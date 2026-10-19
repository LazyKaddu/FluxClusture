import test from 'node:test';
import assert from 'node:assert/strict';
import { DenoiseManager, bilateralFilterFallback } from '../src/services/DenoiseManager.js';

// Polyfill minimal ImageData for Node.js test environment if absent
if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {
        constructor(dataOrWidth, widthOrHeight, height) {
            if (dataOrWidth instanceof Uint8ClampedArray) {
                this.data = dataOrWidth;
                this.width = widthOrHeight;
                this.height = height;
            } else {
                this.width = dataOrWidth;
                this.height = widthOrHeight;
                this.data = new Uint8ClampedArray(this.width * this.height * 4);
            }
        }
    };
}

function createMockNoisyImageData(width = 8, height = 8) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
        // Flat gray base + alternating high-frequency noise
        const noise = (i % 8 === 0) ? 20 : -20;
        const val = Math.min(255, Math.max(0, 128 + noise));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
    }
    return new ImageData(data, width, height);
}

test('DenoiseManager - bilateralFilterFallback reduces noise and preserves alpha', () => {
    const input = createMockNoisyImageData(8, 8);
    const output = bilateralFilterFallback(input, 2, 0.2);

    assert.equal(output.width, 8);
    assert.equal(output.height, 8);
    assert.equal(output.data.length, 8 * 8 * 4);

    // Alpha channel must be preserved as 255
    for (let i = 3; i < output.data.length; i += 4) {
        assert.equal(output.data[i], 255);
    }

    // Verify center pixel noise was smoothed towards 128
    const centerIdx = (4 * 8 + 4) * 4;
    const centerVal = output.data[centerIdx];
    // Original had values like 178 or 78; filtered value should be closer to 128
    assert.ok(Math.abs(centerVal - 128) < Math.abs(input.data[centerIdx] - 128));
});

test('DenoiseManager - processes enqueued frames in deterministic sequential FIFO order', async () => {
    const manager = new DenoiseManager();
    const processedOrder = [];
    const completedCallbacks = [];

    manager.on('frame_denoised', ({ frame }) => {
        processedOrder.push(frame);
    });

    const f0 = manager.enqueueFrame(0, createMockNoisyImageData(4, 4), (data) => {
        completedCallbacks.push(0);
        assert.ok(data instanceof ImageData);
    });

    const f1 = manager.enqueueFrame(1, createMockNoisyImageData(4, 4), (data) => {
        completedCallbacks.push(1);
        assert.ok(data instanceof ImageData);
    });

    const f2 = manager.enqueueFrame(2, createMockNoisyImageData(4, 4), (data) => {
        completedCallbacks.push(2);
        assert.ok(data instanceof ImageData);
    });

    await Promise.all([f0, f1, f2]);

    assert.deepEqual(processedOrder, [0, 1, 2], "Frames must be processed in strict FIFO order");
    assert.deepEqual(completedCallbacks, [0, 1, 2], "Completion callbacks must fire in FIFO order");
    assert.equal(manager.denoisedFramesMap.size, 3);
});

test('DenoiseManager - waitForAll settles only after the complete queue drains', async () => {
    const manager = new DenoiseManager();
    let isDrained = false;

    manager.enqueueFrame(10, createMockNoisyImageData(4, 4));
    manager.enqueueFrame(11, createMockNoisyImageData(4, 4));
    manager.enqueueFrame(12, createMockNoisyImageData(4, 4));

    const drainPromise = manager.waitForAll().then(() => {
        isDrained = true;
    });

    assert.equal(isDrained, false, "waitForAll should not settle immediately while tasks are queued");

    await drainPromise;

    assert.equal(isDrained, true, "waitForAll must settle once all tasks complete");
    assert.equal(manager.queue.length, 0);
    assert.equal(manager.denoisedFramesMap.size, 3);
});

test('DenoiseManager - detects WebGPU support correctly and handles fallback gracefully', async () => {
    const manager = new DenoiseManager();
    // In Node.js, navigator.gpu is undefined
    assert.equal(DenoiseManager.isWebGPUSupported(), false);

    await manager.init();
    assert.equal(manager.backend, 'fallback');

    const result = await manager.denoiseImageData(createMockNoisyImageData(4, 4));
    assert.ok(result instanceof ImageData);
    assert.equal(result.width, 4);
    assert.equal(result.height, 4);
});

test('DenoiseManager - executes through UNet tileExecute when backend is initialized with UNet', async () => {
    const manager = new DenoiseManager();
    let tileExecuted = false;

    manager.unet = {
        tileExecute({ color, done }) {
            tileExecuted = true;
            const out = new ImageData(color.width, color.height);
            done(out);
        },
        dispose() {}
    };
    manager.backend = 'oidn-webgpu';

    const input = createMockNoisyImageData(4, 4);
    const result = await manager.denoiseImageData(input);

    assert.equal(tileExecuted, true, "Must dispatch to unet.tileExecute");
    assert.equal(result.width, 4);
    assert.equal(result.height, 4);

    manager.dispose();
    assert.equal(manager.backend, 'uninitialized');
    assert.equal(manager.unet, null);
});

