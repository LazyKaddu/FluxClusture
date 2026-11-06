import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ReactLenis, useLenis } from 'lenis/react';
import ImageFade from '../components/ImageFade';
import HeroNetwork3D from '../components/HeroNetwork3D';
import { useSEO } from '../hooks/useSEO';

gsap.registerPlugin(ScrollTrigger);

function LenisScrollSync() {
    useLenis(() => {
        ScrollTrigger.update();
    });
    return null;
}

const Home = () => {
    useSEO({
        title: 'Distributed GPU Path-Tracing Swarm & WebGL Render Farm',
        description: 'FluxCluster pools idle browser GPU compute via WebRTC and WebGL to render heavy 3D scenes with Intel OIDN AI denoising.',
        canonical: '/'
    });

    const containerRef = useRef(null);

    useGSAP(() => {
        const panels = gsap.utils.toArray('.snap-panel');
        const scrollerElement = document.querySelector('.my-inner-scroller');

        ScrollTrigger.create({
            trigger: containerRef.current,
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

        ScrollTrigger.refresh();
    }, { scope: containerRef });

    return (
        <ReactLenis
            className="my-inner-scroller relative w-full h-screen overflow-y-auto scrollbar-none"
            options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}
        >
            <LenisScrollSync />
            <div ref={containerRef} className="relative font-sans text-[#ededed]">

                {/* Hero section */}
                <section aria-label="Introduction Hero" className="snap-panel flex justify-center flex-col items-center h-screen w-full text-center px-4">
                    <span className="text-xs font-mono text-[#AF3240] tracking-wider uppercase mb-4">
                        Distributed GPU Compute Swarm
                    </span>
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight text-[#ededed] max-w-4xl leading-tight">
                        A collaborative browser supercomputer
                    </h1>
                    <p className="mt-4 text-sm sm:text-base text-[#a1a1a6] max-w-lg font-mono">
                        Path-tracing complex 3D scenes through peer-to-peer idle GPU swarms.
                    </p>
                </section>

                {/* 3D Network simulation */}
                <section aria-label="3D Distributed Swarm Network" className="snap-panel relative h-screen w-full bg-[#0f0f10] overflow-hidden">
                    <HeroNetwork3D />
                </section>

                {/* About Section */}
                <section aria-label="About FluxCluster" className="snap-panel h-screen w-full flex flex-col md:flex-row items-center justify-center px-6">
                    <div className="w-full max-w-[250px] md:max-w-none md:w-[21vw] h-[350px] md:h-[28vw] mb-8 md:mb-0 md:mr-12 relative rounded-xl overflow-hidden border border-white/[0.08]">
                        <ImageFade
                            image={'/fluximage2Render.webp'}
                            fallback={'/fluximage2Render.png'}
                            alt="FluxCluster distributed GPU compute architecture and WebGL path tracing"
                        />
                    </div>
                    <div className="w-full md:w-2/5">
                        <span className="text-xs font-mono text-[#AF3240] uppercase tracking-wider block mb-2">
                            01 · Architecture
                        </span>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-[#ededed] mb-4">
                            Browser-native distributed rendering
                        </h2>
                        <p className="text-sm text-[#a1a1a6] leading-relaxed mb-4">
                            FluxCluster pools the idle GPU resources of standard browser tabs into a cooperative path-tracing cluster. By offloading pixel transmission to direct WebRTC data channels, the central server coordinates signaling while peers stream rendered chunks directly to the orchestrator.
                        </p>
                        <p className="text-xs font-mono text-[#85858b] border-l-2 border-[#AF3240] pl-3 py-1">
                            Three.js WebGL2 path-tracing · WebGPU Intel OIDN denoising · Redis atomic queue
                        </p>
                    </div>
                </section>

                {/* Mission & Creator Section */}
                <section aria-label="Creator Profile and Mission" className="snap-panel h-screen w-full flex flex-col items-center justify-center px-6">
                    <div className="flex flex-col-reverse md:w-3/5 md:flex-row justify-center md:justify-between items-center gap-8">
                        <div className="w-full md:w-1/2 text-center md:text-left">
                            <span className="text-xs font-mono text-[#AF3240] uppercase tracking-wider block mb-2">
                                02 · Engineering Mission
                            </span>
                            <p className="text-sm text-[#a1a1a6] leading-relaxed mb-6">
                                Conceived and engineered by <strong className="text-[#ededed] font-medium">Aashish Negi</strong> in Pauri Garhwal, Uttarakhand. Built under the constraint of variable mountain connectivity to ensure resilience under real-world network conditions.
                            </p>
                            <div className="p-4 rounded-lg bg-[#141415] border border-white/[0.08] border-l-2 border-l-[#AF3240] text-left">
                                <p className="text-xs italic text-[#ededed]">
                                    "Innovation is not creating something out of the box — it is taking the next step from existing working models."
                                </p>
                            </div>
                        </div>

                        <div className="w-full max-w-[250px] md:max-w-none md:w-[21vw] h-[350px] md:h-[28vw] relative rounded-xl overflow-hidden border border-white/[0.08]">
                            <ImageFade
                                image={'/fluximageRender.webp'}
                                fallback={'/fluximageRender.png'}
                                alt="Aashish Negi - Creator and Architect of FluxCluster"
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-3/5 py-3 px-4 rounded-lg bg-[#141415] border border-white/[0.08] flex items-center justify-center text-xs font-mono text-[#85858b] mt-8 text-center">
                        Open-source systems research · Democratizing distributed GPU compute for the web
                    </div>
                </section>

            </div>
        </ReactLenis>
    );
};

export default Home;
