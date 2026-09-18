import { SocketManager } from './SocketManager';
import { WebRTCManager } from './WebRTCManager';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

class SwarmClient {
    constructor() {
        // Instantiate the two separate brains (Composition)
        this.socketManager = new SocketManager();
        
        // Pass a callback so WebRTC can ask the socket to send signals
        this.webrtcManager = new WebRTCManager((signalPayload) => {
            this.socketManager.emit('WEBRTC_SIGNAL', signalPayload);
        });

        this.role = null;
        this.listeners = {}; // Callbacks for React
    }

    // --- React API ---
    
    // React calls this to listen for updates
    on(event, callback) {
        this.listeners[event] = callback;
    }

    // Triggers the React callbacks safely
    _trigger(event, data) {
        if (this.listeners[event]) this.listeners[event](data);
    }

    joinAsWorker(roomId) {
        this.role = 'worker';
        this.socketManager.connect(SOCKET_URL);

        this.socketManager.on('connect', () => {
            this._trigger('status', 'Connected. Requesting file...');
            this.socketManager.emit('REQUEST_SEEDER', { roomId });
        });

        // Wire up the signaling bridge: Socket -> WebRTC
        this.socketManager.on('WEBRTC_SIGNAL', (payload) => {
            this.webrtcManager.handleIncomingSignal(payload.sender, payload);
        });
        
        // Listeners for swarm orchestration
        this.socketManager.on('ASSIGN_TASK', (task) => {
            this._trigger('newTask', task);
        });
        
        this.socketManager.on('WAIT', () => {
            this._trigger('status', 'Idle. Waiting for tasks...');
        });
        
        this.socketManager.on('TASKS_AVAILABLE', () => {
            if (this.role === 'worker') {
                this.socketManager.emit('REQUEST_TASK');
            }
        });
    }

    joinAsMaster(roomId, fileHash) {
        this.role = 'master';
        this.socketManager.connect(SOCKET_URL);

        this.socketManager.on('connect', () => {
            this._trigger('status', 'Master node connected. Ready to start job.');
        });
        
        this.socketManager.on('WEBRTC_SIGNAL', (payload) => {
            this.webrtcManager.handleIncomingSignal(payload.sender, payload);
        });
    }

    startRenderJob(roomId, clip, frames, gridCols, gridRows, glbHash) {
        if (!this.socketManager.socket) return;
        this.socketManager.emit('INIT_JOB', { roomId, clip, frames, gridCols, gridRows, glbHash });
    }

    submitRenderedTile(task, imageData) {
        // Phase 1: Notify server the task is done (Socket)
        this.socketManager.emit('ACK_TILE', task);

        // Phase 2: WebRTC DataChannel send goes here later
        
        // Greedy Worker: instantly ask for next task
        this.socketManager.emit('REQUEST_TASK');
    }
}

// Export a single instance so the whole app shares the exact same state
export const swarmClient = new SwarmClient();