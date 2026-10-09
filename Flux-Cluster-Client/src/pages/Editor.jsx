import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { loadGLB } from '../render/modelLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { generateFileHash } from '../utils/helper.js';
import { ensurePathTracerEnvironment } from '../render/upgradeLights.js';
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js';

const Editor = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const renderConfig = location.state;

    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const pathTracerRef = useRef(null);
    const reqFrameRef = useRef(null);
    const gltfAnimationsRef = useRef([]);

    const [lights, setLights] = useState([]);
    const [selectedLightId, setSelectedLightId] = useState(null);
    const [previewMode, setPreviewModeState] = useState('normal');
    const previewModeRef = useRef('normal');
    const setPreviewMode = (mode) => {
        previewModeRef.current = mode;
        setPreviewModeState(mode);
    };
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (!renderConfig || !renderConfig.file) {
            navigate('/upload');
            return;
        }

        let isSized = false;
        const initialW = containerRef.current.clientWidth || 1;
        const initialH = containerRef.current.clientHeight || 1;

        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: false });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        rendererRef.current = renderer;

        const camera = new THREE.PerspectiveCamera(60, initialW / initialH, 0.1, 1000);
        camera.position.set(0, 5, 10);
        cameraRef.current = camera;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x222222);
        sceneRef.current = scene;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.update();
        controlsRef.current = controls;

        const pathTracer = new WebGLPathTracer(renderer);
        pathTracer.setBVHWorker(new GenerateMeshBVHWorker());
        pathTracer.rasterizeScene = false;
        pathTracer.renderDelay = 0;
        pathTracerRef.current = pathTracer;

        controls.addEventListener('change', () => {
            if (pathTracerRef.current) pathTracerRef.current.updateCamera();
        });

        // Load GLB
        const loadModel = async () => {
            try {
                const buffer = await renderConfig.file.arrayBuffer();
                const gltf = await loadGLB(buffer);
                scene.add(gltf.scene);
                gltfAnimationsRef.current = gltf.animations || [];
                
                // Sync camera from GLB if available
                const glbCamera = scene.getObjectByProperty('isPerspectiveCamera', true);
                if (glbCamera) {
                    scene.updateMatrixWorld(true);
                    glbCamera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
                    camera.fov = glbCamera.fov;
                    camera.near = glbCamera.near;
                    camera.far = glbCamera.far;
                    camera.updateProjectionMatrix();

                    // Update OrbitControls target to look along the camera's forward axis
                    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                    const targetPos = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(10));
                    controls.target.copy(targetPos);
                    controls.update();
                } else {
                    // Fallback to bounding box center if no camera found
                    const box = new THREE.Box3().setFromObject(scene);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());

                    const maxDim = Math.max(size.x, size.y, size.z);
                    if (maxDim > 0) {
                        const fov = camera.fov * (Math.PI / 180);
                        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                        cameraZ *= 1.5; 
                        camera.position.set(center.x, center.y, center.z + cameraZ);
                        controls.target.copy(center);
                        controls.update();
                    }
                }
                
                // Extract lights
                const extractedLights = [];
                gltf.scene.traverse((child) => {
                    if (child.isLight) {
                        extractedLights.push(child);
                        // Generate a unique ID for React keys if uuid is missing
                        if (!child.uuid) child.uuid = THREE.MathUtils.generateUUID();
                    }
                });

                // If no lights found, maybe add a default so user can see something?
                if (extractedLights.length === 0) {
                    const ambient = new THREE.PointLight(0xffffff, 0.5);
                    ambient.name = "World_GI"; // Default to World_GI naming so it becomes Ambient on the cluster
                    scene.add(ambient);
                    extractedLights.push(ambient);
                }

                setLights(extractedLights);
                if (typeof pathTracer.setSceneAsync === 'function') {
                    await pathTracer.setSceneAsync(scene, camera);
                } else {
                    pathTracer.setScene(scene, camera);
                }
                ensurePathTracerEnvironment(pathTracer);
                if (typeof pathTracer.compileAsync === 'function') {
                    await pathTracer.compileAsync();
                }
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to load GLB", error);
            }
        };
        loadModel();

        // ResizeObserver for reliable dimension handling
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width === 0 || height === 0) {
                    isSized = false;
                    continue;
                }
                isSized = true;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height, false);
                if (pathTracerRef.current) pathTracerRef.current.updateCamera();
            }
        });
        resizeObserver.observe(containerRef.current);

        // Render loop
        const animate = () => {
            reqFrameRef.current = requestAnimationFrame(animate);
            if (!isSized) return;
            
            if (previewModeRef.current === 'pathtracer') {
                pathTracer.renderSample();
            } else {
                renderer.render(scene, camera);
            }
        };
        animate();

        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(reqFrameRef.current);
            controls.dispose();
            renderer.dispose();
            pathTracer.dispose();
        };
    }, []);

    // Sync previewMode changes to reset pathtracer if needed
    useEffect(() => {
        if (previewMode === 'pathtracer' && pathTracerRef.current) {
            pathTracerRef.current.updateCamera();
        }
    }, [previewMode]);

    const handleLightPropertyChange = (property, value) => {
        if (!selectedLightId) return;
        const light = lights.find(l => l.uuid === selectedLightId);
        if (!light) return;

        if (property === 'color') {
            light.color.set(value);
        } else if (property === 'type') {
            // We just rename the light so that the `upgradeLights.js` logic on the cluster node will handle it correctly!
            // 'world_gi', 'area', 'spot', 'sun'
            const nameMap = {
                'area': 'AreaLight',
                'spot': 'SpotLight',
                'directional': 'SunLight',
                'ambient': 'World_GI'
            };
            light.name = nameMap[value] || light.name;
        } else {
            light[property] = Number(value);
        }

        // Force a state update to re-render UI
        setLights([...lights]);

        // If path tracer is running, we need to update the scene to reflect light changes
        if (previewMode === 'pathtracer' && pathTracerRef.current) {
            pathTracerRef.current.updateScene();
            pathTracerRef.current.updateCamera();
            if (typeof pathTracerRef.current.compileAsync === 'function') {
                pathTracerRef.current.compileAsync();
            }
        }
    };

    const getLightTypeFromTitle = (name) => {
        const lower = (name || '').toLowerCase();
        if (lower.includes('area')) return 'area';
        if (lower.includes('spot')) return 'spot';
        if (lower.includes('sun')) return 'directional';
        if (lower.includes('world_gi')) return 'ambient';
        return 'point'; // default fallback
    };

    const handleContinue = () => {
        setIsExporting(true);
        const exporter = new GLTFExporter();
        
        exporter.parse(
            sceneRef.current,
            async (gltfArrayBuffer) => {
                try {
                    // The GLTFExporter wraps the scene inside a root object, we want to export only the first child if it's the imported scene, 
                    // but actually exporting the whole scene works since the cluster node loads whatever we export.
                    const newFile = new File([gltfArrayBuffer], renderConfig.file.name, { type: 'model/gltf-binary' });
                    const newHash = await generateFileHash(gltfArrayBuffer);
                    
                    const updatedConfig = {
                        ...renderConfig,
                        file: newFile,
                        fileHash: newHash
                    };

                    setIsExporting(false);
                    navigate('/render', { state: updatedConfig });
                } catch (err) {
                    console.error("Export error:", err);
                    setIsExporting(false);
                }
            },
            (error) => {
                console.error("GLTFExporter failed:", error);
                setIsExporting(false);
            },
            { binary: true, animations: gltfAnimationsRef.current }
        );
    };

    const selectedLight = lights.find(l => l.uuid === selectedLightId);

    return (
        <div className="h-full text-white font-mono w-full flex flex-col">
            <header className="flex justify-between items-center mb-6">
                <div className="text-sm font-bold">&gt;_ 3D Viewport Editor</div>
                <div className="flex items-center gap-3">
                    <button 
                        className={`px-3 py-1 border text-xs ${previewMode === 'normal' ? 'bg-white text-black' : ''}`}
                        onClick={() => setPreviewMode('normal')}
                    >
                        Normal Renderer
                    </button>
                    <button 
                        className={`px-3 py-1 border text-xs ${previewMode === 'pathtracer' ? 'bg-white text-black' : ''}`}
                        onClick={() => setPreviewMode('pathtracer')}
                    >
                        PathTracer
                    </button>
                </div>
            </header>

            <div className='flex gap-6 w-full h-[85%]'>
                <div className='flex-1 border relative' ref={containerRef}>
                    {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">Loading Model...</div>}
                    <canvas ref={canvasRef} className="w-full h-full block" />
                </div>
                
                <div className='w-1/4 border flex flex-col'>
                    <div className='border-b p-3 font-bold'>Scene Lights</div>
                    <div className='flex-1 overflow-y-auto p-2'>
                        {lights.map(light => (
                            <div 
                                key={light.uuid}
                                className={`p-2 cursor-pointer border mb-2 text-sm ${selectedLightId === light.uuid ? 'bg-white text-black' : 'border-gray-700 hover:border-gray-500'}`}
                                onClick={() => setSelectedLightId(light.uuid)}
                            >
                                {light.name || light.type}
                            </div>
                        ))}
                    </div>
                    
                    {selectedLight && (
                        <div className='border-t p-4 flex flex-col gap-3 text-sm'>
                            <div className='font-bold mb-2'>Properties</div>
                            
                            <div className='flex justify-between items-center'>
                                <span>Type</span>
                                <select 
                                    className="bg-transparent border-b border-white outline-none w-1/2 text-right"
                                    value={getLightTypeFromTitle(selectedLight.name)}
                                    onChange={(e) => handleLightPropertyChange('type', e.target.value)}
                                >
                                    <option value="point" className="text-black">Point</option>
                                    <option value="area" className="text-black">Area</option>
                                    <option value="spot" className="text-black">Spot</option>
                                    <option value="directional" className="text-black">Directional (Sun)</option>
                                    <option value="ambient" className="text-black">World GI</option>
                                </select>
                            </div>

                            <div className='flex justify-between items-center'>
                                <span>Intensity</span>
                                <input 
                                    type="number" step="0.1"
                                    className="bg-transparent border-b border-white outline-none w-1/3 text-right"
                                    value={selectedLight.intensity}
                                    onChange={(e) => handleLightPropertyChange('intensity', e.target.value)}
                                />
                            </div>

                            <div className='flex justify-between items-center'>
                                <span>Color</span>
                                <input 
                                    type="color"
                                    className="bg-transparent border-none outline-none w-8 h-8"
                                    value={"#" + selectedLight.color.getHexString()}
                                    onChange={(e) => handleLightPropertyChange('color', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className='p-3 border-t'>
                        <button 
                            className='w-full py-2 bg-white text-black font-bold disabled:opacity-50'
                            onClick={handleContinue}
                            disabled={isExporting || isLoading}
                        >
                            {isExporting ? "Exporting..." : "Continue to Render"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;
