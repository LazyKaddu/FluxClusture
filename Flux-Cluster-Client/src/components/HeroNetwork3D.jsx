import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  DEFAULT_NODE_COUNT,
  DEFAULT_MAX_CONNECTIONS,
  DEFAULT_BOUNDARY,
  DEFAULT_PROXIMITY_THRESHOLD,
  DEFAULT_NODE_SPEED,
  getMaxLineSegments,
  createNetworkState,
  updateNetworkStep,
  populateLineBuffer,
} from '../utils/networkSimulation';

// Re-export constants for easy access
export { DEFAULT_NODE_COUNT, DEFAULT_MAX_CONNECTIONS, DEFAULT_BOUNDARY, DEFAULT_PROXIMITY_THRESHOLD };

/**
 * Default custom vertex shader chunk injected into MeshStandardMaterial via onBeforeCompile.
 * Adds a subtle autonomous breathing pulse to the cube vertices.
 */
export const defaultNodeVertexShaderChunk = `
  // Custom vertex shader chunk: subtle vertex expansion pulse
  #ifdef USE_INSTANCING
    float nodePhase = float(gl_InstanceID) * 0.45;
  #else
    float nodePhase = 0.0;
  #endif
  float pulse = sin(uTime * 2.5 + nodePhase) * 0.06;
  transformed += normal * pulse;
`;

/**
 * Default custom fragment shader chunk injected into MeshStandardMaterial via onBeforeCompile.
 * Adds a glowing Fresnel rim and cybernetic energy highlights while preserving PBR lighting.
 */
export const defaultNodeFragmentShaderChunk = `
  // Custom fragment shader chunk: Fresnel rim glow & cybernetic emission
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - clamp(abs(dot(viewDir, normal)), 0.0, 1.0), 3.0);
  vec3 rimGlow = uGlowColor * fresnel * 0.9;
  gl_FragColor.rgb += rimGlow;
`;

/**
 * Default custom GLSL vertex shader for the LineSegments connection tethers.
 */
export const defaultLineVertexShader = `
  uniform float uTime;
  varying vec3 vWorldPosition;
  varying float vDistToCenter;

  void main() {
    vWorldPosition = position;
    vDistToCenter = length(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Default custom GLSL fragment shader for the LineSegments connection tethers.
 * Creates an animated cybernetic pulse along the tethers with glowing falloff.
 */
export const defaultLineFragmentShader = `
  uniform float uTime;
  uniform vec3 uLineColor;
  uniform vec3 uAccentColor;
  varying vec3 vWorldPosition;
  varying float vDistToCenter;

  void main() {
    // Animated energy wave flowing through space
    float wave = sin(vDistToCenter * 0.18 - uTime * 3.5);
    float pulse = smoothstep(0.3, 1.0, wave);

    // Dynamic blend between subtle tether color and high-energy accent pulse
    vec3 color = mix(uLineColor, uAccentColor, pulse * 0.7);
    float alpha = 0.25 + 0.65 * pulse;

    gl_FragColor = vec4(color, alpha);
  }
