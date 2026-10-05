import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

// Suppress THREE.Source deprecation warning without crashing on non-configurable properties
const originalWarn = console.warn;
console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Source: "Source" has been renamed')) return;
    originalWarn(...args);
};

gsap.registerPlugin(useGSAP);
gsap.registerPlugin(ScrollTrigger);


createRoot(document.getElementById('root')).render(
    <App />,
)
