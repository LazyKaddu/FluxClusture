import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Canvas Frame Blanking & Transition Logic', () => {
    // Simulated canvas context
    function createMockCanvas(width = 128, height = 128) {
        const events = [];
        const canvas = {
            width,
            height,
            getContext: () => ({
                clearRect(x, y, w, h) {
                    events.push({ type: 'clearRect', x, y, w, h });
                },
                putImageData(imgData, x, y, dx, dy, dw, dh) {
                    events.push({ type: 'putImageData', x, y, dw, dh });
                },
                getImageData(x, y, w, h) {
                    events.push({ type: 'getImageData', x, y, w, h });
                    return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
                }
            })
        };
        return { canvas, events };
    }

    it('clears canvas when transitioning to a new frame and ignores tiles for the same frame', () => {
        const { canvas, events } = createMockCanvas(256, 256);
        let activeCanvasFrame = null;

        const blankCanvas = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        const processTile = (metadata) => {
            const tileFrame = metadata.frame !== undefined ? parseInt(metadata.frame, 10) : null;
            if (tileFrame !== null && activeCanvasFrame !== null && tileFrame < activeCanvasFrame) {
                return; // Discard stale
            }
            if (tileFrame !== null && activeCanvasFrame !== null && tileFrame !== activeCanvasFrame) {
                blankCanvas();
            }
            if (tileFrame !== null) {
                activeCanvasFrame = tileFrame;
            }
            const ctx = canvas.getContext('2d');
            ctx.putImageData({}, metadata.startX, metadata.startY);
        };

        // Frame 0 - First tile (initial load: canvas is already blank)
        processTile({ frame: 0, startX: 0, startY: 0 });
        assert.equal(activeCanvasFrame, 0);
        assert.equal(events.filter(e => e.type === 'clearRect').length, 0);

        // Frame 0 - Second tile (same frame: no clearRect)
        processTile({ frame: 0, startX: 128, startY: 0 });
        assert.equal(events.filter(e => e.type === 'clearRect').length, 0);

        // Frame 1 - First tile arrives (new frame loaded: canvas MUST be blanked!)
        processTile({ frame: 1, startX: 0, startY: 0 });
        assert.equal(activeCanvasFrame, 1);
        const clearEvents = events.filter(e => e.type === 'clearRect');
        assert.equal(clearEvents.length, 1);
        assert.deepEqual(clearEvents[0], { type: 'clearRect', x: 0, y: 0, w: 256, h: 256 });

        // Frame 1 - Second tile (same frame: no extra clear)
        processTile({ frame: 1, startX: 128, startY: 0 });
        assert.equal(events.filter(e => e.type === 'clearRect').length, 1);
    });

    it('discards stale tiles arriving late from a previous frame', () => {
        const { canvas, events } = createMockCanvas(256, 256);
        let activeCanvasFrame = null;

        const processTile = (metadata) => {
            const tileFrame = metadata.frame !== undefined ? parseInt(metadata.frame, 10) : null;
            if (tileFrame !== null && activeCanvasFrame !== null && tileFrame < activeCanvasFrame) {
                return false; // Discarded
            }
            if (tileFrame !== null && activeCanvasFrame !== null && tileFrame !== activeCanvasFrame) {
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            }
            if (tileFrame !== null) {
                activeCanvasFrame = tileFrame;
            }
            canvas.getContext('2d').putImageData({}, metadata.startX, metadata.startY);
            return true;
        };

        // Complete Frame 0
        assert.equal(processTile({ frame: 0, startX: 0, startY: 0 }), true);
        // Advance to Frame 1
        assert.equal(processTile({ frame: 1, startX: 0, startY: 0 }), true);

        // A delayed tile from Frame 0 arrives
        const accepted = processTile({ frame: 0, startX: 128, startY: 128 });
        assert.equal(accepted, false, 'Late tile from Frame 0 must be discarded');
        assert.equal(activeCanvasFrame, 1, 'Active canvas frame must remain 1');
    });

    it('prevents background denoiser callback from blitting previous frame over newly loaded frame', () => {
        const { canvas, events } = createMockCanvas(256, 256);
        const completedFrames = new Map();
        let activeCanvasFrame = 0;

        // Simulated denoiser callback for Frame 0
        const onDenoiseComplete = (frameNum, denoisedData) => {
            completedFrames.set(frameNum, denoisedData);
            // Only blit if active canvas is still on this frame!
            if (activeCanvasFrame === frameNum) {
                canvas.getContext('2d').putImageData(denoisedData, 0, 0);
            }
        };

        // Frame 1 has loaded
        activeCanvasFrame = 1;

        // Denoising for Frame 0 completes in background
        onDenoiseComplete(0, { width: 256, height: 256 });

        assert.equal(completedFrames.has(0), true, 'Frame 0 is stored in memory');
        assert.equal(events.filter(e => e.type === 'putImageData').length, 0, 'Frame 0 denoiser must NOT blit over Frame 1');

        // Now Frame 1 denoiser completes while activeCanvasFrame is 1
        onDenoiseComplete(1, { width: 256, height: 256 });
        assert.equal(events.filter(e => e.type === 'putImageData').length, 1, 'Frame 1 denoiser blits correctly');
    });

    it('onFrameLoad blanks canvas immediately when task for new frame arrives', () => {
        const { canvas, events } = createMockCanvas(256, 256);
        let activeCanvasFrame = null;

        const blankCanvas = () => {
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        };

        const onFrameLoad = (newFrame) => {
            if (activeCanvasFrame !== null && activeCanvasFrame !== newFrame) {
                blankCanvas();
            }
            activeCanvasFrame = newFrame;
        };

        // Load Frame 0
        onFrameLoad(0);
        assert.equal(activeCanvasFrame, 0);
        assert.equal(events.filter(e => e.type === 'clearRect').length, 0);

        // Load Frame 1 (dispatched via newTask before tiles even render)
        onFrameLoad(1);
        assert.equal(activeCanvasFrame, 1);
        assert.equal(events.filter(e => e.type === 'clearRect').length, 1, 'Canvas blanked on new frame load');
    });
});
