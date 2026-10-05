import { useEffect, useRef } from 'react';
import { swarmClient } from '../services/SwarmClient';
import { RenderTaskQueue } from '../render/taskQueue';
import { generateFileHash } from '../utils/helper';

export function useRenderPipeline({
    role,
    roomId,
    file,
    previewUrl,
    fileHash,
    config,
    setStatus,
    setProgress,
    setCurrentFrame,
    setChunkAssigned,
    onTileReceived,
    onFrameComplete,
    onSettingsReceived
}) {
    const isSceneReadyRef = useRef(false);
    const hasInitializedMasterRef = useRef(false);
    const taskQueueRef = useRef(null);
    const completedTilesRef = useRef(0);
    const workerRef = useRef(null);

    useEffect(() => {
        if (!roomId) return;

        let isSubscribed = true;
        const abortController = new AbortController();
        const taskQueue = new RenderTaskQueue();
        taskQueueRef.current = taskQueue;
        taskQueue.pause();

        // 1. Initialize Web Worker
        const worker = new Worker(new URL('../workers/render.worker.js', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        const renderCanvas = document.createElement('canvas');
        renderCanvas.style.position = 'absolute';
        renderCanvas.style.left = '-9999px';
        renderCanvas.style.visibility = 'hidden';
        renderCanvas.style.pointerEvents = 'none';
        document.body.appendChild(renderCanvas);

        const offscreen = renderCanvas.transferControlToOffscreen();
        worker.postMessage({ type: 'INIT', payload: { canvas: offscreen } }, [offscreen]);

        worker.onmessage = (e) => {
            if (!isSubscribed) return;
            const { type, payload, task } = e.data;

            if (type === 'STATUS' && setStatus) {
                setStatus(payload);
            } 
            else if (type === 'SCENE_READY') {
                isSceneReadyRef.current = true;
                taskQueue.resume();
                if (role === 'worker') {
                    swarmClient.socketManager.emit('REQUEST_TASK');
                }
            }
            else if (type === 'PROGRESS') {
                const progressData = payload;
                if (role === 'worker' && progressData.maxSamples > 0 && setProgress) {
                    setProgress(progressData.samples / progressData.maxSamples);
                } else if (role === 'master' && progressData.maxSamples > 0 && setProgress) {
                    const totalFrames = Math.max(1, config.endFrame - config.startFrame + 1);
                    const cols = Math.ceil(config.width / 128);
                    const rows = Math.ceil(config.height / 128);
                    const totalTiles = totalFrames * cols * rows;
                    if (totalTiles > 0) {
                        const tileProgress = Math.min(1, progressData.samples / progressData.maxSamples);
                        const pct = Math.min(1, (completedTilesRef.current + tileProgress) / totalTiles);
                        setProgress(pct);
                    }
                }
            }
            else if (type === 'TILE_RECEIVED') {
                const { metadata, pixels } = payload;
                if (onTileReceived) onTileReceived(metadata, pixels);
            }
            else if (type === 'TILE_COMPLETED') {
                const { task: completedTask, pixels } = payload;
                if (role === 'worker' && onTileReceived) {
                    onTileReceived({ chunkWidth: completedTask.chunkWidth || 128, chunkHeight: completedTask.chunkHeight || 128 }, pixels);
                }
                swarmClient.submitRenderedTile(completedTask, pixels);
            }
        };

        const processTask = async (task, taskSignal) => {
            if (!isSubscribed || taskSignal?.aborted || abortController.signal.aborted) return;
            
            const taskConfig = role === 'master' ? {
                fps: config?.fps || 30,
                width: config?.width || 1920,
                height: config?.height || 1080,
                samples: config?.samples || 1024,
                noiseThreshold: config?.noiseThreshold || 0.0
            } : {
                fps: parseInt(swarmClient.fps, 10) || 30,
                width: parseInt(swarmClient.width, 10),
                height: parseInt(swarmClient.height, 10),
                samples: parseInt(swarmClient.samples, 10),
                noiseThreshold: parseFloat(swarmClient.noiseThreshold) || 0.0
            };

            worker.postMessage({
                type: 'PROCESS_TASK',
                payload: { task, config: taskConfig }
            });

            return new Promise((resolve, reject) => {
                const handler = (e) => {
                    const { type, payload } = e.data;
                    if (type === 'TILE_COMPLETED' && payload.task.id === task.id) {
                        worker.removeEventListener('message', handler);
                        resolve();
                    }
                };
                taskSignal?.addEventListener('abort', () => {
                    worker.removeEventListener('message', handler);
                    reject(new Error("Render aborted"));
                });
                worker.addEventListener('message', handler);
            });
        };

        const setupScene = async (buffer) => {
            if (!isSubscribed) return;
            const sceneConfig = role === 'master' ? {
                animIndex: config?.animationIndex || 0,
                width: config?.width || 1920,
                height: config?.height || 1080,
                startFrame: config?.startFrame || 0,
                fps: config?.fps || 30
            } : {
                animIndex: parseInt(swarmClient.animationIndex, 10) || 0,
                width: parseInt(swarmClient.width, 10),
                height: parseInt(swarmClient.height, 10),
                startFrame: 0,
                fps: parseInt(swarmClient.fps, 10) || 30
            };
            
            worker.postMessage({
                type: 'SETUP_SCENE',
                payload: { buffer, ...sceneConfig }
            });
        };

        swarmClient.on('status', (msg) => {
            if (!isSubscribed) return;
            if (setStatus) setStatus(msg);
        });

        swarmClient.on('newTask', (task) => {
            if (!isSubscribed) return;
            if (setCurrentFrame) setCurrentFrame(parseInt(task.frame, 10));
            if (setChunkAssigned) setChunkAssigned(task.id || `${task.startX}_x_${task.startY}`);
            if (role === 'worker' && setProgress) setProgress(0);

            let enrichedTask = task;
            if (role === 'master') {
                enrichedTask = {
                    ...task,
                    totalWidth: config.width,
                    totalHeight: config.height,
                    samples: config.samples,
                    noiseThreshold: config.noiseThreshold,
                    fps: config.fps
                };
            }

            taskQueue.enqueue(enrichedTask, processTask);
        });

        if (role === 'master') {
            swarmClient.on('frameComplete', (task) => {
                if (onFrameComplete) onFrameComplete(task);
            });

            swarmClient.on('tileReceived', ({ metadata, pixelBuffer }) => {
                if (!isSubscribed) return;
                
                swarmClient.socketManager.emit('ACK_TILE', { id: metadata.taskId, task: { frame: metadata.frame } });
                
                if (onTileReceived) onTileReceived(metadata, pixelBuffer);

                completedTilesRef.current += 1;
                const totalFrames = Math.max(1, config.endFrame - config.startFrame + 1);
                const cols = Math.ceil(config.width / 128);
                const rows = Math.ceil(config.height / 128);
                const totalTiles = totalFrames * cols * rows;

                if (totalTiles > 0 && setProgress) {
                    const pct = Math.min(1, completedTilesRef.current / totalTiles);
                    setProgress(pct);
                }
            });

            async function initMaster() {
                if (hasInitializedMasterRef.current) return;
                hasInitializedMasterRef.current = true;

                let buffer = null;
                if (file && typeof file.arrayBuffer === 'function') {
                    buffer = await file.arrayBuffer();
                } else if (previewUrl) {
                    const response = await fetch(previewUrl);
                    buffer = await response.arrayBuffer();
                }
                if (!isSubscribed || !buffer) return;

                swarmClient.glbBuffer = buffer;
                await setupScene(buffer);

                if (config.masterWillRender !== undefined) {
                    swarmClient.masterWillRender = config.masterWillRender;
                }
                
                swarmClient.joinAsMaster(roomId);
                
                swarmClient.setRenderSetting({
                    ownerId: swarmClient.socketManager.id,
                    glbHash: fileHash,
                    width: config.width,
                    height: config.height,
                    noiseThreshold: config.noiseThreshold,
                    samples: config.samples,
                    animationIndex: config.animationIndex,
                    fps: config.fps
                });
        
                swarmClient.startRenderJob(
                    roomId,
                    config.startFrame,
                    config.endFrame,
                    config.width,
                    config.height,
                    config.fps,
                    fileHash,
                    config.samples,
                    config.noiseThreshold,
                    config.animationIndex
                );
            }
            initMaster();
        } 
        else if (role === 'worker') {
            swarmClient.on('fileReady', async () => {
                if (!isSubscribed) return;

                if (onSettingsReceived) {
                    onSettingsReceived({
                        samples: parseInt(swarmClient.samples, 10),
                        noiseThreshold: parseFloat(swarmClient.noiseThreshold ?? swarmClient.noise),
                        fps: parseInt(swarmClient.fps, 10),
                        width: parseInt(swarmClient.width, 10),
                        height: parseInt(swarmClient.height, 10),
                        animationIndex: parseInt(swarmClient.animationIndex, 10)
                    });
                }

                if (swarmClient.glbBuffer) {
                    if (setStatus) setStatus("Verifying GLB file...");
                    const hash = await generateFileHash(swarmClient.glbBuffer);

                    if (hash !== swarmClient.glbHash) {
                        console.error("GLB hash mismatch! Expected:", swarmClient.glbHash, "Got:", hash);
                        if (setStatus) setStatus("Hash mismatch. Requesting GLB again...");
                        swarmClient.socketManager.emit('REQUEST_SEEDER', { roomId });
                        return;
                    }

                    if (setStatus) setStatus("GLB verified. Setting up scene...");
                    await setupScene(swarmClient.glbBuffer);
                }
            });

            swarmClient.joinAsWorker(roomId);
        }

        return () => {
            isSubscribed = false;
            abortController.abort();

            if (taskQueueRef.current) {
                taskQueueRef.current.dispose();
                taskQueueRef.current = null;
            }

            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'ABORT' });
                workerRef.current = null;
            }

            if (swarmClient.socketManager.socket) {
                swarmClient.socketManager.socket.disconnect();
            }

            if (renderCanvas && renderCanvas.parentNode) {
                renderCanvas.parentNode.removeChild(renderCanvas);
            }
        };
    }, [roomId, role, file, fileHash, previewUrl, config]);
}
