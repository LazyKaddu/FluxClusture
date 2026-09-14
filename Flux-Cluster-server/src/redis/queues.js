import redis from './connection.js';

export async function initializeJob(roomId, clip, frames, gridCols, gridRows, glb_hash, ownerId) {
    // Clear any old data, INCLUDING the new pending_chunks set
    await redis.del(`macro_queue:${roomId}`);
    await redis.del(`micro_queue:${roomId}`);
    await redis.del(`pending_chunks:${roomId}`);
    await redis.del(`job_owner:${roomId}`);
    await redis.del(`glb_hash:${roomId}`);

    // store the owner of the room which pushed the task
    await redis.set(`job_owner:${roomId}`, ownerId);
    
    // Store the cryptographic hash of the 3D asset
    await redis.set(`glb_hash:${roomId}`, glbHash);


    for (let i = 0; i < frames; i++) {
        await redis.lPush(`macro_queue:${roomId}`, JSON.stringify({ frame: i, clip, gridCols, gridRows }));
    }
    
    await advanceFrame(roomId);
}

export async function advanceFrame(roomId) {
    const frameDataStr = await redis.rPop(`macro_queue:${roomId}`);
    if (!frameDataStr) return false;

    const { frame, clip, gridCols, gridRows } = JSON.parse(frameDataStr);
    console.log(`[Room: ${roomId}] 💥 Exploding Frame ${frame}`);

    const chunkIds = []; // Array to hold our set members

    for (let x = 0; x < gridCols; x++) {
        for (let y = 0; y < gridRows; y++) {
            const chunkId = `f${frame}_${x}_${y}`;
            chunkIds.push(chunkId); // Add to our tracker array

            const chunkTask = {
                id: chunkId,
                roomId,
                frame,
                clip,
                bounds: { gridX: x, gridY: y, cols: gridCols, rows: gridRows }
            };
            await redis.lPush(`micro_queue:${roomId}`, JSON.stringify(chunkTask));
        }
    }
    
    // Add all chunk IDs to a Redis Set simultaneously
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

// NEW: Remove a chunk from the set and check if the set is empty
export async function completeChunk(roomId, chunkId) {
    // SREM removes the specific ID from the set
    await redis.sRem(`pending_chunks:${roomId}`, chunkId);
    
    // SCARD returns the number of items left in the set
    const remaining = await redis.sCard(`pending_chunks:${roomId}`);
    return remaining === 0; // Returns true if the frame is completely finished
}

