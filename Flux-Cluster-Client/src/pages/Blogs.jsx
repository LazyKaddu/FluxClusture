import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

const SECTIONS = [
    { id: 'genesis', label: '01 // THE GENESIS', title: 'The Idle GPU Hypothesis' },
    { id: 'architecture', label: '02 // ARCHITECTURE', title: 'Swarm Topology vs Central Control' },
    { id: 'crucible', label: '03 // THE CRUCIBLE', title: '5 Core Engineering Breakthroughs' },
    { id: 'neural-denoising', label: '04 // NEURAL DENOISING', title: 'Intel OIDN in the Browser' },
    { id: 'personal-journey', label: '05 // THE JOURNEY', title: 'Reflections from Pauri Garhwal' },
    { id: 'horizon', label: '06 // THE HORIZON', title: 'Next Frontier: Pure WebGPU Compute' },
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
            await navigator.clipboard.writeText(window.location.origin + '/blogs');
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
            className="w-full h-screen overflow-y-auto overflow-x-hidden text-gray-200 bg-[#0d0d0d] selection:bg-emerald-500 selection:text-black"
        >
            {/* Scroll Progress HUD Bar */}
            <div
                className="fixed top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 z-50 transition-all duration-75"
                style={{ width: `${scrollProgress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(scrollProgress)}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label="Article reading progress"
            />

            {/* Fixed Back to Home Button */}
            <div className="fixed top-3 left-4 sm:top-4 sm:left-6 md:left-8 z-50">
                <button
                    type="button"
                    id="btn-back-home"
                    onClick={() => navigate('/')}
                    aria-label="Back to home page"
                    className="group flex items-center gap-2.5 px-3.5 py-2 rounded-md border border-[#2a2a2a] bg-[#121212]/90 backdrop-blur-md text-xs space-mono-regular text-gray-300 hover:text-white hover:border-emerald-500/80 hover:bg-[#181818] transition-all cursor-pointer shadow-lg shadow-black/50"
                >
                    <span className="text-emerald-400 group-hover:-translate-x-1 transition-transform inline-block font-bold">
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
                    <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs space-mono-regular text-emerald-400 mb-4">
                        <span className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            &gt;_ DEV_LOGS // FLUXCLUSTER_CHRONICLES
                        </span>
                        <span className="text-gray-400">OCTOBER 2026 • 12 MIN READ</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 bebas-neue-regular uppercase">
                        Engineering Chronicles: Building a Distributed GPU Render Farm in the Browser
                    </h1>

                    <p className="text-base sm:text-lg text-gray-300 space-mono-regular leading-relaxed max-w-4xl mb-6">
                        From the seed of an idea in the hills of Uttarakhand to overcoming WebRTC 64KB ceilings,
                        WebGL coordinate inversion, distributed state synchronization, and running Intel OIDN neural AI denoising directly inside client browser tabs.
                    </p>

                    {/* Author & Telemetry Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#222]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded border border-emerald-500/50 bg-[#1a1a1a] flex items-center justify-center font-bold text-emerald-400 bebas-neue-regular text-xl">
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
                                id="btn-copy-blog-link"
                                onClick={handleCopyLink}
                                aria-label="Copy blog post link"
                                className="text-xs space-mono-regular px-3 py-1.5 rounded border border-[#333] hover:border-emerald-500/60 bg-[#181818] text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {copied ? 'LINK COPIED!' : 'SHARE ARTICLE'}
                            </button>
                        </div>
                    </div>

                    {/* Tech Badges */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#1e1e1e] text-[11px] space-mono-regular">
                        {['WEBRTC_SCTP', 'WEBGL2', 'WEBGPU_WGSL', 'INTEL_OIDN', 'REDIS_QUEUES', 'PEER_TO_PEER'].map(tag => (
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
                            <div className="text-emerald-400 uppercase tracking-widest font-bold mb-4 pb-2 border-b border-[#222] flex items-center justify-between">
                                <span>TABLE OF CONTENTS</span>
                                <span className="text-[10px] text-gray-400">[INDEX]</span>
                            </div>
                            <nav aria-label="Article Table of Contents" className="space-y-1">
                                {SECTIONS.map((sec) => {
                                    const isCurrent = activeSection === sec.id;
                                    return (
                                        <button
                                            key={sec.id}
                                            type="button"
                                            onClick={() => scrollToSection(sec.id)}
                                            className={`w-full text-left p-2 rounded transition-all flex flex-col gap-0.5 cursor-pointer ${isCurrent
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400 pl-3 font-semibold'
                                                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                                                }`}
                                        >
                                            <span className="text-[10px] tracking-wider text-gray-400">{sec.label}</span>
                                            <span className="truncate">{sec.title}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Live Architecture Metric Card */}
                            <div className="mt-6 pt-5 border-t border-[#222]">
                                <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-wider">CLUSTER BENCHMARK</div>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="p-2 bg-black/50 border border-[#222] rounded">
                                        <div className="text-emerald-400 text-lg font-bold bebas-neue-regular">16 KB</div>
                                        <div className="text-[9px] text-gray-400">SCTP SLICE SIZE</div>
                                    </div>
                                    <div className="p-2 bg-black/50 border border-[#222] rounded">
                                        <div className="text-cyan-400 text-lg font-bold bebas-neue-regular">1.83 MB</div>
                                        <div className="text-[9px] text-gray-400">OIDN U-NET MODEL</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right Main Article */}
                    <article className="lg:col-span-8 space-y-16 space-mono-regular leading-relaxed text-gray-300 text-sm md:text-base">

                        {/* Section 1: Genesis */}
                        <section id="genesis" aria-labelledby="heading-genesis" className="scroll-mt-32">
                            <div className="text-xs text-emerald-400 uppercase tracking-widest mb-1">01 // THE GENESIS</div>
                            <h2 id="heading-genesis" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                The Idle GPU Hypothesis: Democratizing Path-Tracing
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    If you have ever attempted to render a photorealistic 3D scene in Blender, Maya, or Three.js on a standard consumer laptop, you know the frustration. The fans scream at maximum RPM, the battery drains in twenty minutes, the CPU thermal throttles, and a single 1080p frame with path-traced global illumination takes upwards of an hour to converge.
                                </p>
                                <p>
                                    Commercial render farms solve this by throwing dozens of high-end enterprise GPUs (like NVIDIA A100s or RTX 4090s) in centralized data centers at your scene. But for students, indie creators, and hobbyist developers, enterprise cloud render farms are prohibitively expensive and architecturally opaque.
                                </p>
                                <div className="p-5 border-l-2 border-emerald-400 bg-[#161616] rounded-r my-6">
                                    <p className="italic text-gray-200">
                                        "At any given second, hundreds of millions of web browsers are sitting idle worldwide. Inside those machines are integrated or dedicated GPUs capable of trillions of floating-point operations per second. What if we could link them together—with zero installation—into a cooperative peer-to-peer compute swarm?"
                                    </p>
                                </div>
                                <p>
                                    That was the core hypothesis that conceived <strong>FluxCluster</strong>. No native C++ daemon, no CUDA toolkit installs, no Docker containers. A user simply opens a URL in their browser tab, joins a room via WebRTC, and their GPU immediately begins path-tracing tiles for an animation or high-sample frame, streaming pixels back to the orchestrator.
                                </p>
                            </div>
                        </section>

                        {/* Section 2: Architecture */}
                        <section id="architecture" aria-labelledby="heading-architecture" className="scroll-mt-32">
                            <div className="text-xs text-emerald-400 uppercase tracking-widest mb-1">02 // ARCHITECTURE</div>
                            <h2 id="heading-architecture" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                Swarm Topology: Peer DataChannels Meets Redis Control Plane
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    Building a distributed rendering engine in JavaScript requires decoupling signaling coordination from heavy pixel transmission. If megabytes of rendered tiles were routed through a central Node.js server, the server bandwidth would collapse immediately.
                                </p>

                                {/* Architecture Comparison Matrix */}
                                <div className="overflow-x-auto my-6 border border-[#262626] rounded-lg">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-[#1c1c1c] text-gray-300 uppercase">
                                            <tr>
                                                <th className="p-3 border-b border-[#333]">System Component</th>
                                                <th className="p-3 border-b border-[#333]">Traditional Render Farm</th>
                                                <th className="p-3 border-b border-[#333] text-emerald-400">FluxCluster Browser Swarm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#222]">
                                            <tr>
                                                <td className="p-3 font-semibold text-white">Client Requirements</td>
                                                <td className="p-3 text-gray-400">Native binaries, SSH keys, GPU drivers</td>
                                                <td className="p-3 text-emerald-300">Any modern browser tab (Chrome/Edge/Firefox)</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold text-white">Pixel Data Transport</td>
                                                <td className="p-3 text-gray-400">Centralized Cloud Object Storage (S3/GCS)</td>
                                                <td className="p-3 text-emerald-300">P2P WebRTC SCTP Binary Channels</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold text-white">Task Queueing</td>
                                                <td className="p-3 text-gray-400">Heavy Celery/RabbitMQ workers</td>
                                                <td className="p-3 text-emerald-300">Redis Atomic State + In-Memory FIFO Queue</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 font-semibold text-white">Post-Processing</td>
                                                <td className="p-3 text-gray-400">Server-side CPU/GPU binaries</td>
                                                <td className="p-3 text-emerald-300">Browser-native Intel OIDN WebGPU U-Net</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <p>
                                    In FluxCluster, the master client uploads a GLTF/GLB model and partitions the rendering plane into discreet tiles (e.g., 256x256 pixels). The signaling server (built with Socket.io and Redis) manages room registration, WebRTC SDP offer/answer handshakes, and worker heartbeats. Once peers connect via WebRTC, the signaling server steps out of the data path: raw pixel streams travel directly over direct peer-to-peer data channels.
                                </p>
                            </div>
                        </section>

                        {/* Section 3: The Crucible */}
                        <section id="crucible" aria-labelledby="heading-crucible" className="scroll-mt-32">
                            <div className="text-xs text-emerald-400 uppercase tracking-widest mb-1">03 // THE CRUCIBLE</div>
                            <h2 id="heading-crucible" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                The Crucible: 5 Deep Engineering Breakthroughs
                            </h2>

                            <div className="space-y-8">

                                {/* Hurdle 1 */}
                                <div className="border border-[#222] bg-[#141414] p-5 rounded-lg">
                                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        HURDLE 1: THE WEBRTC SCTP 64KB CEILING & 16KB CHUNKING
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">The Invisible Buffer Overflow</h3>
                                    <p className="text-sm text-gray-300 mb-3">
                                        A 256x256 RGBA tile is 262,144 raw bytes (~256KB). When we first attempted to transmit tiles over a standard WebRTC <code className="text-emerald-300 bg-black/60 px-1 py-0.5 rounded">RTCDataChannel.send()</code>, the channel silently choked, dropped packets, or threw <code className="text-red-400 bg-black/60 px-1 py-0.5 rounded">OperationError: Message size exceeds maximum supported limit</code>.
                                    </p>
                                    <p className="text-sm text-gray-300 mb-3">
                                        Most browser SCTP implementations strictly enforce a 64KB maximum packet boundary. To solve this, we architected a binary sub-chunking protocol:
                                    </p>
                                    <div className="bg-black/80 p-4 rounded border border-[#2a2a2a] text-xs font-mono text-emerald-300 overflow-x-auto">
                                        <div>// Tile payload sliced into 16,384 byte chunks with 12-byte header:</div>
                                        <div>[TileID: 4 Bytes] [ChunkIndex: 2 Bytes] [TotalChunks: 2 Bytes] [ByteLength: 4 Bytes] [Raw Pixel Slice]</div>
                                    </div>
                                    <p className="text-sm text-gray-300 mt-3">
                                        The master reconstructs the tile buffer in memory upon receiving all slices. If any chunk is lost, an exponential backoff retry requests only the missing slice rather than re-rendering the entire 256KB tile.
                                    </p>
                                </div>

                                {/* Hurdle 2 */}
                                <div className="border border-[#222] bg-[#141414] p-5 rounded-lg">
                                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        HURDLE 2: WEBGL BOTTOM-LEFT VS 2D CANVAS TOP-LEFT COORDINATE SPACE
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">The Inverted Tile Phenomenon & Alpha Corruption</h3>
                                    <p className="text-sm text-gray-300 mb-3">
                                        When worker nodes first returned rendered pixel buffers from <code className="text-emerald-300 bg-black/60 px-1 py-0.5 rounded">gl.readPixels()</code> or Three.js <code className="text-emerald-300 bg-black/60 px-1 py-0.5 rounded">WebGLRenderTarget</code>, the tiles rendered on the master canvas were vertically mirrored and strangely transparent.
                                    </p>
                                    <p className="text-sm text-gray-300 mb-3">
                                        In WebGL convention, texture coordinates origin <code className="text-white">(0,0)</code> is located at the <strong>bottom-left</strong>. Conversely, the HTML5 2D Canvas <code className="text-emerald-300 bg-black/60 px-1 py-0.5 rounded">ImageData</code> and <code className="text-emerald-300 bg-black/60 px-1 py-0.5 rounded">putImageData()</code> origin is at the <strong>top-left</strong>. Furthermore, path-tracers writing to floating-point render targets often output zero or arbitrary alpha values.
                                    </p>
                                    <div className="bg-black/80 p-4 rounded border border-[#2a2a2a] text-xs font-mono text-emerald-300 overflow-x-auto">
                                        <div>// In-place row reversal with zero heap reallocations</div>
                                        <div>for (let y = 0; y &lt; Math.floor(tileHeight / 2); y++) &#123;</div>
                                        <div>&nbsp;&nbsp;const topRow = y * rowBytes;</div>
                                        <div>&nbsp;&nbsp;const bottomRow = (tileHeight - 1 - y) * rowBytes;</div>
                                        <div>&nbsp;&nbsp;// Swap row memory and enforce alpha = 255 for opaque path-traced fragments</div>
                                        <div>&#125;</div>
                                    </div>
                                    <p className="text-sm text-gray-300 mt-3">
                                        Solving this with an in-place linear row swap eliminated memory churn, stabilized 60 FPS compositor blits, and guaranteed solid opaque pixel composition.
                                    </p>
                                </div>

                                {/* Hurdle 3 */}
                                <div className="border border-[#222] bg-[#141414] p-5 rounded-lg">
                                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        HURDLE 3: CONCURRENCY, FRAME ADVANCEMENT & THE STALE TILE ANOMALY
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">Preventing Multi-Frame Visual Bleed</h3>
                                    <p className="text-sm text-gray-300 mb-3">
                                        When rendering an animated sequence (e.g., a rotating camera across 120 frames), a slow worker computing Frame 1 might finish its tile <em>after</em> the master has already progressed to Frame 2. If the master blits that late tile onto Frame 2's canvas, the result is ghosting and image corruption.
                                    </p>
                                    <p className="text-sm text-gray-300">
                                        We implemented a generational lifecycle: when the master transitions to a new frame, it immediately blanks the display canvas to clear past pixel data, increments an atomic <code className="text-white">frameIndex</code> and <code className="text-white">epoch</code>, and drops any inbound tile or deferred denoiser callback whose frame identifier does not match the active frame.
                                    </p>
                                </div>

                                {/* Hurdle 4 */}
                                <div className="border border-[#222] bg-[#141414] p-5 rounded-lg">
                                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        HURDLE 4: MEMORY QUARANTINE & CONTEXT LOSS SURVIVAL
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">Taming Browser VRAM Exhaustion</h3>
                                    <p className="text-sm text-gray-300">
                                        Path-tracing builds extensive Bounding Volume Hierarchy (BVH) structures and compiles heavy ray-marching shaders. Left unchecked, switching models or running consecutive jobs triggers <code className="text-red-400 bg-black/60 px-1 py-0.5 rounded">WEBGL_context_lost</code>. We built strict disposal hooks that traverse scene meshes, explicitly invalidate WebGL textures, and trigger clean context rebuilds before OS graphics drivers crash.
                                    </p>
                                </div>

                            </div>
                        </section>

                        {/* Section 4: Neural Denoising */}
                        <section id="neural-denoising" aria-labelledby="heading-neural" className="scroll-mt-32">
                            <div className="text-xs text-emerald-400 uppercase tracking-widest mb-1">04 // NEURAL DENOISING</div>
                            <h2 id="heading-neural" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                Intel OIDN in the Browser: Porting AI Denoising to WebGPU
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    Path tracing calculates light transport by casting stochastic rays into the 3D scene. At low sample counts (16 to 64 samples per pixel), images are covered in harsh Monte Carlo high-frequency noise. Traditional offline production uses Intel's Open Image Denoise (OIDN), a deep-learning neural network trained to filter noise while preserving crisp geometric edges and reflections.
                                </p>
                                <p>
                                    We did not want our users to rely on an external Python backend or cloud service for denoising. We brought <strong>Intel OIDN directly into the browser tab</strong> using WebGPU WGSL compute passes and the pre-trained 1.83MB <code className="text-emerald-300 bg-black/60 px-1 py-0.5 rounded">rt_ldr.tza</code> neural model.
                                </p>

                                <div className="p-4 bg-[#141414] border border-[#222] rounded-lg my-4 space-y-3">
                                    <div className="text-xs font-bold text-white flex items-center justify-between">
                                        <span>THE DENOISE PIPELINE ARCHITECTURE</span>
                                        <span className="text-emerald-400">[DenoiseManager.js]</span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        1. Frame completed &rarr; Raw ImageData sent to <code className="text-gray-200">DenoiseManager.enqueue()</code><br />
                                        2. Asynchronous sequential FIFO queue processes one frame at a time to prevent WebGPU device exhaustion.<br />
                                        3. WebGPU hardware available &rarr; Dispatches U-Net inference across tiles via WGSL compute shaders.<br />
                                        4. WebGPU not supported &rarr; Graceful instant fallback to an optimized CPU Bilateral Filter with color variance awareness.<br />
                                        5. Blits pristine, noise-free output back to the display canvas and triggers frame export.
                                    </div>
                                </div>

                                <p>
                                    The result: clean, noise-free, production-grade renders converge in a fraction of the samples, slashing required peer compute time by over 70%.
                                </p>
                            </div>
                        </section>

                        {/* Section 5: Personal Journey */}
                        <section id="personal-journey" aria-labelledby="heading-journey" className="scroll-mt-32">
                            <div className="text-xs text-emerald-400 uppercase tracking-widest mb-1">05 // THE JOURNEY</div>
                            <h2 id="heading-journey" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                Reflections from Pauri Garhwal to the Open Web
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    Building distributed peer-to-peer compute infrastructure is often associated with teams working out of Silicon Valley or high-density tech hubs with gigabit optical fiber. I conceived, architected, and built FluxCluster from <strong>Pauri Garhwal</strong>, nestled in the mountains of Uttarakhand, India.
                                </p>
                                <p>
                                    Developing graphics-intensive distributed software over variable mountain connectivity was both a major hurdle and an incredible forcing function. It forced me to test how WebRTC STUN/TURN traversal behaved under jitter, how to gracefully recover when a peer disconnected midway through an animation frame, and how to squeeze every ounce of performance out of lightweight client bundles.
                                </p>
                                <p>
                                    There were many late nights debugging why WebRTC SCTP buffers were choking, or why shader compilations were hitching the UI thread before we isolated them into Web Workers. But the moment three different browser tabs on three completely different machines seamlessly rendered a complex 3D Cornell Box animation together in real time—with zero native software installed—it was pure magic.
                                </p>
                                <p>
                                    FluxCluster is 100% open-source under the MIT license because I believe computing power belongs to the community. When we turn idle browsers into collaborative supercomputers, we level the playing field for every 3D artist and student on earth.
                                </p>
                            </div>
                        </section>

                        {/* Section 6: The Horizon */}
                        <section id="horizon" aria-labelledby="heading-horizon" className="scroll-mt-32">
                            <div className="text-xs text-emerald-400 uppercase tracking-widest mb-1">06 // THE HORIZON</div>
                            <h2 id="heading-horizon" className="text-2xl md:text-4xl font-bold text-white mb-6 bebas-neue-regular tracking-wide uppercase">
                                What Lies Ahead: Pure WebGPU Compute Swarms
                            </h2>

                            <div className="space-y-4">
                                <p>
                                    The browser platform is accelerating faster than ever before. With WebGPU reaching broad maturity across Chromium, Firefox, and Safari, the line between native desktop compute and browser capabilities is vanishing.
                                </p>
                                <p>
                                    Our next roadmap milestones for FluxCluster include:
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                    <li><strong>Native WebGPU Compute Path-Tracing:</strong> Transitioning from WebGL2 fragment shader passes to direct WGSL compute kernels with hardware-accelerated BVH traversal.</li>
                                    <li><strong>WebTransport Integration:</strong> Supplementing WebRTC SCTP with QUIC-based WebTransport for lower latency bidirectional stream multiplexing.</li>
                                    <li><strong>Distributed AI Inference:</strong> Leveraging the same swarm mesh topology to run distributed Large Language Model (LLM) and diffusion model inference across cooperative browser clients.</li>
                                </ul>

                                <div className="mt-8 pt-8 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs text-gray-400">
                                        Have thoughts or want to contribute to the swarm?
                                    </div>
                                    <div className="flex gap-3">
                                        <a
                                            href="https://github.com/LazyKaddu"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs space-mono-regular rounded transition-all no-underline inline-block"
                                        >
                                            GITHUB // @LAZYKADDU
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => scrollToSection('genesis')}
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

export default Blogs;
