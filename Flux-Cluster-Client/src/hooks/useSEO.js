import { useEffect } from 'react';

const BASE_URL = 'https://flux-cluster.vercel.app';
const DEFAULT_TITLE = 'FluxCluster — Distributed GPU Path-Tracing Swarm & WebGL Render Farm';
const DEFAULT_DESCRIPTION = 'FluxCluster is a browser-based, peer-to-peer distributed GPU path-tracing cluster and render farm. Pool idle browser GPU compute via WebRTC & WebGL to render heavy 3D scenes with Intel OIDN AI denoising.';
const DEFAULT_IMAGE = `${BASE_URL}/fluximageRender.webp`;

function setMetaTag(selector, attribute, value) {
    if (!value || typeof document === 'undefined') return;
    let element = document.querySelector(selector);
    if (!element) {
        element = document.createElement('meta');
        const [attrName, attrVal] = selector.replace(/[\[\]'"]/g, '').split('=');
        if (attrName && attrVal) {
            element.setAttribute(attrName, attrVal);
            document.head.appendChild(element);
        }
    }
    element.setAttribute(attribute, value);
}

function setCanonical(url) {
    if (typeof document === 'undefined') return;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }
    link.setAttribute('href', url);
}

export function useSEO({
    title,
    description,
    canonical,
    ogType = 'website',
    ogImage = DEFAULT_IMAGE,
    jsonLd
} = {}) {
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const originalTitle = document.title;
        const pageTitle = title ? `${title} | FluxCluster` : DEFAULT_TITLE;
        const pageDesc = description || DEFAULT_DESCRIPTION;
        const pageCanonical = canonical ? (canonical.startsWith('http') ? canonical : `${BASE_URL}${canonical}`) : BASE_URL;
        const pageImage = ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`;

        document.title = pageTitle;

        // Standard Meta
        setMetaTag('meta[name="description"]', 'content', pageDesc);
        setMetaTag('meta[name="title"]', 'content', pageTitle);
        setCanonical(pageCanonical);

        // Open Graph
        setMetaTag('meta[property="og:title"]', 'content', pageTitle);
        setMetaTag('meta[property="og:description"]', 'content', pageDesc);
        setMetaTag('meta[property="og:url"]', 'content', pageCanonical);
        setMetaTag('meta[property="og:type"]', 'content', ogType);
        setMetaTag('meta[property="og:image"]', 'content', pageImage);

        // Twitter Card
        setMetaTag('meta[name="twitter:title"]', 'content', pageTitle);
        setMetaTag('meta[name="twitter:description"]', 'content', pageDesc);
        setMetaTag('meta[name="twitter:url"]', 'content', pageCanonical);
        setMetaTag('meta[name="twitter:image"]', 'content', pageImage);

        // Optional Route JSON-LD
        let scriptTag = null;
        if (jsonLd) {
            scriptTag = document.getElementById('route-jsonld');
            if (!scriptTag) {
                scriptTag = document.createElement('script');
                scriptTag.id = 'route-jsonld';
                scriptTag.type = 'application/ld+json';
                document.head.appendChild(scriptTag);
            }
            scriptTag.textContent = JSON.stringify(jsonLd);
        }

        return () => {
            document.title = originalTitle;
            if (scriptTag && scriptTag.parentNode) {
                scriptTag.parentNode.removeChild(scriptTag);
            }
        };
    }, [title, description, canonical, ogType, ogImage, jsonLd]);
}
