import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const SECTIONS = [
    { id: 'genesis', label: '01 · Genesis', title: 'The Idle GPU Hypothesis' },
    { id: 'architecture', label: '02 · Architecture', title: 'Swarm Topology vs Central Control' },
    { id: 'crucible', label: '03 · Breakthroughs', title: '5 Core Systems Breakthroughs' },
    { id: 'neural-denoising', label: '04 · Neural Denoising', title: 'Intel OIDN in the Browser' },
    { id: 'personal-journey', label: '05 · Journey', title: 'Reflections from Pauri Garhwal' },
    { id: 'horizon', label: '06 · Horizon', title: 'Next Frontier: Pure WebGPU Compute' },
];

const Blogs = () => {
    useSEO({
        title: 'Engineering Chronicles: Building a Distributed GPU Render Farm in the Browser',
        description: 'How FluxCluster was conceived, the architectural breakthroughs (WebRTC 16KB sub-chunk streaming, WebGL coordinate inversion, WebGPU Intel OIDN AI denoising), and creator Aashish Negi\'s journey.',
        canonical: '/blogs',
        ogType: 'article',
        jsonLd: {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": "Engineering Chronicles: Building a Distributed GPU Render Farm in the Browser",
            "description": "How FluxCluster was conceived, the architectural breakthroughs (WebRTC 16KB sub-chunk streaming, WebGL coordinate inversion, WebGPU Intel OIDN AI denoising), and creator Aashish Negi's personal reflections.",
            "image": "https://flux-cluster.vercel.app/fluximageRender.webp",
            "author": {
                "@type": "Person",
                "name": "Aashish Negi",
                "url": "https://github.com/LazyKaddu",
                "jobTitle": "Creator & Systems Architect",
                "address": {
                    "@type": "PostalAddress",
                    "addressRegion": "Uttarakhand",
                    "addressCountry": "IN"
                }
            },
            "publisher": {
                "@type": "Organization",
                "name": "FluxCluster",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://flux-cluster.vercel.app/favicon.svg"
                }
            },
            "datePublished": "2026-10-19",
            "dateModified": "2026-10-19",
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "https://flux-cluster.vercel.app/blogs"
            },
            "keywords": [
                "Distributed Computing",
                "WebRTC DataChannel",
                "WebGL Path Tracing",
                "WebGPU",
                "Intel OIDN",
                "Peer to Peer Render Farm"
            ]
        }
    });

    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('genesis');
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
            await navigator.clipboard.writeText(window.location.origin + '/blogs');
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
                aria-label="Article reading progress"
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

                {/* Article Header */}
                <header className="mb-12 border border-white/[0.08] bg-[#141415] rounded-xl p-6 sm:p-8 relative shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#85858b] mb-4">
                        <span className="inline-flex items-center gap-2 text-[#AF3240]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#AF3240]" />
                            Engineering chronicle · Technical deep dive
                        </span>
                        <span>October 2026 · 12 min read</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-[#ededed] mb-3">
                        Engineering Chronicles: Building a Distributed GPU Render Farm in the Browser
                    </h1>

                    <p className="text-sm sm:text-base text-[#a1a1a6] leading-relaxed max-w-3xl mb-6">
                        Overcoming WebRTC 64KB SCTP packet boundaries, WebGL inverted coordinate spaces, atomic state synchronization, and compiling Intel OIDN neural denoising for in-browser WebGPU execution.
                    </p>

                    {/* Author & Telemetry Badges */}
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
                                id="btn-copy-blog-link"
                                onClick={handleCopyLink}
                                aria-label="Copy blog post link"
                                className="text-xs font-mono px-3 py-1.5 rounded-md border border-white/[0.08] bg-[#19191b] text-[#a1a1a6] hover:text-[#ededed] hover:border-white/[0.16] transition-colors inline-flex items-center gap-2 cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5 text-[#85858b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-3.03a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                </svg>
                                <span>{copied ? 'Link copied' : 'Share article'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Tech Badges */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.04] text-xs font-mono">
                        {['WebRTC SCTP', 'WebGL2', 'WebGPU WGSL', 'Intel OIDN', 'Redis queues', 'Peer-to-peer'].map(tag => (
                            <span key={tag} className="px-2.5 py-0.5 rounded-md bg-[#19191b] border border-white/[0.06] text-[#85858b]">
                                {tag}
                            </span>
                        ))}
                    </div>
                </header>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Sticky Table of Contents & Benchmark card */}
                    <aside className="hidden lg:block lg:col-span-4 sticky top-20 text-xs font-mono">
                        <div className="border border-white/[0.08] bg-[#141415] rounded-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            <div className="text-[11px] uppercase tracking-wider text-[#85858b] mb-3 pb-2 border-b border-white/[0.06] flex items-center justify-between">
                                <span>Contents</span>
                                <span className="text-[10px] text-[#85858b]">6 sections</span>
                            </div>
                            <nav aria-label="Article Table of Contents" className="space-y-1">
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

                            {/* Benchmark metrics */}
                            <div className="mt-5 pt-4 border-t border-white/[0.06]">
                                <div className="text-[10px] uppercase tracking-wider text-[#85858b] mb-3">Cluster telemetry metrics</div>
                                <div className="grid grid-cols-2 gap-2 text-left">
                                    <div className="p-2.5 bg-[#19191b] border border-white/[0.06] rounded-lg">
                                        <div className="text-[#ededed] text-base font-medium tabular-nums">16 KB</div>
                                        <div className="text-[10px] text-[#85858b] mt-0.5">SCTP slice size</div>
                                    </div>
                                    <div className="p-2.5 bg-[#19191b] border border-white/[0.06] rounded-lg">
                                        <div className="text-[#ededed] text-base font-medium tabular-nums">1.83 MB</div>
                                        <div className="text-[10px] text-[#85858b] mt-0.5">OIDN U-Net model</div>
                                    </div>
                                    <div className="p-2.5 bg-[#19191b] border border-white/[0.06] rounded-lg">
                                        <div className="text-[#ededed] text-base font-medium tabular-nums">12 B</div>
                                        <div className="text-[10px] text-[#85858b] mt-0.5">Header overhead</div>
                                    </div>
                                    <div className="p-2.5 bg-[#19191b] border border-white/[0.06] rounded-lg">
                                        <div className="text-[#ededed] text-base font-medium tabular-nums">256 px</div>
                                        <div className="text-[10px] text-[#85858b] mt-0.5">Square tile unit</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right Main Article */}
                    <article className="lg:col-span-8 space-y-14 text-sm sm:text-base text-[#a1a1a6] leading-relaxed">

                        {/* Section 1: Genesis */}
                        <section id="genesis" aria-labelledby="heading-genesis" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">01 · Genesis</div>
                            <h2 id="heading-genesis" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                The idle GPU hypothesis: democratizing path-tracing
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    Rendering a photorealistic 3D scene in Blender, Maya, or Three.js on a standard consumer laptop demonstrates the computational constraints of consumer devices: fans reach maximum speed, batteries deplete quickly, thermal limits throttle clock rates, and path-traced global illumination frames can require substantial convergence times.
                                </p>
                                <p>
                                    Commercial render farms solve this by deploying clusters of enterprise GPUs in centralized data centers. For students, independent artists, and small development teams, cloud rendering subscriptions remain a significant ongoing expense.
                                </p>
                                <div className="p-4 border-l-2 border-[#AF3240] bg-[#19191b] rounded-r-lg my-6">
                                    <p className="text-sm italic text-[#ededed]">
                                        "At any given second, millions of web browsers sit open worldwide. Inside those machines are GPUs capable of trillions of floating-point operations per second. Linking them together into a cooperative peer-to-peer compute swarm turns dormant capacity into rendering power."
                                    </p>
                                </div>
                                <p>
                                    This was the central hypothesis behind <strong className="text-[#ededed] font-medium">FluxCluster</strong>. No native C++ daemons, CUDA toolkits, or container runtimes. A user opens a URL in any modern browser tab, connects over WebRTC, and their GPU joins the path-tracing queue, streaming completed tiles back to the coordinator.
                                </p>
                            </div>
                        </section>

                        {/* Section 2: Architecture */}
                        <section id="architecture" aria-labelledby="heading-architecture" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">02 · Architecture</div>
                            <h2 id="heading-architecture" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                Swarm topology: peer data channels with a Redis control plane
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    A distributed browser rendering engine requires decoupling lightweight signaling from heavy binary pixel transport. Routing megabytes of raw image tiles through a central Node.js server quickly consumes available network bandwidth.
                                </p>

                                {/* Architecture Comparison Matrix */}
                                <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#141415] my-6">
                                    <table className="w-full text-left text-xs font-mono">
                                        <thead className="bg-[#19191b] text-[#85858b] uppercase tracking-wider border-b border-white/[0.08]">
                                            <tr>
                                                <th className="p-3.5 font-medium">System component</th>
                                                <th className="p-3.5 font-medium">Traditional render farm</th>
                                                <th className="p-3.5 font-medium">FluxCluster browser swarm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Client requirements</td>
                                                <td className="p-3.5 text-[#85858b]">Native binaries, SSH keys, GPU drivers</td>
                                                <td className="p-3.5 text-[#ededed]">Any modern browser tab (Chromium, Firefox)</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Pixel data transport</td>
                                                <td className="p-3.5 text-[#85858b]">Centralized cloud object storage</td>
                                                <td className="p-3.5 text-[#ededed]">P2P WebRTC SCTP binary channels</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Task queueing</td>
                                                <td className="p-3.5 text-[#85858b]">Heavy Celery or RabbitMQ workers</td>
                                                <td className="p-3.5 text-[#ededed]">Redis atomic state with in-memory FIFO queue</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3.5 font-medium text-[#ededed]">Post-processing</td>
                                                <td className="p-3.5 text-[#85858b]">Server-side CPU and GPU binaries</td>
                                                <td className="p-3.5 text-[#ededed]">Browser-native Intel OIDN WebGPU U-Net</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <p>
                                    In FluxCluster, the master client loads a GLTF or GLB 3D scene and partitions the viewport into discrete tiles (256×256 pixels). The signaling server (built with Socket.io and Redis) coordinates room tokens, WebRTC SDP handshakes, and node heartbeats. Once peers establish direct WebRTC data channels, the signaling server leaves the transmission path: rendered tiles stream directly between browsers.
                                </p>
                            </div>
                        </section>

                        {/* Section 3: The Crucible */}
                        <section id="crucible" aria-labelledby="heading-crucible" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">03 · Systems Breakthroughs</div>
                            <h2 id="heading-crucible" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                Five core distributed systems engineering challenges
                            </h2>

                            <div className="space-y-6">

                                {/* Hurdle 1 */}
                                <div className="border border-white/[0.08] bg-[#141415] p-5 sm:p-6 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                    <div className="text-xs font-mono text-[#AF3240] mb-2">
                                        Challenge 1 · WebRTC SCTP 64KB packet boundary and 16KB sub-chunking
                                    </div>
                                    <h3 className="text-base sm:text-lg font-medium text-[#ededed] mb-2">
                                        SCTP buffer overflows and binary framing protocol
                                    </h3>
                                    <p className="text-sm text-[#a1a1a6] mb-4">
                                        A single 256×256 RGBA tile comprises 262,144 bytes (~256KB). When transmitting raw tiles through a standard WebRTC <code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">RTCDataChannel.send()</code>, channels routinely drop frames or throw <code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">OperationError: Message size exceeds maximum supported limit</code> because SCTP implementations strictly enforce a 64KB packet boundary.
                                    </p>

                                    {/* Visual Moment 1: Binary Protocol Layout */}
                                    <div className="border border-white/[0.08] bg-[#19191b] rounded-lg p-4 my-4 font-mono text-xs">
                                        <div className="text-[10px] uppercase text-[#85858b] tracking-wider mb-2">
                                            16KB Binary Chunk Structure (12-Byte Header + Payload)
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-center text-[11px]">
                                            <div className="p-2 bg-[#232325] border border-white/[0.06] rounded">
                                                <div className="text-[#ededed] font-medium">Tile ID</div>
                                                <div className="text-[10px] text-[#85858b]">4 Bytes (uint32)</div>
                                            </div>
                                            <div className="p-2 bg-[#232325] border border-white/[0.06] rounded">
                                                <div className="text-[#ededed] font-medium">Chunk index</div>
                                                <div className="text-[10px] text-[#85858b]">2 Bytes (uint16)</div>
                                            </div>
                                            <div className="p-2 bg-[#232325] border border-white/[0.06] rounded">
                                                <div className="text-[#ededed] font-medium">Total chunks</div>
                                                <div className="text-[10px] text-[#85858b]">2 Bytes (uint16)</div>
                                            </div>
                                            <div className="p-2 bg-[#232325] border border-white/[0.06] rounded">
                                                <div className="text-[#ededed] font-medium">Byte length</div>
                                                <div className="text-[10px] text-[#85858b]">4 Bytes (uint32)</div>
                                            </div>
                                            <div className="p-2 bg-[#AF3240]/15 border border-[#AF3240]/40 rounded text-[#ededed]">
                                                <div className="font-medium">Pixel slice</div>
                                                <div className="text-[10px] text-[#a1a1a6]">16,384 Bytes raw</div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-[#a1a1a6]">
                                        The master reconstructs the 256KB buffer in memory as slices arrive. If any sub-chunk drops, the retry mechanism requests only that missing 16KB index instead of re-rendering the entire 256KB tile.
                                    </p>
                                </div>

                                {/* Hurdle 2 */}
                                <div className="border border-white/[0.08] bg-[#141415] p-5 sm:p-6 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                    <div className="text-xs font-mono text-[#AF3240] mb-2">
                                        Challenge 2 · WebGL bottom-left vs 2D canvas top-left coordinate spaces
                                    </div>
                                    <h3 className="text-base sm:text-lg font-medium text-[#ededed] mb-2">
                                        Inverted tile composition and alpha channel corruption
                                    </h3>
                                    <p className="text-sm text-[#a1a1a6] mb-4">
                                        When worker nodes first extracted pixel buffers using <code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">gl.readPixels()</code>, tiles blitted onto the master canvas appeared vertically flipped and transparent.
                                    </p>

                                    {/* Visual Moment 2: Coordinate Space Diagram */}
                                    <div className="border border-white/[0.08] bg-[#19191b] rounded-lg p-4 my-4 font-mono text-xs">
                                        <div className="text-[10px] uppercase text-[#85858b] tracking-wider mb-3">
                                            Coordinate Space Origin Mismatch
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="p-3 bg-[#141415] border border-white/[0.06] rounded-md">
                                                <div className="text-[#ededed] font-medium mb-1">WebGL framebuffer</div>
                                                <div className="text-[11px] text-[#85858b] mb-2">Origin (0,0) at bottom-left</div>
                                                <div className="h-16 border border-dashed border-white/[0.12] rounded flex flex-col justify-between p-1.5 text-[10px] text-[#85858b]">
                                                    <span>(0, height)</span>
                                                    <span className="text-[#AF3240] font-medium">(0, 0) Origin</span>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-[#141415] border border-white/[0.06] rounded-md">
                                                <div className="text-[#ededed] font-medium mb-1">2D canvas ImageData</div>
                                                <div className="text-[11px] text-[#85858b] mb-2">Origin (0,0) at top-left</div>
                                                <div className="h-16 border border-dashed border-white/[0.12] rounded flex flex-col justify-between p-1.5 text-[10px] text-[#85858b]">
                                                    <span className="text-[#AF3240] font-medium">(0, 0) Origin</span>
                                                    <span>(0, height)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-[#a1a1a6] mb-3">
                                        To resolve this without costly heap reallocations, we implemented an in-place linear row reversal loop with enforced opaque alpha values:
                                    </p>
                                    <div className="bg-[#19191b] p-3.5 rounded-lg border border-white/[0.06] text-xs font-mono text-[#ededed] overflow-x-auto leading-relaxed">
                                        <div>const rowBytes = tileWidth * 4;</div>
                                        <div>const halfHeight = Math.floor(tileHeight / 2);</div>
                                        <div>for (let y = 0; y &lt; halfHeight; y++) &#123;</div>
                                        <div className="text-[#85858b] pl-4">// In-place row swap between y and (tileHeight - 1 - y)</div>
                                        <div className="text-[#85858b] pl-4">// Force alpha = 255 for solid path-traced fragments</div>
                                        <div>&#125;</div>
                                    </div>
                                </div>

                                {/* Hurdle 3 */}
                                <div className="border border-white/[0.08] bg-[#141415] p-5 sm:p-6 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                    <div className="text-xs font-mono text-[#AF3240] mb-2">
                                        Challenge 3 · Concurrency, frame progression, and stale tile anomalies
                                    </div>
                                    <h3 className="text-base sm:text-lg font-medium text-[#ededed] mb-2">
                                        Preventing multi-frame visual bleed
                                    </h3>
                                    <p className="text-sm text-[#a1a1a6]">
                                        During multi-frame camera animations, a slower node computing Frame 1 might return its tile after the master has already progressed to Frame 2. Writing that late tile onto Frame 2 produces ghosting artifacts. We resolved this through generational lifecycle tracking: advancing a frame clears the canvas buffer, increments an atomic <code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">frameIndex</code>, and rejects any inbound chunk whose epoch identifier mismatches the active frame.
                                    </p>
                                </div>

                                {/* Hurdle 4 */}
                                <div className="border border-white/[0.08] bg-[#141415] p-5 sm:p-6 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                    <div className="text-xs font-mono text-[#AF3240] mb-2">
                                        Challenge 4 · Memory isolation and WebGL context loss prevention
                                    </div>
                                    <h3 className="text-base sm:text-lg font-medium text-[#ededed] mb-2">
                                        Managing browser VRAM consumption
                                    </h3>
                                    <p className="text-sm text-[#a1a1a6]">
                                        Path tracing constructs spatial Bounding Volume Hierarchies (BVH) and compiles heavy ray-marching shaders. Unmanaged scene swaps can trigger <code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">WEBGL_context_lost</code>. Disposal routines recursively traverse scene hierarchies, explicitly deallocate WebGL textures, and release memory before host graphics drivers encounter limits.
                                    </p>
                                </div>

                            </div>
                        </section>

                        {/* Section 4: Neural Denoising */}
                        <section id="neural-denoising" aria-labelledby="heading-neural" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">04 · Neural Denoising</div>
                            <h2 id="heading-neural" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                Intel OIDN in the browser: porting AI denoising to WebGPU
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    Path tracing samples light transport stochastically. At low sample budgets (16 to 64 samples per pixel), images exhibit high-frequency Monte Carlo noise. Offline production pipelines rely on Intel's Open Image Denoise (OIDN), a deep convolutional neural network trained to eliminate noise while preserving sharp geometric silhouettes.
                                </p>
                                <p>
                                    To avoid cloud dependencies or server-side post-processing, we integrated <strong className="text-[#ededed] font-medium">Intel OIDN directly into client browser tabs</strong> using WebGPU WGSL compute passes and a pre-trained 1.83MB <code className="text-xs font-mono text-[#ededed] bg-[#232325] px-1.5 py-0.5 rounded">rt_ldr.tza</code> neural model weights file.
                                </p>

                                {/* Visual Moment 3: Pipeline Flow */}
                                <div className="border border-white/[0.08] bg-[#141415] rounded-xl p-5 my-4">
                                    <div className="text-xs font-mono text-[#85858b] uppercase tracking-wider mb-3 flex items-center justify-between">
                                        <span>Denoise Pipeline Flow</span>
                                        <span className="text-[#AF3240]">DenoiseManager.js</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-mono text-[#a1a1a6]">
                                        <div className="flex items-start gap-3 p-2.5 bg-[#19191b] rounded-lg border border-white/[0.04]">
                                            <span className="text-[#AF3240] font-medium">01</span>
                                            <span>Raw frame completion triggers enqueue to asynchronous sequential FIFO queue</span>
                                        </div>
                                        <div className="flex items-start gap-3 p-2.5 bg-[#19191b] rounded-lg border border-white/[0.04]">
                                            <span className="text-[#AF3240] font-medium">02</span>
                                            <span>Queue processes one frame sequentially to avoid device VRAM contention</span>
                                        </div>
                                        <div className="flex items-start gap-3 p-2.5 bg-[#19191b] rounded-lg border border-white/[0.04]">
                                            <span className="text-[#AF3240] font-medium">03</span>
                                            <span>WebGPU available: dispatches U-Net inference across tiles via WGSL compute shaders</span>
                                        </div>
                                        <div className="flex items-start gap-3 p-2.5 bg-[#19191b] rounded-lg border border-white/[0.04]">
                                            <span className="text-[#AF3240] font-medium">04</span>
                                            <span>Fallback path: activates an optimized CPU bilateral filter with variance weighting</span>
                                        </div>
                                        <div className="flex items-start gap-3 p-2.5 bg-[#19191b] rounded-lg border border-white/[0.04]">
                                            <span className="text-[#AF3240] font-medium">05</span>
                                            <span>Filtered output blits to master display canvas and triggers frame export</span>
                                        </div>
                                    </div>
                                </div>

                                <p>
                                    This integration allows clean, converged renders in fewer sample passes, reducing required peer compute time by more than 70%.
                                </p>
                            </div>
                        </section>

                        {/* Section 5: Personal Journey */}
                        <section id="personal-journey" aria-labelledby="heading-journey" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">05 · Journey</div>
                            <h2 id="heading-journey" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                Reflections from Pauri Garhwal to the open web
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    Distributed computing projects often originate in major metropolitan technology hubs with reliable high-bandwidth infrastructure. FluxCluster was architected and developed from <strong className="text-[#ededed] font-medium">Pauri Garhwal</strong>, in the mountains of Uttarakhand, India.
                                </p>
                                <p>
                                    Developing distributed software over variable mountain connectivity provided immediate feedback on network resilience. It highlighted the importance of robust WebRTC STUN/TURN traversal under jitter, predictable failover when a node disconnects mid-frame, and compact client bundles.
                                </p>
                                <p>
                                    Debugging SCTP buffer constraints and shader compilation delays led to moving intensive tasks into isolated Web Workers. The initial milestone — having three distinct browser tabs render a path-traced Cornell box animation collaboratively in real time without installed software — validated the feasibility of the architecture.
                                </p>
                            </div>
                        </section>

                        {/* Section 6: The Horizon */}
                        <section id="horizon" aria-labelledby="heading-horizon" className="scroll-mt-24">
                            <div className="text-xs font-mono text-[#AF3240] tracking-wide mb-1">06 · The Horizon</div>
                            <h2 id="heading-horizon" className="text-xl sm:text-2xl font-medium tracking-tight text-[#ededed] mb-4">
                                Roadmap: Pure WebGPU compute swarms
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    As WebGPU reaches broader browser availability across Chromium, Firefox, and Safari, the functional boundary between native desktop compute and browser capabilities continues to narrow.
                                </p>
                                <p>
                                    Subsequent engineering milestones for FluxCluster include:
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-[#a1a1a6]">
                                    <li><strong className="text-[#ededed] font-medium">Native WebGPU Compute Path-Tracing:</strong> Transitioning from WebGL2 fragment passes to direct WGSL compute kernels with hardware-accelerated BVH traversal.</li>
                                    <li><strong className="text-[#ededed] font-medium">WebTransport Integration:</strong> Evaluating QUIC-based WebTransport alongside WebRTC SCTP for lower-latency bidirectional stream multiplexing.</li>
                                    <li><strong className="text-[#ededed] font-medium">Cooperative Machine Learning Inference:</strong> Applying the peer swarm topology to distributed small-model inference across connected clients.</li>
                                </ul>

                                <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs font-mono text-[#85858b]">
                                        Interested in contributing to the swarm architecture?
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
                                            onClick={() => scrollToSection('genesis')}
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

export default Blogs;
