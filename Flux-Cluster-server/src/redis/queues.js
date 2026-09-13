import redis from './connection.js';

export async function initializeJob(roomId, clip, frames, gridCols, gridRows) {
    // Clear any old data for this specific room
    await redis.del(`macro_queue:${roomId}`);
    await redis.del(`micro_queue:${roomId}`);

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

    for (let x = 0; x < gridCols; x++) {
        for (let y = 0; y < gridRows; y++) {
            const chunkTask = {
                id: `f${frame}_${x}_${y}`,
                roomId,
                frame,
                clip,
                bounds: { gridX: x, gridY: y, cols: gridCols, rows: gridRows }
            };
            await redis.lPush(`micro_queue:${roomId}`, JSON.stringify(chunkTask));
        }
    }
    return true;
}

export async function getNextTask(roomId) {
    const taskStr = await redis.rPop(`micro_queue:${roomId}`);
    return taskStr ? JSON.parse(taskStr) : null;
}