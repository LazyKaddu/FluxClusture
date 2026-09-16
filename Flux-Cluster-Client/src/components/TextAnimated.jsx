import React, { useRef } from 'react'
import gsap from 'gsap';

const TextAnimated = ({ text }) => {

    const wrapper = useRef(null);

    const handleMouseEnter = () => {
        const topChars = wrapper.current.querySelectorAll('.top-chars');
        const bottomChars = wrapper.current.querySelectorAll('.bot-chars');
        console.log("enter")
        // Move the original text up and out of view
        gsap.to(topChars, {
            yPercent: -100,
            duration: 0.5,
            stagger: 0.04, // This creates the wave effect!
            ease: "power3.inOut"
        });

        // Move the bottom text up into view
        gsap.to(bottomChars, {
            yPercent: -100,
            duration: 0.5,
            stagger: 0.04,
            ease: "power3.inOut"
        });
    };

    const handleMouseLeave = () => {
        const topChars = wrapper.current.querySelectorAll('.top-chars');
        const bottomChars = wrapper.current.querySelectorAll('.bot-chars');


        gsap.killTweensOf([topChars, bottomChars]);
        gsap.set([topChars, bottomChars], {
            yPercent: 0
        });
    };


return (
    <div className='h-[1em] overflow-hidden' onMouseLeave={handleMouseLeave} onMouseEnter={handleMouseEnter} ref={wrapper}>
        <div>
            {
                text.split("").map((char, index) => {
                    return (<span
                        key={index}
                        className='top-chars inline-block'
                    >
                        {char}
                    </span>
                    )
                })
            }
        </div>

        <div>
            {
                text.split("").map((char, index) => {
                    return (<span
                        key={index}
                        className='bot-chars inline-block'
                    >
                        {char}
                    </span>)
                })
            }
        </div>

    </div>
)
}

export default TextAnimated
