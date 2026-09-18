import { io } from 'socket.io-client';

export class SocketManager {
    constructor() {
        this.socket = null;
    }

    connect(url) {
        if (!this.socket) {
            this.socket = io(url);
        }
    }

    emit(event, payload) {
        if (this.socket) this.socket.emit(event, payload);
    }

    on(event, callback) {
        if (this.socket) this.socket.on(event, callback);
    }

    get id() {
        return this.socket?.id;
    }
}