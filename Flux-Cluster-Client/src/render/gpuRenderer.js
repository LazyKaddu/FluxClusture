import { WebGLPathTracer } from 'three-gpu-pathtracer';
import * as THREE from 'three';

/**
 * A tiny helper that pauses our loop for 1 frame, 
 * giving the browser/worker time to breathe.
 */
const yieldToBrowser = () =>
    new Promise(resolve => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(resolve);
        } else {
            setTimeout(resolve, 0);
        }
    });

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
    console.log(`[Pipeline] 1. renderChunkAdaptively called for chunk (${startX}, ${startY})`);
    const chunkWidth = 64;
    const chunkHeight = 64;
    
    camera.setViewOffset(totalWidth, totalHeight, startX, startY, chunkWidth, chunkHeight);
    
    // CRITICAL: Ensure the world matrix is updated before passing to path tracer!
    camera.updateMatrixWorld(true);
    
    pathTracer.updateCamera();
    pathTracer.reset();
    
    // Check if the camera is stuck at origin
    const pos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
    console.log(`[Pipeline] 2. Camera updated. World Pos: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);

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
        
        const gl = renderer.getContext();
        
        // Ensure the path tracer has blitted the final result to the canvas (default framebuffer)
        // WebGLPathTracer automatically blits to the canvas at the end of renderSample if renderToCanvas is true (default).
        // Read directly from the default framebuffer (which is already tone-mapped and converted to UnsignedByte by Three.js)
        gl.readPixels(0, 0, chunkWidth, chunkHeight, gl.RGBA, gl.UNSIGNED_BYTE, currentPixels);
        
        // --- DEBUG: Check pixel values ---
        if (totalSamples === batchSize) { // Only check on the first batch
            let maxR = 0; let maxG = 0; let maxB = 0;
            for (let i = 0; i < bufferSize; i += 4) {
                if (currentPixels[i] > maxR) maxR = currentPixels[i];
                if (currentPixels[i+1] > maxG) maxG = currentPixels[i+1];
                if (currentPixels[i+2] > maxB) maxB = currentPixels[i+2];
            }
            if (maxR > 0 || maxG > 0 || maxB > 0) {
                console.log(`[Pipeline] 4. FOUND NON-ZERO PIXELS! Chunk (${startX}, ${startY}) | Max RGB: [${maxR}, ${maxG}, ${maxB}]`);
            } else if (startX === 0 && startY === 0) {
                console.log(`[Pipeline] 4. Chunk (0, 0) is entirely pitch black. RAW buffer also empty.`);
            }
        }
        // ---------------------------------
        
        currentNoise = calculateConvergenceNoise(currentPixels, previousPixels);
        
        if (typeof onProgress === 'function') {
            onProgress({ samples: totalSamples, maxSamples, noise: currentNoise });
        }
        
        if (currentNoise <= noiseThreshold && previousPixels !== null) {
            break;
        }
        
        previousPixels = new Uint8Array(currentPixels);
    }
    
    console.log(`[Pipeline] 5. Chunk finished at ${totalSamples} samples. Returning pixel array. length: ${currentPixels.length}`);
    camera.clearViewOffset();
    return currentPixels;
}