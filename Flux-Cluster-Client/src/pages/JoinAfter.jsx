import React,{useEffect,useRef,useState} from 'react'
import { useSearchParams } from "react-router-dom";

const JoinAfter = () => {
    const [searchParams] = useSearchParams();
    const roomID = searchParams.get("roomId");

    const progressRef = useRef(null);
    progressRef.current = 0;

    const canvasRef = useRef(null);

    // Inside your React component
useEffect(() => {
    // 1. Initialize the background Web Worker
    workerRef.current = new Worker(new URL('../render/renderWorker.js', import.meta.url), { type: 'module' });

    // 2. Transfer control of the canvas to the background thread[cite: 1]
    const offscreenCanvas = canvasRef.current.transferControlToOffscreen();

    // 3. Send the INIT_CANVAS command[cite: 1]
    workerRef.current.postMessage(
        { type: 'INIT_CANVAS', canvas: offscreenCanvas },
        [offscreenCanvas] // This array transfers memory ownership[cite: 1]
    );

    // Cleanup worker on unmount[cite: 1]
    return () => workerRef.current.terminate();
}, []);


function handleLoadModel(glbArrayBuffer, animationIndex, fps) {
    workerRef.current.postMessage({
        type: 'SETUP_SCENE',
        fileData: glbArrayBuffer,
        animationIndex: animationIndex,
        fps:fps
    });
}

function startRenderingTile(task) {
    workerRef.current.postMessage({
        type: 'RENDER_CHUNK',
        taskId: task.id,
        startX: task.startX,
        startY: task.startY,
        totalWidth: task.totalWidth,
        totalHeight: task.totalHeight,
        frame: task.frame,
        samples: task.samples,
        noiseThreashold: task.noiseThreashold,
    });
}

workerRef.current.onmessage = (event) => {
    const data = event.data;

    if (data.type === 'CHUNK_PROGRESS') {
        progressRef.current = data.progress; 
    }

    if (data.type === 'CHUNK_FINISHED') {
        const { taskId, pixels } = data;
        
        // Hand the final pixel array to SwarmClient to blast over WebRTC[cite: 1]
        swarmClient.submitRenderedTile(taskId, pixels);
    }
};

    return (
        <div className='w-[80%] h-2/3 flex justify-between flex-col geist-mono-regular'>
            <div className='flex justify-between items-center text-sm'>
                <div className='w-1/3'>
                    <div className='geist-mono-bold  mb-10'>
                        room : {roomID}
                    </div>

                    <div className='text-[#606060] mb-10'>
                        <p>Rendering</p>
                        <p>Frame</p>
                        <p>Chunk Assigned: </p>
                    </div>

                    <div className='border w-full p-4'>
                        <h3>Render Settings</h3>
                        <p className='text-[#606060] m-3'>
                            samples:
                        </p>
                        <p className='text-[#606060] m-3'>noise threshold: </p>
                    </div>

                </div>
                <div className='aspect-square w-5/16 bg-white'>
                    <canvas ref={canvasRef} className="w-full h-full" />
                </div>
            </div>
            <div className='w-full border'>
                <div className={`h-full bg-white text-black p-1 flex items-center justify-center`} style={{ width: `${progressRef.current * 100}%` }}>{progressRef.current*100}%</div>
            </div>
        </div>
    )
}

export default JoinAfter
