import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_ROOT = path.resolve(__dirname, '..');

describe('Developer Blogs & Engineering Chronicles Suite', () => {
    it('src/App.jsx defines /blogs and /blog routes with Blogs component', () => {
        const appPath = path.join(CLIENT_ROOT, 'src', 'App.jsx');
        assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
        const appContent = fs.readFileSync(appPath, 'utf-8');

        assert.match(appContent, /import\s+Blogs\s+from\s+['"]\.\/pages\/Blogs['"]/);
        assert.match(appContent, /<Route\s+path=["']\/blogs["']\s+element=\{<Blogs\s*\/>\}/);
        assert.match(appContent, /<Route\s+path=["']\/blog["']\s+element=\{<Blogs\s*\/>\}/);
    });

    it('src/pages/Blogs.jsx renders a fixed back to home button', () => {
        const blogsPath = path.join(CLIENT_ROOT, 'src', 'pages', 'Blogs.jsx');
        const content = fs.readFileSync(blogsPath, 'utf-8');

        assert.match(content, /id=["']btn-back-home["']/);
        assert.match(content, /navigate\(['"]\/['"]\)/);
        assert.match(content, /fixed/);
        assert.match(content, /BACK TO HOME/);
    });

    it('src/components/Base.jsx exempts /blogs and /blog from mobile blocker and wires drawer BLOG link', () => {
        const basePath = path.join(CLIENT_ROOT, 'src', 'components', 'Base.jsx');
        assert.ok(fs.existsSync(basePath), 'Base.jsx must exist');
        const baseContent = fs.readFileSync(basePath, 'utf-8');

        // Check isHeavyRoute exemption
        assert.match(baseContent, /const\s+heavyPaths\s*=\s*\[.*'\/upload'.*'\/render'.*\]/s);
        assert.match(baseContent, /const\s+isHeavyRoute\s*=\s*heavyPaths\.includes\(location\.pathname\)/);
        assert.ok(!baseContent.includes("window.location.pathname !== '/'"), 'isHeavyRoute must not blindly block all non-home paths');

        // Check NavLinks wiring
        assert.match(baseContent, /<NavLinks[^>]*text=\{["']BLOG["']\}[^>]*onClick=\{[^}]*navigate\(['"]\/blogs['"]\)/s);
    });

    it('src/pages/Blogs.jsx defines semantic hierarchy (<article>, <header>, <h1>, <section>, <nav>)', () => {
        const blogsPath = path.join(CLIENT_ROOT, 'src', 'pages', 'Blogs.jsx');
        assert.ok(fs.existsSync(blogsPath), 'Blogs.jsx must exist');
        const content = fs.readFileSync(blogsPath, 'utf-8');

        assert.match(content, /<article[\s>]/, 'Must contain semantic <article> element');
        assert.match(content, /<header[\s>]/, 'Must contain semantic <header> element');
        assert.match(content, /<h1[\s>]/, 'Must contain semantic <h1> element');
        assert.match(content, /<section[^>]*id=["']genesis["']/, 'Must contain genesis section');
        assert.match(content, /<section[^>]*id=["']architecture["']/, 'Must contain architecture section');
        assert.match(content, /<section[^>]*id=["']crucible["']/, 'Must contain crucible breakthroughs section');
        assert.match(content, /<section[^>]*id=["']neural-denoising["']/, 'Must contain neural denoising section');
        assert.match(content, /<section[^>]*id=["']personal-journey["']/, 'Must contain personal journey section');
        assert.match(content, /<nav\s+aria-label=["']Article Table of Contents["']/, 'Must contain TOC navigation');
    });

    it('src/pages/Blogs.jsx documents all key engineering breakthroughs and personal reflections', () => {
        const blogsPath = path.join(CLIENT_ROOT, 'src', 'pages', 'Blogs.jsx');
        const content = fs.readFileSync(blogsPath, 'utf-8');

        // WebRTC 64KB SCTP ceiling & 16KB slicing
        assert.ok(content.includes('64KB'), 'Must discuss WebRTC 64KB ceiling');
        assert.ok(content.includes('16,384') || content.includes('16KB'), 'Must discuss 16KB sub-chunk slicing');

        // WebGL bottom-left coordinate space vs canvas top-left
        assert.ok(content.includes('bottom-left') || content.includes('coordinate'), 'Must discuss bottom-left coordinate space');
        assert.ok(content.includes('row reversal') || content.includes('alpha'), 'Must discuss in-place row reversal and alpha');

        // Intel OIDN WebGPU U-Net model
        assert.ok(content.includes('OIDN') || content.includes('rt_ldr.tza'), 'Must discuss Intel OIDN model');
        assert.ok(content.includes('DenoiseManager'), 'Must reference DenoiseManager pipeline');

        // Personal reflection and creator attribution
        assert.ok(content.includes('Aashish Negi'), 'Must include creator Aashish Negi');
        assert.ok(content.includes('Pauri Garhwal') || content.includes('Uttarakhand'), 'Must include Uttarakhand roots');
        assert.ok(content.includes('@LazyKaddu'), 'Must link to @LazyKaddu');
    });

    it('src/pages/Blogs.jsx configures useSEO with Schema.org TechArticle JSON-LD and canonical /blogs', () => {
        const blogsPath = path.join(CLIENT_ROOT, 'src', 'pages', 'Blogs.jsx');
        const content = fs.readFileSync(blogsPath, 'utf-8');

        assert.match(content, /useSEO\(\{/);
        assert.match(content, /canonical:\s*['"]\/blogs['"]/);
        assert.match(content, /ogType:\s*['"]article['"]/);
        assert.match(content, /"@type":\s*"TechArticle"/);
        assert.match(content, /"name":\s*"Aashish Negi"/);
        assert.match(content, /"addressRegion":\s*"Uttarakhand"/);
    });

    it('public/sitemap.xml and public/robots.txt include /blogs and /blog', () => {
        const sitemapPath = path.join(CLIENT_ROOT, 'public', 'sitemap.xml');
        const robotsPath = path.join(CLIENT_ROOT, 'public', 'robots.txt');

        const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
        const robotsContent = fs.readFileSync(robotsPath, 'utf-8');

        assert.ok(sitemapContent.includes('https://flux-cluster.vercel.app/blogs'), 'Sitemap must contain /blogs URL');
        assert.match(robotsContent, /Allow:\s*\/blogs/, 'Robots must allow /blogs');
        assert.match(robotsContent, /Allow:\s*\/blog/, 'Robots must allow /blog');
    });
});
