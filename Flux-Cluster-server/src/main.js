import { Server } from 'socket.io';
import { initializeJob, getNextTask, requeueTask, completeChunk, advanceFrame } from './redis/queues.js';
import { setWorkerState, removeWorker, getRoomWorkers, getGlbHash, getOwnerId } from './redis/workers.js';

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
        
        await setWorkerState(roomId, socket.id, { status: 'idle', task: null });
        console.log(`Node ${socket.id} joined room ${roomId}`);
        
        await broadcastSwarmState(roomId);
    });

    // 2. Assign Task & Mark as Working
    socket.on('REQUEST_TASK', async () => {
        if (!socket.roomId) return;

        const task = await getNextTask(socket.roomId);
        if (task) {
            await setWorkerState(socket.roomId, socket.id, { status: 'working', task: task.id });
            socket.emit('ASSIGN_TASK', task);
        } else {
            await setWorkerState(socket.roomId, socket.id, { status: 'idle', task: null });
            socket.emit('WAIT', { reason: 'Queue empty' });

        }
        await broadcastSwarmState(socket.roomId);
    });

    // 3. Complete Task & Return to Idle
    socket.on('ACK_TILE', async (payload) => {
        if (!socket.roomId) return;

        console.log(`[Room: ${socket.roomId}] Tile ${payload.id} completed by ${socket.id}`);
        
        // 1. Mark this worker as idle
        await setWorkerState(socket.roomId, socket.id, { status: 'idle', task: null });
        io.to(socket.roomId).emit('TILE_FINISHED', payload);
        await broadcastSwarmState(socket.roomId);

        // 2. Remove the chunk from the Redis Set
        const isFrameDone = await completeChunk(socket.roomId, payload.id);
        
        // 3. If the Set is empty, advance!
        if (isFrameDone) {
            console.log(`[Room: ${socket.roomId}] 🏁 Frame complete! Advancing...`);
            
            const moreFrames = await advanceFrame(socket.roomId);
            
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
        
        // Filter out the node that is asking
        const availablePeers = Object.keys(workers).filter(id => id !== socket.id);

        if (availablePeers.length === 0) {
            console.log(`[Room: ${socket.roomId}] No seeders available for ${socket.id}`);
            socket.emit('NO_SEEDERS_AVAILABLE');
            return;
        }

        // Pick a random peer from the pool to act as the seeder
        const seederId = availablePeers[Math.floor(Math.random() * availablePeers.length)];
        console.log(`[Room: ${socket.roomId}] Matchmaking: ${seederId} will seed to ${socket.id}`);

        // Command the chosen seeder to create an SDP offer
        io.to(seederId).emit('INITIATE_OFFER', { requester: socket.id });
    });

    // 2. The Switchboard: Routes Offers, Answers, and ICE Candidates
    socket.on('WEBRTC_SIGNAL', (payload) => {
        if (!payload.target) return;

        io.to(payload.target).emit('WEBRTC_SIGNAL', {
            sender: socket.id,
            type: payload.type,
            data: payload.data
        });
    });

    socket.on('GET_FILE_HASH', async (roomId, callback) => {
        const hash = await getGlbHash(roomId);
        callback({ hash }); // Returns the hash directly to the requesting client
    });

    socket.on('GET_OWNER_ID', async (roomId,callback) =>{
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
                await requeueTask(socket.roomId, lastState.task);
                
                // Fire the alarm to wake up all sleeping nodes to grab this task
                io.to(socket.roomId).emit('TASKS_AVAILABLE');
            }
            
            await broadcastSwarmState(socket.roomId);
        }
    });

    socket.on('INIT_JOB', async (payload) => {
        if (!payload.roomId) return;
        await initializeJob(payload.roomId, payload.clip, payload.frames, payload.gridCols, payload.gridRows, payload.glbhash, socket.id);
        io.to(payload.roomId).emit('JOB_STARTED');
    });
});