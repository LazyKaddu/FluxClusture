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
                <header className='flex flex-col justify-between ml-5 md:ml-10 my-5 md:my-10 pointer-events-none z-20'>
                    <a href="/" aria-label="FluxCluster Home" className='bebas-neue-regular capitalize pointer-events-auto cursor-pointer block text-white no-underline' onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                        <span className='text-2xl md:text-4xl'>flux</span><br /><span className='text-sm md:text-xl relative bottom-2 md:bottom-3'>cluster</span>
                    </a>

                    <nav aria-label="Main Navigation" className={'space-mono-regular hidden md:flex transition-all pointer-events-auto ' + `items-${currentPage}`}>
                        <div className='bg-white w-2 h-2 m-[5.5px]' />
                        <ul className='text-sm list-none p-0 m-0'>
                            <li>
                                <button type="button" id="nav-desc-cluster-btn" className='cursor-pointer hover:text-gray-400 transition-colors bg-transparent border-0 text-white p-0 text-left font-inherit' onClick={() => navigate('/')}>DESC CLUSTER</button>
                            </li>
                            <li>
                                <button type="button" id="nav-upload-task-btn" className='cursor-pointer hover:text-gray-400 transition-colors bg-transparent border-0 text-white p-0 text-left font-inherit' onClick={() => navigate('/upload')}>UPLOAD TASK</button>
                            </li>
                            <li>
                                <button type="button" id="nav-join-task-btn" className='cursor-pointer hover:text-gray-400 transition-colors bg-transparent border-0 text-white p-0 text-left font-inherit' onClick={() => navigate('/join')}>JOIN TASK</button>
                            </li>
                        </ul>
                    </nav>
                    <div className='space-mono-regular text-sm hidden md:block'>
                        CREATE, BUILD, INNOVATE <br />
                        WHAT THE FUCK IS <br />
                        FLUX CLUSTER
                    </div>
                </header>

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
                <aside aria-label="Status and Controls" className='flex flex-col justify-between items-end mr-5 md:mr-10 my-5 md:my-10 pointer-events-none z-20'>
                    <button id="nav-open-menu-btn" type="button" aria-label="Open Navigation Menu" className='bebas-neue-regular capitalize cursor-pointer text-lg md:text-xl pointer-events-auto bg-black bg-opacity-50 p-2 rounded border-0 text-white' onClick={() => setIsActive(true)}>
                        <TextAnimated text={"MENU"} />
                    </button>
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
                </aside>
            </div>
            <div className={'absolute w-[85%] md:w-1/2 right-0 h-screen flex flex-col items-end justify-between p-6 md:p-10'}>
                <button id="nav-close-menu-btn" type="button" aria-label="Close Navigation Menu" className='bebas-neue-regular capitalize cursor-pointer text-lg md:text-xl mt-4 md:mt-0 border-0 bg-transparent text-white' onClick={() => setIsActive(false)}>
                    <TextAnimated text={"CLOSE"} />
                </button>
                <nav aria-label="Drawer Navigation" className='bebas-neue-regular flex flex-col items-end'>
                    <NavLinks text={"ABOUT"} />
                    <NavLinks text={"BLOG"} />
                    <NavLinks text={"CONTACT"} />
                    <NavLinks text={"DESIGN"} />
                </nav>
                <div className='text-right text-[10px] md:text-xs space-mono-regular mb-4 md:mb-0'>
                    <div className='mb-2'>FLUX IS OPEN SOURCED UNDER MIT LICENCE <br />@GITHUB/LAZYKADDU</div>
                    <div>@FLUXCLUSTER || CREATING A DIFFERENCE</div>
                </div>
            </div>
        </main>
    )
}

export default Base