`;

const HeroNetwork3D = ({
  nodeCount = DEFAULT_NODE_COUNT,
  boundary = DEFAULT_BOUNDARY,
  proximityThreshold = DEFAULT_PROXIMITY_THRESHOLD,
  maxConnections = DEFAULT_MAX_CONNECTIONS,
  speed = DEFAULT_NODE_SPEED,
  className = 'w-full h-full relative overflow-hidden',
  enableParallax = true,
  // Custom GLSL shader injection slots:
  customNodeVertexChunk = defaultNodeVertexShaderChunk,
  customNodeFragmentChunk = defaultNodeFragmentShaderChunk,
  customLineVertexShader = defaultLineVertexShader,
  customLineFragmentShader = defaultLineFragmentShader,
}) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId;
    let isDisposed = false;

    // 1. Scene & Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = null; // Transparent to blend seamlessly with UI backgrounds

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 110);

    // 2. WebGLRenderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 3. Lighting (PBR Depth & Contrast)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(60, 80, 70);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x708090, 1.2);
    dirLight2.position.set(-60, -40, -50);
    scene.add(dirLight2);

    // Accent crimson point light matching FluxCluster branding (#AF3240)
    const accentPointLight = new THREE.PointLight(0xaf3240, 2.5, 120);
    accentPointLight.position.set(0, 0, 30);
    scene.add(accentPointLight);

    // 4. Custom MeshStandardMaterial with onBeforeCompile for Cube Nodes
    const customUniforms = {
      uTime: { value: 0 },
      uGlowColor: { value: new THREE.Color(0xaf3240) },
    };

    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0xefefef,
      roughness: 0.22,
      metalness: 0.88,
    });

    nodeMaterial.onBeforeCompile = (shader) => {
      // Expose uniforms
      shader.uniforms.uTime = customUniforms.uTime;
      shader.uniforms.uGlowColor = customUniforms.uGlowColor;

      // Inject custom vertex chunk
      if (customNodeVertexChunk && customNodeVertexChunk.trim().length > 0) {
        shader.vertexShader = `
          uniform float uTime;
          ${shader.vertexShader}
        `;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\n${customNodeVertexChunk}`
        );
      }

      // Inject custom fragment chunk
      if (customNodeFragmentChunk && customNodeFragmentChunk.trim().length > 0) {
        shader.fragmentShader = `
          uniform float uTime;
          uniform vec3 uGlowColor;
          ${shader.fragmentShader}
        `;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>\n${customNodeFragmentChunk}`
        );
      }
    };

    // 5. InstancedMesh for Cube Nodes
    const cubeGeometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const instancedMesh = new THREE.InstancedMesh(cubeGeometry, nodeMaterial, nodeCount);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    // 6. LineSegments with pre-allocated Float32Array & Custom GLSL Shader
    const maxSegments = getMaxLineSegments(nodeCount, maxConnections);
    const linePositions = new Float32Array(maxSegments * 6);

    const lineGeometry = new THREE.BufferGeometry();
    const linePositionAttribute = new THREE.BufferAttribute(linePositions, 3);
    linePositionAttribute.setUsage(THREE.DynamicDrawUsage);
    lineGeometry.setAttribute('position', linePositionAttribute);
    lineGeometry.setDrawRange(0, 0);

    const lineUniforms = {
      uTime: { value: 0 },
      uLineColor: { value: new THREE.Color(0x555555) },
      uAccentColor: { value: new THREE.Color(0xaf3240) },
    };

    const lineMaterial = new THREE.ShaderMaterial({
      vertexShader: customLineVertexShader,
      fragmentShader: customLineFragmentShader,
      uniforms: lineUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    // 7. Initialize Autonomous Network State
    const nodes = createNetworkState({
      nodeCount,
      boundary,
      speed,
    });

    // Dummy helper object for computing instance matrices
    const dummy = new THREE.Object3D();

    // 8. Mouse Parallax Tracking
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
      mouse.targetX = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.targetY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    };

    if (enableParallax) {
      window.addEventListener('pointermove', handlePointerMove);
    }

    // 9. Resize Handling via ResizeObserver
    const handleResize = () => {
      if (!container || isDisposed) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Animation Loop
    let lastTime = performance.now();

    const animate = (currentTime) => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const elapsedTime = currentTime * 0.001;
      customUniforms.uTime.value = elapsedTime;
      lineUniforms.uTime.value = elapsedTime;

      // Update node physics, targets, rotational tumbling & connection constraints
      updateNetworkStep(nodes, {
        boundary,
        proximityThreshold,
        maxConnections,
        deltaTime,
      });

      // Update InstancedMesh matrices for cube nodes
      for (let i = 0; i < nodeCount; i++) {
        const node = nodes[i];
        dummy.position.copy(node.position);
        dummy.rotation.copy(node.rotation);
        dummy.scale.setScalar(1.0);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      // Update dynamic line buffer
      const activeSegmentsCount = populateLineBuffer(nodes, linePositions);
      lineGeometry.setDrawRange(0, activeSegmentsCount * 2);
      lineGeometry.attributes.position.needsUpdate = true;

      // Parallax camera easing
      if (enableParallax) {
        mouse.x += (mouse.targetX - mouse.x) * 0.05;
        mouse.y += (mouse.targetY - mouse.y) * 0.05;
        camera.position.x = mouse.x * 12;
        camera.position.y = mouse.y * 12;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 11. Complete Cleanup on Unmount
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);

      if (enableParallax) {
        window.removeEventListener('pointermove', handlePointerMove);
      }
      resizeObserver.disconnect();

      // Dispose Geometries & Materials
      cubeGeometry.dispose();
      nodeMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();

      // Dispose lights and scene children
      scene.clear();

      // Dispose WebGLRenderer
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [
    nodeCount,
    boundary,
    proximityThreshold,
    maxConnections,
    speed,
    enableParallax,
    customNodeVertexChunk,
    customNodeFragmentChunk,
    customLineVertexShader,
    customLineFragmentShader,
  ]);

  return <div ref={mountRef} className={className} />;
};

export default HeroNetwork3D;
