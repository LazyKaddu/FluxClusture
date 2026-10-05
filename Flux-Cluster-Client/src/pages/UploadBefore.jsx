import React, { useState, useEffect } from 'react'
import UploadBox from '../components/UploadBox';
import * as THREE from 'three'
import { loadGLB } from '../render/modelLoader.js';
import { useNavigate } from "react-router-dom";
import { generateSecureShortId, generateFileHash} from '../utils/helper.js'


const UploadBefore = () => {

    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [glbHash, setGlbHash] = useState(null);

    const [roomId, setRoomId] = useState(null);
    

    const [Animations, setAnimations] = useState([])
    const [animDurations, setAnimDurations] = useState([])
    const [Fps, setFps] = useState(30)
    const [RenderAnimation, setRenderAnimation] = useState(0)
    const [samples, setSamples] = useState(1024)
    const [noiseThreshold, setNoiseThreshold] = useState(0.1)

    const [width, setWidth] = useState(1920);
    const [height, setHeight] = useState(1080);

    const [masterWillRender, setMasterWillRender] = useState(true);

    const [min, setMin] = useState(0);
    const [max, setMax] = useState(120);

    const [start, setStart] = useState(min);
    const [end, setEnd] = useState(max);

    useEffect(() => {
        async function extractMetadata() {
            if (file) {
                try {
                    // Convert the raw File object directly into an ArrayBuffer
                    const buffer = await file.arrayBuffer();

                    const hash = await generateFileHash(buffer);
                    setGlbHash(hash);

                    setRoomId(generateSecureShortId())

                    // Pass it to your robust loader (which handles Draco if needed)
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
            // Duration * FPS = Total Frames
            const calculatedMax = Math.floor(durationInSeconds * Fps);

            setMax(calculatedMax);
            setStart(0);
            setEnd(calculatedMax);
        }
    }, [RenderAnimation, Fps, animDurations]);

    


    const createRoom = () => {
        console.log("clicked REnder")

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
            fps: Fps,
            samples: samples,
            noiseThreshold: noiseThreshold,
            width: width,
            height: height,
            masterWillRender: masterWillRender
        };

        navigate(`/editor`, { state: renderConfig })
    }


    return (
        <div className="h-full lg:h-[80%] max-h-screen w-full md:w-[90%] lg:w-[85%] xl:w-3/5 text-white font-mono flex flex-col pt-8 lg:pt-0">

            {/* HEADER: Flexbox for spacing between ends */}
            <header className="flex justify-between items-center mb-6 shrink-0">
                <div className="text-sm font-bold">&gt;_ upload</div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-gray-400">CLUSTER_READY</span>
                </div>
            </header>

            <div className='flex flex-col lg:flex-row justify-between gap-8 lg:gap-10 w-full h-full overflow-y-auto lg:overflow-visible pb-10 lg:pb-0 scrollbar-thin pr-2 lg:pr-0'>
                {/* Left Controls Section */}
                <div className='flex flex-col justify-between h-full w-full lg:w-[55%] gap-8 lg:gap-0'>
                    
                    {/* Animations and Quality Settings */}
                    <div className='flex flex-col md:flex-row gap-4 h-auto lg:h-[55%]'>
                        
                        <div className='border w-full md:w-[60%] h-48 md:h-full flex flex-col'>
                            <div className='border-b p-2 shrink-0'>
                                Animations
                            </div>
                            <div className='overflow-y-auto flex-1 scrollbar-thin'>
                                {
                                    (Animations.length ? Animations.map((anim, index) => {
                                        return (
                                            <p className={`pl-4 my-2 text-[#606060] cursor-pointer ${RenderAnimation === index ? 'text-black bg-white' : 'hover:text-white'}`} onClick={() => setRenderAnimation(index)}
                                            key={index}
                                            >
                                                {anim}
                                            </p>
                                        )
                                    })
                                        : (
                                            <p className="pl-4 my-2 text-gray-500">Upload Glb First</p>
                                        ))
                                }
                            </div>
                        </div>

                        <div className='flex flex-row md:flex-col justify-between w-full md:w-[40%] gap-4 md:gap-4'>
                            <div className='border flex-1 flex flex-col gap-2 items-center justify-center py-4'>
                                <div className='p-2 w-full text-center'>
                                    samples
                                </div>
                                <input
                                    type="number"
                                    placeholder='1024'
                                    className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center w-[80%]"
                                    value = {samples}
                                    onChange={(e)=> setSamples(e.target.value)}
                                />
                            </div>
                            <div className='border flex-1 flex flex-col gap-2 items-center justify-center py-4'>
                                <div className='p-2 w-full text-center text-sm lg:text-base'>
                                    noise Threshold
                                </div>
                                <input
                                    type="number"
                                    placeholder='0.1'
                                    className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center w-[80%]"
                                    value={noiseThreshold}
                                    onChange={(e)=>setNoiseThreshold(e.target.value)}
                                    />
                            </div>
                        </div>
                    </div>

                    {/* Rendering Range and Settings */}
                    <div className='w-full'>
                        <p className='mb-4'>render from range</p>
                        <div className="w-[80%] mb-8">

                            {/* Slider */}
                            <div className="relative h-6">
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
                            <div className="flex justify-between text-sm text-white/60">
                                <span>{start}</span>
                                <span>{end}</span>
                            </div>

                        </div>

                        <div className="flex flex-col md:flex-row gap-6 lg:gap-4">
                            <div className="flex-1 flex flex-col gap-4">
                                <div className='flex items-center gap-4'>
                                    <p className='w-12'>start</p>
                                    <input className='appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center flex-1'
                                        type="number"
                                        placeholder={start}
                                        value={start}
                                        onChange={(e) => {
                                            const value = Math.min(Number(e.target.value), end);
                                            setStart(value);
                                        }}
                                    />
                                </div>
                                <div className='flex items-center gap-4'>
                                    <p className='w-12'>end</p>
                                    <input className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center flex-1"
                                        type='number'
                                        placeholder={end}
                                        value={end}
                                        onChange={(e) => {
                                            const value = Math.max(Number(e.target.value), start);
                                            setEnd(value);
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex-1 flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <p className='w-14'>Fps</p>
                                    <input className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center flex-1"
                                        type='number'
                                        placeholder={30}
                                        value={Fps}
                                        onChange={(e) => (setFps(e.target.value))}
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className='w-14'>Width</p>
                                    <input className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center flex-1"
                                        type='number'
                                        value={width}
                                        placeholder="1900"
                                        onChange={(e) => setWidth(e.target.value)}
                                    />
                                </div >
                                <div className="flex items-center gap-4">
                                    <p className='w-14'>Height</p>
                                    <input className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center flex-1"
                                        type='number'
                                        placeholder="1400"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Preview Section */}
                <div className='w-full lg:w-[40%] flex flex-col justify-end'>
                    <div className='border aspect-square relative mb-4 flex flex-col'>
                        <p className='border-b p-2 w-full shrink-0'>asset model preview</p>
                        <div className='w-full flex-1 flex items-center justify-center overflow-hidden bg-black/50'>
                            <UploadBox file={file} setFile={setFile} loading={loading} setLoading={setLoading} previewUrl={previewUrl} setPreviewUrl={setPreviewUrl} />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="masterRender"
                            className="w-4 h-4 cursor-pointer"
                            checked={masterWillRender}
                            onChange={(e) => setMasterWillRender(e.target.checked)}
                        />
                        <label htmlFor="masterRender" className="text-sm cursor-pointer hover:text-gray-300">
                            I also want to render the chunk
                        </label>
                    </div>
                    
                    <button className='border w-full py-4 uppercase tracking-widest hover:bg-white hover:text-black transition-colors shrink-0' onClick={createRoom}>
                        start Rendering
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UploadBefore
