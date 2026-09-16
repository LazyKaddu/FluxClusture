import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  Html,
  OrbitControls,
} from "@react-three/drei";

const Model = ({url}) => {
  const { scene } = useGLTF(url);

  return (
    <primitive
      object={scene}
      scale={2.8}
      position={[0, 0, 0]}
      rotation={[0,Math.PI,0]}
    />
  );
};

const ModelCanvas = ({url}) => {
  useGLTF.preload(url);
  return (
    <div className="w-full h-full bg-[#000000]">
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
          <Model url={url}/>

          <Environment
            preset="studio"
            environmentIntensity={0.5}
          />
          <OrbitControls/>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ModelCanvas;

