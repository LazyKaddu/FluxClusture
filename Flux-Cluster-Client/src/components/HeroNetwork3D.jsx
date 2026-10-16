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
 * Custom GLSL vertex shader for the cube nodes.
 */
export const nodeVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

uniform float uXval;
uniform float uMix;

void main() {
  vUv = uv;

  vec3 uPosition = position;
  uPosition.x = abs(sin((uPosition.x * 0.05) + uXval) * uPosition.y);
  uPosition.z = sin(uPosition.y * 5.5) * uPosition.z;

  vec3 fPosition = mix(position, uPosition, uMix);

  #ifdef USE_INSTANCING
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(fPosition, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  #else
    vec4 worldPos = modelMatrix * vec4(fPosition, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
  #endif
  vWorldPos = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

/**
 * Custom GLSL fragment shader for the cube nodes.
 */
export const nodeFragmentShader = `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

uniform float uTime;
uniform vec3 uCameraPos;

uniform float uGlowStrength;
uniform float uGlowPower;
uniform float uOpacity;

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(uCameraPos - vWorldPos);

  /* Your original animated color */
  vec3 baseColor =
    0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0));

  /* Fresnel term */
  float fresnel =
    pow(1.0 - max(dot(viewDir, normal), 0.0), uGlowPower);

  /* Specular highlight */
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec =
    pow(max(dot(normal, halfDir), 0.0), 120.0);

  /* Blue → White glow */
  vec3 glowBlue = vec3(0.2, 0.6, 1.0);
  vec3 glowWhite = vec3(1.0);

  vec3 glow =
    mix(glowBlue, glowWhite, fresnel) *
    fresnel * uGlowStrength;

  /* Final color composition */
  vec3 finalColor =
    baseColor * 0.35 +     // glass interior
    spec * vec3(1.0) +     // glossy highlights
    glow;                  // emissive glow

  gl_FragColor = vec4(finalColor, uOpacity);
}
`;

// Backward-compatibility aliases
export const defaultNodeVertexShaderChunk = nodeVertexShader;
export const defaultNodeFragmentShaderChunk = nodeFragmentShader;

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
  // Custom GLSL shader injection slots (default to user's custom node shaders):
  nodeVertexShader: customNodeVertexShader = nodeVertexShader,
  nodeFragmentShader: customNodeFragmentShader = nodeFragmentShader,
  // Variables loaded through JS with default value of 1 as requested:
  uXval = 1.0,
  uMix = 1.0,
  uGlowStrength = 1.0,
  uGlowPower = 1.0,
  uOpacity = 1.0,
  // Custom line shader props:
  customLineVertexShader = defaultLineVertexShader,
  customLineFragmentShader = defaultLineFragmentShader,
  onFrame,
  materialRef: externalMaterialRef,
  uniformsRef: externalUniformsRef,
}) => {
  const mountRef = useRef(null);
  const nodeMaterialRef = useRef(null);

  // Shader uniforms loaded through JS initialized to default 1.0
  const nodeUniformsRef = useRef({
    uTime: { value: 0.0 },
    uCameraPos: { value: new THREE.Vector3() },
    uXval: { value: uXval },
    uMix: { value: uMix },
    uGlowStrength: { value: uGlowStrength },
    uGlowPower: { value: uGlowPower },
    uOpacity: { value: uOpacity },
  });

  // Expose refs externally if props are provided
  if (externalMaterialRef) externalMaterialRef.current = nodeMaterialRef.current;
  if (externalUniformsRef) externalUniformsRef.current = nodeUniformsRef.current;

  // Sync prop changes into uniforms ref
  useEffect(() => {
    if (nodeUniformsRef.current) {
      nodeUniformsRef.current.uXval.value = uXval;
      nodeUniformsRef.current.uMix.value = uMix;
      nodeUniformsRef.current.uGlowStrength.value = uGlowStrength;
      nodeUniformsRef.current.uGlowPower.value = uGlowPower;
      nodeUniformsRef.current.uOpacity.value = uOpacity;
    }
  }, [uXval, uMix, uGlowStrength, uGlowPower, uOpacity]);

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

    // 4. Custom ShaderMaterial for Cube Nodes using user shaders and uniforms
    const nodeMaterial = new THREE.ShaderMaterial({
      vertexShader: customNodeVertexShader || nodeVertexShader,
      fragmentShader: customNodeFragmentShader || nodeFragmentShader,
      uniforms: nodeUniformsRef.current,
      transparent: true,
      depthWrite: true,
    });
    nodeMaterialRef.current = nodeMaterial;
    if (externalMaterialRef) externalMaterialRef.current = nodeMaterial;

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

      // useFrame frame-update pattern: update shader uniforms via refs
      if (nodeUniformsRef.current) {
        nodeUniformsRef.current.uTime.value = elapsedTime;
        nodeUniformsRef.current.uCameraPos.value.copy(camera.position);
      }
      lineUniforms.uTime.value = elapsedTime;

      // Optional user per-frame callback
      if (onFrame) {
        onFrame({
          time: elapsedTime,
          deltaTime,
          camera,
          scene,
          material: nodeMaterialRef.current,
          uniforms: nodeUniformsRef.current,
        });
      }

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
    customNodeVertexShader,
    customNodeFragmentShader,
    customLineVertexShader,
    customLineFragmentShader,
    onFrame,
  ]);

  return <div ref={mountRef} className={className} />;
};

export default HeroNetwork3D;
