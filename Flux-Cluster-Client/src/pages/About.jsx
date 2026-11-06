import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const SECTIONS = [
    { id: 'architect', label: '01 · The Architect', title: 'Aashish Negi — Creator & Engineer' },
    { id: 'vision', label: '02 · The Vision', title: 'The Idle GPU Hypothesis' },
    { id: 'stack', label: '03 · The Stack', title: 'Architecture & Technology' },
    { id: 'design', label: '04 · The Design', title: 'Terminal HUD Philosophy' },
    { id: 'open-source', label: '05 · Open Source', title: 'MIT License & Community' },
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

            for (let i = SECTIONS.length - 1; i >= 0; i--) {
                const el = document.getElementById(SECTIONS[i].id);
                if (el) {
                    const top = el.offsetTop - container.offsetTop;
                    if (scrollTop >= top - 180) {
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
            const topPos = target.offsetTop - container.offsetTop - 24;
            container.scrollTo({ top: topPos, behavior: 'smooth' });
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin + '/about');
            setCopied(true);
            setTimeout(() => setCopied(false), 2400);
        } catch {
            setCopied(true);
            setTimeout(() => setCopied(false), 2400);
        }
    };

    return (
        <div
            ref={contentContainerRef}
            className="w-full h-screen overflow-y-auto overflow-x-hidden text-[#ededed] bg-[#0f0f10] selection:bg-[#AF3240] selection:text-white font-sans antialiased"
        >
            {/* Scroll progress bar */}
            <div
                className="fixed top-0 left-0 h-0.5 bg-[#AF3240] z-50 transition-[width] duration-100 ease-out"
                style={{ width: `${scrollProgress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(scrollProgress)}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Page reading progress"
            />

            {/* Back to Home navigation */}
            <div className="fixed top-4 left-4 sm:left-8 z-40">
                <button
                    type="button"
                    id="btn-back-home"
                    onClick={() => navigate('/')}
                    aria-label="Back to home page"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/[0.08] bg-[#141415]/90 backdrop-blur-md text-xs font-mono text-[#a1a1a6] hover:text-[#ededed] hover:border-white/[0.16] hover:bg-[#19191b] transition-colors cursor-pointer shadow-sm"
                >
                    <svg className="w-3.5 h-3.5 text-[#a1a1a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    <span>BACK TO HOME</span>
                    <span className="hidden sm:inline-block text-[11px] text-[#85858b] border-l border-white/[0.08] pl-2">
                        FluxCluster
                    </span>
                </button>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-28">

                {/* Page header */}
                <header className="mb-12 border border-white/[0.08] bg-[#141415] rounded-xl p-6 sm:p-8 relative shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#85858b] mb-4">
                        <span className="inline-flex items-center gap-2 text-[#AF3240]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                            About · FluxCluster
                        </span>
                        <span>October 2026 · Systems Profile</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-[#ededed] mb-3">
                        About FluxCluster and its creator
                    </h1>

                    <p className="text-sm sm:text-base text-[#a1a1a6] leading-relaxed max-w-3xl mb-6">
                        From the mountains of Uttarakhand to browser-based distributed computing — the architecture, vision, and engineering behind FluxCluster.
                    </p>

                    {/* Author and action bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border border-white/[0.08] bg-[#19191b] flex items-center justify-center font-mono font-medium text-xs text-[#ededed]">
                                AN
                            </div>
                            <div>
                                <div className="text-sm font-medium text-[#ededed]">
                                    Aashish Negi
                                    <span className="text-xs text-[#85858b] font-mono ml-2">@LazyKaddu</span>
                                </div>
                                <div className="text-xs text-[#85858b]">Creator and systems architect · Pauri Garhwal, Uttarakhand</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                id="btn-copy-about-link"
                                onClick={handleCopyLink}
                                aria-label="Copy about page link"
                                className="text-xs font-mono px-3 py-1.5 rounded-md border border-white/[0.08] bg-[#19191b] text-[#a1a1a6] hover:text-[#ededed] hover:border-white/[0.16] transition-colors inline-flex items-center gap-2 cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5 text-[#85858b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-3.03a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                </svg>
                                <span>{copied ? 'Link copied' : 'Share profile'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Technology tags */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.04] text-xs font-mono">
                        {['Distributed systems', 'WebRTC SCTP', 'WebGL2', 'WebGPU WGSL', 'Intel OIDN', 'Open source'].map(tag => (
                            <span key={tag} className="px-2.5 py-0.5 rounded-md bg-[#19191b] border border-white/[0.06] text-[#85858b]">
                                {tag}
                            </span>
                        ))}
                    </div>
                </header>

                {/* Content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Sticky Table of Contents */}
                    <aside className="hidden lg:block lg:col-span-4 sticky top-20 text-xs font-mono">
                        <div className="border border-white/[0.08] bg-[#141415] rounded-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            <div className="text-[11px] uppercase tracking-wider text-[#85858b] mb-3 pb-2 border-b border-white/[0.06] flex items-center justify-between">
                                <span>Contents</span>
                                <span className="text-[10px] text-[#85858b]">5 sections</span>
                            </div>
                            <nav aria-label="About Page Table of Contents" className="space-y-1">
                                {SECTIONS.map((sec) => {
                                    const isCurrent = activeSection === sec.id;
                                    return (
                                        <button
                                            key={sec.id}
                                            type="button"
                                            onClick={() => scrollToSection(sec.id)}
                                            className={`w-full text-left px-3 py-2 rounded-md transition-colors flex flex-col gap-0.5 cursor-pointer ${isCurrent
                                                    ? 'bg-[#19191b] text-[#ededed] border-l-2 border-[#AF3240] pl-2.5 font-medium'
                                                    : 'text-[#85858b] hover:text-[#ededed] hover:bg-[#19191b]/50'
                                                }`}
                                        >
                                            <span className="text-[10px] text-[#85858b]">{sec.label}</span>
                                            <span className="truncate text-xs font-sans">{sec.title}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* External Links */}
                            <div className="mt-5 pt-4 border-t border-white/[0.06]">
                                <div className="text-[10px] uppercase tracking-wider text-[#85858b] mb-2">Reference</div>
                                <div className="space-y-1.5">
                                    <a
                                        href="https://github.com/LazyKaddu"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-2 rounded-md border border-white/[0.06] bg-[#19191b]/60 text-[#a1a1a6] hover:text-[#ededed] hover:border-white/[0.12] transition-colors no-underline"
                                    >
                                        <span className="text-xs">GitHub repository</span>
                                        <svg className="w-3.5 h-3.5 text-[#85858b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                        </svg>
                                    </a>
                                    <a
                                        href="/blogs"
                                        onClick={(e) => { e.preventDefault(); navigate('/blogs'); }}
                                        className="flex items-center justify-between p-2 rounded-md border border-white/[0.06] bg-[#19191b]/60 text-[#a1a1a6] hover:text-[#ededed] hover:border-white/[0.12] transition-colors no-underline"
                                    >
                                        <span className="text-xs">Engineering blog</span>
                                        <svg className="w-3.5 h-3.5 text-[#85858b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main article */}
                    <article className="lg:col-span-8 space-y-14 text-sm sm:text-base text-[#a1a1a6] leading-relaxed">

                        {/* Section 1: The Architect */}
                        <section id="architect" aria-labelledby="heading-architect" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">01 · The Architect</div>
                            <h2 id="heading-architect" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                Aashish Negi — Creator and systems engineer
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    I am <strong className="text-[#ededed] font-medium">Aashish Negi</strong>, a full-stack developer based in <strong className="text-[#ededed] font-medium">Pauri Garhwal, Uttarakhand</strong> — a mountain district in the Indian Himalayas. My work spans the graphics and systems spectrum: from WebGL shader pipelines and WebRTC binary data channels to React component architectures and distributed Redis coordination planes.
                                </p>
                                <p>
                                    My interest in software engineering centers on how complex systems emerge from simple, well-defined primitives. Whether building a physics simulation, a peer-to-peer data mesh, or a GPU ray-marching kernel, systems thinking informs every design decision.
                                </p>
                                <div className="p-4 border-l-2 border-[#AF3240] bg-[#19191b] rounded-r-lg my-6">
                                    <p className="text-sm italic text-[#ededed]">
                                        "Innovation is not creating something out of the box — it is taking the next step from existing working models."
                                    </p>
                                </div>
                                <p>
                                    Building FluxCluster from a mountain region with variable connectivity served as a practical forcing function. It required designing for real-world resilience: predictable WebRTC reconnection, compact client bundle sizes, and offline-tolerant worker state recovery.
                                </p>
                            </div>
                        </section>

                        {/* Section 2: The Vision */}
                        <section id="vision" aria-labelledby="heading-vision" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">02 · The Vision</div>
                            <h2 id="heading-vision" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                The idle GPU hypothesis: cooperative compute in the browser
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    At any given moment, hundreds of millions of web browsers sit open and idle worldwide. The machines running them house integrated and dedicated GPUs capable of trillions of floating-point operations per second, yet their computational capacity remains unused outside of basic UI rendering.
                                </p>
                                <p>
                                    <strong className="text-[#ededed] font-medium">FluxCluster</strong> evaluates a straightforward proposition: link idle browser tabs together through peer-to-peer WebRTC connections into a cooperative GPU rendering swarm, requiring zero local software installation.
                                </p>
                                <p>
                                    Commercial render farms solve rendering demands with centralized cloud clusters (NVIDIA A100s or RTX 4090s) in enterprise data centers. For students, independent creators, and researchers, cloud compute costs can be a barrier. FluxCluster offers a peer-to-peer alternative.
                                </p>

                                {/* Visual Moment: Swarm Architecture Diagram */}
                                <div className="border border-white/[0.08] bg-[#141415] rounded-xl p-5 my-6">
                                    <div className="text-xs font-mono text-[#85858b] uppercase tracking-wider mb-4 flex items-center justify-between">
                                        <span>Swarm Architecture Topology</span>
                                        <span className="text-[#AF3240]">WebRTC P2P Data Mesh</span>
                                    </div>
                                    <svg className="w-full h-auto text-xs font-mono" viewBox="0 0 680 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        {/* Background Grid */}
                                        <defs>
                                            <pattern id="grid-pattern-about" width="20" height="20" patternUnits="userSpaceOnUse">
                                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                            </pattern>
                                        </defs>
                                        <rect width="680" height="260" fill="url(#grid-pattern-about)" rx="8" />

                                        {/* Master Node */}
                                        <rect x="30" y="80" width="160" height="100" rx="8" fill="#19191b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                        <text x="45" y="105" fill="#ededed" fontSize="12" fontWeight="500">Master Browser</text>
                                        <text x="45" y="125" fill="#85858b" fontSize="10">GLTF scene parser</text>
                                        <text x="45" y="142" fill="#85858b" fontSize="10">256x256 tile partitioner</text>
                                        <text x="45" y="159" fill="#85858b" fontSize="10">Display canvas blitter</text>

                                        {/* Signaling Control Plane */}
                                        <rect x="260" y="20" width="160" height="60" rx="8" fill="#19191b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                        <text x="275" y="42" fill="#ededed" fontSize="11" fontWeight="500">Signaling Server</text>
                                        <text x="275" y="60" fill="#85858b" fontSize="9">Socket.io + Redis SDP</text>

                                        {/* Peer Workers */}
                                        <rect x="490" y="30" width="160" height="60" rx="8" fill="#19191b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                        <text x="505" y="52" fill="#ededed" fontSize="11" fontWeight="500">Worker Node 01</text>
                                        <text x="505" y="70" fill="#85858b" fontSize="9">WebGL2 path-tracing</text>

                                        <rect x="490" y="105" width="160" height="60" rx="8" fill="#19191b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                        <text x="505" y="127" fill="#ededed" fontSize="11" fontWeight="500">Worker Node 02</text>
                                        <text x="505" y="145" fill="#85858b" fontSize="9">WebGPU OIDN denoiser</text>

                                        <rect x="490" y="180" width="160" height="60" rx="8" fill="#19191b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                                        <text x="505" y="202" fill="#ededed" fontSize="11" fontWeight="500">Worker Node N</text>
                                        <text x="505" y="220" fill="#85858b" fontSize="9">Dynamic BVH worker</text>

                                        {/* Signaling Paths */}
                                        <path d="M 190 100 L 260 50" stroke="#85858b" strokeWidth="1" strokeDasharray="3 3" />
                                        <path d="M 420 50 L 490 50" stroke="#85858b" strokeWidth="1" strokeDasharray="3 3" />

                                        {/* Direct P2P Data Channels */}
                                        <path d="M 190 120 L 490 60" stroke="#AF3240" strokeWidth="1.5" />
                                        <path d="M 190 130 L 490 135" stroke="#AF3240" strokeWidth="1.5" />
                                        <path d="M 190 140 L 490 210" stroke="#AF3240" strokeWidth="1.5" />

                                        {/* Labels */}
                                        <rect x="285" y="132" width="110" height="20" rx="4" fill="#0f0f10" stroke="#AF3240" strokeWidth="0.8" />
                                        <text x="292" y="146" fill="#ededed" fontSize="9">WebRTC SCTP (16KB)</text>
                                    </svg>
                                    <div className="mt-3 text-xs text-[#85858b] flex items-center justify-between">
                                        <span>Dotted: Lightweight signaling handshakes</span>
                                        <span>Crimson: Direct peer-to-peer pixel streams</span>
                                    </div>
                                </div>

                                <p>
                                    No native binaries, Docker containers, or graphics driver toolkits are required. A user opens a browser tab, enters a room token, and their GPU immediately starts rendering path-traced tiles, streaming finished pixel data directly to the orchestrator over peer-to-peer data channels.
                                </p>
                            </div>
                        </section>

                        {/* Section 3: The Stack */}
                        <section id="stack" aria-labelledby="heading-stack" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">03 · The Stack</div>
                            <h2 id="heading-stack" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                Architecture and technology breakdown
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    FluxCluster uses a hybrid topology: a lightweight centralized control plane for task coordination, and a decentralized peer-to-peer data mesh for binary pixel transmission.
                                </p>

                                {/* Tech Stack Matrix */}
                                <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#141415] my-6">
                                    <table className="w-full text-left text-xs font-mono">
                                        <thead className="bg-[#19191b] text-[#85858b] uppercase tracking-wider border-b border-white/[0.08]">
                                            <tr>
                                                <th className="p-3.5 font-medium">Layer</th>
                                                <th className="p-3.5 font-medium">Technology</th>
                                                <th className="p-3.5 font-medium">Role in system</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Rendering engine</td>
                                                <td className="p-3.5 text-[#a1a1a6]">Three.js + three-gpu-pathtracer</td>
                                                <td className="p-3.5 text-[#85858b]">WebGL2 GPU path tracing with BVH acceleration</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Peer transport</td>
                                                <td className="p-3.5 text-[#a1a1a6]">WebRTC SCTP DataChannels</td>
                                                <td className="p-3.5 text-[#85858b]">P2P binary pixel tile streaming (16KB sub-chunks)</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Signaling plane</td>
                                                <td className="p-3.5 text-[#a1a1a6]">Socket.io + Redis</td>
                                                <td className="p-3.5 text-[#85858b]">Room management, SDP handshakes, task queue state</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Neural denoising</td>
                                                <td className="p-3.5 text-[#a1a1a6]">Intel OIDN (oidn-web)</td>
                                                <td className="p-3.5 text-[#85858b]">WebGPU WGSL U-Net inference for noise filtering</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Client interface</td>
                                                <td className="p-3.5 text-[#a1a1a6]">React 19 + Vite + TailwindCSS</td>
                                                <td className="p-3.5 text-[#85858b]">Telemetry HUD, real-time node state, GSAP transitions</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">3D Scene graph</td>
                                                <td className="p-3.5 text-[#a1a1a6]">@react-three/fiber + drei</td>
                                                <td className="p-3.5 text-[#85858b]">Declarative scene hierarchy with custom GLSL shaders</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <p>
                                    Worker browser tabs receive GLB scene files via WebRTC data channels, construct local Bounding Volume Hierarchy acceleration structures using <code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded border border-white/[0.06]">three-mesh-bvh</code>, and render assigned tile regions. Completed tiles are sliced into 16KB binary chunks with a 12-byte header and streamed back to the master.
                                </p>
                            </div>
                        </section>

                        {/* Section 4: The Design */}
                        <section id="design" aria-labelledby="heading-design" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">04 · The Design</div>
                            <h2 id="heading-design" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                Terminal telemetry: design principles
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    FluxCluster draws layout inspiration from mission control consoles and engineering telemetry HUDs — environments where data density and operational clarity must coexist.
                                </p>

                                <div className="space-y-4 mt-6">
                                    <div className="border border-white/[0.08] bg-[#141415] p-5 rounded-xl">
                                        <div className="flex items-center gap-2 text-xs font-mono text-[#AF3240] mb-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                                            <span>Principle 1 · Dark-first quiet chrome</span>
                                        </div>
                                        <p className="text-sm text-[#a1a1a6]">
                                            Neutral graphite surfaces (<code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">#0f0f10</code>, <code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">#141415</code>) provide a calm backdrop. Color is reserved for state indicators and the single crimson accent (<code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">#AF3240</code>).
                                        </p>
                                    </div>

                                    <div className="border border-white/[0.08] bg-[#141415] p-5 rounded-xl">
                                        <div className="flex items-center gap-2 text-xs font-mono text-[#AF3240] mb-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                                            <span>Principle 2 · Monospace telemetry with readable sans prose</span>
                                        </div>
                                        <p className="text-sm text-[#a1a1a6]">
                                            Long-form reading is rendered in clean proportional type for endurance, while monospace type is deliberately reserved for network coordinates, packet headers, metrics, and code snippets.
                                        </p>
                                    </div>

                                    <div className="border border-white/[0.08] bg-[#141415] p-5 rounded-xl">
                                        <div className="flex items-center gap-2 text-xs font-mono text-[#AF3240] mb-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                                            <span>Principle 3 · Data density without visual noise</span>
                                        </div>
                                        <p className="text-sm text-[#a1a1a6]">
                                            Telemetry indicators, progress bars, and worker states communicate node health directly. Thin hairlines (<code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">border-white/[0.08]</code>) segment regions cleanly without heavy borders or decorative shadows.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 5: Open Source */}
                        <section id="open-source" aria-labelledby="heading-open-source" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">05 · Open Source</div>
                            <h2 id="heading-open-source" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                MIT License and community
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    FluxCluster is open-source software distributed under the <strong className="text-[#ededed] font-medium">MIT License</strong>. The entire repository — from the WebRTC signaling coordination plane to the WebGPU denoising pipeline and React client — is public on GitHub.
                                </p>
                                <p>
                                    Distributed compute should remain accessible to students, hobbyists, and developers without costly cloud subscriptions.
                                </p>

                                <div className="p-4 border-l-2 border-[#AF3240] bg-[#19191b] rounded-r-lg my-6">
                                    <p className="text-sm italic text-[#ededed]">
                                        "When you open-source systems work, every contributor, benchmark, and issue report tests the architecture against conditions no single engineer could replicate."
                                    </p>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs font-mono text-[#85858b]">
                                        Explore the codebase or join the swarm on GitHub
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href="https://github.com/LazyKaddu"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3.5 py-2 bg-[#AF3240] hover:bg-[#972935] text-white text-xs font-mono rounded-md transition-colors no-underline inline-flex items-center gap-2"
                                        >
                                            <span>GitHub repository</span>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                            </svg>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => scrollToSection('architect')}
                                            className="px-3.5 py-2 border border-white/[0.08] hover:border-white/[0.16] text-[#a1a1a6] hover:text-[#ededed] text-xs font-mono rounded-md transition-colors cursor-pointer"
                                        >
                                            Back to top ↑
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
