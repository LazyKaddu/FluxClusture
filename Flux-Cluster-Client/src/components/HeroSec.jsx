import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  Html,
} from "@react-three/drei";

const Model = () => {
  const { scene } = useGLTF("/mobiusStrip.glb");

  return (
    <primitive
      object={scene}
      scale={2.8}
      position={[0, 0, 0]}
      rotation={[0,Math.PI,0]}
    />
  );
};

const HeroSec = () => {
  return (
    <div className="w-full h-screen bg-[#000000]">
      <Canvas
        camera={{
          position: [0, 0.8, 8],
          fov: 38,
        }}
        gl={{
          antialias: true,
        }}
      >
        <ambientLight intensity={0.15} />

        <directionalLight
          position={[3, 5, 4]}
          intensity={3}
        />

        <directionalLight
          position={[-4, 2, -2]}
          intensity={1.5}
        />

        <Suspense
          fallback={
            <Html center>
              <div className="text-white">
                Loading...
              </div>
            </Html>
          }
        >
          <Model />

          <Environment
            preset="studio"
            environmentIntensity={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HeroSec;

useGLTF.preload("/mobiusStrip.glb");