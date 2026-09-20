import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { renderChunkAdaptively } from './gpuRenderer.js';
import { loadGLB } from './modelLoader.js';

let renderer = null;
let pathTracer = null;
let camera = null;
let currentScene = null;
let mixer = null;
let currentRenderedFrame = null;
let sceneReadyPromise = null;
let resolveSceneReady = null;

function syncCameraFromGLB(loadedScene, renderCamera, totalWidth, totalHeight) {
    if (!renderCamera) return;
    const glbCamera = loadedScene?.getObjectByProperty('isPerspectiveCamera', true);
    if (glbCamera) {
        renderCamera.copy(glbCamera);
    } else if (loadedScene) {
        // Fallback: auto-fit camera to scene
        const box = new THREE.Box3().setFromObject(loadedScene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const fov = renderCamera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.5; // zoom out a bit
            
            renderCamera.position.set(center.x, center.y, center.z + cameraZ);
            renderCamera.lookAt(center);
        }
    }
    renderCamera.aspect = totalWidth / totalHeight;
    renderCamera.updateProjectionMatrix();
}

self.onmessage = async (event) => {
    const data = event.data;

    try {
        if (data.type === 'INIT_CANVAS') {
            const canvas = data.canvas || new OffscreenCanvas(64, 64);
            renderer = new THREE.WebGLRenderer({ canvas });
            pathTracer = new WebGLPathTracer(renderer);
            // Base camera setup; will be overwritten by the GLB camera
            camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
            self.postMessage({ type: 'CANVAS_INITIALIZED' });
        }

        if (data.type === 'SETUP_SCENE') {
            sceneReadyPromise = new Promise(r => resolveSceneReady = r);
            const gltf = await loadGLB(data.fileData);
            
            // WebGLPathTracer requires a true THREE.Scene (with properties like backgroundRotation),
            // but gltf.scene is often a THREE.Group. We wrap it to prevent errors.
            currentScene = new THREE.Scene();
            currentScene.add(gltf.scene);

            // 1. Setup animation mixer if animations exist
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(currentScene);
                const animIndex = data.animationIndex !== undefined ? data.animationIndex : 0;

                if (gltf.animations[animIndex]) {
                    const action = mixer.clipAction(gltf.animations[animIndex]);
                    action.play();
                } else {
                    console.warn(`Animation index ${animIndex} does not exist in this GLB.`);
                }
            } else {
                mixer = null;
            }

            const initialFrame = data.frame !== undefined ? data.frame : 0;
            const fps = data.fps || 30;
            if (mixer) {
                mixer.setTime(initialFrame / fps);
            }
            currentRenderedFrame = initialFrame;

            const width = data.totalWidth || 1920;
            const height = data.totalHeight || 1080;

            if (!camera) {
                camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            }
            syncCameraFromGLB(currentScene, camera, width, height);

            // 2. Configure pathTracer and generate BVH for current initial pose
            if (currentScene && pathTracer && camera) {
                pathTracer.setScene(currentScene, camera);
            }

            self.postMessage({ type: 'SCENE_READY' });
            if (resolveSceneReady) resolveSceneReady();
        }

        if (data.type === 'RENDER_CHUNK') {
            if (sceneReadyPromise) await sceneReadyPromise;

            if (!renderer || !pathTracer || !camera) {
                throw new Error("Renderer or camera not initialized. Send INIT_CANVAS first.");
            }
            if (!currentScene) {
                throw new Error("Scene not loaded. Send SETUP_SCENE first.");
            }

            // If the frame changed, advance the animation mixer and rebuild the BVH
            if (data.frame !== undefined && data.frame !== currentRenderedFrame) {
                if (mixer) {
                    const fps = data.fps || 30;
                    mixer.setTime(data.frame / fps);
                }
                syncCameraFromGLB(currentScene, camera, data.totalWidth, data.totalHeight);
                
                // WORKAROUND: three-gpu-pathtracer has a bug in PathTracingSceneGenerator (line 180):
                // `this._materialUuids.length !== length` where `length` is undefined.
                // Setting `_materialUuids` to null forces a short-circuit before it throws ReferenceError.
                if (pathTracer._generator) {
                    pathTracer._generator._materialUuids = null;
                }
                pathTracer.setScene(currentScene, camera);
                
                currentRenderedFrame = data.frame;
            }

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
                { type: 'CHUNK_FINISHED', taskId: data.taskId, task: data.task, pixels: finalPixels },
                [finalPixels.buffer]
            );
        }
    } catch (error) {
        console.error("[RenderWorker Error]:", error);
        self.postMessage({ type: 'ERROR', message: error?.message || String(error) });
    }
};