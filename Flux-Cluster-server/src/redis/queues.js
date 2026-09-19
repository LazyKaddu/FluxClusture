import redis from './connection.js';

const CHUNK_SIZE = 64; 

export async function initializeJob(
    roomId, 
    startFrame, 
    endFrame, 
    width, 
    height, 
    fps, 
    glbHash, 
    samples, 
    noiseThreshold, 
    animationIndex, 
    ownerId
) {
    // 1. Clear any old data
    await redis.del(`macro_queue:${roomId}`);
    await redis.del(`micro_queue:${roomId}`);
    await redis.del(`pending_chunks:${roomId}`);
    await redis.del(`job_meta:${roomId}`);

    // 2. Store global job configuration centrally as a single JSON object
    const jobMeta = { 
        ownerId, 
        glbHash, 
        width, 
        height, 
        fps,
        samples,
        noiseThreshold,
        animationIndex
    };
    await redis.set(`job_meta:${roomId}`, JSON.stringify(jobMeta));

    // 3. Populate the Macro Queue with the exact frame range
    for (let i = startFrame; i <= endFrame; i++) {
        await redis.rPush(`macro_queue:${roomId}`, i.toString());
    }
    
    // 4. Explode the first frame to kick off the swarm
    await advanceFrame(roomId);
}

export async function advanceFrame(roomId) {
    const frameStr = await redis.lPop(`macro_queue:${roomId}`);
    if (!frameStr) return false;

    const frame = parseInt(frameStr, 10);
    console.log(`[Room: ${roomId}] 💥 Exploding Frame ${frame}`);

    // Fetch the stored dimensions and render settings
    const metaStr = await redis.get(`job_meta:${roomId}`);
    if (!metaStr) throw new Error("Job metadata missing");
    
    // Unpack all the settings we stored in initializeJob
    const { width, height, samples, noiseThreshold, animationIndex } = JSON.parse(metaStr);

    const chunkIds = [];
    const cols = Math.ceil(width / CHUNK_SIZE);
    const rows = Math.ceil(height / CHUNK_SIZE);

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            const startX = x * CHUNK_SIZE;
            const startY = y * CHUNK_SIZE;
            
            const chunkWidth = Math.min(CHUNK_SIZE, width - startX);
            const chunkHeight = Math.min(CHUNK_SIZE, height - startY);

            const chunkId = `f${frame}_x${startX}_y${startY}`;
            chunkIds.push(chunkId);

            // Construct the exact payload the Worker requires
            const chunkTask = {
                id: chunkId,
                roomId,
                frame,
                startX,
                startY,
                chunkWidth,
                chunkHeight
            };
            
            await redis.lPush(`micro_queue:${roomId}`, JSON.stringify(chunkTask));
        }
    }
    
    if (chunkIds.length > 0) {
        await redis.sAdd(`pending_chunks:${roomId}`, chunkIds);
    }
    
    return true;
}

export async function getNextTask(roomId) {
    const taskStr = await redis.rPop(`micro_queue:${roomId}`);
    return taskStr ? JSON.parse(taskStr) : null;
}

export async function requeueTask(roomId, task) {
    await redis.rPush(`micro_queue:${roomId}`, JSON.stringify(task));
}

export async function completeChunk(roomId, chunkId) {
    await redis.sRem(`pending_chunks:${roomId}`, chunkId);
    const remaining = await redis.sCard(`pending_chunks:${roomId}`);
    return remaining === 0;
}