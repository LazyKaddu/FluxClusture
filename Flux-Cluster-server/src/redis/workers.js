import redis from './connection.js';

// Update a specific worker's state in the room's hash map
export async function setWorkerState(roomId, socketId, state) {
    await redis.hSet(`workers:${roomId}`, socketId, JSON.stringify(state));
}

// Remove a worker when they disconnect and return their last state (crucial for later)
export async function removeWorker(roomId, socketId) {
    const stateStr = await redis.hGet(`workers:${roomId}`, socketId);
    if (stateStr) {
        await redis.hDel(`workers:${roomId}`, socketId);
        return JSON.parse(stateStr);
    }
    return null;
}

// Fetch the entire map of active workers for the frontend UI
export async function getRoomWorkers(roomId) {
    const workersData = await redis.hGetAll(`workers:${roomId}`);
    const activeWorkers = {};
    
    for (const [socketId, dataStr] of Object.entries(workersData)) {
        activeWorkers[socketId] = JSON.parse(dataStr);
    }
    
    return activeWorkers; // { "socket_abc123": { status: "idle", task: null }, ... }
}


export async function getGlbHash(roomId) {
    return await redis.get(`glb_hash:${roomId}`);
}

export async function getOwnerId(roomId) {
    return await redis.get(`job_owner:${roomId}`);
}

export async function getRenderSettings(roomId) {
    const metaStr = await redis.get(`job_meta:${roomId}`);
    return metaStr ? JSON.parse(metaStr) : null;
}