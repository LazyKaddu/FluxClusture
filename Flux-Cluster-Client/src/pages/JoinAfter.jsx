import React, { useRef, useState } from 'react';
import { useSearchParams } from "react-router-dom";
import { useRenderPipeline } from '../hooks/useRenderPipeline';

const JoinAfter = () => {
    const [searchParams] = useSearchParams();
    const roomID = searchParams.get("roomId");

    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("Initializing...");
    const [currentFrame, setCurrentFrame] = useState(0);
    const [chunkAssigned, setChunkAssigned] = useState("None");
    const [settings, setSettings] = useState({});

    const canvasRef = useRef(null);

    useRenderPipeline({
        role: 'worker',
        roomId: roomID,
        setStatus,
        setProgress,
        setCurrentFrame,
        setChunkAssigned,
        onSettingsReceived: setSettings,
        onTileReceived: (metadata, pixelBuffer) => {
            const task = { chunkWidth: metadata.chunkWidth, chunkHeight: metadata.chunkHeight };
            const canvas = canvasRef.current;
            if (!canvas || !pixelBuffer) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const tChunkW = parseInt(task.chunkWidth, 10) || chunkW;
            const tChunkH = parseInt(task.chunkHeight, 10) || chunkH;

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
        <div className='w-full md:w-[90%] lg:w-[80%] xl:w-[70%] max-w-5xl h-auto min-h-[66%] flex justify-between flex-col geist-mono-regular p-6'>
            <div className='flex flex-col md:flex-row justify-between items-start md:items-center text-sm gap-8 md:gap-4'>
                
                <div className='w-full md:w-1/2 lg:w-5/12 flex flex-col gap-6'>
                    <div>
                        <div className='geist-mono-bold text-xl text-white mb-2'>
                            room : {roomID}
                        </div>
                        <div className='text-xs text-gray-400'>Status: {status}</div>
                    </div>

                    <div className='text-[#606060] flex flex-col gap-1'>
                        <p>Rendering node active</p>
                        <p>Frame: {currentFrame}</p>
                        <p className='break-all'>Chunk Assigned: {chunkAssigned}</p>
                    </div>

                    <div className='border border-white/20 w-full p-4 bg-black/30'>
                        <h3 className='text-white mb-3 font-bold'>Render Settings</h3>
                        <div className='grid grid-cols-2 gap-y-3 gap-x-4'>
                            <p className='text-[#606060] text-xs'>
                                Res: {settings.width && settings.height ? `${settings.width}x${settings.height}` : '-'}
                            </p>
                            <p className='text-[#606060] text-xs'>
                                Samples: {settings.samples || '-'}
                            </p>
                            <p className='text-[#606060] text-xs'>
                                Noise: {settings.noiseThreshold || '-'}
                            </p>
                            <p className='text-[#606060] text-xs'>
                                FPS: {settings.fps || '-'}
                            </p>
                            <p className='text-[#606060] text-xs col-span-2'>
                                Anim Index: {settings.animationIndex !== undefined ? settings.animationIndex : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className='w-full sm:w-2/3 md:w-1/2 lg:w-4/12 max-w-[300px] aspect-square bg-[#1a1a1a] flex items-center justify-center overflow-hidden border border-gray-800 rounded-lg mx-auto md:mx-0'>
                    {/* 
                        Size the internal canvas buffer to exactly 64x64 so it matches the chunk, 
                        and let CSS scale it up to fill the container.
                        'imageRendering: pixelated' keeps it sharp if you want to see the pixels.
                    */}
                    <canvas
                        ref={canvasRef}
                        width={64}
                        height={64}
                        className="w-full h-full"
                        style={{ imageRendering: 'pixelated' }}
                    />
                </div>
            </div>

            <div className='w-full flex justify-center mt-12'>
                <div className='w-full border border-white/30 h-8 bg-black overflow-hidden'>
                    <div
                        className='h-full bg-white text-black p-1 flex items-center justify-center transition-all duration-300 text-xs font-bold'
                        style={{ width: `${Math.max(2, progress * 100)}%` }}
                    >
                        {(progress * 100).toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    )
}

export default JoinAfter
