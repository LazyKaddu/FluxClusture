import { io } from 'socket.io-client';

export class SocketManager {
    constructor(url) {
        // Initialize the socket client immediately so it can accept listeners, 
        // but don't connect to the server until connect() is called.
        this.socket = io(url, { autoConnect: false });
    }

    connect() {
        this.socket.connect();
    }

    emit(event, payload) {
        this.socket.emit(event, payload);
    }

    on(event, callback) {
        // Now this works even before connect() is called!
        this.socket.on(event, callback);
    }

    get id() {
        return this.socket.id;
    }
}