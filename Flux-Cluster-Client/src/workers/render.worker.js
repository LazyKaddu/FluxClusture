import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { loadGLB } from '../render/modelLoader.js';
import { upgradeSceneLights, worldBackgroundColor, ensurePathTracerEnvironment } from '../render/upgradeLights.js';
import { renderChunk } from '../render/gpuRenderer.js';

let renderer = null;
let pathTracer = null;
let scene = null;
let camera = null;
let mixer = null;
let currentRenderedFrame = -1;
let abortController = new AbortController();

// Polyfill requestAnimationFrame for environments where it might not exist in worker
self.requestAnimationFrame = self.requestAnimationFrame || (cb => setTimeout(cb, 16));
self.cancelAnimationFrame = self.cancelAnimationFrame || clearTimeout;

function syncCamera(scene, renderCamera, width, height) {
    if (!renderCamera) return;
    const glbCamera = scene.getObjectByProperty('isPerspectiveCamera', true);
    
    if (glbCamera) {
        scene.updateMatrixWorld(true);
        glbCamera.matrixWorld.decompose(renderCamera.position, renderCamera.quaternion, renderCamera.scale);
        renderCamera.fov = glbCamera.fov;
        renderCamera.near = glbCamera.near;
        renderCamera.far = glbCamera.far;
    } else {
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const fov = renderCamera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 1.5; 
            renderCamera.position.set(center.x, center.y, center.z + cameraZ);
            renderCamera.lookAt(center);
        }
    }
    
    renderCamera.aspect = width / height;
    renderCamera.updateProjectionMatrix();
}

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        const { canvas } = payload;
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        
        pathTracer = new WebGLPathTracer(renderer);
        camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        self.postMessage({ type: 'STATUS', payload: 'Worker initialized.' });
    } 
    
    else if (type === 'SETUP_SCENE') {
        const { buffer, animIndex, width, height, startFrame, fps } = payload;
        self.postMessage({ type: 'STATUS', payload: 'Setting up 3D scene from GLB...' });
        try {
            const gltf = await loadGLB(buffer.slice(0));
            scene = new THREE.Scene();
            scene.add(gltf.scene);

            const giConfig = upgradeSceneLights(scene);
            scene.background = worldBackgroundColor(giConfig && giConfig.color);
            scene.backgroundIntensity = (giConfig && giConfig.intensity) || 1.0;

            let hasMesh = false;
            scene.traverse(c => { if (c.isMesh && (!c.material.transparent || c.material.opacity > 0)) hasMesh = true; });
            if (!hasMesh) {
                const dummy = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), new THREE.MeshStandardMaterial({ color: 0x000000 }));
                scene.add(dummy);
            }

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(scene);
                if (gltf.animations[animIndex]) {
                    mixer.clipAction(gltf.animations[animIndex]).play();
                }
            } else {
                mixer = null;
            }

            if (mixer) {
                mixer.setTime(startFrame / fps);
            }
            currentRenderedFrame = startFrame;

            syncCamera(scene, camera, width, height);
            
            if (pathTracer._generator) {
                pathTracer._generator.bvhOptions = { strategy: 0 };
            }

            self.postMessage({ type: 'STATUS', payload: 'Generating BVH (This may take a while)...' });
            pathTracer.setScene(scene, camera);
            ensurePathTracerEnvironment(pathTracer);

            if (typeof pathTracer.compileAsync === 'function') {
                self.postMessage({ type: 'STATUS', payload: 'Compiling Shaders...' });
                await pathTracer.compileAsync();
            }

            self.postMessage({ type: 'SCENE_READY' });
        } catch (err) {
            console.error(err);
            self.postMessage({ type: 'STATUS', payload: 'Error setting up scene in worker.' });
        }
    } 
    
    else if (type === 'PROCESS_TASK') {
        const { task, config } = payload;
        if (abortController.signal.aborted) return;
        
        try {
            const fps = config.fps || 30;
            const width = config.width || 1920;
            const height = config.height || 1080;
            const samples = config.samples || 1024;

            if (task.frame !== undefined && task.frame !== currentRenderedFrame) {
                syncCamera(scene, camera, width, height);
                if (mixer) {
                    mixer.setTime(task.frame / fps);
                    self.postMessage({ type: 'STATUS', payload: `Updating BVH for Frame ${task.frame}...` });
                    
                    pathTracer.setScene(scene, camera);
                    ensurePathTracerEnvironment(pathTracer);
                    
                    if (typeof pathTracer.compileAsync === 'function') {
                        await pathTracer.compileAsync();
                    }
                }
                currentRenderedFrame = task.frame;
            }

            const tChunkW = parseInt(task.chunkWidth, 10) || 128;
            const tChunkH = parseInt(task.chunkHeight, 10) || 128;

            const pixels = await renderChunk(
                renderer,
                pathTracer,
                camera,
                parseInt(task.startX, 10),
                parseInt(task.startY, 10),
                tChunkW,
                tChunkH,
                width,
                height,
                samples,
                (progressData) => {
                    self.postMessage({ type: 'PROGRESS', payload: progressData, task });
                    if (progressData.pixels) {
                        self.postMessage({ 
                            type: 'TILE_RECEIVED', 
                            payload: { 
                                metadata: { startX: task.startX, startY: task.startY, chunkWidth: tChunkW, chunkHeight: tChunkH, frame: task.frame, taskId: task.id }, 
                                pixels: progressData.pixels 
                            } 
                        });
                    }
                },
                abortController.signal,
                { noiseThreshold: config.noiseThreshold || 0.0 }
            );

            if (!abortController.signal.aborted && pixels) {
                self.postMessage({ 
                    type: 'TILE_COMPLETED', 
                    payload: { 
                        task, 
                        pixels 
                    } 
                });
            }
        } catch (error) {
            if (error.message !== "Render aborted" && error.message !== "WebGL context lost") {
                console.error("Worker Render error:", error);
            }
        }
    } 
    
    else if (type === 'ABORT') {
        abortController.abort();
        if (pathTracer) pathTracer.dispose();
        if (renderer) {
            renderer.dispose();
            renderer.forceContextLoss();
        }
        self.close();
    }
};
