import React, { useState, useEffect } from 'react';
import UploadBox from '../components/UploadBox';
import { loadGLB } from '../render/modelLoader.js';
import { useNavigate } from "react-router-dom";
import { generateSecureShortId, generateFileHash } from '../utils/helper.js';
import { useSEO } from '../hooks/useSEO';

const RESOLUTION_PRESETS = [
    { label: '1080p', width: 1920, height: 1080 },
    { label: '1440p', width: 2560, height: 1440 },
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
            alert("Please upload a .glb 3D asset first.");
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
        <div className="font-sans antialiased text-[#ededed] bg-[#141415] w-full max-w-4xl max-h-[min(94vh,820px)] flex flex-col justify-start select-none border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden my-auto">
            {/* Pinned Header */}
            <header className="flex justify-between items-center px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-[#19191b]/50 shrink-0">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-medium text-[#AF3240] px-2 py-0.5 rounded bg-[#AF3240]/10 border border-[#AF3240]/20">
                        FluxCluster
                    </span>
                    <h1 className="text-xs font-mono font-medium text-[#ededed] m-0 p-0">
                        3D Staging & Dispatch Console
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block text-xs font-mono text-[#85858b]">
                        WebRTC SCTP
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                        <span className="text-xs font-mono text-[#85858b]">
                            Swarm ready
                        </span>
                    </div>
                </div>
            </header>

            {/* Scrollable Workstation Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* Left Column: 3D Viewport & Tracks */}
                    <div className="lg:col-span-5 flex flex-col gap-3">

                        {/* Viewport Box */}
                        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#19191b] flex flex-col">
                            <div className="border-b border-white/[0.06] px-3.5 py-2 flex items-center justify-between text-xs font-mono">
                                <span className="font-medium text-[#ededed]">Asset Viewport</span>
                                <span className={`text-[11px] ${file ? 'text-[#4cc38a]' : 'text-[#85858b]'}`}>
                                    {file ? 'Model loaded' : 'Awaiting file'}
                                </span>
                            </div>
                            <div className="w-full h-[180px] sm:h-[200px] relative flex items-center justify-center p-2.5">
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

                        {/* Animation Sequences */}
                        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#19191b] flex-1 min-h-[90px] max-h-[140px] flex flex-col">
                            <div className="border-b border-white/[0.06] px-3.5 py-1.5 flex items-center justify-between text-xs font-mono">
                                <span className="text-[#85858b]">Animation tracks</span>
                                <span className="text-[11px] text-[#85858b]">{Animations.length} tracks</span>
                            </div>
                            <div className="overflow-y-auto flex-1 p-1.5 space-y-1">
                                {Animations.length > 0 ? (
                                    Animations.map((anim, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setRenderAnimation(index)}
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                                                RenderAnimation === index
                                                    ? 'bg-[#232325] text-[#ededed] border-l-2 border-[#AF3240] pl-2 font-medium'
                                                    : 'text-[#85858b] hover:text-[#ededed] hover:bg-[#232325]/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="text-[10px] text-[#85858b]">#{String(index + 1).padStart(2, '0')}</span>
                                                <span className="truncate">{anim}</span>
                                            </div>
                                            <span className="text-[11px] text-[#85858b] shrink-0 ml-2">
                                                {animDurations[index] ? `${animDurations[index].toFixed(1)}s` : '0.0s'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full min-h-[60px] flex flex-col items-center justify-center text-center p-2 text-xs font-mono text-[#85858b]">
                                        <span>No rig animations detected</span>
                                        <span className="text-[10px] mt-0.5">Static frame mode active</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pipeline Configuration */}
                    <div className="lg:col-span-7 flex flex-col gap-3">

                        {/* Section 01: Engine Sampling */}
                        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#19191b] p-3">
                            <div className="flex items-center justify-between text-xs font-mono mb-2.5">
                                <span className="text-[#85858b] uppercase tracking-wider text-[11px]">01 · Engine Sampling</span>
                                <span className="text-[#85858b]">MIS path-tracer</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                {/* Samples */}
                                <div className="p-2.5 bg-[#141415] border border-white/[0.06] rounded-lg flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-[#85858b]">Samples</span>
                                        <span className="text-[10px] text-[#85858b]">SPP</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max="8192"
                                        value={samples}
                                        onChange={(e) => setSamples(e.target.value)}
                                        className="bg-transparent border-0 border-b border-white/[0.16] focus:border-[#AF3240] outline-none text-[#ededed] text-sm font-mono font-medium text-center py-0.5 w-full transition-colors"
                                    />
                                    <div className="flex gap-1 justify-center mt-0.5">
                                        {SAMPLE_PRESETS.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setSamples(s)}
                                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                                    Number(samples) === s
                                                        ? 'border-[#AF3240] bg-[#AF3240]/15 text-[#ededed] font-medium'
                                                        : 'border-white/[0.06] bg-[#19191b] text-[#85858b] hover:text-[#ededed]'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Noise Threshold */}
                                <div className="p-2.5 bg-[#141415] border border-white/[0.06] rounded-lg flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-[#85858b]">Noise cut</span>
                                        <span className="text-[10px] text-[#85858b]">RMS</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.001"
                                        max="1.0"
                                        value={noiseThreshold}
                                        onChange={(e) => setNoiseThreshold(e.target.value)}
                                        className="bg-transparent border-0 border-b border-white/[0.16] focus:border-[#AF3240] outline-none text-[#ededed] text-sm font-mono font-medium text-center py-0.5 w-full transition-colors"
                                    />
                                    <div className="flex gap-1 justify-center mt-0.5">
                                        {NOISE_PRESETS.map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setNoiseThreshold(n)}
                                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                                    Number(noiseThreshold) === n
                                                        ? 'border-[#AF3240] bg-[#AF3240]/15 text-[#ededed] font-medium'
                                                        : 'border-white/[0.06] bg-[#19191b] text-[#85858b] hover:text-[#ededed]'
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 02: Timeline Duration */}
                        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#19191b] p-3 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-[#85858b] uppercase tracking-wider text-[11px]">02 · Timeline Duration</span>
                                <span className="text-[#ededed] font-medium">{totalFrames} frames</span>
                            </div>

                            {/* Slider Track */}
                            <div className="relative h-4">
                                <div className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-white/[0.08] rounded-full" />
                                <div
                                    className="absolute top-1/2 h-1 -translate-y-1/2 bg-[#AF3240] rounded-full"
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

                            {/* Numeric Inputs */}
                            <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-0.5">
                                <div className="flex items-center justify-between px-2 py-1 bg-[#141415] border border-white/[0.06] rounded-md">
                                    <span className="text-[#85858b] text-[10px]">Start</span>
                                    <input
                                        type="number"
                                        value={start}
                                        min={min}
                                        max={end}
                                        onChange={(e) => setStart(Math.max(min, Math.min(Number(e.target.value), end)))}
                                        className="w-10 bg-transparent text-right font-medium outline-none text-[#ededed]"
                                    />
                                </div>
                                <div className="flex items-center justify-between px-2 py-1 bg-[#141415] border border-white/[0.06] rounded-md">
                                    <span className="text-[#85858b] text-[10px]">End</span>
                                    <input
                                        type="number"
                                        value={end}
                                        min={start}
                                        max={max}
                                        onChange={(e) => setEnd(Math.max(start, Math.min(Number(e.target.value), max)))}
                                        className="w-10 bg-transparent text-right font-medium outline-none text-[#ededed]"
                                    />
                                </div>
                                <div className="flex items-center justify-between px-2 py-1 bg-[#141415] border border-white/[0.06] rounded-md">
                                    <span className="text-[#85858b] text-[10px]">FPS</span>
                                    <input
                                        type="number"
                                        value={Fps}
                                        min={1}
                                        max={120}
                                        onChange={(e) => setFps(Number(e.target.value))}
                                        className="w-10 bg-transparent text-right font-medium outline-none text-[#ededed]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 03: Output Matrix */}
                        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#19191b] p-3 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-[#85858b] uppercase tracking-wider text-[11px]">03 · Output Matrix</span>
                                <div className="flex gap-1">
                                    {RESOLUTION_PRESETS.map((p) => (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onClick={() => handleApplyResolution(p.width, p.height)}
                                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                                isPresetActive(p.width, p.height)
                                                    ? 'border-[#AF3240] bg-[#AF3240]/15 text-[#ededed] font-medium'
                                                    : 'border-white/[0.06] bg-[#141415] text-[#85858b] hover:text-[#ededed]'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Resolution Inputs */}
                            <div className="flex items-center justify-between gap-3 text-xs font-mono bg-[#141415] border border-white/[0.06] rounded-md p-1.5 px-2.5">
                                <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-[#85858b] text-[10px]">Width</span>
                                    <input
                                        type="number"
                                        value={width}
                                        onChange={(e) => setWidth(Number(e.target.value))}
                                        className="w-full bg-transparent font-medium outline-none text-[#ededed] border-b border-white/[0.12] text-center"
                                    />
                                    <span className="text-[#85858b] text-[10px]">px</span>
                                </div>
                                <span className="text-[#85858b]">×</span>
                                <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-[#85858b] text-[10px]">Height</span>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={(e) => setHeight(Number(e.target.value))}
                                        className="w-full bg-transparent font-medium outline-none text-[#ededed] border-b border-white/[0.12] text-center"
                                    />
                                    <span className="text-[#85858b] text-[10px]">px</span>
                                </div>
                            </div>
                        </div>

                        {/* Execution Options */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            {/* Master Render Toggle */}
                            <label
                                htmlFor="masterRender"
                                className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-[#19191b] transition-colors flex-1"
                            >
                                <input
                                    type="checkbox"
                                    id="masterRender"
                                    className="sr-only"
                                    checked={masterWillRender}
                                    onChange={(e) => setMasterWillRender(e.target.checked)}
                                />
                                <div
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                        masterWillRender
                                            ? 'border-[#AF3240] bg-[#AF3240] text-white'
                                            : 'border-white/[0.24] bg-transparent'
                                    }`}
                                >
                                    {masterWillRender && (
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-xs font-mono text-[#a1a1a6] flex-1">
                                    Master compute
                                </span>
                                <span className={`text-[10px] font-mono ${masterWillRender ? 'text-[#4cc38a]' : 'text-[#85858b]'}`}>
                                    {masterWillRender ? 'Active' : 'Off'}
                                </span>
                            </label>

                            {/* Intel OIDN AI Denoiser Toggle */}
                            <label
                                htmlFor="denoiserToggle"
                                className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-[#19191b] transition-colors flex-1"
                            >
                                <input
                                    type="checkbox"
                                    id="denoiserToggle"
                                    className="sr-only"
                                    checked={denoiserEnabled}
                                    onChange={(e) => setDenoiserEnabled(e.target.checked)}
                                />
                                <div
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                        denoiserEnabled
                                            ? 'border-[#AF3240] bg-[#AF3240] text-white'
                                            : 'border-white/[0.24] bg-transparent'
                                    }`}
                                >
                                    {denoiserEnabled && (
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-xs font-mono text-[#a1a1a6] flex-1">
                                    AI Denoiser (OIDN)
                                </span>
                                <span className={`text-[10px] font-mono ${denoiserEnabled ? 'text-[#4cc38a]' : 'text-[#85858b]'}`}>
                                    {denoiserEnabled ? 'Active' : 'Off'}
                                </span>
                            </label>
                        </div>

                    </div>
                </div>
            </div>

            {/* Pinned Action Footer */}
            <footer className="px-4 sm:px-5 py-3 border-t border-white/[0.08] bg-[#141415] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-[#85858b]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                    <span>Swarm grid: {tilesX}×{tilesY} tiles · {totalChunks.toLocaleString()} chunks</span>
                </div>
                <button
                    type="button"
                    onClick={createRoom}
                    disabled={!file}
                    className={`w-full sm:w-auto ml-auto py-2.5 px-5 text-xs font-mono font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        file
                            ? 'bg-[#AF3240] hover:bg-[#972935] text-white cursor-pointer shadow-sm'
                            : 'bg-[#19191b] text-[#85858b] border border-white/[0.06] cursor-not-allowed opacity-60'
                    }`}
                >
                    <span>Configure Lighting & Launch Swarm</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </button>
            </footer>
        </div>
    );
};

export default UploadBefore;
