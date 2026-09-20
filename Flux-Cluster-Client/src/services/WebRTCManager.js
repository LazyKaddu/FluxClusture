export class WebRTCManager {
    constructor(onSignalNeeded, onFileReceived, onRenderDataReceived) {
        this.peers = new Map();
        this.onSignalNeeded = onSignalNeeded; // Callback to pass SDPs to the socket
        this.onFileReceived = onFileReceived;
        this.onRenderDataReceived = onRenderDataReceived; // NEW
        
        this.renderChannel = null; // Store the persistent channel here 
        this.iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    }

    async setupPersistentRenderChannel(masterId) {
        const pc = this.createPeer(masterId);

        // Name this channel differently so we don't confuse it with the file transfer
        const dataChannel = pc.createDataChannel('render_stream');
        dataChannel.binaryType = 'arraybuffer';

        dataChannel.onopen = () => {
            console.log(`[WebRTC] Persistent Render Channel open to Master: ${masterId}`);
        };

        // Save it to the class instance so we can use it whenever a chunk finishes
        this.renderChannel = dataChannel;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.onSignalNeeded({
            target: masterId,
            type: 'offer',
            offer: offer
        });
    }

    createPeer(targetId) {
        const pc = new RTCPeerConnection(this.iceServers);
        this.peers.set(targetId, pc);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.onSignalNeeded({ target: targetId, type: 'candidate', candidate: event.candidate });
            }
        };

        // NEW: Listen for the Master node opening the DataChannel
        pc.ondatachannel = (event) => {
            const dataChannel = event.channel;
            
            if (dataChannel.label === 'asset_transfer') {
                let receivedBuffers = [];

                // Handle incoming file data[cite: 1]
                dataChannel.onmessage = (event) => {
                    if (typeof event.data === 'string' && event.data === 'EOF') {
                        console.log(`[WebRTC] Finished receiving GLB from ${targetId}`);
                        
                        // 1. Combine all the ArrayBuffer chunks into a single Blob
                        const blob = new Blob(receivedBuffers);
                        
                        // 2. Create a local URL for the stitched file
                        const fileUrl = URL.createObjectURL(blob);
                        
                        // 3. Send the URL up to the SwarmClient
                        if (this.onFileReceived) this.onFileReceived(fileUrl);

                        // 4. Clean up the ephemeral connection[cite: 1]
                        receivedBuffers = [];
                        dataChannel.close();
                        pc.close();
                        this.peers.delete(targetId);
                        
                    } else {
                        // Push incoming binary chunks into the array
                        receivedBuffers.push(event.data);
                    }
                };
            }
            if (dataChannel.label === 'render_stream') {
                console.log(`[WebRTC] Master accepted render stream from ${targetId}`);
    
                let pendingMetadata = null;

                dataChannel.onmessage = (event) => {
                    if (typeof event.data === 'string') {
                        // 1. First message arrives: Parse and store the metadata
                        pendingMetadata = JSON.parse(event.data);
                    } else {
                        // 2. Second message arrives: It is the binary ArrayBuffer
                        if (this.onRenderDataReceived && pendingMetadata) {
                            this.onRenderDataReceived(pendingMetadata, event.data);
                            pendingMetadata = null; // Reset for the next chunk
                        }
                    }
                };
            }
                    };

        return pc;
    }

    // Add glbFileBuffer as a parameter so the manager knows what to send
    async initiateOffer(targetId, glbFileBuffer) {
        const pc = this.createPeer(targetId);

        const dataChannel = pc.createDataChannel('asset_transfer');
        dataChannel.binaryType = 'arraybuffer';

        // Set a safe threshold for the browser's internal network buffer (e.g., 64KB)
        dataChannel.bufferedAmountLowThreshold = 65536;

        dataChannel.onopen = () => {
            console.log(`[WebRTC] DataChannel open! Streaming file to ${targetId}...`);
            
            const CHUNK_SIZE = 16384; // 16KB chunks are the safest cross-browser standard
            let offset = 0;

            const sendNextChunk = () => {
                // Keep sending chunks as long as we haven't reached the end of the file
                while (offset < glbFileBuffer.byteLength) {
                    
                    // If we are pushing data faster than the network can send it, pause.
                    if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
                        dataChannel.onbufferedamountlow = () => {
                            dataChannel.onbufferedamountlow = null; // Unbind listener
                            sendNextChunk(); // Resume sending
                        };
                        return; // Exit the loop until the buffer drains
                    }

                    // Slice the array and send the chunk
                    const chunk = glbFileBuffer.slice(offset, offset + CHUNK_SIZE);
                    dataChannel.send(chunk);
                    offset += chunk.byteLength;
                }

                // Once the loop finishes, send a tiny text message to tell the receiver we are done
                dataChannel.send('EOF'); // End Of File
                console.log(`[WebRTC] Finished sending GLB to ${targetId}`);
            };

            sendNextChunk();
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.onSignalNeeded({
            target: targetId,
            type: 'offer',
            offer: offer
        });

        return dataChannel;
    }

    async handleIncomingSignal(senderId, signal) {
        let pc = this.peers.get(senderId);
        if (!pc) pc = this.createPeer(senderId);

        try {
            if (signal.type === 'offer') {
                const desc = signal.offer || signal;
                if (!desc || !desc.type) return;
                await pc.setRemoteDescription(new RTCSessionDescription(desc));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.onSignalNeeded({ target: senderId, type: 'answer', answer: answer });
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