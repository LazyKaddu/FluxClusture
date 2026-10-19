import { initUNetFromURL } from 'oidn-web/dist/oidn.js';

/**
 * Creates an ImageData-compatible object across environments.
 */
export function createImageData(width, height, existingData = null) {
    const data = existingData ? new Uint8ClampedArray(existingData) : new Uint8ClampedArray(width * height * 4);
    if (typeof ImageData !== 'undefined') {
        return new ImageData(data, width, height);
    }
    return { data, width, height };
}

/**
 * Fast CPU-based edge-preserving bilateral filter fallback.
 * Used when WebGPU is not supported or when device initialization fails.
 */
export function bilateralFilterFallback(imageData, spatialSigma = 2, rangeSigma = 0.25) {
    const { width, height, data } = imageData;
    const output = createImageData(width, height, data);
    const outData = output.data;

    const radius = Math.max(1, Math.round(spatialSigma * 1.5));
    const twoSpatialSq = 2 * spatialSigma * spatialSigma;
    const twoRangeSq = 2 * rangeSigma * rangeSigma;

    // Precompute spatial weights
    const spatialWeights = [];
    for (let dy = -radius; dy <= radius; dy++) {
        spatialWeights[dy + radius] = [];
        for (let dx = -radius; dx <= radius; dx++) {
            spatialWeights[dy + radius][dx + radius] = Math.exp(-(dx * dx + dy * dy) / twoSpatialSq);
        }
    }

    // Process interior pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const centerIdx = (y * width + x) * 4;
            const cR = data[centerIdx] / 255;
            const cG = data[centerIdx + 1] / 255;
            const cB = data[centerIdx + 2] / 255;

            let sumR = 0, sumG = 0, sumB = 0, norm = 0;

            const yMin = Math.max(0, y - radius);
            const yMax = Math.min(height - 1, y + radius);
            const xMin = Math.max(0, x - radius);
            const xMax = Math.min(width - 1, x + radius);

            for (let ny = yMin; ny <= yMax; ny++) {
                const sY = ny - y + radius;
                for (let nx = xMin; nx <= xMax; nx++) {
                    const sX = nx - x + radius;
                    const nIdx = (ny * width + nx) * 4;

                    const nR = data[nIdx] / 255;
                    const nG = data[nIdx + 1] / 255;
                    const nB = data[nIdx + 2] / 255;

                    const colorDistSq = (cR - nR) ** 2 + (cG - nG) ** 2 + (cB - nB) ** 2;
                    const weight = spatialWeights[sY][sX] * Math.exp(-colorDistSq / twoRangeSq);

                    sumR += nR * weight;
                    sumG += nG * weight;
                    sumB += nB * weight;
                    norm += weight;
                }
            }

            if (norm > 0) {
                outData[centerIdx] = Math.min(255, Math.max(0, Math.round((sumR / norm) * 255)));
                outData[centerIdx + 1] = Math.min(255, Math.max(0, Math.round((sumG / norm) * 255)));
                outData[centerIdx + 2] = Math.min(255, Math.max(0, Math.round((sumB / norm) * 255)));
            }
            outData[centerIdx + 3] = 255;
        }
    }

    return output;
}

/**
 * Converts ImageData to a PNG Blob.
 */
export async function imageDataToBlob(imageData, type = 'image/png') {
    if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = offscreen.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        return offscreen.convertToBlob({ type });
    } else if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Canvas blob conversion failed"));
            }, type);
        });
    }
    throw new Error("No canvas context available for PNG conversion");
}

/**
 * Triggers a browser download of an ImageData as PNG.
 */
