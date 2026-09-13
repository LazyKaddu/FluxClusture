import { Server } from 'socket.io';
import { initializeJob, getNextTask } from './redis/queues.js';
import { setWorkerState, removeWorker, getRoomWorkers } from './redis/workers.js';

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
        await setWorkerState(socket.roomId, socket.id, { status: 'idle', task: null });
        
        // Notify the Viewer to paint the canvas (We will use this in Phase 4)
        io.to(socket.roomId).emit('TILE_FINISHED', payload);
        
        await broadcastSwarmState(socket.roomId);
    });

    // 4. Handle Disconnects (The foundation for Fault Tolerance)
    socket.on('disconnect', async () => {
        if (socket.roomId) {
            const lastState = await removeWorker(socket.roomId, socket.id);
            console.log(`❌ Node disconnected: ${socket.id}. Last state:`, lastState);
            
            // NOTE FOR PHASE 6: If lastState.status === 'working', 
            // we will push lastState.task back into the micro_queue here!
            
            await broadcastSwarmState(socket.roomId);
        }
    });

    socket.on('INIT_JOB', async (payload) => {
        if (!payload.roomId) return;
        await initializeJob(payload.roomId, payload.clip, payload.frames, payload.gridCols, payload.gridRows);
        io.to(payload.roomId).emit('JOB_STARTED');
    });
});