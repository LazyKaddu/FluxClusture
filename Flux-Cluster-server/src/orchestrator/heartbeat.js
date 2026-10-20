import redis from '../redis/connection.js';
import { requeueTask } from '../redis/queues.js';
import { removeWorker, getRoomWorkers } from '../redis/workers.js';

// Configuration defaults (can be overridden via options or environment variables)
const DEFAULT_HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL_MS, 10) || 5000;
const DEFAULT_HEARTBEAT_TIMEOUT = parseInt(process.env.HEARTBEAT_TIMEOUT_MS, 10) || 15000;
const CHUNK_SIZE = 128;

// In-memory tracking for worker activity and active rooms
const nodeActivity = new Map(); // socketId -> { lastSeen: number, roomId: string }
const activeRooms = new Set();
let heartbeatTimer = null;

/**
 * Register a room to be monitored by the heartbeat orchestrator.
 */
export function registerRoom(roomId) {
    if (roomId) {
        activeRooms.add(roomId);
    }
}

/**
 * Unregister a room from heartbeat monitoring.
 */
export function unregisterRoom(roomId) {
    if (roomId) {
        activeRooms.delete(roomId);
    }
}

/**
 * Record socket activity (updates lastSeen timestamp).
 * Called on HEARTBEAT_PONG and any normal incoming message from client.
 */
export function recordWorkerActivity(socketId, roomId = null) {
    if (!socketId) return;
    const existing = nodeActivity.get(socketId) || {};
    nodeActivity.set(socketId, {
        lastSeen: Date.now(),
        roomId: roomId || existing.roomId || null
    });
}

/**
 * Clean up tracking for a disconnected socket.
 */
export function clearWorkerActivity(socketId) {
    nodeActivity.delete(socketId);
}

/**
 * Helper to reconstruct a task payload from its chunkId and room job metadata.
 */
async function reconstructTask(roomId, taskId) {
    try {
        const metaStr = await redis.get(`job_meta:${roomId}`);
        if (!metaStr) return null;

        const { width, height } = JSON.parse(metaStr);
        const parts = taskId.split('_');
        if (parts.length < 3) return null;

        const frame = parseInt(parts[0].substring(1), 10);
        const startX = parseInt(parts[1].substring(1), 10);
        const startY = parseInt(parts[2].substring(1), 10);

        const chunkWidth = Math.min(CHUNK_SIZE, width - startX);
        const chunkHeight = Math.min(CHUNK_SIZE, height - startY);

        return {
            id: taskId,
            roomId,
            frame,
            startX,
            startY,
            chunkWidth,
            chunkHeight
        };
    } catch (err) {
        console.error(`[Heartbeat] Failed to reconstruct task ${taskId} for room ${roomId}:`, err);
        return null;
    }
}

/**
 * Broadcasts the live worker map to the room.
 */
export async function broadcastSwarmState(io, roomId) {
    if (!io || !roomId) return;
    try {
        const workers = await getRoomWorkers(roomId);
        io.to(roomId).emit('SWARM_STATE_UPDATE', workers);
    } catch (err) {
        console.error(`[Heartbeat] Error broadcasting swarm state for room ${roomId}:`, err);
    }
}

/**
 * Rescues any task owned by the specified worker and restores it to micro_queue.
 */
export async function rescueWorkerTasks(io, roomId, socketId, lastStateTask = null) {
    let taskRescued = false;

    // 1. If lastState had the task recorded, attempt to requeue it
    if (lastStateTask && lastStateTask.id) {
        console.log(`🚨 [Heartbeat] Attempting to rescue recorded task ${lastStateTask.id} from worker ${socketId}`);
        const requeued = await requeueTask(roomId, lastStateTask, socketId);
        if (requeued) {
            console.log(`✅ [Heartbeat] Successfully requeued task ${lastStateTask.id} to micro_queue:${roomId}`);
            await redis.hDel(`task_start:${roomId}`, lastStateTask.id);
            taskRescued = true;
        }
    }

    // 2. Safety fallback: scan task_owner:${roomId} for any task assigned to this worker
    try {
        const owners = await redis.hGetAll(`task_owner:${roomId}`);
        for (const [taskId, ownerSocketId] of Object.entries(owners)) {
            if (ownerSocketId === socketId && (!lastStateTask || lastStateTask.id !== taskId)) {
                console.log(`🚨 [Heartbeat] Found unrecovered task ${taskId} still owned by ${socketId}. Reconstructing...`);
                const reconstructed = await reconstructTask(roomId, taskId);
                if (reconstructed) {
                    const requeued = await requeueTask(roomId, reconstructed, socketId);
                    if (requeued) {
                        console.log(`✅ [Heartbeat] Successfully rescued and requeued ${taskId}`);
                        await redis.hDel(`task_start:${roomId}`, taskId);
                        taskRescued = true;
                    }
                }
            }
        }
    } catch (err) {
        console.error(`[Heartbeat] Error checking task_owner for room ${roomId}:`, err);
    }

    // 3. If any task was rescued, sound the alarm to awaken idle nodes
    if (taskRescued && io) {
        console.log(`📢 [Heartbeat] Waking up swarm in room ${roomId} for newly available tasks!`);
        io.to(roomId).emit('TASKS_AVAILABLE');
    }

    return taskRescued;
}

