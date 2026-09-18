import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { createFrameBVH } from './bvhManager.js';
import { renderChunkAdaptively } from './gpuRenderer.js';
import { loadGLB } from './modelLoader.js';

let renderer, pathTracer, camera;

function syncCameraFromGLB(loadedScene, renderCamera, totalWidth, totalHeight) {
    const glbCamera = loadedScene.getObjectByProperty('isPerspectiveCamera', true);
    if (glbCamera) {
        renderCamera.copy(glbCamera);
        renderCamera.aspect = totalWidth / totalHeight;
        renderCamera.updateProjectionMatrix();
    }
}

self.onmessage = async (event) => {
    const data = event.data;

    if (data.type === 'INIT_CANVAS') {
        renderer = new THREE.WebGLRenderer({ canvas: data.canvas });
        pathTracer = new WebGLPathTracer(renderer);
        // Base camera setup; will be overwritten by the GLB camera
        camera = new THREE.PerspectiveCamera(75, data.canvas.width / data.canvas.height, 0.1, 1000);
    }

    if (data.type === 'SETUP_SCENE') {
    const gltf = await loadGLB(data.fileData); 
    
    // 1. Move the scene to the requested animation frame
    if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(gltf.scene);

        const animIndex = data.animationIndex !== undefined ? data.animationIndex : 0;



        if (gltf.animations[animIndex]) {
            const action = mixer.clipAction(gltf.animations[animIndex]); 
            action.play();
            
            const targetTime = data.frame / data.fps; 
            mixer.setTime(targetTime); 
        } else {
            console.warn(`Animation index ${animIndex} does not exist in this GLB.`);
        }
    }
        
        // Convert the frame number to seconds (assuming 30 FPS standard)
        // e.g., frame 60 / 30fps = 2.0 seconds into the animation
        const fps = data.fps; 
        const targetTime = data.frame / fps;
        
        // Force the mixer to exactly this moment in time
        mixer.setTime(targetTime); 
    }
    
    syncCameraFromGLB(gltf.scene, camera, data.totalWidth, data.totalHeight);
    
    // 2. Generate the BVH now that the geometry is in the correct pose
    const { bvh, materials, textures, geometry } = createFrameBVH(gltf.scene);
    pathTracer.setScene(bvh, materials, textures, geometry);
}

    if (data.type === 'RENDER_CHUNK') {
        const finalPixels = await renderChunkAdaptively(
            renderer,
            pathTracer,
            camera,
            data.startX,     
            data.startY,     
            data.totalWidth,
            data.totalHeight,
            data.frame,
            (progressData) => {
                self.postMessage({
                    type: 'CHUNK_PROGRESS',
                    taskId: data.taskId,
                    ...progressData 
                });
            },
            data.samples,
            data.noiseThreshold
        );

        // Zero-Copy Transfer
        self.postMessage(
            { type: 'CHUNK_FINISHED', taskId: data.taskId, pixels: finalPixels },
            [finalPixels.buffer] 
        );
    }
};