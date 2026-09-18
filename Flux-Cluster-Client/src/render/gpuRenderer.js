import { WebGLPathTracer } from 'three-gpu-pathtracer';

/**
 * A tiny helper that pauses our loop for 1 frame, 
 * giving the browser time to paint the canvas to the monitor.
 */
const yieldToBrowser = () => new Promise(resolve => requestAnimationFrame(resolve));

/**
 * Compares two Uint8Array pixel buffers to calculate the noise delta.
 * Returns a value where 0 is perfectly converged (no change)[cite: 1].
 */
function calculateConvergenceNoise(currentPixels, previousPixels) {
    if (!previousPixels) return 1.0; 
    
    let totalDifference = 0;
    const pixelCount = currentPixels.length;
    
    for (let i = 0; i < pixelCount; i += 4) {
        totalDifference += Math.abs(currentPixels[i] - previousPixels[i]);         
        totalDifference += Math.abs(currentPixels[i + 1] - previousPixels[i + 1]); 
        totalDifference += Math.abs(currentPixels[i + 2] - previousPixels[i + 2]); 
    }
    
    return totalDifference / (pixelCount * 0.75);
}

/**
 * Renders a 64x64 tile adaptively and fires progress callbacks.
 */
export async function renderChunkAdaptively(renderer, pathTracer, camera, startX, startY, totalWidth, totalHeight, frameNumber, onProgress, maxSamples=1024, noiseThreshold=0.1) {
    const chunkWidth = 64;
    const chunkHeight = 64;
    
    camera.setViewOffset(totalWidth, totalHeight, startX, startY, chunkWidth, chunkHeight);
    pathTracer.updateCamera();
    pathTracer.reset();

    const batchSize = 5;

    
    const bufferSize = chunkWidth * chunkHeight * 4;
    let currentPixels = new Uint8Array(bufferSize);
    let previousPixels = null;
    let currentNoise = 1.0;
    
    let totalSamples = 0;
    
    while (totalSamples < maxSamples) {
        for (let i = 0; i < batchSize; i++) {
            pathTracer.renderSample();
            totalSamples++;
        }
        
        await yieldToBrowser();
        
        renderer.readRenderTargetPixels(
            pathTracer.target,
            0, 0, chunkWidth, chunkHeight,
            currentPixels
        );
        
        currentNoise = calculateConvergenceNoise(currentPixels, previousPixels);
        
        if (onProgress) {
            onProgress({ progress: totalSamples/maxSamples });
        }
        
        if (currentNoise <= noiseThreshold && previousPixels !== null) {
            break;
        }
        
        previousPixels = new Uint8Array(currentPixels);
    }
    
    camera.clearViewOffset();
    return currentPixels;
}