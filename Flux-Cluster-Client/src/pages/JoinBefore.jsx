import React, { useState } from 'react'
import { useNavigate } from "react-router-dom";

const JoinBefore = () => {
    const navigate = useNavigate();
    const [RoomID, setRoomID] = useState("");

    const joinRoom = ()=>{
        navigate(`/joined?roomId=${RoomID}`)
    }


    return (
        <div className='border border-white/20 w-[95%] md:w-[70%] lg:w-[50%] xl:w-[40%] flex justify-center h-auto min-h-[50%] items-center geist-mono-regular p-8 lg:p-12 shadow-2xl bg-black/40'>
            <div className='flex justify-between flex-col w-full h-full gap-10'>
                <div className='flex justify-between items-center text-xs'>
                    <p className='geist-mono-bold text-lg'>&gt;_ JOIN ROOM</p>
                    <p className='text-xs text-[#606060] flex items-center gap-2'>
                        <span className='w-2 h-2 rounded-full inline-block bg-green-500 animate-pulse'></span> CLUSTER_READY
                    </p>
                </div>

                <div className='flex flex-col gap-4'>
                    <input 
                        placeholder='Enter Room Code ...' 
                        className='border border-white/40 bg-transparent w-full py-4 px-4 text-center text-sm outline-none focus:border-white transition-colors tracking-widest' 
                        value={RoomID} 
                        onChange={(e) => (setRoomID(e.target.value))} 
                    />
                    <button 
                        className='border border-white w-full py-4 flex items-center justify-center text-sm geist-mono-bold hover:bg-white hover:text-black transition-colors uppercase tracking-widest'
                        onClick={joinRoom}
                    >
                        [ EXECUTE_JOIN ]
                    </button>
                </div>
                
                <div className='flex justify-between text-xs mt-4'>
                    <p className='text-[#606060]'>
                        connection: stable//secured
                    </p>
                    <p className='text-indigo-700'>
                        v1.2.0-flux
                    </p>
                </div>
            </div>
        </div>
    )
}

export default JoinBefore
