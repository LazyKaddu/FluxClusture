import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { loadGLB } from '../render/modelLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import '../render/patchThreeGpuPathTracer.js';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { generateFileHash } from '../utils/helper.js';
import { ensurePathTracerEnvironment } from '../render/upgradeLights.js';
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js';
import { useSEO } from '../hooks/useSEO';

const LIGHT_TYPE_LABELS = {
    area: 'Area',
    spot: 'Spot',
    directional: 'Sun',
    ambient: 'World',
    point: 'Point'
};

const Editor = () => {
    useSEO({
        title: '3D Scene & Lighting Studio',
        description: 'Interactive 3D viewport and lighting editor for FluxCluster. Position area lights, spotlights, and directional emitters with real-time raster and path-tracing previews.',
        canonical: '/editor'
    });

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

        if (mode === 'pathtracer') {
            if (rendererRef.current && sceneRef.current) {
                rendererRef.current.setClearColor(sceneRef.current.background || 0x050505, 1);
                rendererRef.current.clear(true, true, true);
            }
            if (pathTracerRef.current) {
                pathTracerRef.current.reset();
                pathTracerRef.current.updateCamera();
            }
        }
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
        scene.background = new THREE.Color(0x0a0a0c);
        sceneRef.current = scene;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.update();
        controlsRef.current = controls;

        const pathTracer = new WebGLPathTracer(renderer);
        pathTracer.setBVHWorker(new GenerateMeshBVHWorker());
        pathTracer.rasterizeScene = false;
        pathTracer.renderDelay = 0;
        pathTracer.fadeDuration = 0;
        pathTracer.minSamples = 1;
        pathTracer.dynamicLowRes = false;
        pathTracerRef.current = pathTracer;

        controls.addEventListener('change', () => {
            if (pathTracerRef.current) pathTracerRef.current.updateCamera();
        });

        const loadModel = async () => {
            try {
                const buffer = await renderConfig.file.arrayBuffer();
                const gltf = await loadGLB(buffer);
                scene.add(gltf.scene);
                gltfAnimationsRef.current = gltf.animations || [];

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

                const extractedLights = [];
                gltf.scene.traverse((child) => {
                    if (child.isLight) {
                        extractedLights.push(child);
                        if (!child.uuid) child.uuid = THREE.MathUtils.generateUUID();
                    }
                });

                if (extractedLights.length === 0) {
                    const ambient = new THREE.PointLight(0xffffff, 0.5);
                    ambient.name = 'World_GI';
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

    useEffect(() => {
        if (previewMode === 'pathtracer' && pathTracerRef.current) {
            if (rendererRef.current && sceneRef.current) {
                rendererRef.current.setClearColor(sceneRef.current.background || 0x050505, 1);
                rendererRef.current.clear(true, true, true);
            }
            pathTracerRef.current.reset();
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

        setLights([...lights]);

        if (previewMode === 'pathtracer' && pathTracerRef.current) {
            if (rendererRef.current && sceneRef.current) {
                rendererRef.current.setClearColor(sceneRef.current.background || 0x050505, 1);
                rendererRef.current.clear(true, true, true);
            }
            pathTracerRef.current.reset();
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
        return 'point';
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
        <div className="font-sans antialiased text-[#ededed] bg-[#141415] w-full max-w-5xl max-h-[min(92vh,820px)] flex flex-col overflow-hidden border border-white/[0.08] rounded-xl shadow-2xl my-auto">

            {/* Header */}
            <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-[#19191b]/50 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-[#AF3240] px-2 py-0.5 rounded bg-[#AF3240]/10 border border-[#AF3240]/20">
                        FluxCluster
                    </span>
                    <h1 className="text-xs font-mono font-medium text-[#ededed] m-0 p-0">
                        Scene Lighting Studio
                    </h1>
                </div>

                {/* Preview Mode Switcher */}
                <div className="flex items-center gap-1 bg-[#19191b] p-1 rounded-lg border border-white/[0.06]">
                    <button
                        className={`text-xs font-mono px-3 py-1 rounded transition-colors cursor-pointer ${
                            previewMode === 'normal'
                                ? 'bg-[#232325] text-[#ededed] font-medium shadow-sm'
                                : 'text-[#85858b] hover:text-[#ededed]'
                        }`}
                        onClick={() => setPreviewMode('normal')}
                    >
                        Rasterizer
                    </button>
                    <button
                        className={`text-xs font-mono px-3 py-1 rounded transition-colors cursor-pointer ${
                            previewMode === 'pathtracer'
                                ? 'bg-[#AF3240] text-white font-medium shadow-sm'
                                : 'text-[#85858b] hover:text-[#ededed]'
                        }`}
                        onClick={() => setPreviewMode('pathtracer')}
                    >
                        Path Tracer
                    </button>
                </div>
            </header>

            {/* Workstation Body */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

                {/* Left: 3D Viewport */}
                <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-white/[0.08] relative overflow-hidden bg-[#0a0a0c] min-h-[260px] md:min-h-0">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] shrink-0 bg-[#141415] text-xs font-mono text-[#85858b]">
                        <span className="flex items-center gap-2 text-[#ededed]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                            {previewMode === 'normal' ? 'Interactive raster preview' : 'Path tracer progressive accumulation'}
                        </span>
                        <span>{lights.length} emitters in scene</span>
                    </div>

                    <div className="flex-1 relative overflow-hidden" ref={containerRef}>
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0c]/85 z-10 gap-3">
                                <div className="w-7 h-7 border-2 border-white/20 border-t-[#AF3240] rounded-full animate-spin" />
                                <span className="text-xs font-mono text-[#a1a1a6]">
                                    Compiling BVH scene structure...
                                </span>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="w-full h-full block" />
                    </div>

                    <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] shrink-0 bg-[#141415] text-xs font-mono text-[#85858b]">
                        <span>Orbit: Left click · Pan: Right click</span>
                        <span className="text-[#a1a1a6]">Drag to reposition view</span>
                    </div>
                </div>

                {/* Right: Inspector */}
                <div className="w-full md:w-[280px] lg:w-[300px] shrink-0 flex flex-col overflow-y-auto md:overflow-hidden bg-[#141415]">

                    {/* Scene Lights List */}
                    <div className="border-b border-white/[0.06] shrink-0">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#19191b]/30">
                            <span className="text-xs font-mono text-[#85858b] uppercase tracking-wider text-[11px]">
                                Scene Lights
                            </span>
                            <span className="text-xs font-mono text-[#85858b]">{lights.length}</span>
                        </div>
                        <div className="overflow-y-auto max-h-40 p-2 space-y-1">
                            {lights.map(light => {
                                const lType = getLightTypeFromTitle(light.name);
                                const isSelected = selectedLightId === light.uuid;
                                return (
                                    <div
                                        key={light.uuid}
                                        className={`flex items-center justify-between px-3 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-[#232325] text-[#ededed] border-l-2 border-[#AF3240] pl-2.5 font-medium'
                                                : 'text-[#85858b] hover:text-[#ededed] hover:bg-[#19191b]'
                                        }`}
                                        onClick={() => setSelectedLightId(light.uuid)}
                                    >
                                        <span className="truncate flex-1">{light.name || light.type}</span>
                                        <span className="text-[10px] text-[#85858b] px-1.5 py-0.5 rounded bg-[#141415] border border-white/[0.06]">
                                            {LIGHT_TYPE_LABELS[lType] || lType}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Properties */}
                    <div className="flex-1 flex flex-col overflow-hidden border-b border-white/[0.06]">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#19191b]/30">
                            <span className="text-xs font-mono text-[#85858b] uppercase tracking-wider text-[11px]">
                                {selectedLight ? (selectedLight.name || 'Selected Light') : 'Properties'}
                            </span>
                        </div>

                        {selectedLight ? (
                            <div className="overflow-y-auto flex-1 p-3 space-y-3">
                                {/* Type selector */}
                                <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="text-[#85858b]">Type</span>
                                    <select
                                        className="text-xs font-mono bg-[#19191b] border border-white/[0.08] rounded px-2 py-1 text-[#ededed] outline-none cursor-pointer"
                                        value={getLightTypeFromTitle(selectedLight.name)}
                                        onChange={(e) => handleLightPropertyChange('type', e.target.value)}
                                    >
                                        <option value="point">Point</option>
                                        <option value="area">Area</option>
                                        <option value="spot">Spot</option>
                                        <option value="directional">Sun</option>
                                        <option value="ambient">World GI</option>
                                    </select>
                                </div>

                                {/* Intensity */}
                                <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="text-[#85858b]">Intensity</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-20 text-xs font-mono bg-[#19191b] border border-white/[0.08] rounded px-2 py-1 text-[#ededed] text-right outline-none focus:border-[#AF3240]"
                                        value={selectedLight.intensity}
                                        onChange={(e) => handleLightPropertyChange('intensity', e.target.value)}
                                    />
                                </div>

                                {/* Color */}
                                <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="text-[#85858b]">Color</span>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-7 h-5 border border-white/[0.12] rounded overflow-hidden cursor-pointer">
                                            <div
                                                className="w-full h-full"
                                                style={{ backgroundColor: '#' + selectedLight.color.getHexString() }}
                                            />
                                            <input
                                                type="color"
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                value={'#' + selectedLight.color.getHexString()}
                                                onChange={(e) => handleLightPropertyChange('color', e.target.value)}
                                            />
                                        </div>
                                        <span className="text-[11px] text-[#85858b] font-mono">
                                            #{selectedLight.color.getHexString().toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* Spot Angle */}
                                {getLightTypeFromTitle(selectedLight.name) === 'spot' && selectedLight.angle !== undefined && (
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-[#85858b]">Angle</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-20 text-xs font-mono bg-[#19191b] border border-white/[0.08] rounded px-2 py-1 text-[#ededed] text-right outline-none focus:border-[#AF3240]"
                                            value={selectedLight.angle?.toFixed(3) ?? ''}
                                            onChange={(e) => handleLightPropertyChange('angle', e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-xs font-mono text-[#85858b]">
                                Select a light above to configure properties
                            </div>
                        )}
                    </div>

                    {/* Telemetry Strip */}
                    <div className="p-3 border-b border-white/[0.06] text-xs font-mono space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[#85858b]">Asset</span>
                            <span className="text-[#ededed] max-w-[150px] truncate text-right">{fileName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#85858b]">Size</span>
                            <span className="text-[#ededed]">{fileSize}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#85858b]">Engine</span>
                            <span className="text-[#ededed]">{previewMode === 'pathtracer' ? 'Path tracer' : 'Rasterizer'}</span>
                        </div>
                    </div>

                    {/* Export Footer */}
                    <div className="p-4 bg-[#141415] shrink-0">
                        <button
                            className="w-full py-2.5 px-4 text-xs font-mono font-medium rounded-lg bg-[#AF3240] hover:bg-[#972935] text-white transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={handleContinue}
                            disabled={isExporting || isLoading}
                        >
                            <span>{isExporting ? 'Exporting scene...' : 'Continue to Cluster Render'}</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Editor;
