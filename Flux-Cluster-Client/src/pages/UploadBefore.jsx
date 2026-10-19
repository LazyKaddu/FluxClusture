import React, { useState, useEffect } from 'react'
import UploadBox from '../components/UploadBox';
import { loadGLB } from '../render/modelLoader.js';
import { useNavigate } from "react-router-dom";
import { generateSecureShortId, generateFileHash } from '../utils/helper.js'
import { useSEO } from '../hooks/useSEO';

const RESOLUTION_PRESETS = [
    { label: '1080P', width: 1920, height: 1080 },
    { label: '1440P', width: 2560, height: 1440 },
    { label: '4K', width: 3840, height: 2160 },
    { label: '1:1', width: 1080, height: 1080 },
];

const SAMPLE_PRESETS = [256, 512, 1024, 2048];
const NOISE_PRESETS = [0.05, 0.1, 0.2];

const UploadBefore = () => {
    useSEO({
        title: 'Stage 3D Render Job',
        description: 'Upload GLB/glTF 3D models, configure camera and timeline animations, set sampling SPP and noise thresholds, and dispatch distributed path-tracing jobs across the FluxCluster swarm.',
        canonical: '/upload'
    });

    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [glbHash, setGlbHash] = useState(null);
    const [roomId, setRoomId] = useState(null);

    const [Animations, setAnimations] = useState([]);
    const [animDurations, setAnimDurations] = useState([]);
    const [Fps, setFps] = useState(30);
    const [RenderAnimation, setRenderAnimation] = useState(0);
    const [samples, setSamples] = useState(1024);
    const [noiseThreshold, setNoiseThreshold] = useState(0.1);

    const [width, setWidth] = useState(1920);
    const [height, setHeight] = useState(1080);
    const [masterWillRender, setMasterWillRender] = useState(true);
    const [denoiserEnabled, setDenoiserEnabled] = useState(true);

    const min = 0;
    const [max, setMax] = useState(120);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(120);

    // Compute Distributed Swarm Grid Telemetry
    const TILE_SIZE = 256;
    const tilesX = Math.max(1, Math.ceil(width / TILE_SIZE));
    const tilesY = Math.max(1, Math.ceil(height / TILE_SIZE));
    const tilesPerFrame = tilesX * tilesY;
    const totalFrames = Math.max(1, end - start + 1);
    const totalChunks = totalFrames * tilesPerFrame;

    useEffect(() => {
        async function extractMetadata() {
            if (file) {
                try {
                    const buffer = await file.arrayBuffer();
                    const hash = await generateFileHash(buffer);
                    setGlbHash(hash);
                    setRoomId(generateSecureShortId());

                    const gltf = await loadGLB(buffer);

                    if (gltf.animations && gltf.animations.length > 0) {
                        const names = gltf.animations.map((anim, i) => anim.name || `Animation ${i}`);
                        const durations = gltf.animations.map(anim => anim.duration);

                        setAnimations(names);
                        setAnimDurations(durations);
                        setRenderAnimation(0);
                    } else {
                        setAnimations([]);
                        setAnimDurations([]);
                    }
                } catch (error) {
                    console.error("Error parsing GLB metadata:", error);
                }
            }
        }

        extractMetadata();
    }, [file]);

    useEffect(() => {
        if (animDurations.length > 0 && animDurations[RenderAnimation] !== undefined) {
            const durationInSeconds = animDurations[RenderAnimation];
            const calculatedMax = Math.floor(durationInSeconds * Fps);

            setMax(calculatedMax);
            setStart(0);
            setEnd(calculatedMax);
        }
    }, [RenderAnimation, Fps, animDurations]);

    const handleApplyResolution = (w, h) => {
        setWidth(w);
        setHeight(h);
    };

    const isPresetActive = (pW, pH) => width === pW && height === pH;

    const createRoom = () => {
        if (!file) {
            alert("Please upload a GLB file first!");
            return;
        }

        const renderConfig = {
            roomId: roomId,
            file: file,
            fileHash: glbHash,
            previewUrl: previewUrl,
            animationIndex: RenderAnimation,
            startFrame: start,
            endFrame: end,
            fps: Number(Fps),
            samples: Number(samples),
            noiseThreshold: Number(noiseThreshold),
            width: Number(width),
            height: Number(height),
            masterWillRender: masterWillRender,
            denoiserEnabled: denoiserEnabled
        };

        navigate(`/editor`, { state: renderConfig });
    };

    return (
        <div className="h-full max-h-[92vh] w-full md:w-[94%] lg:w-[90%] xl:w-3/5 text-white font-mono flex flex-col justify-start select-none py-2 my-auto">
            {/* TERMINAL HEADER */}
            <header className="flex justify-between items-center mb-3 shrink-0 border-b border-white/20 pb-2.5">
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold tracking-wider inline-block m-0 p-0 font-inherit">&gt;_ FLUX_GRID // STAGING_CONSOLE</h1>
                    <span className="text-[10px] text-gray-500 hidden sm:inline">v2.4_HPC</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-gray-400 tracking-wider">SWARM_READY</span>
                    </div>
                    <span className="text-gray-600 hidden sm:inline">|</span>
                    <span className="text-gray-500 hidden sm:inline">WEBRTC_SCTP</span>
                </div>
            </header>

            {/* MAIN TWO-COLUMN WORKSTATION WITH AUTO SCROLL */}
            <div className="flex flex-col lg:flex-row justify-between gap-5 lg:gap-6 w-full flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/40 scrollbar-track-black/0 pr-1.5 pb-4">

                {/* LEFT COLUMN: 3D VIEWPORT & RIG METRICS */}
                <div className="w-full lg:w-[48%] flex flex-col gap-3">
                    {/* 3D Model Viewport */}
                    <div className="border border-white/20 flex flex-col bg-black/40 relative">
                        <div className="border-b border-white/20 px-3 py-1.5 flex items-center justify-between text-xs tracking-wider">
                            <span className="font-bold flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-white inline-block" />
                                ASSET_VIEWPORT
                            </span>
                            <span className={`text-[10px] uppercase tracking-widest ${file ? 'text-green-500' : 'text-gray-500'}`}>
                                {file ? 'MODEL_LOADED' : 'AWAITING_PAYLOAD'}
                            </span>
                        </div>
                        <div className="w-full h-[250px] md:h-[280px] relative flex items-center justify-center overflow-hidden">
                            <UploadBox
                                file={file}
                                setFile={setFile}
                                loading={loading}
                                setLoading={setLoading}
                                previewUrl={previewUrl}
                                setPreviewUrl={setPreviewUrl}
                            />
                        </div>
                    </div>

                    {/* Animation Sequences Card */}
                    <div className="border border-white/20 flex-1 min-h-[110px] max-h-[150px] flex flex-col bg-black/30">
                        <div className="border-b border-white/20 px-3 py-1.5 flex items-center justify-between text-xs tracking-wider">
                            <span className="text-gray-400">ANIMATION_TRACKS</span>
                            <span className="text-[10px] text-gray-500">[{Animations.length} DISCOVERED]</span>
                        </div>
                        <div className="overflow-y-auto flex-1 scrollbar-thin p-1 max-h-[150px]">
                            {Animations.length > 0 ? (
                                Animations.map((anim, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setRenderAnimation(index)}
                                        className={`flex items-center justify-between px-3 py-1.5 my-0.5 text-xs cursor-pointer transition-colors ${RenderAnimation === index
                                            ? 'bg-white text-black font-bold'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="text-[10px] font-mono opacity-50">#{String(index + 1).padStart(2, '0')}</span>
                                            <span className="truncate">{anim}</span>
                                        </div>
                                        <span className="text-[10px] font-mono opacity-80 shrink-0 ml-2">
                                            {animDurations[index] ? `${animDurations[index].toFixed(1)}s` : '0.0s'}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full min-h-[80px] flex flex-col items-center justify-center text-center p-4">
                                    <span className="text-xs text-gray-600 tracking-wider uppercase">
                                        No Rig Animations Detected
                                    </span>
                                    <span className="text-[10px] text-gray-700 mt-1">
                                        Static scene frame mode active
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: RENDER PIPELINE & SWARM DISPATCH */}
                <div className="w-full lg:w-[48%] flex flex-col gap-3">

                    {/* SECTION 1: RAYTRACING ENGINE QUALITY */}
                    <div className="border border-white/20 flex flex-col bg-black/30">
                        <div className="border-b border-white/20 px-3 py-1.5 flex items-center justify-between text-xs tracking-wider text-gray-400">
                            <span>01 // ENGINE SAMPLING</span>
                            <span className="text-[10px] text-gray-500">MIS_PATHTRACER</span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-white/20">
                            {/* Samples Cell */}
                            <div className="p-3 flex flex-col justify-between gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 uppercase tracking-wider">SAMPLES</span>
                                    <span className="text-[10px] text-gray-500">SPP</span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max="8192"
                                    value={samples}
                                    onChange={(e) => setSamples(e.target.value)}
                                    className="bg-transparent border-0 border-b border-white/40 focus:border-white outline-none text-white text-base text-center font-bold py-1 w-full"
                                />
                                <div className="flex gap-1 justify-center mt-1">
                                    {SAMPLE_PRESETS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setSamples(s)}
                                            className={`text-[9px] px-1.5 py-0.5 border transition-colors ${Number(samples) === s
                                                ? 'border-white bg-white text-black font-bold'
                                                : 'border-white/20 text-gray-500 hover:text-white hover:border-white/40'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Noise Threshold Cell */}
                            <div className="p-3 flex flex-col justify-between gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 uppercase tracking-wider">NOISE</span>
                                    <span className="text-[10px] text-gray-500">RMS</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.001"
                                    max="1.0"
                                    value={noiseThreshold}
                                    onChange={(e) => setNoiseThreshold(e.target.value)}
                                    className="bg-transparent border-0 border-b border-white/40 focus:border-white outline-none text-white text-base text-center font-bold py-1 w-full"
                                />
                                <div className="flex gap-1 justify-center mt-1">
                                    {NOISE_PRESETS.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setNoiseThreshold(n)}
                                            className={`text-[9px] px-1.5 py-0.5 border transition-colors ${Number(noiseThreshold) === n
                                                ? 'border-white bg-white text-black font-bold'
                                                : 'border-white/20 text-gray-500 hover:text-white hover:border-white/40'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: TIMELINE RANGE & FRAMERATE */}
                    <div className="border border-white/20 p-3 flex flex-col gap-3 bg-black/30">
                        <div className="flex items-center justify-between text-xs tracking-wider">
                            <span className="text-gray-400">02 // TIMELINE DURATION</span>
                            <span className="text-white font-bold">{totalFrames} FRAMES</span>
                        </div>

                        {/* Slider Track */}
                        <div className="relative h-6 mt-1">
                            <div className="absolute top-1/2 left-0 w-full h-0.5 -translate-y-1/2 bg-white/20" />
                            <div
                                className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-white"
                                style={{
                                    left: `${(start / max) * 100}%`,
                                    right: `${100 - (end / max) * 100}%`,
                                }}
                            />
                            <input
                                type="range"
                                min={min}
                                max={max}
                                value={start}
                                onChange={(e) => {
                                    const value = Math.min(Number(e.target.value), end);
                                    setStart(value);
                                }}
                                className="range-input"
                            />
                            <input
                                type="range"
                                min={min}
                                max={max}
                                value={end}
                                onChange={(e) => {
                                    const value = Math.max(Number(e.target.value), start);
                                    setEnd(value);
                                }}
                                className="range-input"
                            />
                        </div>

                        {/* Numeric Start/End/FPS Bar */}
                        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2 text-xs">
                            <div className="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10">
                                <span className="text-gray-500 text-[10px]">START</span>
                                <input
                                    type="number"
                                    value={start}
                                    min={min}
                                    max={end}
                                    onChange={(e) => setStart(Math.max(min, Math.min(Number(e.target.value), end)))}
                                    className="w-12 bg-transparent text-right font-bold outline-none text-white"
                                />
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10">
                                <span className="text-gray-500 text-[10px]">END</span>
                                <input
                                    type="number"
                                    value={end}
                                    min={start}
                                    max={max}
                                    onChange={(e) => setEnd(Math.max(start, Math.min(Number(e.target.value), max)))}
                                    className="w-12 bg-transparent text-right font-bold outline-none text-white"
                                />
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10">
                                <span className="text-gray-500 text-[10px]">FPS</span>
                                <input
                                    type="number"
                                    value={Fps}
                                    min={1}
                                    max={120}
                                    onChange={(e) => setFps(Number(e.target.value))}
                                    className="w-10 bg-transparent text-right font-bold outline-none text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: RESOLUTION & SWARM TILE MATRIX */}
                    <div className="border border-white/20 p-3 flex flex-col gap-3 bg-black/30">
                        <div className="flex items-center justify-between text-xs tracking-wider">
                            <span className="text-gray-400">03 // OUTPUT MATRIX</span>
                            <div className="flex gap-1">
                                {RESOLUTION_PRESETS.map((p) => (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => handleApplyResolution(p.width, p.height)}
                                        className={`text-[9px] px-1.5 py-0.5 border transition-colors ${isPresetActive(p.width, p.height)
                                            ? 'border-white bg-white text-black font-bold'
                                            : 'border-white/20 text-gray-500 hover:text-white hover:border-white/40'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Resolution Inputs */}
                        <div className="flex items-center justify-between gap-3 text-xs border border-white/10 bg-white/5 p-2">
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-gray-500 text-[10px]">WIDTH</span>
                                <input
                                    type="number"
                                    value={width}
                                    onChange={(e) => setWidth(Number(e.target.value))}
                                    className="w-full bg-transparent font-bold outline-none text-white border-b border-white/30 text-center"
                                />
                                <span className="text-gray-600 text-[10px]">PX</span>
                            </div>
                            <span className="text-gray-500">×</span>
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-gray-500 text-[10px]">HEIGHT</span>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(Number(e.target.value))}
                                    className="w-full bg-transparent font-bold outline-none text-white border-b border-white/30 text-center"
                                />
                                <span className="text-gray-600 text-[10px]">PX</span>
                            </div>
                        </div>

                        {/* Swarm Grid Matrix Readout */}
                        <div className="flex items-center justify-between p-2 bg-black border border-white/10 text-[10px] tracking-wider text-gray-400">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500" />
                                <span>SWARM GRID: {tilesX}×{tilesY} TILES</span>
                            </div>
                            <span className="text-white font-bold">{totalChunks.toLocaleString()} COMPUTE CHUNKS</span>
                        </div>
                    </div>

                    {/* SECTION 4: MASTER WORKER ROLE & DISPATCH CTA */}
                    <div className="flex flex-col gap-3">
                        <label
                            htmlFor="masterRender"
                            className="flex items-center gap-3 cursor-pointer select-none group border border-white/10 hover:border-white/30 p-2.5 transition-colors bg-black/20"
                        >
                            <input
                                type="checkbox"
                                id="masterRender"
                                className="sr-only"
                                checked={masterWillRender}
                                onChange={(e) => setMasterWillRender(e.target.checked)}
                            />
                            <div
                                className={`w-4 h-4 border flex items-center justify-center transition-colors shrink-0 ${masterWillRender
                                    ? 'border-white bg-white'
                                    : 'border-white/40 group-hover:border-white bg-transparent'
                                    }`}
                            >
                                {masterWillRender && (
                                    <svg
                                        className="w-3 h-3 text-black"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                        strokeLinecap="square"
                                        strokeLinejoin="miter"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <span
                                className={`text-[11px] uppercase tracking-wider transition-colors flex-1 ${masterWillRender ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                    }`}
                            >
                                I also want to render the chunk (Master Compute)
                            </span>
                            <span className={`text-[9px] tracking-widest font-mono uppercase ${masterWillRender ? 'text-green-500' : 'text-gray-600'
                                }`}>
                                {masterWillRender ? 'ACTIVE' : 'OFF'}
                            </span>
                        </label>

                        {/* AI Denoiser (Intel OIDN) Toggle */}
                        <label
                            htmlFor="denoiserToggle"
                            className="flex items-center gap-3 cursor-pointer select-none group border border-white/10 hover:border-white/30 p-2.5 transition-colors bg-black/20"
                        >
                            <input
                                type="checkbox"
                                id="denoiserToggle"
                                className="sr-only"
                                checked={denoiserEnabled}
                                onChange={(e) => setDenoiserEnabled(e.target.checked)}
                            />
                            <div
                                className={`w-4 h-4 border flex items-center justify-center transition-colors shrink-0 ${denoiserEnabled
                                    ? 'border-white bg-white'
                                    : 'border-white/40 group-hover:border-white bg-transparent'
                                    }`}
                            >
                                {denoiserEnabled && (
                                    <svg
                                        className="w-3 h-3 text-black"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                        strokeLinecap="square"
                                        strokeLinejoin="miter"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex flex-col flex-1">
                                <span
                                    className={`text-[11px] uppercase tracking-wider transition-colors ${denoiserEnabled ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                        }`}
                                >
                                    AI Denoiser (Intel OIDN)
                                </span>
                                <span className="text-[9px] text-gray-500">
                                    Denoise rendered animation frames with Open Image Denoise
                                </span>
                            </div>
                            <span className={`text-[9px] tracking-widest font-mono uppercase ${denoiserEnabled ? 'text-green-500' : 'text-gray-600'
                                }`}>
                                {denoiserEnabled ? 'OIDN_ON' : 'OFF'}
                            </span>
                        </label>

                        {/* START RENDERING CTA BUTTON */}
                        <button
                            type="button"
                            onClick={createRoom}
                            disabled={!file}
                            className={`border w-full py-3.5 uppercase tracking-widest text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-3 ${file
                                ? 'border-white bg-black text-white hover:bg-white hover:text-black cursor-pointer shadow-lg'
                                : 'border-white/20 bg-black/50 text-gray-600 cursor-not-allowed opacity-60'
                                }`}
                        >
                            <span>&gt;_ START CLUSTER RENDERING</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default UploadBefore;
