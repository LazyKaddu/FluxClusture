import { Server } from 'socket.io';
import { initializeJob, getNextTask, requeueTask, acknowledgeTask, completeChunk, advanceFrame } from './redis/queues.js';
import { setWorkerState, removeWorker, getRoomWorkers, getGlbHash, getOwnerId, getRenderSettings } from './redis/workers.js';
import { trackTaskStart, trackTaskCompletion, handleEmptyQueue } from './orchestrator/taskAllocator.js';

const PORT = process.env.PORT || 8080;

const io = new Server(PORT, { cors: { origin: "*" } });
console.log(`🚀 Master Node running on port ${PORT}`);

// Helper: Broadcasts the live worker map to the room
async function broadcastSwarmState(roomId) {
    const workers = await getRoomWorkers(roomId);
    io.to(roomId).emit('SWARM_STATE_UPDATE', workers);
}

io.on('connection', (socket) => {
    console.log(`⚡ Node connected: ${socket.id}`);

    // 1. Join Room & Register as Idle
    socket.on('JOIN_ROOM', async ({ roomId }) => {
        socket.join(roomId);
        socket.roomId = roomId;
        console.log(`Node ${socket.id} joined room ${roomId}`);
        
        await setWorkerState(roomId, socket.id, { status: 'idle', task: null });

        await broadcastSwarmState(roomId);
    });

    socket.on('SET_INITIAL_STATE', async () => {
        console.log("set initial state for ",socket.id)
        await setWorkerState(socket.roomId, socket.id, { status: 'idle', task: null });
    });


    socket.on('GET_RENDER_SETTINGS', async (roomId, callback) => {
        if (!roomId) {
            callback({ success: false, error: "No room ID provided" });
            return;
        }

        try {
            const settings = await getRenderSettings(roomId);
            if (settings) {
                callback({ success: true, settings });
            } else {
                callback({ success: false, error: "Settings not found for this room" });
            }
        } catch (error) {
            console.error(`[Room: ${roomId}] Error fetching render settings:`, error);
            callback({ success: false, error: "Internal server error" });
        }
    });


    // 2. Assign Task & Mark as Working
    socket.on('REQUEST_TASK', async () => {
        if (!socket.roomId) return;

        const task = await getNextTask(socket.roomId, socket.id);
        if (task) {
            await setWorkerState(socket.roomId, socket.id, { status: 'working', task });
            await trackTaskStart(socket.roomId, task.id);
            socket.emit('ASSIGN_TASK', task);
        } else {
            await setWorkerState(socket.roomId, socket.id, { status: 'idle', task: null });
            socket.emit('WAIT', { reason: 'Queue empty' });
            handleEmptyQueue(socket.roomId, io);
        }
        await broadcastSwarmState(socket.roomId);
    });

    // 3. Complete Task & Return to Idle
    socket.on('ACK_TILE', async (payload) => {
        if (!socket.roomId) return;

        // Validate payload structure
        if (!payload || typeof payload !== 'object' || typeof payload.id !== 'string' || payload.id.trim().length === 0) {
            console.warn(`[Room: ${socket.roomId}] Rejected malformed ACK_TILE from ${socket.id}`);
            socket.emit('ACK_TILE_REJECTED', { id: payload?.id, reason: 'INVALID_PAYLOAD' });
            return;
        }

        const taskId = payload.id.trim();

        // Server-authoritative task ownership validation and atomic completion
        const ackResult = await acknowledgeTask(socket.roomId, socket.id, taskId);

        if (!ackResult || !ackResult.accepted) {
            console.warn(`[Room: ${socket.roomId}] ACK_TILE rejected for ${taskId} from ${socket.id}: ${ackResult?.reason}`);
            socket.emit('ACK_TILE_REJECTED', { id: taskId, reason: ackResult?.reason || 'REJECTED' });
            return;
        }

        console.log(`[Room: ${socket.roomId}] Tile ${taskId} completed by ${socket.id}`);

        await trackTaskCompletion(socket.roomId, taskId);

        io.to(socket.roomId).emit('TILE_FINISHED', payload);
        await broadcastSwarmState(socket.roomId);

        // If the frame is done, advance!
        if (ackResult.isFrameDone) {
            console.log(`[Room: ${socket.roomId}] 🏁 Frame complete! Advancing...`);

            const moreFrames = await advanceFrame(socket.roomId);

            io.to(socket.roomId).emit('frameComplete', payload.task);

            if (moreFrames) {
                // Wake up swarm for the next frame
                io.to(socket.roomId).emit('TASKS_AVAILABLE');
            } else {
                // No more frames in macro queue
                console.log(`[Room: ${socket.roomId}] 🎉 FULL JOB COMPLETE!`);
                io.to(socket.roomId).emit('JOB_COMPLETE');
            }
        }
    });

    // --- WEBRTC MATCHMAKING & SIGNALING ---

    // 1. A new node asks for the .glb file
    socket.on('REQUEST_SEEDER', async () => {
        if (!socket.roomId) return;

        // Fetch all active sockets in this room from Redis
        const workers = await getRoomWorkers(socket.roomId);
        const settings = await getRenderSettings(socket.roomId);

        // Filter out the node that is asking
        const availablePeers = Object.keys(workers).filter(id => id !== socket.id);

        if (availablePeers.length === 0) {
            console.log(`[Room: ${socket.roomId}] No seeders available for ${socket.id}`);
            socket.emit('NO_SEEDERS_AVAILABLE');
            return;
        }

        // Prioritize the master node (owner) if they are in the room, otherwise pick random
        let seederId = availablePeers[Math.floor(Math.random() * availablePeers.length)];
        if (settings && settings.ownerId && availablePeers.includes(settings.ownerId)) {
            seederId = settings.ownerId;
        }

        console.log(`[Room: ${socket.roomId}] Matchmaking: ${seederId} will seed to ${socket.id}`);

        // Command the chosen seeder to create an SDP offer
        io.to(seederId).emit('INITIATE_OFFER', { requester: socket.id });
    });

    // 2. The Switchboard: Routes Offers, Answers, and ICE Candidates
    socket.on('WEBRTC_SIGNAL', (payload) => {
        if (!payload.target) return;

        io.to(payload.target).emit('WEBRTC_SIGNAL', {
            ...payload,
            sender: socket.id
        });
    });

    socket.on('GET_FILE_HASH', async (roomId, callback) => {
        const hash = await getGlbHash(roomId);
        callback({ hash }); // Returns the hash directly to the requesting client
    });

    socket.on('GET_OWNER_ID', async (roomId, callback) => {
        const ownerId = await getOwnerId(roomId);
        callback({ ownerId })
    })

    // 4. Handle Disconnects (The foundation for Fault Tolerance)
    socket.on('disconnect', async () => {
        if (socket.roomId) {
            const lastState = await removeWorker(socket.roomId, socket.id);
            console.log(`❌ Node disconnected: ${socket.id}. Last state:`, lastState);

            // If they disconnected while working on a task, rescue it!
            if (lastState && lastState.status === 'working' && lastState.task) {
                console.log(`🚨 Rescuing stranded task ${lastState.task.id} and waking swarm!`);

                // Push the abandoned task back to the right side (front) of the Redis queue
                // only if this worker is still the recorded owner of the task
                const requeued = await requeueTask(socket.roomId, lastState.task, socket.id);

                if (requeued) {
                    // Fire the alarm to wake up all sleeping nodes to grab this task
                    io.to(socket.roomId).emit('TASKS_AVAILABLE');
                }
            }

            await broadcastSwarmState(socket.roomId);
        }
    });

    socket.on('INIT_JOB', async (payload) => {
        if (!payload.roomId) return;
        const ownerId = payload.ownerId || socket.id; // Master's socket ID is the owner
        await initializeJob(payload.roomId, payload.startFrame, payload.endFrame, payload.width, payload.height, payload.fps, payload.glbHash, payload.samples, payload.noiseThreshold, payload.animationIndex, ownerId)
        io.to(payload.roomId).emit('TASKS_AVAILABLE');
    });
});