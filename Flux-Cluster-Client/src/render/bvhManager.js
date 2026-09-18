import { PathTracingSceneGenerator } from 'three-gpu-pathtracer';

/**
 * Creates the BVH and packages materials/textures for the GPU Path Tracer.
 * @param {THREE.Object3D} model - The loaded GLTF scene or model
 * @returns {Object} The compiled data needed by the path tracer
 */
export function createFrameBVH(model) {
    // The generator parses the Three.js model, calculates the BVH tree,
    // and flattens the textures and materials into WebGL-compatible arrays.
    const generator = new PathTracingSceneGenerator();
    
    const { bvh, materials, textures, geometry } = generator.generate(model);
    
    return {
        bvh,
        materials,
        textures,
        geometry
    };
}