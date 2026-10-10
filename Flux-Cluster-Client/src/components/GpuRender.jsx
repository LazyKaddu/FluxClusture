import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { renderChunk } from '../render/gpuRenderer.js';
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js';

const createScene = () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  const lightGeo = new THREE.PlaneGeometry(8, 8);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveIntensity: 10,
  });
  const lightMesh = new THREE.Mesh(lightGeo, lightMat);
  lightMesh.position.set(0, 9.9, 0);
  lightMesh.rotation.x = Math.PI / 2;
  scene.add(lightMesh);

  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  scene.add(floorMesh);

  const sphereGeo = new THREE.SphereGeometry(2, 64, 64);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 1.0,
    ior: 1.5,
    roughness: 0,
    thickness: 2.0,
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, glassMat);
  sphereMesh.position.set(-2.5, 2, 0);
  scene.add(sphereMesh);

  const boxGeo = new THREE.BoxGeometry(3, 4, 3);
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 1.0, roughness: 0.2 });
  const boxMesh = new THREE.Mesh(boxGeo, metalMat);
  boxMesh.position.set(2.5, 2, 0);
  boxMesh.rotation.y = Math.PI / 6;
  scene.add(boxMesh);

  return scene;
};

export default function PathTracerCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // 1. WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: false,
      alpha: false,
    });
    
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // 2. Camera & Scene Setup
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 500);
    camera.position.set(0, 4, 12);
    cameraRef.current = camera;

    const scene = createScene();
    sceneRef.current = scene;

    // 3. Initialize the Path Tracer
    const pathTracer = new WebGLPathTracer(renderer);
    pathTracer.setBVHWorker(new GenerateMeshBVHWorker());
    
    // Newer versions of three-gpu-pathtracer recommend generating the BVH asynchronously 
    // to prevent freezing the UI thread, but synchronous is fine for small scenes.
    let isSized = false;
    let isReady = false;

    const initTracer = async () => {
      if (typeof pathTracer.setSceneAsync === 'function') {
        await pathTracer.setSceneAsync(scene, camera);
      } else {
        pathTracer.setScene(scene, camera);
      }

      if (typeof pathTracer.compileAsync === 'function') {
        await pathTracer.compileAsync();
      }
      isReady = true;
    };
    initTracer();

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.update();
    controls.addEventListener('change', () => pathTracer.updateCamera());

    // 5. Safe Render Loop
    let animationId;

    const renderLoop = () => {
      animationId = requestAnimationFrame(renderLoop);
      
      // ONLY render if we have a valid framebuffer size > 0 and tracer is ready
      if (isSized && isReady) {
        pathTracer.renderSample();
      }
    };
    renderLoop();

    // 6. ResizeObserver (Replaces window.addEventListener)
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Prevent 0 size assignments that crash WebGL framebuffers
        if (width === 0 || height === 0) {
          isSized = false;
          continue;
        }

        isSized = true;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height, false); // false prevents resizing the canvas CSS
        renderer.setPixelRatio(window.devicePixelRatio);
        
        pathTracer.updateCamera();
      }
    });

    // Observe the parent container instead of the window
    resizeObserver.observe(containerRef.current);

    // 7. Strict Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      
      controls.dispose();
      pathTracer.dispose();
      renderer.dispose();
      
      // Clear materials and geometries
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, []);

  const handleBackgroundRender = async () => {
    if (isRendering || !sceneRef.current || !cameraRef.current) return;
    setIsRendering(true);
    setRenderProgress(0);

    try {
      const width = 800; // You can change this to any desired high-res size
      const height = 600;
      const samples = 1024; // Desired number of samples

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const offscreenRenderer = new THREE.WebGLRenderer({ canvas: offscreenCanvas, antialias: false, alpha: false });
      offscreenRenderer.setSize(width, height, false);
      offscreenRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      offscreenRenderer.toneMappingExposure = 1.0;

      const offscreenPathTracer = new WebGLPathTracer(offscreenRenderer);
      
      // Create an independent scene so WebGL resources (geometries/materials) aren't shared across contexts
      const offscreenScene = createScene();
      offscreenPathTracer.setScene(offscreenScene, cameraRef.current.clone());

      const pixels = await renderChunk(
        offscreenRenderer,
        offscreenPathTracer,
        cameraRef.current.clone(),
        0, 0, width, height, width, height, samples,
        (prog) => {
          setRenderProgress(Math.round((prog.samples / prog.maxSamples) * 100));
        }
      );

      // Convert Uint8Array pixels to ImageData (note: WebGL returns bottom-up pixels)
      const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
      
      // Use a 2D canvas to flip the image vertically
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = width;
      finalCanvas.height = height;
      const ctx = finalCanvas.getContext('2d');
      ctx.translate(0, height);
      ctx.scale(1, -1);
      ctx.drawImage(tempCanvas, 0, 0);

      const dataUrl = finalCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'render.png';
      a.click();
      
      offscreenPathTracer.dispose();
      offscreenRenderer.dispose();
    } catch (e) {
      console.error("Background render failed:", e);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}
    >
      <canvas 
        ref={canvasRef} 
        style={{ display: 'block', width: '100%', height: '100%' }} 
      />
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'sans-serif', pointerEvents: 'none' }}>
        <strong>three-gpu-pathtracer</strong>
        <p>Drag to rotate. Image refines dynamically.</p>
        <div style={{ pointerEvents: 'auto', marginTop: 10 }}>
          <button 
            onClick={handleBackgroundRender} 
            disabled={isRendering}
            style={{ padding: '8px 12px', cursor: 'pointer', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
          >
            {isRendering ? `Rendering... ${renderProgress}%` : 'Start High-Res Background Render'}
          </button>
        </div>
      </div>
    </div>
  );
}