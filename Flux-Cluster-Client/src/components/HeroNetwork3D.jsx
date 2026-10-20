import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import RoseMesh from './RoseMesh';

import {
  DEFAULT_NODE_COUNT,
  DEFAULT_MAX_CONNECTIONS,
  DEFAULT_PROXIMITY_THRESHOLD,
  BOUNDS,
  randomInRange,
  generateInitialNodeTransforms,
} from '../utils/networkSimulation';

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

  vec4 worldPos = modelMatrix * vec4(fPosition, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

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

export const defaultLineVertexShader = `
varying vec3 vWorldPosition;
varying float vDistToCenter;

void main() {
  vWorldPosition = position;
  vDistToCenter = length(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

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
  vec3 color = mix(uLineColor, uAccentColor, pulse * 0.85);
  float alpha = 0.25 + 0.65 * pulse;

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Autonomous Cube Node Component matching user reference
 */
export const NodeMesh = ({
  index,
  mix = 1.0,
  rotation,
  position,
  bounds = BOUNDS,
  onRegisterNode,
  onUnregisterNode,
  customVertexShader = nodeVertexShader,
  customFragmentShader = nodeFragmentShader,
}) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const moveTween = useRef(null);

  useEffect(() => {
    if (onRegisterNode && meshRef.current) {
      onRegisterNode(index, meshRef.current);
    }
    return () => {
      if (onUnregisterNode) {
        onUnregisterNode(index);
      }
    };
  }, [index, onRegisterNode, onUnregisterNode]);

  useEffect(() => {
    if (!meshRef.current) return;

    const move = () => {
      moveTween.current = gsap.to(meshRef.current.position, {
        x: randomInRange(bounds.x[0], bounds.x[1]),
        y: randomInRange(bounds.y[0], bounds.y[1]),
        z: randomInRange(bounds.z[0], bounds.z[1]),
        duration: gsap.utils.random(20, 30),
        ease: 'sine.inOut',
        onComplete: move,
      });
    };

    move();

    return () => {
      moveTween.current?.kill();
    };
  }, [bounds]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uXval: { value: 0 },
      uMix: { value: 0 },
      uGlowStrength: { value: 1.4 },
      uGlowPower: { value: 2.8 },
      uOpacity: { value: 0.9 },
      uCameraPos: { value: new THREE.Vector3() },
    }),
    []
  );

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uMix.value = mix;
  }, [mix]);

  useFrame((state, delta) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uXval.value = state.clock.elapsedTime * 10.0;
    materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position);

    // Subtle individual cube rotation towards mouse movement direction (inverted Y)
    if (meshRef.current) {
      meshRef.current.rotation.x += -state.pointer.y * delta * 0.4;
      meshRef.current.rotation.y += -state.pointer.x * delta * 0.4;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={rotation}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        moveTween.current?.pause();
        if (materialRef.current) {
          gsap.to(materialRef.current.uniforms.uMix, {
            value: 0,
            duration: 0.3,
            ease: 'sine.out',
          });
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        moveTween.current?.resume();
        if (materialRef.current) {
          gsap.to(materialRef.current.uniforms.uMix, {
            value: mix,
            duration: 0.8,
            ease: 'sine.inOut',
          });
        }
      }}
    >
      <boxGeometry args={[1, 1, 1, 20, 20, 20]} />
      <shaderMaterial
        ref={materialRef}
        depthWrite={false}
        vertexShader={customVertexShader}
        fragmentShader={customFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Dynamic Network Connection Tethers between Autonomous Nodes.
 * Maintains <= 3 connections per node, using single draw call with Float32Array.
 */
const NetworkLines = ({
  nodeCount,
  nodesRef,
  proximityThreshold = DEFAULT_PROXIMITY_THRESHOLD,
  maxConnections = DEFAULT_MAX_CONNECTIONS,
  customLineVertexShader = defaultLineVertexShader,
  customLineFragmentShader = defaultLineFragmentShader,
}) => {
  const lineGeometryRef = useRef();
  const lineMaterialRef = useRef();
  const connectionsMap = useRef(new Map());

  const maxLines = Math.floor((nodeCount * maxConnections) / 2);
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
  const linePositionsRef = useRef(linePositions);

  useEffect(() => {
    linePositionsRef.current = linePositions;
  }, [linePositions]);

  const lineUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLineColor: { value: new THREE.Color(0x444444) },
      uAccentColor: { value: new THREE.Color(0xaf3240) },
    }),
    []
  );

  useFrame((state) => {
    const nodes = nodesRef.current;
    if (!nodes) return;

    // Collect valid node positions
    const positions = [];
    for (let i = 0; i < nodeCount; i++) {
      if (nodes[i]) {
        positions[i] = nodes[i].position;
      }
    }

    const breakThreshold = proximityThreshold * 1.05;

    // 1. Sever connections that exceed proximity threshold
    for (let i = 0; i < nodeCount; i++) {
      const connsA = connectionsMap.current.get(i);
      if (!connsA || !positions[i]) continue;

      for (const j of Array.from(connsA)) {
        if (i < j) {
          if (!positions[j] || positions[i].distanceTo(positions[j]) > breakThreshold) {
            connsA.delete(j);
            connectionsMap.current.get(j)?.delete(i);
          }
        }
      }
    }

    // 2. Establish new connections within proximity threshold (strict max 3 per node)
    for (let i = 0; i < nodeCount; i++) {
      if (!positions[i]) continue;
      let connsA = connectionsMap.current.get(i);
      if (!connsA) {
        connsA = new Set();
        connectionsMap.current.set(i, connsA);
      }
      if (connsA.size >= maxConnections) continue;

      for (let j = i + 1; j < nodeCount; j++) {
        if (connsA.size >= maxConnections) break;
        if (!positions[j]) continue;

        let connsB = connectionsMap.current.get(j);
        if (!connsB) {
          connsB = new Set();
          connectionsMap.current.set(j, connsB);
        }
        if (connsB.size >= maxConnections) continue;
        if (connsA.has(j)) continue;

        if (positions[i].distanceTo(positions[j]) <= proximityThreshold) {
          connsA.add(j);
          connsB.add(i);
        }
      }
    }

    // 3. Populate dynamic line vertex buffer
    const buf = linePositionsRef.current;
    let ptr = 0;
    for (let i = 0; i < nodeCount; i++) {
      const connsA = connectionsMap.current.get(i);
      if (!connsA || !positions[i]) continue;

      for (const j of connsA) {
        if (i < j && positions[j]) {
          const p1 = positions[i];
          const p2 = positions[j];
          buf[ptr++] = p1.x;
          buf[ptr++] = p1.y;
          buf[ptr++] = p1.z;
          buf[ptr++] = p2.x;
          buf[ptr++] = p2.y;
          buf[ptr++] = p2.z;
        }
      }
    }

    const activeLines = ptr / 6;

    if (lineGeometryRef.current) {
      lineGeometryRef.current.setDrawRange(0, activeLines * 2);
      lineGeometryRef.current.attributes.position.needsUpdate = true;
    }

    if (lineMaterialRef.current) {
      lineMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <lineSegments>
      <bufferGeometry ref={lineGeometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[linePositions, 3]}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={lineMaterialRef}
        vertexShader={customLineVertexShader}
        fragmentShader={customLineFragmentShader}
        uniforms={lineUniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};

/**
 * Main Network 3D Scene
 */
const NetworkScene = ({
  nodeCount = DEFAULT_NODE_COUNT,
  proximityThreshold = DEFAULT_PROXIMITY_THRESHOLD,
  maxConnections = DEFAULT_MAX_CONNECTIONS,
  bounds = BOUNDS,
  mix = 1.0,
  showRose = true,
  roseScale = 6.0,
  enableOrbit = true,
  customNodeVertexShader,
  customNodeFragmentShader,
  customLineVertexShader,
  customLineFragmentShader,
}) => {
  const nodesRef = useRef([]);

  const handleRegisterNode = (index, mesh) => {
    nodesRef.current[index] = mesh;
  };

  const handleUnregisterNode = (index) => {
    delete nodesRef.current[index];
  };

  // Generate initial node positions and rotations cleanly
  const initialNodes = useMemo(
    () => generateInitialNodeTransforms(nodeCount, bounds),
    [nodeCount, bounds]
  );

  const parallaxGroupRef = useRef();

  // Smooth parallax rotation towards cursor position (with inverted mouse Y)
  useFrame((state, delta) => {
    if (!parallaxGroupRef.current) return;
    const targetRotX = -state.pointer.y * 0.28;
    const targetRotY = state.pointer.x * 0.38;

    const damping = Math.min(delta * 4.0, 0.1);
    parallaxGroupRef.current.rotation.x = THREE.MathUtils.lerp(
      parallaxGroupRef.current.rotation.x,
      targetRotX,
      damping
    );
    parallaxGroupRef.current.rotation.y = THREE.MathUtils.lerp(
      parallaxGroupRef.current.rotation.y,
      targetRotY,
      damping
    );
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[60, 80, 70]} intensity={2.0} />
      <directionalLight position={[-60, -40, -50]} intensity={1.2} />
      <pointLight position={[0, 0, 30]} intensity={2.5} distance={120} color="#af3240" />

      {/* Network constellation group reacting to cursor parallax */}
      <group ref={parallaxGroupRef}>
        {/* Central Rose Mesh with custom fragment shader */}
        {showRose && (
          <Suspense fallback={null}>
            <RoseMesh scale={roseScale} position={[0, 0, 0]} />
          </Suspense>
        )}

        {/* Autonomous Node Meshes */}
        {initialNodes.map((node) => (
          <NodeMesh
            key={node.id}
            index={node.id}
            mix={mix}
            position={node.position}
            rotation={node.rotation}
            bounds={bounds}
            onRegisterNode={handleRegisterNode}
            onUnregisterNode={handleUnregisterNode}
            customVertexShader={customNodeVertexShader}
            customFragmentShader={customNodeFragmentShader}
          />
        ))}

        {/* Dynamic Network Connection Tethers */}
        <NetworkLines
          nodeCount={nodeCount}
          nodesRef={nodesRef}
          proximityThreshold={proximityThreshold}
          maxConnections={maxConnections}
          customLineVertexShader={customLineVertexShader}
          customLineFragmentShader={customLineFragmentShader}
        />
      </group>

      {/* OrbitControls enabled conditionally (always on desktop, toggled on mobile) */}
      {enableOrbit && (
        <OrbitControls enableZoom={false} enablePan={false} dampingFactor={0.05} />
      )}
    </>
  );
};

/**
 * Top-level HeroNetwork3D Canvas Component
 */
const HeroNetwork3D = ({
  nodeCount = DEFAULT_NODE_COUNT,
  proximityThreshold = DEFAULT_PROXIMITY_THRESHOLD,
  maxConnections = DEFAULT_MAX_CONNECTIONS,
  bounds = BOUNDS,
  mix = 1.0,
  showRose = true,
  roseScale = 6.0,
  className = 'w-full h-full relative overflow-hidden',
  cameraPosition = [0, 0, 110],
  customNodeVertexShader = nodeVertexShader,
  customNodeFragmentShader = nodeFragmentShader,
  customLineVertexShader = defaultLineVertexShader,
  customLineFragmentShader = defaultLineFragmentShader,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [is3DActive, setIs3DActive] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIs3DActive(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isOrbitEnabled = !isMobile || is3DActive;

  return (
    <div
      className={`${className} ${
        !isOrbitEnabled
          ? 'touch-pan-y [&_canvas]:touch-pan-y'
          : 'touch-none [&_canvas]:touch-none'
      }`}
    >
      <Canvas
        style={{ touchAction: isOrbitEnabled ? 'none' : 'pan-y' }}
        camera={{ position: cameraPosition, fov: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <NetworkScene
          nodeCount={nodeCount}
          proximityThreshold={proximityThreshold}
          maxConnections={maxConnections}
          bounds={bounds}
          mix={mix}
          showRose={showRose}
          roseScale={roseScale}
          enableOrbit={isOrbitEnabled}
          customNodeVertexShader={customNodeVertexShader}
          customNodeFragmentShader={customNodeFragmentShader}
          customLineVertexShader={customLineVertexShader}
          customLineFragmentShader={customLineFragmentShader}
        />
      </Canvas>

      {/* Mobile 3D Interaction Mode Toggle */}
      {isMobile && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center z-20 pointer-events-auto md:hidden px-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIs3DActive((prev) => !prev);
            }}
            className={`px-4 py-2 rounded-full text-xs font-mono tracking-wider flex items-center gap-2 border transition-all duration-300 backdrop-blur-md shadow-lg select-none active:scale-95 cursor-pointer ${
              is3DActive
                ? 'bg-[#AF3240]/90 text-white border-[#AF3240] shadow-[#AF3240]/30'
                : 'bg-black/80 text-white/90 border-white/20 hover:border-white/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                is3DActive ? 'bg-white animate-pulse' : 'bg-[#AF3240]'
              }`}
            />
            {is3DActive ? '✕ Exit 3D (Scroll Mode)' : '⟳ Explore 3D'}
          </button>
        </div>
      )}
    </div>
  );
};

export { RoseMesh };
export default HeroNetwork3D;

