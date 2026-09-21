export class WebRTCManager {
    constructor(onSignalNeeded, onFileReceived, onRenderDataReceived) {
        this.peers = new Map();
        this.onSignalNeeded = onSignalNeeded; // Callback to pass SDPs to the socket
        this.onFileReceived = onFileReceived;
        this.onRenderDataReceived = onRenderDataReceived; // NEW
        
        this.renderChannel = null; // Store the persistent channel here 
        this.iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    }

    async setupPersistentRenderChannel(masterId, myId) {
        const connectionId = `render_${myId}`;
        const pc = this.createPeer(masterId, connectionId);

        const dataChannel = pc.createDataChannel('render_stream');
        dataChannel.binaryType = 'arraybuffer';

        dataChannel.onopen = () => {
            console.log(`[WebRTC] Persistent Render Channel open to Master: ${masterId}`);
        };

        this.renderChannel = dataChannel;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.onSignalNeeded({
            target: masterId,
            connectionId: connectionId,
            type: 'offer',
            offer: offer
        });
    }

    // The seeder (can be any node) initiates the offer for asset_transfer
    async initiateOffer(targetId, glbFileBuffer) {
        const connectionId = `asset_${targetId}`;
        const pc = this.createPeer(targetId, connectionId);

        const dataChannel = pc.createDataChannel('asset_transfer');
        dataChannel.binaryType = 'arraybuffer';
        dataChannel.bufferedAmountLowThreshold = 65536;

        dataChannel.onopen = () => {
            console.log(`[WebRTC] DataChannel open! Streaming file to ${targetId}...`);
            const CHUNK_SIZE = 16384;
            let offset = 0;

            const sendNextChunk = () => {
                while (offset < glbFileBuffer.byteLength) {
                    if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
                        dataChannel.onbufferedamountlow = () => {
                            dataChannel.onbufferedamountlow = null;
                            sendNextChunk();
                        };
                        return;
                    }
                    const chunk = glbFileBuffer.slice(offset, offset + CHUNK_SIZE);
                    dataChannel.send(chunk);
                    offset += chunk.byteLength;
                }
                dataChannel.send('EOF');
                console.log(`[WebRTC] Finished sending GLB to ${targetId}`);
            };
            sendNextChunk();
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.onSignalNeeded({
            target: targetId,
            connectionId: connectionId,
            type: 'offer',
            offer: offer
        });

        return { dataChannel };
    }

    createPeer(targetId, connectionId) {
        const pc = new RTCPeerConnection(this.iceServers);
        this.peers.set(connectionId, pc);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.onSignalNeeded({ target: targetId, connectionId: connectionId, type: 'candidate', candidate: event.candidate });
            }
        };

        // Worker node listens for the Master opening the DataChannels
        pc.ondatachannel = (event) => {
            const dataChannel = event.channel;
            
            if (dataChannel.label === 'asset_transfer') {
                let receivedBuffers = [];
                dataChannel.onmessage = (event) => {
                    if (typeof event.data === 'string' && event.data === 'EOF') {
                        console.log(`[WebRTC] Finished receiving GLB from ${targetId}`);
                        const blob = new Blob(receivedBuffers);
                        const fileUrl = URL.createObjectURL(blob);
                        if (this.onFileReceived) this.onFileReceived(fileUrl);
                        
                        receivedBuffers = [];
                        // Don't close the PC because we still need render_stream!
                    } else {
                        receivedBuffers.push(event.data);
                    }
                };
            }
            
            if (dataChannel.label === 'render_stream') {
                console.log(`[WebRTC] Master accepted render stream from ${targetId}`);
    
                let pendingMetadata = null;
                let receivedBuffers = [];
                let receivedBytes = 0;
                let expectedBytes = 0;

                dataChannel.onmessage = (event) => {
                    if (typeof event.data === 'string') {
                        // 1. First message arrives: Parse and store the metadata
                        pendingMetadata = JSON.parse(event.data);
                        // A tile is exactly metadata.width * metadata.height * 4 bytes
                        expectedBytes = pendingMetadata.width * pendingMetadata.height * 4;
                        receivedBuffers = [];
                        receivedBytes = 0;
                    } else {
                        // 2. Subsequent messages are binary chunks
                        if (pendingMetadata) {
                            receivedBuffers.push(new Uint8Array(event.data));
                            receivedBytes += event.data.byteLength;

                            if (receivedBytes >= expectedBytes) {
                                // We have the full tile! Recombine and emit
                                const fullBuffer = new Uint8Array(expectedBytes);
                                let offset = 0;
                                for (const buffer of receivedBuffers) {
                                    fullBuffer.set(buffer, offset);
                                    offset += buffer.byteLength;
                                }

                                if (this.onRenderDataReceived) {
                                    this.onRenderDataReceived(pendingMetadata, fullBuffer.buffer);
                                }
                                pendingMetadata = null;
                            }
                        }
                    }
                };
            }
        };

        return pc;
    }


    async handleIncomingSignal(senderId, signal) {
        const connectionId = signal.connectionId;
        if (!connectionId) return; // Ignore signals without a connection ID

        let pc = this.peers.get(connectionId);
        if (!pc) pc = this.createPeer(senderId, connectionId);

        try {
            if (signal.type === 'offer') {
                const desc = signal.offer || signal;
                if (!desc || !desc.type) return;
                await pc.setRemoteDescription(new RTCSessionDescription(desc));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.onSignalNeeded({ target: senderId, connectionId: connectionId, type: 'answer', answer: answer });
            } 
            else if (signal.type === 'answer') {
                const desc = signal.answer || signal;
                if (!desc || !desc.type) return;
                await pc.setRemoteDescription(new RTCSessionDescription(desc));
            } 
            else if (signal.type === 'candidate') {
                const cand = signal.candidate || signal;
                if (!cand || (!cand.candidate && !cand.sdpMid)) return;
                await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
        } catch (err) {
            console.error("[WebRTC] Error handling signal:", err, signal);
        }
    }
}