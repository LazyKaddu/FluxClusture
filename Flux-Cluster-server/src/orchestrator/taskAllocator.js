import redis from '../redis/connection.js';

// Lock to prevent multiple monitors running for the same room
const activeMonitors = new Set();

export async function trackTaskStart(roomId, chunkId) {
    const startTime = Date.now();
    await redis.hSet(`task_start:${roomId}`, chunkId, startTime.toString());
}

export async function trackTaskCompletion(roomId, chunkId) {
    const startTimeStr = await redis.hGet(`task_start:${roomId}`, chunkId);
    if (!startTimeStr) return;

    const startTime = parseInt(startTimeStr, 10);
    const duration = Date.now() - startTime;

    // Clean up
    await redis.hDel(`task_start:${roomId}`, chunkId);

    // Update averages
    const statsStr = await redis.get(`chunk_stats:${roomId}`);
    let stats = statsStr ? JSON.parse(statsStr) : { totalTime: 0, count: 0 };
    
    stats.totalTime += duration;
    stats.count += 1;

    await redis.set(`chunk_stats:${roomId}`, JSON.stringify(stats));
}

export async function getAverageChunkTime(roomId) {
    const statsStr = await redis.get(`chunk_stats:${roomId}`);
    // Default to 5 seconds if no data is available
    if (!statsStr) return 5000; 

    const stats = JSON.parse(statsStr);
    if (stats.count === 0) return 5000;

    return Math.round(stats.totalTime / stats.count);
}

export async function handleEmptyQueue(roomId, io) {
    if (activeMonitors.has(roomId)) return;
    
    // Ensure there are actually pending chunks left before we monitor
    const pendingCount = await redis.sCard(`pending_chunks:${roomId}`);
    if (pendingCount === 0) return;

    activeMonitors.add(roomId);

    try {
        const avgTime = await getAverageChunkTime(roomId);
        console.log(`[Room: ${roomId}] Microqueue empty. Waiting ${avgTime}ms (avg render time) before rescuing pending chunks...`);

        await new Promise(resolve => setTimeout(resolve, avgTime));

        // After waiting, check pending chunks again
        const pendingChunks = await redis.sMembers(`pending_chunks:${roomId}`);
        if (pendingChunks.length > 0) {
            console.log(`[Room: ${roomId}] Rescuing ${pendingChunks.length} chunks that are taking too long!`);
            
            const metaStr = await redis.get(`job_meta:${roomId}`);
            if (!metaStr) return;
            const { width, height } = JSON.parse(metaStr);
            const CHUNK_SIZE = 64;

            for (const chunkId of pendingChunks) {
                // Parse f{frame}_x{startX}_y{startY}
                const parts = chunkId.split('_');
                const frame = parseInt(parts[0].substring(1), 10);
                const startX = parseInt(parts[1].substring(1), 10);
                const startY = parseInt(parts[2].substring(1), 10);
                
                const chunkWidth = Math.min(CHUNK_SIZE, width - startX);
                const chunkHeight = Math.min(CHUNK_SIZE, height - startY);

                const chunkTask = {
                    id: chunkId,
                    roomId,
                    frame,
                    startX,
                    startY,
                    chunkWidth,
                    chunkHeight
                };

                // Add back to micro_queue
                await redis.lPush(`micro_queue:${roomId}`, JSON.stringify(chunkTask));
            }

            // Alert the swarm that tasks are available again
            io.to(roomId).emit('TASKS_AVAILABLE');
        }
    } catch (error) {
        console.error(`[Room: ${roomId}] Error in handleEmptyQueue:`, error);
    } finally {
        activeMonitors.delete(roomId);
    }
}