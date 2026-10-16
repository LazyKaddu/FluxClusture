import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import { roseVertexShader, roseFragmentShader } from '../shaders/roseShaders';

export { roseVertexShader, roseFragmentShader };

/**
 * 3D Rose Centerpiece Component
 * Loads /Rose.glb, centers its geometric centroid at [0, 0, 0],
 * and applies the node-matching custom GLSL fragment shader.
 */
const RoseMesh = ({
  modelPath = '/Rose.glb',
  scale = 1.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  glowStrength = 1.4,
  glowPower = 2.8,
  opacity = 0.25,
  mix = 0.0,
  autoRotate = true,
  autoRotateSpeed = 0.1,
  customVertexShader,
  customFragmentShader,
}) => {
  const groupRef = useRef();
  const materialRef = useRef();

  const { scene } = useGLTF(modelPath);

  // Clone scene and compute geometric centroid to center rotation on (0, 0, 0)
  const centeredScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    // Offset cloned scene so its geometric center is at (0, 0, 0)
    clone.position.sub(center);
    return clone;
  }, [scene]);

  // Uniforms matching autonomous node shader
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPos: { value: new THREE.Vector3() },
      uGlowStrength: { value: glowStrength },
      uGlowPower: { value: glowPower },
      uOpacity: { value: opacity },
      uMix: { value: mix },
      uXval: { value: 0.0 },
    }),
    [glowStrength, glowPower, opacity, mix]
  );

  // Apply custom shader material to all meshes in the rose model
  useEffect(() => {
    if (!materialRef.current || !centeredScene) return;

    centeredScene.traverse((child) => {
      if (child.isMesh) {
        child.material = materialRef.current;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [centeredScene]);

  // Per-frame uniform updates and slow turntable rotation
  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position);
    }

    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * autoRotateSpeed;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={customVertexShader || roseVertexShader}
        fragmentShader={customFragmentShader || roseFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
      <primitive object={centeredScene} />
    </group>
  );
};

useGLTF.preload('/Rose.glb');

export default RoseMesh;
