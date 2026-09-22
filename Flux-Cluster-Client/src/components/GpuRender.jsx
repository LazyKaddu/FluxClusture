import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function PathTracerCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    // --- Scene Objects ---
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

    // 3. Initialize the Path Tracer
    const pathTracer = new WebGLPathTracer(renderer);
    
    // Newer versions of three-gpu-pathtracer recommend generating the BVH asynchronously 
    // to prevent freezing the UI thread, but synchronous is fine for small scenes.
    pathTracer.setScene(scene, camera);

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.update();
    controls.addEventListener('change', () => pathTracer.updateCamera());

    // 5. Safe Render Loop
    let animationId;
    let isSized = false;

    const renderLoop = () => {
      animationId = requestAnimationFrame(renderLoop);
      
      // ONLY render if we have a valid framebuffer size > 0
      if (isSized) {
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
      </div>
    </div>
  );
}