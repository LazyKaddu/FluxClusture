import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_ROOT = path.resolve(__dirname, '..');

describe('Frontend SEO & Search Discoverability Suite', () => {
    it('index.html contains full suite of meta tags, canonical link, and OpenGraph/Twitter cards', () => {
        const indexHtml = fs.readFileSync(path.join(CLIENT_ROOT, 'index.html'), 'utf-8');

        assert.match(indexHtml, /<html\s+lang="en"/i, 'HTML lang="en" must be declared');
        assert.match(indexHtml, /<title>FluxCluster/i, 'Descriptive default title must be present');
        assert.match(indexHtml, /<meta\s+name="description"\s+content="[^"]+"/i, 'Meta description tag must be present');
        assert.match(indexHtml, /<meta\s+name="keywords"\s+content="[^"]+"/i, 'Meta keywords tag must be present');
        assert.match(indexHtml, /<meta\s+name="author"\s+content="[^"]+"/i, 'Author tag must be present');
        assert.match(indexHtml, /<meta\s+name="robots"\s+content="index,\s*follow"/i, 'Robots index, follow must be declared');
        assert.match(indexHtml, /<link\s+rel="canonical"\s+href="https:\/\/flux-cluster\.vercel\.app\/"/i, 'Canonical link must be present');
        
        // OpenGraph
        assert.match(indexHtml, /<meta\s+property="og:title"/i, 'og:title must exist');
        assert.match(indexHtml, /<meta\s+property="og:description"/i, 'og:description must exist');
        assert.match(indexHtml, /<meta\s+property="og:image"\s+content="https:\/\/flux-cluster\.vercel\.app\/fluximageRender\.webp"/i, 'og:image must exist');
        assert.match(indexHtml, /<meta\s+property="og:url"\s+content="https:\/\/flux-cluster\.vercel\.app\/"/i, 'og:url must exist');

        // Twitter Card
        assert.match(indexHtml, /<meta\s+name="twitter:card"\s+content="summary_large_image"/i, 'twitter:card must be summary_large_image');
        assert.match(indexHtml, /<meta\s+name="twitter:title"/i, 'twitter:title must exist');
        assert.match(indexHtml, /<meta\s+name="twitter:description"/i, 'twitter:description must exist');

        // Performance: Preconnect fonts
        assert.match(indexHtml, /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.googleapis\.com"/i, 'preconnect to fonts.googleapis.com must exist');
        assert.match(indexHtml, /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.gstatic\.com"\s+crossorigin/i, 'preconnect to fonts.gstatic.com must exist');
        assert.match(indexHtml, /<link\s+rel="manifest"\s+href="\/site\.webmanifest"/i, 'Web manifest link must exist');
    });

    it('index.html embeds valid Schema.org JSON-LD structured data', () => {
        const indexHtml = fs.readFileSync(path.join(CLIENT_ROOT, 'index.html'), 'utf-8');
        const scriptMatch = indexHtml.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
        assert.ok(scriptMatch, 'JSON-LD script tag must exist');

        const parsed = JSON.parse(scriptMatch[1].trim());
        assert.equal(parsed['@context'], 'https://schema.org');
        assert.ok(Array.isArray(parsed['@graph']), '@graph array must be present');

        const webApp = parsed['@graph'].find(item => item['@type'] === 'WebApplication');
        assert.ok(webApp, 'WebApplication schema must be defined');
        assert.equal(webApp.name, 'FluxCluster');
        assert.equal(webApp.url, 'https://flux-cluster.vercel.app/');
    });

    it('public/robots.txt exists with proper crawler directives and sitemap URL', () => {
        const robotsPath = path.join(CLIENT_ROOT, 'public', 'robots.txt');
        assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');
        const robotsContent = fs.readFileSync(robotsPath, 'utf-8');

        assert.match(robotsContent, /User-agent:\s*\*/i);
        assert.match(robotsContent, /Allow:\s*\//i);
        assert.match(robotsContent, /Disallow:\s*\/render\*/i);
        assert.match(robotsContent, /Disallow:\s*\/joined\*/i);
        assert.match(robotsContent, /Sitemap:\s*https:\/\/flux-cluster\.vercel\.app\/sitemap\.xml/i);
    });

    it('public/sitemap.xml exists with valid XML and all core routes', () => {
        const sitemapPath = path.join(CLIENT_ROOT, 'public', 'sitemap.xml');
        assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
        const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

        assert.match(sitemapContent, /<\?xml\s+version="1\.0"\s+encoding="UTF-8"\?>/i);
        assert.match(sitemapContent, /<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/i);

        const expectedRoutes = [
            'https://flux-cluster.vercel.app/',
            'https://flux-cluster.vercel.app/upload',
            'https://flux-cluster.vercel.app/join',
            'https://flux-cluster.vercel.app/editor',
            'https://flux-cluster.vercel.app/demo',
            'https://flux-cluster.vercel.app/blogs'
        ];

        for (const route of expectedRoutes) {
            assert.ok(sitemapContent.includes(`<loc>${route}</loc>`), `Sitemap must include ${route}`);
        }
    });

    it('favicon.svg exists in public and src/assets with adaptive dark and light theme styles', () => {
        const publicFavicon = path.join(CLIENT_ROOT, 'public', 'favicon.svg');
        const assetsFavicon = path.join(CLIENT_ROOT, 'src', 'assets', 'favicon.svg');

        assert.ok(fs.existsSync(publicFavicon), 'public/favicon.svg must exist');
        assert.ok(fs.existsSync(assetsFavicon), 'src/assets/favicon.svg must exist');

        const content = fs.readFileSync(publicFavicon, 'utf-8');
        assert.match(content, /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/i);
        assert.match(content, /<path/i);
        assert.match(content, /@media\s*\(prefers-color-scheme:\s*dark\)/i, 'Favicon must contain prefers-color-scheme: dark media query');
        assert.match(content, /id="paint0_linear_light"/i, 'Favicon must define light theme gradient');
        assert.match(content, /id="paint0_linear_dark"/i, 'Favicon must define dark theme inverted gradient');
    });

    it('public/site.webmanifest exists with valid JSON and metadata', () => {
        const manifestPath = path.join(CLIENT_ROOT, 'public', 'site.webmanifest');
        assert.ok(fs.existsSync(manifestPath), 'public/site.webmanifest must exist');
        const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        assert.equal(content.short_name, 'FluxCluster');
        assert.equal(content.display, 'standalone');
        assert.equal(content.theme_color, '#000000');
        assert.ok(Array.isArray(content.icons) && content.icons.length > 0);
    });

    it('src/index.css has eliminated render-blocking Google Font @import', () => {
        const cssContent = fs.readFileSync(path.join(CLIENT_ROOT, 'src', 'index.css'), 'utf-8');
        assert.equal(cssContent.includes('@import url(\'https://fonts.googleapis.com'), false, 'Render-blocking @import must be removed from CSS');
    });

    it('All pages define semantic h1 elements for clear document hierarchy', () => {
        const pages = [
            'src/pages/Home.jsx',
            'src/pages/UploadBefore.jsx',
            'src/pages/UploadAfter.jsx',
            'src/pages/JoinBefore.jsx',
            'src/pages/JoinAfter.jsx',
            'src/pages/Editor.jsx',
            'src/components/GpuRender.jsx',
            'src/pages/Blogs.jsx'
        ];

        for (const relPath of pages) {
            const pageContent = fs.readFileSync(path.join(CLIENT_ROOT, relPath), 'utf-8');
            assert.match(pageContent, /<h1[\s>]/, `${relPath} must contain an <h1> element`);
        }
    });
});
