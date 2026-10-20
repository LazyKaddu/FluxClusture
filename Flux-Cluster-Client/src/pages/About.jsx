import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const SECTIONS = [
    { id: 'architect', label: '01 // THE ARCHITECT', title: 'Aashish Negi — Creator & Engineer' },
    { id: 'vision', label: '02 // THE VISION', title: 'The Idle GPU Hypothesis' },
    { id: 'stack', label: '03 // THE STACK', title: 'Architecture & Technology' },
    { id: 'design', label: '04 // THE DESIGN', title: 'Terminal HUD Philosophy' },
    { id: 'open-source', label: '05 // OPEN SOURCE', title: 'MIT License & Community' },
];

const About = () => {
    useSEO({
        title: 'About FluxCluster & Aashish Negi — Creator, Vision & Architecture',
        description: 'Meet Aashish Negi, the creator behind FluxCluster — a distributed browser-based GPU path-tracing swarm. Learn about the vision, architecture, tech stack, and open-source mission from Pauri Garhwal, Uttarakhand.',
        canonical: '/about',
        ogType: 'profile',
        jsonLd: {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            "mainEntity": {
                "@type": "Person",
                "name": "Aashish Negi",
                "url": "https://github.com/LazyKaddu",
                "jobTitle": "Creator & Systems Architect",
                "knowsAbout": [
                    "Distributed Computing",
                    "WebRTC",
                    "WebGL",
                    "WebGPU",
                    "Path Tracing",
                    "Full Stack Development"
                ],
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Pauri Garhwal",
                    "addressRegion": "Uttarakhand",
                    "addressCountry": "IN"
                }
            },
            "about": {
                "@type": "WebApplication",
                "name": "FluxCluster",
                "url": "https://flux-cluster.vercel.app/",
                "applicationCategory": "Distributed GPU Rendering",
                "operatingSystem": "Any modern web browser",
                "license": "https://opensource.org/licenses/MIT"
            },
            "datePublished": "2026-10-20",
            "dateModified": "2026-10-20"
        }
    });

    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('architect');
    const [scrollProgress, setScrollProgress] = useState(0);
    const [copied, setCopied] = useState(false);
    const contentContainerRef = useRef(null);

    // Track scroll progress and active section
    useEffect(() => {
        const container = contentContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const totalScroll = scrollHeight - clientHeight;
            if (totalScroll > 0) {
                setScrollProgress(Math.min(100, Math.max(0, (scrollTop / totalScroll) * 100)));
            }

            // Find current section in view
            for (let i = SECTIONS.length - 1; i >= 0; i--) {
                const el = document.getElementById(SECTIONS[i].id);
                if (el) {
                    const top = el.offsetTop - container.offsetTop;
                    if (scrollTop >= top - 200) {
                        setActiveSection(SECTIONS[i].id);
                        break;
                    }
                }
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const container = contentContainerRef.current;
        const target = document.getElementById(id);
        if (container && target) {
            const topPos = target.offsetTop - container.offsetTop - 30;
            container.scrollTo({ top: topPos, behavior: 'smooth' });
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin + '/about');
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <div
            ref={contentContainerRef}
            className="w-full h-screen overflow-y-auto overflow-x-hidden text-gray-200 bg-[#0d0d0d] selection:bg-[#AF3240] selection:text-white"
        >
            {/* Scroll Progress HUD Bar */}
            <div
                className="fixed top-0 left-0 h-1 bg-gradient-to-r from-[#AF3240] via-[#d4475a] to-[#AF3240] z-50 transition-all duration-75"
                style={{ width: `${scrollProgress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(scrollProgress)}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Page reading progress"
            />

            {/* Fixed Back to Home Button */}
            <div className="fixed top-3 left-4 sm:top-4 sm:left-6 md:left-8 z-50">
                <button
                    type="button"
                    id="btn-back-home"
                    onClick={() => navigate('/')}
                    aria-label="Back to home page"
                    className="group flex items-center gap-2.5 px-3.5 py-2 rounded-md border border-[#2a2a2a] bg-[#121212]/90 backdrop-blur-md text-xs space-mono-regular text-gray-300 hover:text-white hover:border-[#AF3240]/80 hover:bg-[#181818] transition-all cursor-pointer shadow-lg shadow-black/50"
                >
                    <span className="text-[#AF3240] group-hover:-translate-x-1 transition-transform inline-block font-bold">
                        &larr;
                    </span>
                    <span className="tracking-wider font-semibold">BACK TO HOME</span>
                    <span className="hidden sm:inline-block text-[10px] text-gray-500 border-l border-[#333] pl-2.5">
                        FLUX//CLUSTER
                    </span>
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 md:pt-28 pb-32">

                {/* Terminal HUD Meta Header */}
                <header className="mb-12 border border-[#262626] bg-[#121212]/90 backdrop-blur-md p-6 md:p-8 rounded-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#AF3240]" />

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs space-mono-regular text-[#AF3240] mb-4">
                        <span className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-[#AF3240] animate-pulse" />
                            &gt;_ ABOUT // FLUXCLUSTER
                        </span>
                        <span className="text-gray-400">OCTOBER 2026 • PROFILE</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 bebas-neue-regular uppercase">
                        About FluxCluster & Its Creator
                    </h1>

                    <p className="text-base sm:text-lg text-gray-300 space-mono-regular leading-relaxed max-w-4xl mb-6">
                        From the mountains of Uttarakhand to the bleeding edge of browser-based distributed computing — the story of FluxCluster and the engineer behind it.
                    </p>

                    {/* Author & Action Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#222]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded border border-[#AF3240]/50 bg-[#1a1a1a] flex items-center justify-center font-bold text-[#AF3240] bebas-neue-regular text-xl">
                                AN
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white space-mono-regular">
                                    Aashish Negi
                                    <span className="text-xs text-gray-400 ml-2">(@LazyKaddu)</span>
                                </div>
                                <div className="text-xs text-gray-400">Creator & Distributed Systems Architect • Pauri Garhwal, UK</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                id="btn-copy-about-link"
                                onClick={handleCopyLink}
                                aria-label="Copy about page link"
                                className="text-xs space-mono-regular px-3 py-1.5 rounded border border-[#333] hover:border-[#AF3240]/60 bg-[#181818] text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5 text-[#AF3240]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {copied ? 'LINK COPIED!' : 'SHARE PAGE'}
                            </button>
                        </div>
                    </div>

                    {/* Identity Tags */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#1e1e1e] text-[11px] space-mono-regular">
                        {['FULL_STACK', 'DISTRIBUTED_SYSTEMS', 'WEBRTC', 'WEBGL2', 'WEBGPU', 'OPEN_SOURCE'].map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded bg-black/60 border border-[#2a2a2a] text-gray-400">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </header>

                {/* Main Content Layout with Sticky TOC on Desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Sticky Table of Contents */}
                    <aside className="hidden lg:block lg:col-span-4 sticky top-20 space-mono-regular text-xs">
                        <div className="border border-[#262626] bg-[#111]/90 rounded-lg p-5">
                            <div className="text-[#AF3240] uppercase tracking-widest font-bold mb-4 pb-2 border-b border-[#222] flex items-center justify-between">
                                <span>TABLE OF CONTENTS</span>
                                <span className="text-[10px] text-gray-400">[INDEX]</span>
                            </div>
                            <nav aria-label="About Page Table of Contents" className="space-y-1">
                                {SECTIONS.map((sec) => {
                                    const isCurrent = activeSection === sec.id;
                                    return (
                                        <button
                                            key={sec.id}
                                            type="button"
                                            onClick={() => scrollToSection(sec.id)}
                                            className={`w-full text-left p-2 rounded transition-all flex flex-col gap-0.5 cursor-pointer ${isCurrent
                                                    ? 'bg-[#AF3240]/10 text-[#AF3240] border-l-2 border-[#AF3240] pl-3 font-semibold'
                                                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                                                }`}
                                        >
                                            <span className="text-[10px] tracking-wider text-gray-400">{sec.label}</span>
                                            <span className="truncate">{sec.title}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Quick Links Card */}
                            <div className="mt-6 pt-5 border-t border-[#222]">
                                <div className="text-[10px] text-gray-400 mb-3 uppercase tracking-wider">CONNECT</div>
                                <div className="space-y-2">
                                    <a
                                        href="https://github.com/LazyKaddu"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-black/50 border border-[#222] rounded text-gray-300 hover:text-white hover:border-[#AF3240]/40 transition-all no-underline"
                                    >
                                        <svg className="w-4 h-4 text-[#AF3240]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                        <span className="text-xs">GitHub // @LazyKaddu</span>
                                    </a>
                                    <a
                                        href="/blogs"
                                        onClick={(e) => { e.preventDefault(); navigate('/blogs'); }}
                                        className="flex items-center gap-2 p-2 bg-black/50 border border-[#222] rounded text-gray-300 hover:text-white hover:border-[#AF3240]/40 transition-all no-underline"
                                    >
                                        <svg className="w-4 h-4 text-[#AF3240]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                                        <span className="text-xs">Engineering Blog</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right Main Article */}
                    <article className="lg:col-span-8 space-y-16 space-mono-regular leading-relaxed text-gray-300 text-sm md:text-base">

                        {/* Section 1: The Architect */}
                        <section id="architect" aria-labelledby="heading-architect" className="scroll-mt-32">
                            <div className="text-xs text-[#AF3240] uppercase tracking-widest mb-1">01 // THE ARCHITECT</div>
                            <h2 id="heading-architect" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                Aashish Negi — Creator & Systems Engineer
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    I am <strong>Aashish Negi</strong>, a full-stack developer from <strong>Pauri Garhwal, Uttarakhand</strong> — a small mountain district in the Indian Himalayas. My work spans the entire engineering spectrum: from low-level WebGL shader pipelines and WebRTC binary data channels to React component architectures and distributed Redis-backed coordination planes.
                                </p>
                                <p>
                                    My journey into software engineering started with a fascination for how complex systems emerge from simple, well-designed primitives. Whether it is a physics simulation, a peer-to-peer mesh network, or a GPU ray-marching kernel — the elegance of systems thinking drives everything I build.
                                </p>
                                <div className="p-5 border-l-2 border-[#AF3240] bg-[#161616] rounded-r my-6">
                                    <p className="italic text-gray-200">
                                        "Innovation is not creating something out of the box — it is just taking the next step from the existing working models."
                                    </p>
                                </div>
                                <p>
                                    Building FluxCluster from a mountain town with variable connectivity was both a constraint and a forcing function. It pushed me to design for resilience — graceful WebRTC reconnection, minimal client bundle sizes, and offline-first worker state recovery. Every architectural decision was battle-tested against real-world network instability.
                                </p>
                            </div>
                        </section>

                        {/* Section 2: The Vision */}
                        <section id="vision" aria-labelledby="heading-vision" className="scroll-mt-32">
                            <div className="text-xs text-[#AF3240] uppercase tracking-widest mb-1">02 // THE VISION</div>
                            <h2 id="heading-vision" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                The Idle GPU Hypothesis: Democratizing Compute
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    At any given moment, hundreds of millions of web browsers are sitting idle worldwide. Inside those machines sit integrated and dedicated GPUs capable of trillions of floating-point operations per second — yet they sit dormant, rendering nothing more than static HTML.
                                </p>
                                <p>
                                    <strong>FluxCluster</strong> was conceived to answer a simple question: <em>what if we could link those idle browsers together — with zero installation — into a cooperative peer-to-peer GPU compute swarm?</em>
                                </p>
                                <p>
                                    Commercial render farms solve GPU-intensive rendering by throwing enterprise hardware (NVIDIA A100s, RTX 4090 clusters) at the problem in centralized data centers. But for students, indie creators, and hobbyist 3D artists, enterprise cloud rendering is prohibitively expensive and architecturally opaque. FluxCluster levels that playing field.
                                </p>
                                <div className="p-5 border-l-2 border-[#AF3240] bg-[#161616] rounded-r my-6">
                                    <p className="italic text-gray-200">
                                        No native binaries. No CUDA toolkit installs. No Docker containers. A user simply opens a browser tab, joins a room via WebRTC, and their GPU immediately begins path-tracing tiles — streaming pixels directly to the orchestrator over peer-to-peer data channels.
                                    </p>
                                </div>
                                <p>
                                    The architecture decouples lightweight signaling coordination (Socket.io + Redis) from heavy pixel data transport (WebRTC SCTP DataChannels), ensuring the server never becomes a bandwidth bottleneck. Once peers establish direct connections, raw rendered tiles flow directly between browsers at full bandwidth.
                                </p>
                            </div>
                        </section>

                        {/* Section 3: The Stack */}
                        <section id="stack" aria-labelledby="heading-stack" className="scroll-mt-32">
                            <div className="text-xs text-[#AF3240] uppercase tracking-widest mb-1">03 // THE STACK</div>
                            <h2 id="heading-stack" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                Architecture & Technology Breakdown
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    FluxCluster is built on a hybrid architecture: a lightweight centralized control plane for task orchestration, and a decentralized peer-to-peer data mesh for heavy pixel transport. Every layer is engineered for browser-native execution with zero external dependencies.
                                </p>

                                {/* Tech Stack Matrix */}
                                <div className="overflow-x-auto my-6 border border-[#262626] rounded-lg">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-[#1c1c1c] text-gray-300 uppercase">
                                            <tr>
                                                <th className="p-3 border-b border-[#333]">Layer</th>
                                                <th className="p-3 border-b border-[#333]">Technology</th>
                                                <th className="p-3 border-b border-[#333] text-[#AF3240]">Purpose in FluxCluster</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#222]">
                                            <tr>
                                                <td className="p-3 font-semibold text-white">Rendering Engine</td>
                                                <td className="p-3 text-gray-400">Three.js + three-gpu-pathtracer</td>
                                                <td className="p-3 text-[#d4475a]">WebGL2 GPU path-tracing with BVH acceleration</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold text-white">Peer Transport</td>
                                                <td className="p-3 text-gray-400">WebRTC SCTP DataChannels</td>
                                                <td className="p-3 text-[#d4475a]">Direct P2P binary pixel tile streaming (16KB sub-chunks)</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold text-white">Signaling</td>
                                                <td className="p-3 text-gray-400">Socket.io + Redis</td>
                                                <td className="p-3 text-[#d4475a]">Room management, SDP handshakes, task queue coordination</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold text-white">AI Denoising</td>
                                                <td className="p-3 text-gray-400">Intel OIDN (oidn-web)</td>
                                                <td className="p-3 text-[#d4475a]">WebGPU WGSL U-Net inference for noise-free renders</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold text-white">Frontend</td>
                                                <td className="p-3 text-gray-400">React 19 + Vite + TailwindCSS 4</td>
                                                <td className="p-3 text-[#d4475a]">SPA with GSAP animations and Lenis smooth scroll</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold text-white">3D Scene</td>
                                                <td className="p-3 text-gray-400">@react-three/fiber + drei</td>
                                                <td className="p-3 text-[#d4475a]">Declarative Three.js with custom GLSL shaders</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <p>
                                    The client application is a single-page React app bundled with Vite. GSAP powers scroll-triggered animations and GLSL shader transitions. The 3D network visualization on the home page uses custom vertex and fragment shaders for real-time node constellation rendering with proximity-based dynamic tethering.
                                </p>
                                <p>
                                    On the compute side, worker browser tabs receive GLB scene files via WebRTC, build local BVH acceleration structures using <code className="text-[#d4475a] bg-black/60 px-1 py-0.5 rounded">three-mesh-bvh</code>, and render assigned tile regions via <code className="text-[#d4475a] bg-black/60 px-1 py-0.5 rounded">three-gpu-pathtracer</code>. Completed tiles are sliced into 16KB binary chunks with a 12-byte header protocol and streamed back over WebRTC SCTP channels.
                                </p>
                            </div>
                        </section>

                        {/* Section 4: The Design */}
                        <section id="design" aria-labelledby="heading-design" className="scroll-mt-32">
                            <div className="text-xs text-[#AF3240] uppercase tracking-widest mb-1">04 // THE DESIGN</div>
                            <h2 id="heading-design" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                Terminal HUD: Design Philosophy
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    FluxCluster's interface draws inspiration from mission control dashboards and terminal HUDs — environments where data density and clarity coexist. The design philosophy is rooted in three principles:
                                </p>

                                <div className="space-y-4">
                                    <div className="border border-[#222] bg-[#141414] p-5 rounded-lg">
                                        <div className="flex items-center gap-2 text-[#AF3240] text-xs font-bold mb-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                                            PRINCIPLE 1: DARK-FIRST MINIMALISM
                                        </div>
                                        <p className="text-sm text-gray-300">
                                            Pure black and near-black backgrounds (<code className="text-white bg-black/60 px-1 py-0.5 rounded">#0d0d0d</code>, <code className="text-white bg-black/60 px-1 py-0.5 rounded">#141414</code>) reduce visual noise and let content breathe. Color is used sparingly and intentionally — crimson red (<code className="text-white bg-black/60 px-1 py-0.5 rounded">#AF3240</code>) for primary accents, muted grays for secondary text.
                                        </p>
                                    </div>

                                    <div className="border border-[#222] bg-[#141414] p-5 rounded-lg">
                                        <div className="flex items-center gap-2 text-[#AF3240] text-xs font-bold mb-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                                            PRINCIPLE 2: MONOSPACE TYPOGRAPHY
                                        </div>
                                        <p className="text-sm text-gray-300">
                                            The <strong>Space Mono</strong> typeface for body text and <strong>Bebas Neue</strong> for display headings create a technical, engineered atmosphere. Monospace type evokes terminal output and code editors — fitting for a tool built by engineers, for engineers.
                                        </p>
                                    </div>

                                    <div className="border border-[#222] bg-[#141414] p-5 rounded-lg">
                                        <div className="flex items-center gap-2 text-[#AF3240] text-xs font-bold mb-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                                            PRINCIPLE 3: DATA DENSITY WITH CLARITY
                                        </div>
                                        <p className="text-sm text-gray-300">
                                            Every visual element serves a purpose. Status indicators, progress bars, metric cards, and telemetry badges communicate system state at a glance. Borders and subtle background shifts (<code className="text-white bg-black/60 px-1 py-0.5 rounded">border-[#262626]</code>) delineate content regions without heavy separators. The interface feels alive — scroll progress bars, animated pulse indicators, and GSAP-driven transitions create a responsive, data-rich experience.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 5: Open Source */}
                        <section id="open-source" aria-labelledby="heading-open-source" className="scroll-mt-32">
                            <div className="text-xs text-[#AF3240] uppercase tracking-widest mb-1">05 // OPEN SOURCE</div>
                            <h2 id="heading-open-source" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                MIT License & Community
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    FluxCluster is <strong>100% open-source</strong> under the <strong>MIT License</strong>. Every line of code — from the WebRTC signaling server to the WebGPU denoiser pipeline to the React frontend — is publicly available on GitHub.
                                </p>
                                <p>
                                    The decision to open-source FluxCluster was deliberate from day one. Computing power should not be gated behind expensive cloud subscriptions. When we turn idle browsers into collaborative supercomputers, we level the playing field for every 3D artist, student, and indie developer on earth.
                                </p>

                                <div className="p-5 border-l-2 border-[#AF3240] bg-[#161616] rounded-r my-6">
                                    <p className="italic text-gray-200">
                                        "When you open-source your work, you are not giving it away — you are multiplying it. Every contributor, every fork, every issue filed makes the system stronger than any single engineer could."
                                    </p>
                                </div>

                                <p>
                                    Whether you want to contribute rendering optimizations, improve the WebRTC chunking protocol, add support for new 3D file formats, or simply use FluxCluster for your own projects — the code is yours. Fork it, break it, improve it, ship it.
                                </p>

                                <div className="mt-8 pt-8 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs text-gray-400">
                                        Ready to explore the code or join the swarm?
                                    </div>
                                    <div className="flex gap-3">
                                        <a
                                            href="https://github.com/LazyKaddu"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-[#AF3240] hover:bg-[#c43d4f] text-white font-bold text-xs space-mono-regular rounded transition-all no-underline inline-block"
                                        >
                                            GITHUB // @LAZYKADDU
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => scrollToSection('architect')}
                                            className="px-4 py-2 border border-[#333] hover:border-gray-500 text-gray-300 text-xs space-mono-regular rounded transition-all cursor-pointer"
                                        >
                                            BACK TO TOP &uarr;
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                    </article>
                </div>
            </div>
        </div>
    );
};

export default About;
