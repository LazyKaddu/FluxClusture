import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const ImageFade = ({ image }) => {
    const containerRef = useRef(null); 
    const gridRef = useRef(null);

    useGSAP(() => {
        const cells = gsap.utils.toArray(".grid-cell", gridRef.current);

        const disappear = () => {
            // 1. Wipe out any existing animations on these cells immediately
            gsap.killTweensOf(cells);
            
            // 2. Clear inline styles to ensure they snap back to visible
            gsap.set(cells, { clearProps: "opacity", opacity: 1 });

            // 3. Shuffle a fresh copy of the array
            const shuffled = gsap.utils.shuffle([...cells]);

            gsap.to(shuffled, {
                opacity: 0,
                duration: 0.1,
                stagger: 0.01,
                ease: "none",
                overwrite: true // MAGIC BULLET: Forces new animation to override old ones
            });
        };

        const reset = () => {
            gsap.killTweensOf(cells);
            // Snap them back to fully visible black boxes
            gsap.set(cells, { clearProps: "opacity", opacity: 1 });
        };
        const scrollerElement = document.querySelector(".my-inner-scroller");
        ScrollTrigger.create({
            trigger: containerRef.current,
            
            // CRITICAL: If this is inside your Lenis inner scroller, you MUST uncomment the line below and target its class/ID!
            scroller: scrollerElement, 

            start: "top 80%",
            end: "bottom 20%",
            
            // Turn this on temporarily! It will draw lines on your screen so you can see if the trigger is actually firing

            onEnter: disappear, 
            onLeave: reset,     
            onEnterBack: disappear, 
            onLeaveBack: reset, 
        });
    }, { scope: containerRef }); 

    return (
        <div ref={containerRef} className="relative w-full h-full">
            <img className="absolute inset-0 w-full h-full object-cover" src={image} alt="Reveal" />
            
            <div ref={gridRef} className="absolute inset-0 z-10 grid grid-cols-9 grid-rows-12 w-full h-full">
                {Array.from({ length: 108 }).map((_, index) => (
                    <div key={index} className="bg-black grid-cell" />
                ))}
            </div>
        </div>
    );
}

export default ImageFade;