/**
 * Handles node disconnection or timeout.
 * Idempotently cleans up worker state, recovers tasks, and alerts remaining nodes.
 */
export async function handleNodeDisconnect(io, roomId, socketId, reason = 'DISCONNECT') {
    if (!roomId || !socketId) {
        clearWorkerActivity(socketId);
        return;
    }

    console.log(`⚠️ [Heartbeat] Node ${socketId} disconnected from room ${roomId} (Reason: ${reason})`);

    // Clear local heartbeat tracking
    clearWorkerActivity(socketId);

    // If socket is still connected in socket.io instance, close it
    if (io && io.sockets && io.sockets.sockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
            socket.disconnect(true);
        }
    }

    // Remove worker from Redis and retrieve last state
    let lastState = null;
    try {
        lastState = await removeWorker(roomId, socketId);
    } catch (err) {
        console.error(`[Heartbeat] Error removing worker ${socketId} from Redis:`, err);
    }

    // Rescue any task that was assigned to this worker
    const lastTask = (lastState && lastState.status === 'working' && lastState.task) ? lastState.task : null;
    await rescueWorkerTasks(io, roomId, socketId, lastTask);

    // Broadcast updated swarm state to remaining nodes
    await broadcastSwarmState(io, roomId);
}

/**
 * Starts the periodic heartbeat monitor.
 */
export function startHeartbeatMonitor(io, options = {}) {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
    }

    const intervalMs = options.interval || DEFAULT_HEARTBEAT_INTERVAL;
    const timeoutMs = options.timeout || DEFAULT_HEARTBEAT_TIMEOUT;

    console.log(`💓 [Heartbeat] Monitor started (Interval: ${intervalMs}ms, Timeout: ${timeoutMs}ms)`);

    heartbeatTimer = setInterval(async () => {
        try {
            // Gather all active room candidates from activeRooms set and Socket.io adapter
            const roomsToCheck = new Set(activeRooms);

            if (io && io.sockets && io.sockets.adapter && io.sockets.adapter.rooms) {
                for (const [roomName] of io.sockets.adapter.rooms) {
                    // Filter out individual socket self-rooms
                    if (roomName && !io.sockets.sockets.has(roomName)) {
                        roomsToCheck.add(roomName);
                    }
                }
            }

            const now = Date.now();

            for (const roomId of roomsToCheck) {
                let workers = {};
                try {
                    workers = await getRoomWorkers(roomId);
                } catch (err) {
                    console.error(`[Heartbeat] Failed to get workers for room ${roomId}:`, err);
                    continue;
                }

                const workerIds = Object.keys(workers);
                if (workerIds.length === 0) {
                    continue;
                }

                for (const socketId of workerIds) {
                    const socket = io && io.sockets && io.sockets.sockets ? io.sockets.sockets.get(socketId) : null;

                    // 1. Socket already disconnected or absent in memory
                    if (!socket || !socket.connected) {
                        console.warn(`[Heartbeat] Detected socket absence for node ${socketId} in room ${roomId}`);
                        await handleNodeDisconnect(io, roomId, socketId, 'SOCKET_DROPPED');
                        continue;
                    }

                    // 2. Check last seen timestamp
                    const activity = nodeActivity.get(socketId);
                    const lastSeen = activity?.lastSeen || 0;

                    if (lastSeen > 0 && (now - lastSeen > timeoutMs)) {
                        console.warn(`[Heartbeat] Node ${socketId} in room ${roomId} timed out (Inactive for ${now - lastSeen}ms)`);
                        await handleNodeDisconnect(io, roomId, socketId, 'HEARTBEAT_TIMEOUT');
                        continue;
                    }

                    // 3. Send heartbeat ping to active node
                    socket.emit('HEARTBEAT_PING', { timestamp: now, roomId });
                }
            }
        } catch (error) {
            console.error('[Heartbeat] Error during heartbeat sweep:', error);
        }
    }, intervalMs);

    return heartbeatTimer;
}

/**
 * Stops the periodic heartbeat monitor.
 */
export function stopHeartbeatMonitor() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        console.log('🛑 [Heartbeat] Monitor stopped');
    }
}
