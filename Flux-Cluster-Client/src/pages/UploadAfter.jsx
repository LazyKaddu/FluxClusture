import React from 'react'

const UploadAfter = () => {
    const roomId = "absd";
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
