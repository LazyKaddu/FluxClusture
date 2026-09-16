import React, { useState } from 'react'
import UploadBox from '../components/UploadBox';

const UploadBefore = () => {


    let min = 0;
    let max = 120;


    const [start, setStart] = useState(min);
    const [end, setEnd] = useState(max);

    const [Animations, setAnimations] = useState(["hello", "bro", "my", "name", "is", "aashish"])
    const [RenderAnimation, setRenderAnimation] = useState(0)

    return (
        <div className="h-6/8 text-white font-mono w-full flex flex-col">

            {/* HEADER: Flexbox for spacing between ends */}
            <header className="flex justify-between items-center mb-6">
                <div className="text-sm font-bold">&gt;_ upload</div>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-gray-400">CLUSTER_READY</span>
                </div>
            </header>

            <div className='flex justify-between gap-10 w-full h-full'>
                <div className='flex flex-col justify-between h-full w-full'>
                    <div className='flex gap-4 h-4/7'>
                        <div className='border w-4/7'>
                            <div className='border-b p-2'>
                                Animations
                            </div>
                            <div className='overflow-scroll h-[87%] scrollbar-thin'>
                                {
                                    Animations.map((anim, index) => {
                                        return (
                                            <p className='pl-4 my-2' onClick={() => setRenderAnimation(index)}>
                                                {anim}
                                            </p>
                                        )
                                    })
                                }
                            </div>
                        </div>
                        <div className='flex flex-col justify-between'>

                            <div className='border h-3/7 flex gap-5 items-center flex-col'>
                                <div className='p-2 w-full'>
                                    samples
                                </div>
                                <input
                                    type="number"
                                    placeholder='1024'
                                    className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center w-[80%]"
                                />
                            </div>
                            <div className='border h-3/7 gap-5 flex items-center flex-col'>
                                <div className='p-2 w-full'>
                                    noise Threshold
                                </div>
                                <input
                                    type="number"
                                    placeholder='0.1'
                                    className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center w-[80%]" />
                            </div>


                        </div>
                    </div>
                    <div className=''>
                        <p>render from range</p>
                        <div className="w-[80%] mb-4">

                            {/* Slider */}
                            <div className="relative h-6">

                                {/* Track */}
                                <div className="absolute top-1/2 left-0 w-full h-0.5 -translate-y-1/2 bg-white/20" />

                                {/* Selected range */}
                                <div
                                    className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-white"
                                    style={{
                                        left: `${(start / max) * 100}%`,
                                        right: `${100 - (end / max) * 100}%`,
                                    }}
                                />

                                {/* Start */}
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

                                {/* End */}
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

                        <div>
                            <div className='flex gap-2'>
                                <p className='w-10'>start</p>
                                <input className='appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center w-[10%]'
                                    type="number"
                                    placeholder={start}
                                    onChange={(e) => {

                                        const value = Math.min(Number(e.target.value), end);
                                        setStart(value);
                                    }}
                                />
                            </div>
                            <div className='flex gap-2'>
                                <p className='w-10'>end</p>
                                <input className="appearance-none bg-transparent border-0 border-b border-white outline-none text-white text-center w-[10%]"
                                    type='number'
                                    placeholder={end}
                                    onChange={(e) => {
                                        const value = Math.max(Number(e.target.value), start);
                                        setEnd(value);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className=' w-5/9'>
                    <div className='border aspect-square relative mb-3'>
                        <p className='border-b p-2 w-full'>asset model preview</p>
                        <div className='w-full h-[90%] flex items-center justify-center'>
                            <UploadBox/>
                        </div>
                    </div>
                    <button className='border w-full aspect-6/1'>start Rendering</button>
                </div>
            </div>
        </div >
    )
}

export default UploadBefore
