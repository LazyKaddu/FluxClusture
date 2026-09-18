export class WebRTCManager {
    constructor(onSignalNeeded) {
        this.peers = new Map();
        this.onSignalNeeded = onSignalNeeded; // Callback to pass SDPs to the socket
        this.iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    }

    createPeer(targetId) {
        const pc = new RTCPeerConnection(this.iceServers);
        this.peers.set(targetId, pc);

        // When WebRTC generates a candidate, it tells the main class to send it via Socket
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.onSignalNeeded({ target: targetId, type: 'candidate', candidate: event.candidate });
            }
        };

        return pc;
    }

    async handleIncomingSignal(senderId, signal) {
        let pc = this.peers.get(senderId);
        if (!pc) pc = this.createPeer(senderId);

        if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.onSignalNeeded({ target: senderId, type: 'answer', answer: answer });
        } 
        else if (signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
        } 
        else if (signal.type === 'candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }
}