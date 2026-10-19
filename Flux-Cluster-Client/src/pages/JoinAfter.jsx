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
        <div className="font-mono bg-black text-white h-full max-h-[86vh] w-full md:w-[94%] lg:w-[88%] xl:w-3/5 max-w-5xl flex flex-col overflow-hidden border border-white shadow-2xl my-auto select-none">
            {/* ── Terminal HUD Header ── */}
            <header className="flex items-center justify-between px-4 py-2.5 border-b border-white shrink-0 bg-black">
                <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-bold tracking-[0.15em] border border-white px-2 py-0.5 uppercase">
                        FluxCluster
                    </span>
                    <h1 className="text-[11px] font-bold tracking-[0.12em] uppercase text-white inline-block m-0 p-0 font-inherit">
                        &gt;_ Worker Node
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 border border-neutral-800 px-2 py-0.5 bg-neutral-950">
                        <span className="text-[8px] text-neutral-500 uppercase tracking-widest">NET:</span>
                        <span className="text-[9px] text-neutral-300 font-bold tracking-wider">WEBRTC_SCTP</span>
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

                {/* LEFT: Live Tile Stream Viewport */}
                <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-white relative overflow-hidden bg-black">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800 shrink-0 bg-black">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-white inline-block shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                            <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-white">
                                Live Tile Stream
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-neutral-500 font-mono">
                                [{tileDimensions.w}×{tileDimensions.h} BUFFER]
                            </span>
                            <span className={`text-[8px] tracking-wider uppercase px-1.5 py-0.5 border ${
                                hasReceivedTile ? 'border-green-600/60 text-green-400 bg-green-950/20' : 'border-neutral-700 text-neutral-500'
                            }`}>
                                {hasReceivedTile ? 'STREAMING' : 'STANDBY'}
                            </span>
                        </div>
                    </div>

                    {/* Viewport Canvas Arena */}
                    <div className="flex-1 relative flex items-center justify-center p-4 bg-neutral-950 overflow-hidden">
                        {/* Technical grid backdrop */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

                        {/* Centered Canvas Container with Corner Brackets */}
                        <div className="relative max-w-[260px] sm:max-w-[300px] w-full aspect-square border border-neutral-800 bg-black flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.9)]">
                            <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-white/60 pointer-events-none z-10" />
                            <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-white/60 pointer-events-none z-10" />
                            <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-white/60 pointer-events-none z-10" />
                            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-white/60 pointer-events-none z-10" />

                            <canvas
                                ref={canvasRef}
                                width={tileDimensions.w}
                                height={tileDimensions.h}
                                className="w-full h-full block"
                                style={{ imageRendering: 'pixelated' }}
                            />

                            {!hasReceivedTile && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-10 gap-3 text-center p-4">
                                    <div className="w-7 h-7 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
                                    <span className="text-[10px] font-bold tracking-[0.15em] text-neutral-300 uppercase">
                                        {status || 'Awaiting Tile Dispatch…'}
                                    </span>
                                    <span className="text-[8px] text-neutral-600 uppercase tracking-widest">
                                        Frame #{currentFrame}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Viewport Sub-footer Telemetry */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-neutral-900 shrink-0 bg-black">
                        <span className="text-[9px] tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                            <span className="text-neutral-600">FRAME:</span> #{currentFrame}
                        </span>
                        <span className="text-[9px] tracking-wider text-neutral-400 uppercase flex items-center gap-1.5 max-w-[140px] truncate">
                            <span className="text-neutral-600">CHUNK:</span> {chunkAssigned}
                        </span>
                        <span className="text-[9px] tracking-wider text-white uppercase hidden sm:flex items-center">
                            MIS_PATHTRACER
                        </span>
                    </div>
                </div>

                {/* RIGHT: Inspector & Telemetry Panel */}
                <div className="w-full md:w-[280px] lg:w-[320px] shrink-0 flex flex-col overflow-hidden bg-black">

                    {/* 01 // Node Telemetry */}
                    <div className="border-b border-neutral-900 shrink-0">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900 bg-black">
                            <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-neutral-500">
                                01 // Node Telemetry
                            </span>
                            <span className="text-[9px] text-neutral-600">WORKER</span>
                        </div>

                        <div className="p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] tracking-widest uppercase text-neutral-500">ROOM ID</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold tracking-wider text-white font-mono truncate max-w-[120px]">
                                        {roomID || '—'}
                                    </span>
                                    {roomID && (
                                        <button
                                            onClick={handleCopyRoomId}
                                            className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 border border-neutral-700 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                            title="Copy Room ID"
                                        >
                                            {copied ? 'COPIED' : 'COPY'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[9px] tracking-widest uppercase text-neutral-500">DAEMON ROLE</span>
                                <span className="text-[10px] tracking-wider text-neutral-300">GPU_COMPUTE</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[9px] tracking-widest uppercase text-neutral-500">TARGET FRAME</span>
                                <span className="text-[10px] tracking-wider text-neutral-300">#{currentFrame}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[9px] tracking-widest uppercase text-neutral-500">ASSIGNED TILE</span>
                                <span className="text-[10px] tracking-wider text-neutral-300 truncate max-w-[130px] text-right font-mono">
                                    {chunkAssigned}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 02 // Cluster Specs */}
                    <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin border-b border-neutral-900">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-900 bg-black">
                            <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-neutral-500">
                                02 // Cluster Specs
                            </span>
                            <span className="text-[9px] text-neutral-600">MANIFEST</span>
                        </div>

                        <div className="p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Resolution</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {settings.width && settings.height ? `${settings.width} × ${settings.height}` : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Samples</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {settings.samples ? `${settings.samples} SPP` : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Noise Threshold</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {settings.noiseThreshold !== undefined ? `${settings.noiseThreshold} RMS` : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-neutral-900/60">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Framerate</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {settings.fps ? `${settings.fps} FPS` : '—'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-[9px] tracking-wider uppercase text-neutral-500">Animation Track</span>
                                <span className="text-[10px] font-bold tracking-wider text-white">
                                    {settings.animationIndex !== undefined ? `#${settings.animationIndex}` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 03 // Session Actions & Disconnect */}
                    <div className="border-t border-white p-3 shrink-0 bg-black flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[9px] text-neutral-500">
                            <span className="uppercase tracking-widest">STATUS</span>
                            <span className="text-neutral-400 font-mono truncate max-w-[160px] text-right">
                                {status}
                            </span>
                        </div>

                        <button
                            onClick={handleDisconnect}
                            className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase w-full p-2.5 bg-transparent border border-neutral-700 text-neutral-300 hover:border-white hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors flex items-center justify-center gap-2"
                        >
                            <span>✕</span>
                            Disconnect / Leave Swarm
                        </button>
                    </div>

                </div>

            </div>

            {/* ── Footer Progress Bar ── */}
            <div className="border-t border-white p-3 shrink-0 bg-black">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] tracking-widest uppercase text-neutral-500">
                        Tile Pass Sampling Progress
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
                    <span>SWARM_ACCUMULATION // RAYTRACING</span>
                    <span>PEER_DATACHANNEL // STABLE</span>
                </div>
            </div>
        </div>
    );
};

export default JoinAfter;

