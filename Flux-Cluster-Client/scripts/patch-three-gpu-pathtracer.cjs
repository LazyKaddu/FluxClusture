const fs = require('fs');
const path = require('path');

const targets = [
    path.join(__dirname, '../node_modules/three-gpu-pathtracer/src/core/PathTracingSceneGenerator.js'),
    path.join(__dirname, '../node_modules/three-gpu-pathtracer/build/index.module.js'),
    path.join(__dirname, '../node_modules/.vite/deps/three-gpu-pathtracer.js')
];

let patchedCount = 0;

for (const target of targets) {
    if (fs.existsSync(target)) {
        let content = fs.readFileSync(target, 'utf8');
        if (content.includes('this._materialUuids.length !== length')) {
            content = content.replace(
                /this\._materialUuids\.length !== length/g,
                'this._materialUuids.length !== (materials ? materials.length : 0)'
            );
            fs.writeFileSync(target, content, 'utf8');
            console.log(`[patch] Successfully patched ${path.basename(target)}`);
            patchedCount++;
        }
    }
}

if (patchedCount === 0) {
    console.log('[patch] Target files already up to date or not found.');
}
