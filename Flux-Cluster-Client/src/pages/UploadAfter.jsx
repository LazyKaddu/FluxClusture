import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { encodeFramesToMP4 } from '../render/videoExporter';
import { useRenderPipeline } from '../hooks/useRenderPipeline';
import { denoiseManager, downloadImageDataAsPNG } from '../services/DenoiseManager';
import { useSEO } from '../hooks/useSEO';

const UploadAfter = () => {
    useSEO({
        title: 'Live Cluster Render Accumulator',
        description: 'Live composite viewport for distributed WebGL path-tracing. Monitor swarm worker peering, tile accumulation, real-time Intel OIDN AI denoising, and export MP4 animations.',
        canonical: '/render'
    });

    const location = useLocation();
    const navigate = useNavigate();
    const config = location.state || {};

    const {
        roomId = '',
        file = null,
        fileHash = null,
        previewUrl = null,
        masterWillRender = true,
        denoiserEnabled = true
    } = config;

    const width = parseInt(config.width || 1920, 10);
    const height = parseInt(config.height || 1080, 10);
    const fps = parseInt(config.fps || 30, 10);
    const samples = parseInt(config.samples || 1024, 10);
    const noiseThreshold = parseFloat(config.noiseThreshold || 0.1);
    const animationIndex = parseInt(config.animationIndex || 0, 10);

    const startFrame = parseInt(config.startFrame || 0, 10);
    const endFrame = parseInt(config.endFrame || 0, 10);
    const totalFrames = Math.max(1, endFrame - startFrame + 1);

    const [status, setStatus] = useState("Initializing...");
    const [progress, setProgress] = useState(0);
    const [currentFrame, setCurrentFrame] = useState(startFrame);
    const [chunkAssigned, setChunkAssigned] = useState("idle");
    const [isExporting, setIsExporting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [completedFramesCount, setCompletedFramesCount] = useState(0);
    const [denoisedFramesCount, setDenoisedFramesCount] = useState(0);
    const [denoiserBackend, setDenoiserBackend] = useState(denoiserEnabled ? 'initializing' : 'disabled');
    const [isDenoising, setIsDenoising] = useState(false);

    const canvasRef = useRef(null);
    const completedFramesMap = useRef(new Map());
    const currentFrameRef = useRef(currentFrame);
    const activeCanvasFrameRef = useRef(null);

    const fileName = file?.name || 'Scene Model';
    const fileSize = file?.size
        ? (file.size / 1024 / 1024).toFixed(2) + ' MB'
        : '—';

    const handleCopyRoomId = () => {
        if (!roomId) return;
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const blankCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
    };

    function drawTileToCanvas(metadata, pixelBuffer) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const tileFrame = metadata.frame !== undefined ? parseInt(metadata.frame, 10) : null;

        // Discard stale tiles from an earlier frame that may have arrived late over the network
        if (tileFrame !== null && activeCanvasFrameRef.current !== null && tileFrame < activeCanvasFrameRef.current) {
            return;
        }

        // When a new frame is loaded, blank the canvas before accumulating new tiles
        if (tileFrame !== null && activeCanvasFrameRef.current !== null && tileFrame !== activeCanvasFrameRef.current) {
            ctx.clearRect(0, 0, width, height);
        }

        if (tileFrame !== null) {
            activeCanvasFrameRef.current = tileFrame;
        }

        const tChunkW = parseInt(metadata.chunkWidth, 10) || 128;
        const tChunkH = parseInt(metadata.chunkHeight, 10) || 128;

        const raw = new Uint8ClampedArray(pixelBuffer);
        const flipped = new Uint8ClampedArray(raw.length);
        const rowSize = tChunkW * 4;

        // Invert vertically since WebGL readRenderTargetPixels has bottom-left origin
        for (let y = 0; y < tChunkH; y++) {
            const srcRow = (tChunkH - 1 - y) * rowSize;
            const dstRow = y * rowSize;
            flipped.set(raw.subarray(srcRow, srcRow + rowSize), dstRow);
        }

        for (let i = 3; i < flipped.length; i += 4) {
            flipped[i] = 255;
        }

        const imgData = new ImageData(flipped, tChunkW, tChunkH);
        const drawWidth = Math.min(tChunkW, width - metadata.startX);
        const drawHeight = Math.min(tChunkH, height - metadata.startY);
        ctx.putImageData(imgData, metadata.startX, metadata.startY, 0, 0, drawWidth, drawHeight);
    }

    useEffect(() => {
        currentFrameRef.current = currentFrame;
    }, [currentFrame]);

    useEffect(() => {
        if (!denoiserEnabled) return;

        denoiseManager.init('/weights/rt_ldr.tza')
            .then(() => {
                setDenoiserBackend(denoiseManager.backend);
            })
            .catch((err) => {
                console.warn("[UploadAfter] DenoiseManager init error:", err);
                setDenoiserBackend('fallback');
            });

        return () => {
            denoiseManager.reset();
        };
    }, [denoiserEnabled]);

    const handleDownloadCurrentFrame = async () => {
        let frameData = completedFramesMap.current.get(currentFrame);
        if (!frameData) {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) frameData = ctx.getImageData(0, 0, width, height);
            }
        }
        if (!frameData) return;
        try {
            await downloadImageDataAsPNG(frameData, `FluxCluster_${roomId}_frame_${currentFrame}.png`);
        } catch (e) {
            console.error("Frame PNG export failed:", e);
        }
    };

    const configObject = useMemo(() => ({
        width, height, fps, samples, noiseThreshold, animationIndex, startFrame, endFrame, masterWillRender, denoiserEnabled
    }), [width, height, fps, samples, noiseThreshold, animationIndex, startFrame, endFrame, masterWillRender, denoiserEnabled]);

    useRenderPipeline({
        role: 'master',
        roomId,
        file,
        previewUrl,
        fileHash,
        config: configObject,
        setStatus,
        setProgress,
        setCurrentFrame,
        setChunkAssigned,
        onFrameLoad: (newFrame) => {
            if (activeCanvasFrameRef.current !== null && activeCanvasFrameRef.current !== newFrame) {
                blankCanvas();
            }
            activeCanvasFrameRef.current = newFrame;
        },
        onFrameComplete: (task) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            const fullFrameData = ctx.getImageData(0, 0, width, height);

            if (denoiserEnabled) {
                completedFramesMap.current.set(task.frame, fullFrameData);
                setCompletedFramesCount(completedFramesMap.current.size);

                setIsDenoising(true);
                setStatus(`Denoising Frame #${task.frame} (OIDN)...`);

                denoiseManager.enqueueFrame(task.frame, fullFrameData, (denoisedData) => {
                    completedFramesMap.current.set(task.frame, denoisedData);
                    setDenoisedFramesCount(prev => prev + 1);
                    setIsDenoising(false);

                    if (activeCanvasFrameRef.current === task.frame) {
                        ctx.putImageData(denoisedData, 0, 0);
                    }

                    setStatus(`Frame #${task.frame} Denoised (OIDN)`);
                    console.log(`[UploadAfter] Saved Denoised Frame ${task.frame} to memory.`);
                });
            } else {
                completedFramesMap.current.set(task.frame, fullFrameData);
                setCompletedFramesCount(completedFramesMap.current.size);
                console.log(`Successfully saved Frame ${task.frame} to memory.`);
            }
        },
        onTileReceived: (metadata, pixelBuffer) => {
            drawTileToCanvas(metadata, pixelBuffer);
        }
    });

    const handleExportVideo = async () => {
        if (isExporting) return;
        setIsExporting(true);

        if (denoiserEnabled) {
            setStatus("Finalizing frame denoising (OIDN)...");
            await denoiseManager.waitForAll();
        }

        setStatus("Encoding video... Please wait.");

        const orderedFrames = [];
        for (let f = startFrame; f <= endFrame; f++) {
            if (completedFramesMap.current.has(f)) {
                orderedFrames.push(completedFramesMap.current.get(f));
            } else {
                console.warn(`Missing frame ${f}, video might stutter.`);
            }
        }

        try {
            const videoBlob = await encodeFramesToMP4(orderedFrames, width, height, fps);
            const downloadUrl = URL.createObjectURL(videoBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `FluxCluster_Render_${roomId}.mp4`;
            link.click();
            URL.revokeObjectURL(downloadUrl);

            setStatus("Video downloaded!");
        } catch (error) {
            console.error("Video export failed:", error);
            setStatus("Export failed.");
        } finally {
            setIsExporting(false);
        }
    };

    if (!roomId) {
        return (
            <div className="font-sans antialiased text-[#ededed] bg-[#141415] h-full max-h-[86vh] w-full md:w-[94%] lg:w-[88%] xl:w-3/5 max-w-5xl flex flex-col items-center justify-center border border-white/[0.08] rounded-xl shadow-2xl p-8 text-center my-auto select-none">
                <span className="text-base font-medium text-[#ededed] mb-2">
                    No active render session
                </span>
                <p className="text-xs sm:text-sm text-[#85858b] max-w-sm mb-6 leading-relaxed">
                    No cluster render configuration was found in current state. Return to the staging console to load a model and dispatch a job.
                </p>
                <button
                    onClick={() => navigate('/upload')}
                    className="text-xs font-mono font-medium px-4 py-2 rounded-lg bg-[#AF3240] hover:bg-[#972935] text-white transition-colors cursor-pointer"
                >
                    Return to Staging
                </button>
            </div>
        );
    }

    const isComplete = progress >= 0.999 || (completedFramesCount > 0 && completedFramesCount >= totalFrames);

    return (
        <div className="font-sans antialiased text-[#ededed] bg-[#141415] w-full max-w-5xl max-h-[min(92vh,820px)] flex flex-col overflow-hidden border border-white/[0.08] rounded-xl shadow-2xl my-auto select-none">
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-[#19191b]/50 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-[#AF3240] px-2 py-0.5 rounded bg-[#AF3240]/10 border border-[#AF3240]/20">
                        FluxCluster
                    </span>
                    <h1 className="text-xs font-mono font-medium text-[#ededed] m-0 p-0">
                        Orchestrator Console
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block text-xs font-mono text-[#85858b]">
                        Swarm host
                    </span>

                    <span className="hidden sm:inline-block text-xs font-mono text-[#85858b] border-l border-white/[0.08] pl-3">
                        {denoiserEnabled ? (denoiserBackend === 'oidn-webgpu' ? 'OIDN WebGPU' : 'OIDN Fallback') : 'Denoiser off'}
                    </span>

                    <div className="flex items-center gap-2 border-l border-white/[0.08] pl-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                        <span className="text-xs font-mono text-[#a1a1a6] truncate max-w-[140px] sm:max-w-[200px]">
                            {status}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Workstation Body */}
            <div className="flex flex-1 overflow-hidden min-h-0 flex-col md:flex-row">

                {/* Left: Composite Accumulation Viewport */}
                <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-white/[0.08] relative overflow-hidden bg-[#0f0f10]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] shrink-0 bg-[#141415] text-xs font-mono">
                        <span className="font-medium text-[#ededed]">
                            Composite frame accumulation
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[#85858b]">
                                {width}×{height} canvas
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                                isComplete ? 'text-[#4cc38a] bg-[#4cc38a]/10' : 'text-[#85858b] bg-[#19191b]'
                            }`}>
                                {isComplete ? 'Complete' : 'Rendering'}
                            </span>
                        </div>
                    </div>

                    {/* Viewport Canvas Arena */}
                    <div className="flex-1 relative flex items-center justify-center p-3 sm:p-4 bg-[#0f0f10] overflow-hidden">
                        <div
                            className="relative border border-white/[0.08] bg-[#141415] rounded-lg flex items-center justify-center overflow-hidden shadow-lg"
                            style={{
                                aspectRatio: `${width} / ${height}`,
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: width >= height ? '100%' : 'auto',
                                height: width < height ? '100%' : 'auto'
                            }}
                        >
                            <canvas
                                ref={canvasRef}
                                width={width}
                                height={height}
                                className="w-full h-full block object-contain"
                            />
                        </div>
                    </div>

                    {/* Viewport Sub-footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] shrink-0 bg-[#141415] text-xs font-mono text-[#85858b]">
                        <span>Frame #{currentFrame} / #{endFrame}</span>
                        <span className="truncate max-w-[140px]">Tile: {chunkAssigned}</span>
                        <span className={`hidden sm:inline ${isDenoising ? 'text-[#4cc38a]' : ''}`}>
                            {isDenoising ? 'OIDN Denoising' : 'Path tracer'}
                        </span>
                    </div>
                </div>

                {/* Right: Inspector & Swarm Orchestration */}
                <div className="w-full md:w-[280px] lg:w-[320px] shrink-0 flex flex-col overflow-hidden bg-[#141415]">

                    {/* 01 · Swarm Orchestration */}
                    <div className="border-b border-white/[0.06] p-4">
                        <div className="flex items-center justify-between mb-3 text-xs font-mono">
                            <span className="text-[#85858b] uppercase tracking-wider text-[11px]">
                                01 · Swarm Orchestration
                            </span>
                            <span className="text-[#85858b]">Master</span>
                        </div>

                        <div className="space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between">
                                <span className="text-[#85858b]">Room ID</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#ededed] font-medium truncate max-w-[120px]">
                                        {roomId || '—'}
                                    </span>
                                    {roomId && (
                                        <button
                                            onClick={handleCopyRoomId}
                                            className="px-2 py-0.5 rounded text-[11px] border border-white/[0.08] bg-[#19191b] hover:bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] transition-colors cursor-pointer"
                                            title="Copy Room ID to invite workers"
                                        >
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#85858b]">Payload</span>
                                <span className="text-[#ededed] truncate max-w-[140px] text-right" title={fileName}>
                                    {fileName}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#85858b]">Size</span>
                                <span className="text-[#ededed]">{fileSize}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#85858b]">Local compute</span>
                                <span className="text-[#ededed]">
                                    {masterWillRender ? 'Enabled' : 'Swarm only'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 02 · Pipeline Specs */}
                    <div className="flex-1 overflow-y-auto p-4 border-b border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3 text-xs font-mono">
                            <span className="text-[#85858b] uppercase tracking-wider text-[11px]">
                                02 · Pipeline Specs
                            </span>
                            <span className="text-[#85858b]">Manifest</span>
                        </div>

                        <div className="space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Resolution</span>
                                <span className="text-[#ededed] font-medium">
                                    {width} × {height}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Samples</span>
                                <span className="text-[#ededed] font-medium">
                                    {samples} SPP
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Noise cut</span>
                                <span className="text-[#ededed] font-medium">
                                    {noiseThreshold} RMS
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Framerate</span>
                                <span className="text-[#ededed] font-medium">
                                    {fps} FPS
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Frame range</span>
                                <span className="text-[#ededed] font-medium">
                                    #{startFrame} → #{endFrame} ({totalFrames})
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-[#85858b]">AI denoiser</span>
                                <span className={`font-medium ${denoiserEnabled ? 'text-[#4cc38a]' : 'text-[#85858b]'}`}>
                                    {denoiserEnabled ? (denoiserBackend === 'oidn-webgpu' ? 'Intel OIDN' : 'OIDN Fallback') : 'Off'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 03 · Actions & Export */}
                    <div className="p-4 bg-[#141415] shrink-0 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-[#85858b]">
                            <span>Frames ready</span>
                            <span className="text-[#ededed] font-medium">
                                {completedFramesCount} / {totalFrames}
                                {denoiserEnabled && ` (${denoisedFramesCount} denoised)`}
                            </span>
                        </div>

                        {completedFramesCount > 0 && (
                            <button
                                onClick={handleDownloadCurrentFrame}
                                className="w-full py-2 px-3 text-xs font-mono rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-[#19191b] hover:bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                title="Download currently displayed frame as PNG"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                <span>Save Frame #{currentFrame} (PNG)</span>
                            </button>
                        )}

                        {isComplete ? (
                            <button
                                onClick={handleExportVideo}
                                disabled={isExporting}
                                className="w-full py-2.5 px-4 text-xs font-mono font-medium rounded-lg bg-[#AF3240] hover:bg-[#972935] text-white transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span>{isExporting ? 'Encoding MP4 video...' : 'Export Video (MP4)'}</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate('/upload')}
                                    className="flex-1 py-2 px-3 text-xs font-mono rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-[#19191b] hover:bg-[#232325] text-[#85858b] hover:text-[#ededed] transition-colors cursor-pointer text-center"
                                >
                                    Cancel
                                </button>
                                {completedFramesCount > 0 && (
                                    <button
                                        onClick={handleExportVideo}
                                        disabled={isExporting}
                                        className="py-2 px-3 text-xs font-mono rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-[#19191b] hover:bg-[#232325] text-[#ededed] transition-colors cursor-pointer"
                                    >
                                        {isExporting ? '...' : 'Save Partial'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* Footer Progress Bar */}
            <footer className="px-5 py-3 border-t border-white/[0.08] bg-[#19191b]/50 shrink-0">
                <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                    <span className="text-[#85858b]">Cluster render progress</span>
                    <span className="text-[#ededed] font-medium tabular-nums">
                        {(progress * 100).toFixed(1)}%
                    </span>
                </div>

                <div className="w-full bg-[#19191b] border border-white/[0.08] rounded-md h-2 overflow-hidden">
                    <div
                        className="h-full bg-[#AF3240] transition-[width] duration-150 ease-out"
                        style={{ width: `${Math.max(1, Math.min(100, progress * 100))}%` }}
                    />
                </div>

                <div className="flex items-center justify-between mt-2 text-xs font-mono text-[#85858b]">
                    <span>Frames buffered: {completedFramesCount} / {totalFrames}{denoiserEnabled && ` (${denoisedFramesCount} denoised)`}</span>
                    <span>Distributed path-tracer</span>
                </div>
            </footer>
        </div>
    );
};

export default UploadAfter;
