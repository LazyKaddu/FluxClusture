import React, { useState, useEffect } from 'react'
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import TextAnimated from './TextAnimated';



const NavLinks = ({ href, text }) => {
    return (
        <div className='text-8xl cursor-pointer'>
            <TextAnimated text={text} />
        </div>
    )
}




const Base = ({ childComponent: RenderPage }) => {
    let currentPage = "start";

    if (RenderPage.name === "Join") {
        currentPage = "end";
    } else if (RenderPage.name === "Upload") {
        currentPage = "center";
    }



    const mainRef = useRef(null);

    const timeline = useRef(null);

    // 2. React state to track if the animation is open or closed
    const [isActive, setIsActive] = useState(false);

    // 3. Set up the GSAP timeline only ONCE when the component mounts
    useEffect(() => {
        // Create a paused timeline
        timeline.current = gsap.timeline({ paused: true });

        // Add your animations to the timeline
        timeline.current.to(mainRef.current, {
            x: "-50vw",
            rotation: 12,      // Spin it  
            duration: 1,
            ease: "power2.inOut"
        });
    }, []); // Empty dependency array ensures this runs only once

    // 4. Watch the 'isActive' state and play/reverse accordingly
    useEffect(() => {
        if (isActive) {
            timeline.current.play();
        } else {
            timeline.current.reverse();
        }
    }, [isActive]);

    return (
        <main className='relative text-white bg-[#141414] overflow-hidden w-full h-screen'>
            <div className='absolute z-10 w-full bg-black flex justify-between min-h-screen' ref={mainRef} >
                <div className='flex flex-col justify-between ml-10 my-10'>
                    <div className='bebas-neue-regular capitalize '>
                        <span className=' text-4xl'>flux</span><br /><span className='text-xl relative bottom-3'>cluster</span>
                    </div>

                    <div className={'space-mono-regular flex transition-all' + `items-${currentPage}`}>
                        <div className='bg-white w-2 h-2 m-[5.5px]' />

                        <div className='text-sm'>
                            <div> DESC CLUSTER</div>
                            <div> UPLOAD TASK</div>
                            <div> JOIN TASK</div>
                        </div>
                    </div>
                    <div className='space-mono-regular text-sm'>
                        CREATE, BUILD, INNOVATE <br />
                        WHAT THE FUCK IS <br />
                        FLUX CLUSTER
                    </div>
                </div>
                <div className='w-7/11 h-screen flex items-center justify-center'>
                    <RenderPage />
                </div>
                <div className='flex flex-col justify-between items-end mr-10 my-10'>
                    <div className='bebas-neue-regular capitalize cursor-pointer text-xl' onClick={() => setIsActive(true)}>
                        <TextAnimated text={"MENU"} />
                    </div>
                    <div className='flex text-sm '>
                        <div className='mr-1'>
                            <div className='w-3 h-0.5 bg-white rotate-30 relative top-[10.5px] origin-right'></div>
                            <div className='w-3 h-0.5 bg-white -rotate-30 relative top-[8.5px] origin-right'></div>
                        </div>
                        <div className='space-mono-regular'>
                            <div>npm run FluxCluster</div>
                            <div className='text-blue-600'>running FluxCluster</div>
                            <div className='text-green-600'>all test passed</div>
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>
            <div className={'absolute w-1/2 right-0 h-screen flex flex-col items-end justify-between p-10'}>
                <div className='bebas-neue-regular capitalize cursor-pointer text-xl' onClick={() => setIsActive(false)}>
                    <TextAnimated text={"CLOSE"} />
                </div>
                <div className='bebas-neue-regular flex flex-col items-end'>
                    <NavLinks text={"ABOUT"} />
                    <NavLinks text={"BLOG"} />
                    <NavLinks text={"CONTACT"} />
                    <NavLinks text={"DESIGN"} />
                </div>
                <div className='text-right text-xs space-mono-regular'>
                    <div className='mb-2'>FLUX IS OPEN SOURCED UNDER MIT LICENCE <br />@GITHUB/LAZYKADDU</div>
                    <div>@FLUXCLUSTER || CREATING A DIFFERENCE</div>
                </div>

            </div>
        </main>
    )
}

export default Base
