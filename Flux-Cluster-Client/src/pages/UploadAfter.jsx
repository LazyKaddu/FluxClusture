import React, { useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { encodeFramesToMP4 } from '../render/videoExporter';
import { useRenderPipeline } from '../hooks/useRenderPipeline';

const UploadAfter = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const config = location.state || {};

    const {
        roomId = '',
        file = null,
        fileHash = null,
        previewUrl = null,
        masterWillRender = true
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

    const canvasRef = useRef(null);
    const completedFramesMap = useRef(new Map());

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

    function drawTileToCanvas(metadata, pixelBuffer) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

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

        // Force alpha to 255 so transparent backgrounds don't render as invisible
        let maxR = 0, maxG = 0, maxB = 0;
        for (let i = 3; i < flipped.length; i += 4) {
            flipped[i] = 255;
            if (flipped[i - 3] > maxR) maxR = flipped[i - 3];
            if (flipped[i - 2] > maxG) maxG = flipped[i - 2];
            if (flipped[i - 1] > maxB) maxB = flipped[i - 1];
        }

        const imgData = new ImageData(flipped, tChunkW, tChunkH);
        const drawWidth = Math.min(tChunkW, width - metadata.startX);
        const drawHeight = Math.min(tChunkH, height - metadata.startY);
        ctx.putImageData(imgData, metadata.startX, metadata.startY, 0, 0, drawWidth, drawHeight);
    }

    const configObject = useMemo(() => ({
        width, height, fps, samples, noiseThreshold, animationIndex, startFrame, endFrame, masterWillRender
    }), [width, height, fps, samples, noiseThreshold, animationIndex, startFrame, endFrame, masterWillRender]);

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
        onFrameComplete: (task) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            const fullFrameData = ctx.getImageData(0, 0, width, height);
            completedFramesMap.current.set(task.frame, fullFrameData);
            setCompletedFramesCount(completedFramesMap.current.size);
            console.log(`Successfully saved Frame ${task.frame} to memory.`);
        },
        onTileReceived: (metadata, pixelBuffer) => {
            drawTileToCanvas(metadata, pixelBuffer);
        }
    });

    const handleExportVideo = async () => {
        if (isExporting) return;
        setIsExporting(true);
        setStatus("Encoding video... Please wait.");

        // Sort frames sequentially in case they finished out of order
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
            <div className="font-mono bg-black text-white h-full max-h-[86vh] w-full md:w-[94%] lg:w-[88%] xl:w-3/5 max-w-5xl flex flex-col items-center justify-center border border-white shadow-2xl p-8 text-center my-auto select-none">
                <span className="text-sm font-bold tracking-widest text-neutral-300 mb-2 uppercase">
                    &gt;_ No Active Render Session
                </span>
                <p className="text-xs text-neutral-500 max-w-sm mb-6 leading-relaxed">
                    No cluster render configuration was found in the current state. Return to the staging console to load a model and dispatch a job.
                </p>
                <button
                    onClick={() => navigate('/upload')}
                    className="text-[10px] font-bold tracking-[0.15em] uppercase px-5 py-2.5 border border-white bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                    Return to Staging
                </button>
            </div>
        );
    }

    const isComplete = progress >= 0.999 || (completedFramesCount > 0 && completedFramesCount >= totalFrames);

    return (
        <div className="font-mono bg-black text-white h-full max-h-[86vh] w-full md:w-[94%] lg:w-[88%] xl:w-3/5 max-w-5xl flex flex-col overflow-hidden border border-white shadow-2xl my-auto select-none">
            {/* ── Terminal HUD Header ── */}
            <header className="flex items-center justify-between px-4 py-2.5 border-b border-white shrink-0 bg-black">
                <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-bold tracking-[0.15em] border border-white px-2 py-0.5 uppercase">
                        FluxCluster
                    </span>
                    <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-white">
                        &gt;_ Orchestrator Console
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 border border-neutral-800 px-2 py-0.5 bg-neutral-950">
                        <span className="text-[8px] text-neutral-500 uppercase tracking-widest">NET:</span>
                        <span className="text-[9px] text-neutral-300 font-bold tracking-wider">SWARM_HOST</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 border border-neutral-800 bg-neutral-950">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                        <span className="text-[9px] font-bold tracking-wider uppercase text-neutral-300 truncate max-w-[120px] sm:max-w-[180px]">
                            {status}
                        </span>
                    </div>
                </div>
            </header>

            {/* ── Main Two-Column Workstation Body ── */}
            <div className="flex flex-1 overflow-hidden min-h-0 flex-col md:flex-row">

                {/* LEFT: Composite Accumulation Viewport */}
                <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-white relative overflow-hidden bg-black">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 shrink-0 bg-black">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-white inline-block shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                            <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-white">
                                Composite Frame Accumulation
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-neutral-500 font-mono">
                                [{width}×{height} CANVAS]
                            </span>
                            <span className={`text-[8px] tracking-wider uppercase px-1.5 py-0.5 border ${
                                isComplete
                                    ? 'border-green-600/60 text-green-400 bg-green-950/20'
                                    : 'border-neutral-700 text-neutral-400'
                            }`}>
                                {isComplete ? 'RENDER_COMPLETE' : 'DISPATCHING_SWARM'}
                            </span>
                        </div>
                    </div>

                    {/* Viewport Canvas Arena */}
                    <div className="flex-1 relative flex items-center justify-center p-3 sm:p-4 bg-neutral-950 overflow-hidden">
                        {/* Technical grid backdrop */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

                        {/* Centered Canvas Container with Aspect Containment */}
                        <div
                            className="relative border border-neutral-800 bg-black flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.9)]"
                            style={{
                                aspectRatio: `${width} / ${height}`,
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: width >= height ? '100%' : 'auto',
                                height: width < height ? '100%' : 'auto'
                            }}
                        >
                            <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-white/60 pointer-events-none z-10" />
                            <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-white/60 pointer-events-none z-10" />
                            <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-white/60 pointer-events-none z-10" />
                            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-white/60 pointer-events-none z-10" />

                            <canvas
                                ref={canvasRef}
                                width={width}
                                height={height}
                                className="w-full h-full block object-contain"
                            />
                        </div>
                    </div>

                    {/* Viewport Sub-footer Telemetry */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-neutral-900 shrink-0 bg-black">
                        <span className="text-[9px] tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                            <span className="text-neutral-600">FRAME:</span> #{currentFrame} / #{endFrame}
                        </span>
                        <span className="text-[9px] tracking-wider text-neutral-400 uppercase flex items-center gap-1.5 max-w-[140px] truncate">
                            <span className="text-neutral-600">TILE:</span> {chunkAssigned}
                        </span>
                        <span className="text-[9px] tracking-wider text-white uppercase hidden sm:flex items-center">
                            MIS_PATHTRACER
                        </span>
                    </div>
                </div>

                {/* RIGHT: Inspector & Swarm Orchestration Panel */}
                <div className="w-full md:w-[280px] lg:w-[320px] shrink-0 flex flex-col overflow-hidden bg-black">

                    {/* 01 // Swarm Orchestration */}
                    <div className="border-b border-neutral-900 shrink-0">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900 bg-black">
                            <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-neutral-500">
                                01 // Swarm Orchestration
                            </span>
                            <span className="text-[9px] text-neutral-600">MASTER</span>
                        </div>

                        <div className="p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] tracking-widest uppercase text-neutral-500">ROOM ID</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold tracking-wider text-white font-mono truncate max-w-[120px]">
                                        {roomId || '—'}
                                    </span>
                                    {roomId && (
                                        <button
                                            onClick={handleCopyRoomId}
                                            className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                            title="Copy Room ID to invite workers"
                                        >
                                            {copied ? 'COPIED' : 'COPY'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[9px] tracking-widest uppercase text-neutral-500">PAYLOAD</span>
                                <span className="text-[10px] tracking-wider text-neutral-300 truncate max-w-[130px] text-right font-mono" title={fileName}>
                                    {fileName}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[9px] tracking-widest uppercase text-neutral-500">SIZE</span>
                                <span className="text-[10px] tracking-wider text-neutral-300">{fileSize}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[9px] tracking-widest uppercase text-neutral-500">LOCAL COMPUTE</span>
                                <span className="text-[10px] tracking-wider text-neutral-300">
                                    {masterWillRender ? 'ENABLED' : 'SWARM_ONLY'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 02 // Pipeline Config */}
                    <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin border-b border-neutral-900">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900 bg-black">
                            <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-neutral-500">
                                02 // Pipeline Specs
                            </span>
                            <span className="text-[9px] text-neutral-600">MANIFEST</span>
                        </div>

                        <div className="p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Resolution</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {width} × {height}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Samples</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {samples} SPP
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Noise Threshold</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {noiseThreshold} RMS
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Framerate</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {fps} FPS
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Frame Range</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    #{startFrame} → #{endFrame} ({totalFrames})
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Animation Track</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    #{animationIndex}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 03 // Session Actions & Video Export */}
                    <div className="border-t border-white p-3 shrink-0 bg-black flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[9px] text-neutral-500">
                            <span className="uppercase tracking-widest">FRAMES READY</span>
                            <span className="text-neutral-300 font-mono">
                                {completedFramesCount} / {totalFrames}
                            </span>
                        </div>

                        {isComplete ? (
                            <button
                                onClick={handleExportVideo}
                                disabled={isExporting}
                                className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase w-full p-2.5 bg-white text-black border-none cursor-pointer hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                <span>▶</span>
                                {isExporting ? 'Encoding MP4 Video…' : 'Export Video (MP4)'}
                            </button>
                        ) : (
                            <div className="flex items-center justify-between gap-2">
                                <button
                                    onClick={() => navigate('/upload')}
                                    className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase w-full p-2.5 bg-transparent border border-neutral-700 text-neutral-400 hover:border-white hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors text-center"
                                >
                                    Cancel & Return
                                </button>
                                {completedFramesCount > 0 && (
                                    <button
                                        onClick={handleExportVideo}
                                        disabled={isExporting}
                                        title="Export currently completed frames early"
                                        className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase px-3 py-2.5 bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-white hover:text-white cursor-pointer transition-colors whitespace-nowrap"
                                    >
                                        {isExporting ? '…' : 'Save Partial'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* ── Footer Progress Bar ── */}
            <div className="border-t border-white p-3 shrink-0 bg-black">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] tracking-widest uppercase text-neutral-500">
                        Cluster Render Progress
                    </span>
                    <span className="text-[10px] font-bold font-mono tracking-wider text-white">
                        {(progress * 100).toFixed(1)}%
                    </span>
                </div>

                <div className="w-full border border-neutral-700 h-6 bg-neutral-950 overflow-hidden relative flex items-center">
                    <div
                        className="h-full bg-white text-black text-[9px] font-bold font-mono transition-all duration-300 flex items-center justify-end pr-2 overflow-hidden"
                        style={{ width: `${Math.max(2, Math.min(100, progress * 100))}%` }}
                    >
                        {progress >= 0.15 && `${(progress * 100).toFixed(0)}%`}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-[8px] tracking-wider uppercase text-neutral-600">
                    <span>FRAMES BUFFERED: {completedFramesCount} / {totalFrames}</span>
                    <span>DISTRIBUTED_PATHTRACER // ORCHESTRATOR</span>
                </div>
            </div>
        </div>
    );
};

export default UploadAfter;

