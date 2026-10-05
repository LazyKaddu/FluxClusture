import React, { useState, useEffect } from 'react'
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import TextAnimated from './TextAnimated';
import { useNavigate } from 'react-router-dom';



const NavLinks = ({ href, text }) => {
    return (
        <div className='text-5xl md:text-8xl cursor-pointer my-2 md:my-0'>
            <TextAnimated text={text} />
        </div>
    )
}

const Base = ({ childComponent: RenderPage }) => {
    let currentPage = "start";
    const navigate = useNavigate();

    if (RenderPage.name === "JoinBefore" || RenderPage.name === "JoinAfter" || RenderPage.name === "Join") {
        currentPage = "end";
    } else if (RenderPage.name === "UploadBefore" || RenderPage.name === "UploadAfter" || RenderPage.name === "Upload" || RenderPage.name === "Editor") {
        currentPage = "center";
    }

    const mainRef = useRef(null);
    const timeline = useRef(null);
    const [isActive, setIsActive] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useGSAP(() => {
        let mm = gsap.matchMedia();
        
        mm.add("(max-width: 767px)", () => {
            timeline.current = gsap.timeline({ paused: true });
            timeline.current.to(mainRef.current, {
                x: "-85vw",
                rotation: 6,
                duration: 0.8,
                ease: "power2.inOut"
            });
            if (isActive) timeline.current.progress(1);
        });

        mm.add("(min-width: 768px)", () => {
            timeline.current = gsap.timeline({ paused: true });
            timeline.current.to(mainRef.current, {
                x: "-50vw",
                rotation: 12,
                duration: 1,
                ease: "power2.inOut"
            });
            if (isActive) timeline.current.progress(1);
        });

        return () => mm.revert();
    }, []);

    useEffect(() => {
        if (timeline.current) {
            if (isActive) {
                timeline.current.play();
            } else {
                timeline.current.reverse();
            }
        }
    }, [isActive]);

    // Check if the current route is NOT the home page
    const isHeavyRoute = typeof window !== 'undefined' && window.location.pathname !== '/';

    return (
        <main className='relative text-white bg-[#141414] overflow-hidden w-full h-screen'>
            <div className='absolute z-10 w-full bg-black flex justify-between min-h-screen' ref={mainRef} >
                {/* Left Panel */}
                <div className='flex flex-col justify-between ml-5 md:ml-10 my-5 md:my-10 pointer-events-none z-20'>
                    <div className='bebas-neue-regular capitalize pointer-events-auto cursor-pointer' onClick={() => navigate('/')}>
                        <span className=' text-2xl md:text-4xl'>flux</span><br /><span className='text-sm md:text-xl relative bottom-2 md:bottom-3'>cluster</span>
                    </div>

                    <div className={'space-mono-regular hidden md:flex transition-all pointer-events-auto ' + `items-${currentPage}`}>
                        <div className='bg-white w-2 h-2 m-[5.5px]' />
                        <div className='text-sm'>
                            <div className='cursor-pointer hover:text-gray-400 transition-colors' onClick={() => navigate('/')}> DESC CLUSTER</div>
                            <div className='cursor-pointer hover:text-gray-400 transition-colors' onClick={() => navigate('/upload')}> UPLOAD TASK</div>
                            <div className='cursor-pointer hover:text-gray-400 transition-colors' onClick={() => navigate('/join')}> JOIN TASK</div>
                        </div>
                    </div>
                    <div className='space-mono-regular text-sm hidden md:block'>
                        CREATE, BUILD, INNOVATE <br />
                        WHAT THE FUCK IS <br />
                        FLUX CLUSTER
                    </div>
                </div>

                {/* Center Content */}
                <div className='absolute inset-0 flex items-center justify-center w-full h-screen z-10'>
                    {isMobile && isHeavyRoute ? (
                        <div className="flex flex-col items-center justify-center text-center px-8 z-50 pointer-events-auto">
                            <h2 className="text-3xl text-[#AF3240] font-bold mb-4">Desktop Required</h2>
                            <p className="text-gray-400 text-sm max-w-sm">
                                Distributed path-tracing is a computationally heavy task. To prevent thermal throttling and network bottlenecks in the swarm, mobile devices are currently blocked from joining or orchestrating renders.
                            </p>
                        </div>
                    ) : (
                        <RenderPage />
                    )}
                </div>

                {/* Right Panel */}
                <div className='flex flex-col justify-between items-end mr-5 md:mr-10 my-5 md:my-10 pointer-events-none z-20'>
                    <div className='bebas-neue-regular capitalize cursor-pointer text-lg md:text-xl pointer-events-auto bg-black bg-opacity-50 p-2 rounded' onClick={() => setIsActive(true)}>
                        <TextAnimated text={"MENU"} />
                    </div>
                    <div className='hidden md:flex text-sm'>
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
                    <div className='hidden md:block'></div>
                </div>
            </div>
            <div className={'absolute w-[85%] md:w-1/2 right-0 h-screen flex flex-col items-end justify-between p-6 md:p-10'}>
                <div className='bebas-neue-regular capitalize cursor-pointer text-lg md:text-xl mt-4 md:mt-0' onClick={() => setIsActive(false)}>
                    <TextAnimated text={"CLOSE"} />
                </div>
                <div className='bebas-neue-regular flex flex-col items-end'>
                    <NavLinks text={"ABOUT"} />
                    <NavLinks text={"BLOG"} />
                    <NavLinks text={"CONTACT"} />
                    <NavLinks text={"DESIGN"} />
                </div>
                <div className='text-right text-[10px] md:text-xs space-mono-regular mb-4 md:mb-0'>
                    <div className='mb-2'>FLUX IS OPEN SOURCED UNDER MIT LICENCE <br />@GITHUB/LAZYKADDU</div>
                    <div>@FLUXCLUSTER || CREATING A DIFFERENCE</div>
                </div>
            </div>
        </main>
    )
}

export default Base
