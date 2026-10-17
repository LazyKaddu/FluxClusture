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

const LIGHT_ICONS = { area: '▣', spot: '◎', directional: '☀', ambient: '◉', point: '●' };

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
        scene.background = new THREE.Color(0x050505);
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

                // If no lights found, add a default so user can see something
                if (extractedLights.length === 0) {
                    const ambient = new THREE.PointLight(0xffffff, 0.5);
                    ambient.name = 'World_GI'; // Default to World_GI naming so it becomes Ambient on the cluster
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
                console.error('Failed to load GLB', error);
            }
        };
        loadModel();

        // ResizeObserver for reliable dimension handling
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width === 0 || height === 0) { isSized = false; continue; }
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

        // If path tracer is running, update the scene to reflect light changes
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
                    const newFile = new File([gltfArrayBuffer], renderConfig.file.name, { type: 'model/gltf-binary' });
                    const newHash = await generateFileHash(gltfArrayBuffer);
                    const updatedConfig = { ...renderConfig, file: newFile, fileHash: newHash };
                    setIsExporting(false);
                    navigate('/render', { state: updatedConfig });
                } catch (err) {
                    console.error('Export error:', err);
                    setIsExporting(false);
                }
            },
            (error) => {
                console.error('GLTFExporter failed:', error);
                setIsExporting(false);
            },
            { binary: true, animations: gltfAnimationsRef.current }
        );
    };

    const selectedLight = lights.find(l => l.uuid === selectedLightId);
    const fileName = renderConfig?.file?.name ?? '—';
    const fileSize = renderConfig?.file
        ? (renderConfig.file.size / 1024 / 1024).toFixed(2) + ' MB'
        : '—';

    return (
        <div className="font-mono bg-black text-white h-full max-h-[86vh] w-full md:w-[94%] lg:w-[88%] xl:w-3/5 max-w-5xl flex flex-col overflow-hidden border border-white shadow-2xl my-auto">

            {/* ── Header ── */}
            <header className="flex items-center justify-between px-4 py-2.5 border-b border-white shrink-0">
                <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-bold tracking-[0.15em] border border-white px-2 py-0.5 uppercase">
                        FluxCluster
                    </span>
                    <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-white">
                        &gt;_ Light Editor
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        className={`text-[9px] font-bold tracking-widest uppercase border px-2.5 py-1 cursor-pointer transition-colors ${
                            previewMode === 'normal'
                                ? 'bg-white text-black border-white'
                                : 'border-neutral-600 bg-transparent text-neutral-400 hover:border-white hover:text-white'
                        }`}
                        onClick={() => setPreviewMode('normal')}
                    >
                        Normal
                    </button>
                    <button
                        className={`text-[9px] font-bold tracking-widest uppercase border px-2.5 py-1 cursor-pointer transition-colors ${
                            previewMode === 'pathtracer'
                                ? 'bg-white text-black border-white'
                                : 'border-neutral-600 bg-transparent text-neutral-400 hover:border-white hover:text-white'
                        }`}
                        onClick={() => setPreviewMode('pathtracer')}
                    >
                        PathTracer
                    </button>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden min-h-0">

                {/* LEFT: 3D Viewport */}
                <div className="flex-1 min-w-0 flex flex-col border-r border-white relative overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-800 shrink-0 bg-black">
                        <span className={`text-[9px] font-bold tracking-[0.12em] uppercase ${previewMode === 'normal' ? 'text-white' : 'text-neutral-500'}`}>
                            {previewMode === 'normal' ? '●' : '○'} RASTERIZER
                        </span>
                        <span className="text-neutral-700 text-[9px]">/</span>
                        <span className={`text-[9px] font-bold tracking-[0.12em] uppercase ${previewMode === 'pathtracer' ? 'text-white' : 'text-neutral-500'}`}>
                            {previewMode === 'pathtracer' ? '●' : '○'} PATH TRACER
                        </span>
                    </div>

                    <div className="flex-1 relative overflow-hidden" ref={containerRef}>
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-10 gap-4">
                                <div className="w-8 h-8 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
                                <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
                                    Loading Scene…
                                </span>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="w-full h-full block" />
                    </div>

                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-neutral-900 shrink-0 bg-black">
                        <span className="text-[9px] tracking-wider text-neutral-500 uppercase flex items-center">
                            <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${!isLoading ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]' : 'bg-neutral-700'}`} />
                            {isLoading ? 'COMPILING BVH' : 'SCENE READY'}
                        </span>
                        <span className="text-[9px] tracking-wider text-neutral-500 uppercase flex items-center">
                            {lights.length} LIGHT{lights.length !== 1 ? 'S' : ''} DETECTED
                        </span>
                        <span className="text-[9px] tracking-wider text-white uppercase flex items-center">
                            ORBIT — DRAG TO ROTATE
                        </span>
                    </div>
                </div>

                {/* RIGHT: Inspector */}
                <div className="w-[280px] shrink-0 flex flex-col overflow-hidden bg-black">

                    {/* Scene lights list */}
                    <div className="border-b border-neutral-900 shrink-0">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900 bg-black">
                            <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-neutral-500">Scene Lights</span>
                            <span className="text-[9px] text-neutral-600">{lights.length} OBJ</span>
                        </div>
                        <div className="overflow-y-auto max-h-40 scrollbar-thin">
                            {lights.map(light => {
                                const lType = getLightTypeFromTitle(light.name);
                                const isSelected = selectedLightId === light.uuid;
                                return (
                                    <div
                                        key={light.uuid}
                                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                                            isSelected ? 'bg-white text-black' : 'hover:bg-neutral-900 text-white'
                                        }`}
                                        onClick={() => setSelectedLightId(light.uuid)}
                                    >
                                        <span className="text-[10px] w-4 text-center shrink-0">{LIGHT_ICONS[lType] ?? '●'}</span>
                                        <span className="text-[10px] tracking-wider flex-1 truncate">{light.name || light.type}</span>
                                        <span className="text-[8px] tracking-wider uppercase px-1 py-px border border-current opacity-60">
                                            {lType}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Properties */}
                    <div className="flex-1 flex flex-col overflow-hidden border-b border-neutral-900">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900 bg-black">
                            <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-neutral-500">
                                {selectedLight ? `// ${selectedLight.name || 'Light'}` : 'Properties'}
                            </span>
                        </div>

                        {selectedLight ? (
                            <div className="overflow-y-auto flex-1 scrollbar-thin">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900/60 gap-2">
                                    <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-neutral-500 shrink-0">Type</span>
                                    <div className="flex items-center gap-1.5">
                                        <select
                                            className="font-mono text-[10px] bg-transparent border-0 border-b border-neutral-700 hover:border-white focus:border-white text-white outline-none px-1 py-0.5 text-right cursor-pointer transition-colors [&>option]:bg-neutral-950 [&>option]:text-white"
                                            value={getLightTypeFromTitle(selectedLight.name)}
                                            onChange={(e) => handleLightPropertyChange('type', e.target.value)}
                                        >
                                            <option value="point">Point</option>
                                            <option value="area">Area</option>
                                            <option value="spot">Spot</option>
                                            <option value="directional">Sun (Directional)</option>
                                            <option value="ambient">World GI</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900/60 gap-2">
                                    <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-neutral-500 shrink-0">Intensity</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="font-mono text-[10px] bg-transparent border-0 border-b border-neutral-700 hover:border-white focus:border-white text-white outline-none w-16 text-right px-1 py-0.5 transition-colors"
                                            value={selectedLight.intensity}
                                            onChange={(e) => handleLightPropertyChange('intensity', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900/60 gap-2">
                                    <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-neutral-500 shrink-0">Color</span>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-7 h-5 border border-neutral-700 hover:border-white overflow-hidden cursor-pointer transition-colors shrink-0">
                                            <div
                                                className="w-full h-full pointer-events-none"
                                                style={{ backgroundColor: '#' + selectedLight.color.getHexString() }}
                                            />
                                            <input
                                                type="color"
                                                className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] opacity-0 cursor-pointer"
                                                value={'#' + selectedLight.color.getHexString()}
                                                onChange={(e) => handleLightPropertyChange('color', e.target.value)}
                                            />
                                        </div>
                                        <span className="text-[9px] text-neutral-500 tracking-wider font-mono">
                                            #{selectedLight.color.getHexString().toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {getLightTypeFromTitle(selectedLight.name) === 'spot' && selectedLight.angle !== undefined && (
                                    <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900/60 gap-2">
                                        <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-neutral-500 shrink-0">Angle</span>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="font-mono text-[10px] bg-transparent border-0 border-b border-neutral-700 hover:border-white focus:border-white text-white outline-none w-16 text-right px-1 py-0.5 transition-colors"
                                                value={selectedLight.angle?.toFixed(3) ?? ''}
                                                onChange={(e) => handleLightPropertyChange('angle', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-5 text-center">
                                <p className="text-[9px] tracking-[0.12em] uppercase text-neutral-600 leading-relaxed">
                                    Select a light<br />to inspect properties
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Telemetry strip */}
                    <div className="border-t border-neutral-900 px-3 py-2 flex flex-col gap-1 shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] tracking-widest uppercase text-neutral-600">FILE</span>
                            <span className="text-[8px] tracking-wider text-neutral-400 max-w-[160px] truncate text-right">{fileName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] tracking-widest uppercase text-neutral-600">SIZE</span>
                            <span className="text-[8px] tracking-wider text-neutral-400">{fileSize}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] tracking-widest uppercase text-neutral-600">RENDERER</span>
                            <span className="text-[8px] tracking-wider text-neutral-400">{previewMode === 'pathtracer' ? 'PATHTRACER' : 'RASTERIZER'}</span>
                        </div>
                    </div>

                    {/* Export footer */}
                    <div className="border-t border-white p-3 shrink-0 bg-black">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[9px] tracking-widest uppercase text-neutral-500">Target</span>
                            <span className="text-[9px] tracking-wider text-neutral-400 truncate max-w-[140px] text-right">/render → cluster</span>
                        </div>
                        <button
                            className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase w-full p-2.5 bg-white text-black border-none cursor-pointer hover:bg-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            onClick={handleContinue}
                            disabled={isExporting || isLoading}
                        >
                            <span>▶</span>
                            {isExporting ? 'Exporting…' : 'Continue to Render'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Editor;
