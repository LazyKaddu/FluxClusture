import React, {useEffect, useState} from 'react'
import { useLocation } from 'react-router-dom';
import { swarmClient } from '../services/SwarmClient';

const UploadAfter = () => {
    const location = useLocation();
    const config = location.state;
    const [status, setStatus] = useState("Initializing...");

    const {roomId, file, fileHash, previewUrl, animationIndex, startFrame, endFrame, fps, samples, noiseThreshold, width, height } = config;

    useEffect(()=>{
        swarmClient.on('status', (msg) => {
            setStatus(msg);
            if (msg.includes("Ready to start job")) {
                swarmClient.startRenderJob(
                    roomId, 
                    startFrame, 
                    endFrame, 
                    width, 
                    height, 
                    fps, 
                    fileHash,
                    samples,
                    noiseThreshold,
                    animationIndex,
                );
            }
        });

        swarmClient.joinAsMaster(roomId, fileHash);
        swarmClient.setRenderSetting(swarmClient.socketManager.id, fileHash, width, height, noiseThreshold, samples, animationIndex, fps);




        return () => {
            if (swarmClient.socketManager.socket) {
                swarmClient.socketManager.socket.disconnect();
            }
        };
    },[roomId, fileHash, startFrame, endFrame, fps, width, height])
    
    let progress = 0.5;
    return (
        <div className='w-[84%] h-[90%] geist-mono-regular'>
            <div className='text-sm text-[#606060]'>
                <p className='text-white mb-2'>Room : {roomId}</p>
                <div className='mb-2'>
                    <p>Rendering : Clove.glb / Frame : 2/34 / Chunk Assigned : 64x64_00_00</p>
                    <p>samples: 1024 noise threshold: 0.01</p>
                </div>
            </div>
            <div className='bg-white w-full aspect-16/9 mb-4'>
                <img />
            </div>
            <div className='w-full flex justify-center'>


                <div className='w-[90%] border'>
                    <div className={`h-full bg-white text-black p-1 flex items-center justify-center`} style={{ width: `${progress * 100}%` }}>{progress * 100}%</div>
                </div>
            </div>

        </div>
    )
}

export default UploadAfter
