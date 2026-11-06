import React, { useRef, useState } from 'react';
import { useSearchParams, useNavigate } from "react-router-dom";
import { useRenderPipeline } from '../hooks/useRenderPipeline';
import { useSEO } from '../hooks/useSEO';

const JoinAfter = () => {
    useSEO({
        title: 'Active Worker Node Viewport',
        description: 'Live worker telemetry and GPU chunk compute monitor for FluxCluster peer nodes. Inspect tile rendering progress, WebRTC SCTP streaming, and swarm health.',
        canonical: '/joined'
    });

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomID = searchParams.get("roomId");

    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("Initializing...");
    const [currentFrame, setCurrentFrame] = useState(0);
    const [chunkAssigned, setChunkAssigned] = useState("None");
    const [settings, setSettings] = useState({});
    const [copied, setCopied] = useState(false);
    const [tileDimensions, setTileDimensions] = useState({ w: 128, h: 128 });
    const [hasReceivedTile, setHasReceivedTile] = useState(false);

    const canvasRef = useRef(null);

    const handleCopyRoomId = () => {
        if (!roomID) return;
        navigator.clipboard.writeText(roomID);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDisconnect = () => {
        navigate('/join');
    };

    useRenderPipeline({
        role: 'worker',
        roomId: roomID,
        setStatus,
        setProgress,
        setCurrentFrame,
        setChunkAssigned,
        onSettingsReceived: setSettings,
        onTileReceived: (metadata, pixelBuffer) => {
            const canvas = canvasRef.current;
            if (!canvas || !pixelBuffer) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const tChunkW = parseInt(metadata.chunkWidth, 10) || 128;
            const tChunkH = parseInt(metadata.chunkHeight, 10) || 128;

            if (canvas.width !== tChunkW) canvas.width = tChunkW;
            if (canvas.height !== tChunkH) canvas.height = tChunkH;
            setTileDimensions({ w: tChunkW, h: tChunkH });
            setHasReceivedTile(true);

            const raw = new Uint8ClampedArray(pixelBuffer);
            const flipped = new Uint8ClampedArray(raw.length);
            const rowSize = tChunkW * 4;

            for (let y = 0; y < tChunkH; y++) {
                const srcRow = (tChunkH - 1 - y) * rowSize;
                const dstRow = y * rowSize;
                flipped.set(raw.subarray(srcRow, srcRow + rowSize), dstRow);
            }

            for (let i = 3; i < flipped.length; i += 4) {
                flipped[i] = 255;
            }

            const imgData = new ImageData(flipped, tChunkW, tChunkH);
            ctx.putImageData(imgData, 0, 0);
        }
    });

    return (
        <div className="font-sans antialiased text-[#ededed] bg-[#141415] w-full max-w-5xl max-h-[min(92vh,820px)] flex flex-col overflow-hidden border border-white/[0.08] rounded-xl shadow-2xl my-auto select-none">
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-[#19191b]/50 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-[#AF3240] px-2 py-0.5 rounded bg-[#AF3240]/10 border border-[#AF3240]/20">
                        FluxCluster
                    </span>
                    <h1 className="text-xs font-mono font-medium text-[#ededed] m-0 p-0">
                        Worker Node Viewport
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block text-xs font-mono text-[#85858b] border-r border-white/[0.08] pr-3">
                        WebRTC SCTP
                    </span>

                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                        <span className="text-xs font-mono text-[#a1a1a6] truncate max-w-[140px] sm:max-w-[200px]">
                            {status}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Viewport Body */}
            <div className="flex flex-1 overflow-hidden min-h-0 flex-col md:flex-row">

                {/* Left: Live Tile Stream */}
                <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-white/[0.08] relative overflow-hidden bg-[#0f0f10]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] shrink-0 bg-[#141415]">
                        <span className="text-xs font-mono font-medium text-[#ededed]">
                            Live tile stream
                        </span>
                        <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-[#85858b]">
                                {tileDimensions.w}×{tileDimensions.h} buffer
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                                hasReceivedTile ? 'text-[#4cc38a] bg-[#4cc38a]/10' : 'text-[#85858b] bg-[#19191b]'
                            }`}>
                                {hasReceivedTile ? 'Streaming' : 'Standby'}
                            </span>
                        </div>
                    </div>

                    {/* Viewport Canvas Arena */}
                    <div className="flex-1 relative flex items-center justify-center p-4 bg-[#0f0f10] overflow-hidden">
                        <div className="relative max-w-[260px] sm:max-w-[300px] w-full aspect-square border border-white/[0.08] bg-[#141415] rounded-lg flex items-center justify-center overflow-hidden shadow-lg">
                            <canvas
                                ref={canvasRef}
                                width={tileDimensions.w}
                                height={tileDimensions.h}
                                className="w-full h-full block"
                                style={{ imageRendering: 'pixelated' }}
                            />

                            {!hasReceivedTile && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141415]/90 z-10 gap-3 text-center p-4">
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-[#AF3240] rounded-full animate-spin" />
                                    <span className="text-xs font-mono text-[#a1a1a6]">
                                        {status || 'Awaiting tile dispatch...'}
                                    </span>
                                    <span className="text-[11px] font-mono text-[#85858b]">
                                        Frame #{currentFrame}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Viewport Sub-footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] shrink-0 bg-[#141415] text-xs font-mono text-[#85858b]">
                        <span>Frame #{currentFrame}</span>
                        <span className="truncate max-w-[160px]">Tile: {chunkAssigned}</span>
                        <span className="hidden sm:inline">Path tracer</span>
                    </div>
                </div>

                {/* Right: Telemetry & Specs */}
                <div className="w-full md:w-[280px] lg:w-[320px] shrink-0 flex flex-col overflow-hidden bg-[#141415]">

                    {/* 01 · Node Telemetry */}
                    <div className="border-b border-white/[0.06] p-4">
                        <div className="flex items-center justify-between mb-3 text-xs font-mono">
                            <span className="text-[#85858b] uppercase tracking-wider text-[11px]">
                                01 · Node Telemetry
                            </span>
                            <span className="text-[#85858b]">Worker</span>
                        </div>

                        <div className="space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between">
                                <span className="text-[#85858b]">Room ID</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#ededed] font-medium truncate max-w-[120px]">
                                        {roomID || '—'}
                                    </span>
                                    {roomID && (
                                        <button
                                            onClick={handleCopyRoomId}
                                            className="px-2 py-0.5 rounded text-[11px] border border-white/[0.08] bg-[#19191b] hover:bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] transition-colors cursor-pointer"
                                            title="Copy Room ID"
                                        >
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#85858b]">Daemon role</span>
                                <span className="text-[#ededed]">GPU compute</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#85858b]">Target frame</span>
                                <span className="text-[#ededed]">#{currentFrame}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#85858b]">Assigned tile</span>
                                <span className="text-[#ededed] truncate max-w-[130px] text-right">
                                    {chunkAssigned}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 02 · Cluster Manifest */}
                    <div className="flex-1 overflow-y-auto p-4 border-b border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3 text-xs font-mono">
                            <span className="text-[#85858b] uppercase tracking-wider text-[11px]">
                                02 · Cluster Specs
                            </span>
                            <span className="text-[#85858b]">Manifest</span>
                        </div>

                        <div className="space-y-2 text-xs font-mono">
                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Resolution</span>
                                <span className="text-[#ededed] font-medium">
                                    {settings.width && settings.height ? `${settings.width} × ${settings.height}` : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Samples</span>
                                <span className="text-[#ededed] font-medium">
                                    {settings.samples ? `${settings.samples} SPP` : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Noise threshold</span>
                                <span className="text-[#ededed] font-medium">
                                    {settings.noiseThreshold !== undefined ? `${settings.noiseThreshold} RMS` : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                                <span className="text-[#85858b]">Framerate</span>
                                <span className="text-[#ededed] font-medium">
                                    {settings.fps ? `${settings.fps} FPS` : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-[#85858b]">Animation track</span>
                                <span className="text-[#ededed] font-medium">
                                    {settings.animationIndex !== undefined ? `#${settings.animationIndex}` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Disconnect Action */}
                    <div className="p-4 bg-[#141415] shrink-0">
                        <button
                            onClick={handleDisconnect}
                            className="w-full py-2 px-3 text-xs font-mono rounded-lg border border-white/[0.08] hover:border-white/[0.16] bg-[#19191b] hover:bg-[#232325] text-[#a1a1a6] hover:text-[#ededed] transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span>Leave swarm</span>
                        </button>
                    </div>

                </div>

            </div>

            {/* Footer Progress Bar */}
            <footer className="px-5 py-3 border-t border-white/[0.08] bg-[#19191b]/50 shrink-0">
                <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                    <span className="text-[#85858b]">Tile sampling progress</span>
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
                    <span>Swarm peer · Connected</span>
                    <span>Direct P2P DataChannel</span>
                </div>
            </footer>
        </div>
    );
};

export default JoinAfter;
