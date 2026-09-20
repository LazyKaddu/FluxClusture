import React, { useState } from 'react'
import { useNavigate } from "react-router-dom";

const JoinBefore = () => {
    const navigate = useNavigate();
    const [RoomID, setRoomID] = useState("");

    const joinRoom = ()=>{
        navigate(`/joined?roomId=${RoomID}`)
    }


    return (
        <div className='border w-[80%] flex justify-center h-3/4 items-center geist-mono-regular'>
            <div className='flex justify-between flex-col w-1/2 h-2/3'>
                <div className='flex justify-between text-xs'>
                    <p className='geist-mono-bold '>&gt;_ JOIN ROOM</p>
                    <p className='text-xs text-[#606060]'><span className='w-2 h-2 rounded-full inline-block bg-green-500'></span> CLUSTER_READY</p>
                </div>

                <div>
                    <input placeholder='Enter Room Code ...' className='border w-full aspect-12/1 mb-4 p-2 text-sm' value={RoomID} onChange={(e) => (setRoomID(e.target.value))} />
                    <button className='border w-full aspect-12/1 p-2 flex items-center justify-center text-sm geist-mono-bold'
                        onClick={joinRoom}
                    >[ EXECUTE_JOIN ]</button>
                </div>
                <div className='flex justify-between text-xs'>
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
