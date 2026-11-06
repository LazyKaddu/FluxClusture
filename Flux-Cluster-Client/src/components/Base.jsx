import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import TextAnimated from './TextAnimated';
import { useNavigate, useLocation } from 'react-router-dom';

const NavLinks = ({ text, onClick }) => {
    return (
        <div className="text-4xl sm:text-6xl md:text-7xl font-sans font-medium cursor-pointer my-2 md:my-1 text-[#a1a1a6] hover:text-[#ededed] transition-colors" onClick={onClick}>
            <TextAnimated text={text} />
        </div>
    );
};

const Base = ({ childComponent: RenderPage }) => {
    let currentPage = "start";
    const navigate = useNavigate();
    const location = useLocation();

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

    // Only block computationally intensive worker/render routes on mobile
    const heavyPaths = ['/upload', '/render', '/editor', '/join', '/joined', '/demo'];
    const isHeavyRoute = heavyPaths.includes(location.pathname);

    return (
        <main className="relative text-[#ededed] bg-[#0f0f10] overflow-hidden w-full h-screen font-sans antialiased">
            <div className="absolute z-10 w-full bg-[#0f0f10] flex justify-between min-h-screen" ref={mainRef}>
                {/* Left Panel */}
                <header className="flex flex-col justify-between ml-5 md:ml-10 my-6 md:my-10 pointer-events-none z-20">
                    <a
                        href="/"
                        aria-label="FluxCluster Home"
                        className="pointer-events-auto cursor-pointer block text-[#ededed] no-underline"
                        onClick={(e) => { e.preventDefault(); navigate('/'); }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#AF3240]" />
                            <span className="font-mono text-sm tracking-wider uppercase font-medium">flux<span className="text-[#85858b]">cluster</span></span>
                        </div>
                    </a>

                    <nav aria-label="Main Navigation" className={'font-mono text-xs hidden md:flex transition-all pointer-events-auto ' + `items-${currentPage}`}>
                        <div className="bg-[#AF3240] w-1.5 h-1.5 my-auto mr-3 rounded-full" />
                        <ul className="list-none p-0 m-0 space-y-1.5">
                            <li>
                                <button
                                    type="button"
                                    id="nav-desc-cluster-btn"
                                    className="cursor-pointer text-[#85858b] hover:text-[#ededed] transition-colors bg-transparent border-0 p-0 text-left font-inherit"
                                    onClick={() => navigate('/')}
                                >
                                    Cluster overview
                                </button>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    id="nav-upload-task-btn"
                                    className="cursor-pointer text-[#85858b] hover:text-[#ededed] transition-colors bg-transparent border-0 p-0 text-left font-inherit"
                                    onClick={() => navigate('/upload')}
                                >
                                    Upload task
                                </button>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    id="nav-join-task-btn"
                                    className="cursor-pointer text-[#85858b] hover:text-[#ededed] transition-colors bg-transparent border-0 p-0 text-left font-inherit"
                                    onClick={() => navigate('/join')}
                                >
                                    Join task
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <div className="text-xs font-mono text-[#85858b] leading-relaxed hidden md:block">
                        Distributed GPU compute<br />
                        Browser-native swarm<br />
                        Zero local installation
                    </div>
                </header>

                {/* Center Content */}
                <div className="absolute inset-0 flex items-center justify-center w-full h-screen z-10 p-2 sm:p-4 md:p-6 overflow-y-auto">
                    {isMobile && isHeavyRoute ? (
                        <div className="flex flex-col items-center justify-center text-center px-8 z-50 pointer-events-auto max-w-md">
                            <span className="text-xs font-mono text-[#AF3240] uppercase tracking-wider mb-2">Notice</span>
                            <h2 className="text-2xl text-[#ededed] font-medium mb-3">Desktop Required</h2>
                            <p className="text-[#85858b] text-sm leading-relaxed mb-6">
                                Distributed path-tracing is computationally intensive. To prevent thermal throttling and memory exhaustion, mobile devices are restricted from participating as worker nodes or orchestrators.
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="px-4 py-2 text-xs font-mono rounded-lg bg-[#19191b] border border-white/[0.08] text-[#ededed] hover:bg-[#232325] transition-colors cursor-pointer"
                            >
                                Return to home
                            </button>
                        </div>
                    ) : (
                        <RenderPage />
                    )}
                </div>

                {/* Right Panel */}
                <aside aria-label="Status and Controls" className="flex flex-col justify-between items-end mr-5 md:mr-10 my-6 md:my-10 pointer-events-none z-20">
                    <button
                        id="nav-open-menu-btn"
                        type="button"
                        aria-label="Open Navigation Menu"
                        className="cursor-pointer text-xs font-mono pointer-events-auto px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#141415]/80 backdrop-blur-sm text-[#ededed] hover:border-white/[0.16] transition-colors"
                        onClick={() => setIsActive(true)}
                    >
                        <TextAnimated text={"MENU"} />
                    </button>

                    <div className="hidden md:flex flex-col items-end text-xs font-mono space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                            <span className="text-[#85858b]">Swarm online</span>
                        </div>
                        <div className="text-[11px] text-[#85858b]">WebRTC SCTP mesh</div>
                    </div>

                    <div className="hidden md:block" />
                </aside>
            </div>

            {/* Drawer menu */}
            <div className="absolute w-[85%] md:w-1/2 right-0 h-screen flex flex-col items-end justify-between p-6 md:p-12 bg-[#141415] border-l border-white/[0.08]">
                <button
                    id="nav-close-menu-btn"
                    type="button"
                    aria-label="Close Navigation Menu"
                    className="cursor-pointer text-xs font-mono text-[#85858b] hover:text-[#ededed] mt-4 md:mt-0 border-0 bg-transparent transition-colors"
                    onClick={() => setIsActive(false)}
                >
                    <TextAnimated text={"CLOSE"} />
                </button>

                <nav aria-label="Drawer Navigation" className="flex flex-col items-end space-y-2">
                    <NavLinks text={"ABOUT"} onClick={() => { setIsActive(false); navigate('/about'); }} />
                    <NavLinks text={"BLOG"} onClick={() => { setIsActive(false); navigate('/blogs'); }} />
                    <NavLinks text={"CONTACT"} onClick={() => { setIsActive(false); window.open('https://github.com/LazyKaddu', '_blank'); }} />
                    <NavLinks text={"DESIGN"} onClick={() => { setIsActive(false); navigate('/'); }} />
                </nav>

                <div className="text-right text-xs font-mono text-[#85858b] mb-4 md:mb-0 space-y-1">
                    <div>Open source under MIT License</div>
                    <div>github.com/LazyKaddu · @FluxCluster</div>
                </div>
            </div>
        </main>
    );
};

export default Base;
