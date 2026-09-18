import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Parses a raw ArrayBuffer containing GLB/GLTF data into a Three.js scene.
 * Conditionally applies Draco decompression only if the file requires it.
 * @param {ArrayBuffer} fileData - The binary GLB file data.
 * @returns {Promise<Object>} A promise that resolves to the parsed GLTF scene.
 */
export function loadGLB(fileData) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        let dracoLoader = null;
        
        // 1. Decode the first 50KB of the binary file to text.
        // The JSON header is always at the beginning; 50KB is more than enough to capture it safely.
        const textDecoder = new TextDecoder('utf-8');
        const headerChunk = new Uint8Array(fileData, 0, Math.min(fileData.byteLength, 50000));
        const headerString = textDecoder.decode(headerChunk);
        
        // 2. Check if the file explicitly requests Draco compression
        const needsDraco = headerString.includes('KHR_draco_mesh_compression');

        // 3. Setup the decoder ONLY if required
        if (needsDraco) {
            console.log("Draco compression detected. Initializing decoder...");
            dracoLoader = new DRACOLoader();
            // Point to Google's public CDN for the required WASM decoding files
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
            loader.setDRACOLoader(dracoLoader);
        }

        // 4. Parse the file
        loader.parse(
            fileData,
            '', 
            (gltf) => {
                // Free up memory by destroying the decoder once parsing finishes
                if (dracoLoader) {
                    dracoLoader.dispose();
                }
                resolve(gltf);
            },
            (error) => {
                console.error("GLTF Parsing Error:", error);
                reject(error);
            }
        );
    });
}