export async function downloadImageDataAsPNG(imageData, filename = 'fluxcluster_frame.png') {
    const blob = await imageDataToBlob(imageData, 'image/png');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * DenoiseManager
 * 
 * Manages the Intel Open Image Denoise (OIDN) lifecycle, execution queue,
 * and fallback filtering for animation frames in FluxCluster.
 */
export class DenoiseManager {
    constructor() {
        this.unet = null;
        this.backend = 'uninitialized'; // 'oidn-webgpu' | 'fallback' | 'failed'
        this.isInitializing = false;
        this.initPromise = null;
        this.queue = [];
        this.isProcessingQueue = false;
        this.activeTask = null;
        this.drainResolvers = [];
        this.listeners = new Map();
        this.denoisedFramesMap = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const list = this.listeners.get(event).filter(cb => cb !== callback);
        this.listeners.set(event, list);
    }

    _emit(event, data) {
        if (this.listeners.has(event)) {
            for (const cb of this.listeners.get(event)) {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`[DenoiseManager] Error in listener for ${event}:`, err);
                }
            }
        }
    }

    /**
     * Checks whether WebGPU is available in the current browser.
     */
    static isWebGPUSupported() {
        return typeof navigator !== 'undefined' && !!navigator.gpu;
    }

    /**
     * Initializes the OIDN U-Net model from local weights.
     */
    async init(weightsUrl = '/weights/rt_ldr.tza') {
        if (this.backend === 'oidn-webgpu' && this.unet) {
            return this.unet;
        }

        if (this.isInitializing && this.initPromise) {
            return this.initPromise;
        }

        this.isInitializing = true;
        this.initPromise = (async () => {
            if (!DenoiseManager.isWebGPUSupported()) {
                console.warn("[DenoiseManager] WebGPU is not supported in this browser. Falling back to CPU bilateral filter.");
                this.backend = 'fallback';
                this.isInitializing = false;
                this._emit('ready', { backend: this.backend });
                return null;
            }

            try {
                this._emit('status', 'Loading Intel OIDN neural weights...');
                const unet = await initUNetFromURL(weightsUrl, undefined, { hdr: false });
                this.unet = unet;
                this.backend = 'oidn-webgpu';
                this.isInitializing = false;
                console.log("[DenoiseManager] Intel OIDN WebGPU denoiser initialized successfully.");
                this._emit('ready', { backend: this.backend });
                return unet;
            } catch (error) {
                console.warn("[DenoiseManager] Failed to initialize OIDN WebGPU. Falling back to CPU bilateral filter:", error);
                this.backend = 'fallback';
                this.isInitializing = false;
                this._emit('ready', { backend: this.backend });
                return null;
            }
        })();

        return this.initPromise;
    }

    /**
     * Directly denoises a single ImageData buffer.
     */
    async denoiseImageData(imageData, onProgress = null) {
        if (this.backend === 'uninitialized') {
            await this.init();
        }

        if (this.backend === 'oidn-webgpu' && this.unet) {
            return new Promise((resolve, reject) => {
                let settled = false;
                try {
                    this.unet.tileExecute({
                        color: imageData,
                        progress: (_denoised, tileData, tile, currentIdx, totalIdx) => {
                            if (onProgress && totalIdx > 0) {
                                onProgress(currentIdx / totalIdx, tileData, tile);
                            }
                        },
                        done: (outputImageData) => {
                            if (!settled) {
                                settled = true;
                                resolve(outputImageData);
                            }
                        },
                        error: (err) => {
                            if (!settled) {
                                settled = true;
                                console.warn("[DenoiseManager] OIDN WebGPU tileExecute failed. Applying fallback:", err);
                                resolve(bilateralFilterFallback(imageData));
                            }
                        }
                    });
                } catch (err) {
                    if (!settled) {
                        settled = true;
                        console.warn("[DenoiseManager] tileExecute throw. Applying fallback:", err);
                        resolve(bilateralFilterFallback(imageData));
                    }
                }
            });
        }

        // Fallback filter
        return bilateralFilterFallback(imageData);
    }

    /**
     * Enqueues an animation frame for sequential denoising.
     */
    enqueueFrame(frameNumber, imageData, onComplete = null) {
        return new Promise((resolve, reject) => {
            const task = {
                frameNumber,
                imageData,
                onComplete,
                resolve,
                reject,
                enqueuedAt: Date.now()
            };

            this.queue.push(task);
            this._emit('queue_updated', {
                queueLength: this.queue.length,
                activeTask: this.activeTask
            });

            this._processQueue();
        });
    }

    async _processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            this.activeTask = task;

            this._emit('frame_denoising_start', {
                frame: task.frameNumber,
                remaining: this.queue.length
            });

            try {
                const denoisedData = await this.denoiseImageData(task.imageData, (pct) => {
                    this._emit('frame_progress', {
                        frame: task.frameNumber,
                        progress: pct
                    });
                });

                this.denoisedFramesMap.set(task.frameNumber, denoisedData);

                if (task.onComplete) {
                    task.onComplete(denoisedData);
                }

                task.resolve(denoisedData);

                this._emit('frame_denoised', {
                    frame: task.frameNumber,
                    denoisedData,
                    totalDenoised: this.denoisedFramesMap.size
                });
            } catch (err) {
                console.error(`[DenoiseManager] Failed to denoise frame ${task.frameNumber}:`, err);
                task.reject(err);
            } finally {
                this.activeTask = null;
            }
        }

        this.isProcessingQueue = false;

        // Drain any pending flush/wait resolvers
        if (this.drainResolvers.length > 0) {
            const resolvers = [...this.drainResolvers];
            this.drainResolvers = [];
            for (const r of resolvers) {
                r();
            }
        }
    }

    /**
     * Waits until all currently enqueued denoising tasks are complete.
     */
    async waitForAll() {
        if (!this.isProcessingQueue && this.queue.length === 0) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.drainResolvers.push(resolve);
        });
    }

    /**
     * Clears all pending queue tasks and resets state.
     */
    reset() {
        this.queue = [];
        this.denoisedFramesMap.clear();
        this.activeTask = null;
        this.drainResolvers = [];
    }

    /**
     * Frees resources.
     */
    dispose() {
        this.reset();
        if (this.unet) {
            try {
                this.unet.dispose();
            } catch (e) {
                console.warn("[DenoiseManager] Error disposing UNet:", e);
            }
            this.unet = null;
        }
        this.backend = 'uninitialized';
    }
}

export const denoiseManager = new DenoiseManager();
