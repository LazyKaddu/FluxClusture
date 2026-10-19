import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ReactLenis } from 'lenis/react';
import ImageFade from '../components/ImageFade';
import HeroNetwork3D from '../components/HeroNetwork3D';
import { useSEO } from '../hooks/useSEO';


gsap.registerPlugin(ScrollTrigger);

const Home = () => {
    useSEO({
        title: 'Distributed GPU Path-Tracing Swarm & WebGL Render Farm',
        description: 'FluxCluster pools idle browser GPU compute via WebRTC and WebGL to render heavy 3D scenes with Intel OIDN AI denoising.',
        canonical: '/'
    });

    const containerRef = useRef(null);

    useGSAP(() => {
        const panels = gsap.utils.toArray('.snap-panel');

        // Find the exact DOM element ReactLenis created
        const scrollerElement = document.querySelector('.my-inner-scroller');

        ScrollTrigger.create({
            trigger: containerRef.current,
            // Pass the actual DOM element instead of a string ID
            scroller: scrollerElement,
            start: "top top",
            end: "bottom bottom",

            snap: {
                snapTo: 1 / (panels.length - 1),
                duration: { min: 0.2, max: 0.6 },
                delay: 0.1,
                ease: "power1.inOut",
                directional: true
            }
        });
    }, { scope: containerRef }); // Only runs after everything is rendered

    return (
        <ReactLenis
            // Changed from ID to className so we can securely query it
            className="my-inner-scroller relative w-full h-screen overflow-y-auto  scrollbar-none"
            options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}
        >
            <div ref={containerRef} className="relative space-mono-regular">

                <section aria-label="Introduction Hero" className="snap-panel flex justify-center flex-col items-center text-5xl md:text-7xl h-screen w-full text-[#606060] text-center px-4">
                    <h1 className="tracking-tight">
                        <span className='text-white font-bold'>NEW</span> ERA OF<br />COMPUTING
                    </h1>
                </section>

                <section aria-label="3D Distributed Swarm Network" className="snap-panel relative h-screen w-full bg-[#000000] overflow-hidden">
                    <HeroNetwork3D />
                </section>

                <section aria-label="About FluxCluster" className="snap-panel h-screen w-full flex flex-col md:flex-row items-center justify-center px-6">
                    <div className='w-full max-w-[250px] md:max-w-none md:w-[21vw] h-[350px] md:h-[28vw] mb-10 md:mb-0 md:mr-10 relative'>
                        <ImageFade
                            image={'/fluximage2Render.webp'}
                            fallback={'/fluximage2Render.png'}
                            alt="FluxCluster distributed GPU compute architecture and WebGL path tracing"
                        />
                    </div>
                    <div className='w-full md:w-2/5'>
                        <h2 className='text-3xl md:text-4xl mb-3 md:mb-5 text-center md:text-left'>FLUX <span className='text-xl md:text-2xl'>CLUSTER</span></h2>
                        <p className='text-xs md:text-sm text-[#606060] text-center md:text-left'>
                            FluxCluster is a fault-tolerant, hybrid distributed computing architecture that pools the idle GPU and CPU resources of standard browser tabs into a unified high-performance computing (HPC) cluster.
                            <br />
                            <br className="hidden md:block" />
                            <br className="hidden md:block" />

                            Designed to bypass the limitations of single-device rendering and central server bandwidth bottlenecks, it offloads heavy data distribution to a peer-to-peer swarm while maintaining precise task orchestration via a lightweight centralized control plane.
                        </p>
                    </div>
                </section>

                <section aria-label="Creator Profile and Mission" className="snap-panel h-screen w-full  flex flex-col items-center justify-center px-6">
                    <div className='flex flex-col-reverse md:w-3/5 md:flex-row justify-center md:justify-between items-center'>
                        <div className='w-full md:w-2/5 mt-10 md:mt-0 text-center md:text-left'>
                            <p className='text-[#606060] text-xs md:text-xs mb-8 md:mb-15'>
                                <span className='text-white text-lg md:text-2xl'>I</span> am Aashish Negi a Full stack developer from Uttrakhand Pauri Garhwal. Creating softwares that makes impact in the current world.
                            </p>
                            <p className='text-[#AF3240] text-base md:text-xl italic'>
                                “innovation is not creating something out of the box its just taking the next step from the existing working models“
                            </p>
                        </div>

                        <div className='w-full max-w-[250px] md:max-w-none md:w-[21vw] h-[350px] md:h-[28vw] relative'>
                            <ImageFade
                                image={'/fluximageRender.webp'}
                                fallback={'/fluximageRender.png'}
                                alt="Aashish Negi - Creator and Architect of FluxCluster"
                            />
                        </div>
                    </div>
                    <div className='w-full md:w-3/5 h-auto py-4 md:h-15 bg-white flex justify-center items-center text-black mt-8 text-xs md:text-sm text-center px-2'>
                        Pushing the boundaries of full-stack development — one commit at a time.
                    </div>
                </section>

            </div>
        </ReactLenis>
    );
};

export default Home;