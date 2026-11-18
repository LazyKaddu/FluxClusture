import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import net from 'node:net';
import { Server } from 'socket.io';
import { io as ioc } from 'socket.io-client';
import { setupRedisAdapter } from '../src/redis/adapter.js';

function checkTcpPort(port, host = '127.0.0.1', timeoutMs = 400) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ port, host });
        socket.setTimeout(timeoutMs);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.once('error', () => {
            socket.destroy();
            resolve(false);
        });
    });
}

describe('Multi-Container Redis Pub/Sub Socket.IO Cluster', () => {
    let redisAvailable = false;
    let server1 = null;
    let server2 = null;
    let port1 = 9181;
    let port2 = 9182;
    let client1 = null;
    let client2 = null;
    let adapterClients1 = null;
    let adapterClients2 = null;

    before(async () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const parsed = new URL(redisUrl);
        const host = parsed.hostname || '127.0.0.1';
        const port = parseInt(parsed.port || '6379', 10);

        redisAvailable = await checkTcpPort(port, host);
        if (!redisAvailable) {
            console.log(`ℹ️ [redisPubSub.test.js] Redis not reachable on ${host}:${port}. Integration tests requiring active Redis connection will be skipped.`);
            return;
        }

        // 1. Initialize Server 1 (Pod Simulator 1)
        server1 = new Server(port1, { cors: { origin: '*' } });
        adapterClients1 = await setupRedisAdapter(server1, { redisUrl });

        // 2. Initialize Server 2 (Pod Simulator 2)
        server2 = new Server(port2, { cors: { origin: '*' } });
        adapterClients2 = await setupRedisAdapter(server2, { redisUrl });

        // Wire server-side socket handlers for testing
        const wireServer = (io) => {
            io.on('connection', (socket) => {
                socket.on('JOIN_ROOM', ({ roomId }) => {
                    socket.join(roomId);
                    socket.roomId = roomId;
                });

                socket.on('WEBRTC_SIGNAL', (payload) => {
                    if (payload && payload.target) {
                        io.to(payload.target).emit('WEBRTC_SIGNAL', {
                            ...payload,
                            sender: socket.id
                        });
                    }
                });
            });
        };

        wireServer(server1);
        wireServer(server2);
    });

    after(async () => {
        if (client1) client1.disconnect();
        if (client2) client2.disconnect();

        if (server1) {
            await new Promise((res) => server1.close(res));
        }
        if (server2) {
            await new Promise((res) => server2.close(res));
        }

        if (adapterClients1) {
            if (adapterClients1.pubClient?.isOpen) await adapterClients1.pubClient.quit();
            if (adapterClients1.subClient?.isOpen) await adapterClients1.subClient.quit();
        }
        if (adapterClients2) {
            if (adapterClients2.pubClient?.isOpen) await adapterClients2.pubClient.quit();
            if (adapterClients2.subClient?.isOpen) await adapterClients2.subClient.quit();
        }
    });

    it('exports setupRedisAdapter function correctly', async () => {
        const { setupRedisAdapter: exportedFn } = await import('../src/redis/adapter.js');
        assert.equal(typeof exportedFn, 'function', 'setupRedisAdapter must be an exported function');
    });

    it('broadcasts room events across distinct server instances via Redis Pub/Sub', async (t) => {
        if (!redisAvailable) {
            t.skip('Skipped because Redis is not running locally');
            return;
        }

        // Connect Client 1 to Server 1
        client1 = ioc(`http://127.0.0.1:${port1}`, { reconnection: false });
        await new Promise((res) => client1.once('connect', res));

        // Connect Client 2 to Server 2
        client2 = ioc(`http://127.0.0.1:${port2}`, { reconnection: false });
        await new Promise((res) => client2.once('connect', res));

        assert.ok(client1.id, 'Client 1 should have socket ID');
        assert.ok(client2.id, 'Client 2 should have socket ID');
        assert.notEqual(client1.id, client2.id);

        const testRoom = 'room_cluster_test_42';
        client1.emit('JOIN_ROOM', { roomId: testRoom });
        client2.emit('JOIN_ROOM', { roomId: testRoom });

        // Wait for rooms to propagate through Redis adapter
        await new Promise((res) => setTimeout(res, 200));

        // Prepare promise on Client 2 (connected to Server 2)
        const receivePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Cross-server room broadcast timed out')), 2500);
            client2.once('SWARM_STATE_UPDATE', (payload) => {
                clearTimeout(timeout);
                resolve(payload);
            });
        });

        // Emit from Server 1 (where Client 2 is NOT connected locally)
        server1.to(testRoom).emit('SWARM_STATE_UPDATE', { testKey: 'cross_pod_success' });

        const receivedPayload = await receivePromise;
        assert.deepEqual(receivedPayload, { testKey: 'cross_pod_success' });
    });

    it('routes direct socket-to-socket WebRTC signals across distinct server instances', async (t) => {
        if (!redisAvailable) {
            t.skip('Skipped because Redis is not running locally');
            return;
        }

        // Client 1 (on Server 1) targets Client 2 (on Server 2) directly by socket ID
        const signalPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Cross-server WebRTC signal timed out')), 2500);
            client2.once('WEBRTC_SIGNAL', (payload) => {
                clearTimeout(timeout);
                resolve(payload);
            });
        });

        client1.emit('WEBRTC_SIGNAL', {
            target: client2.id,
            sdp: 'mock-webrtc-offer-description',
            type: 'offer'
        });

        const receivedSignal = await signalPromise;
        assert.equal(receivedSignal.target, client2.id);
        assert.equal(receivedSignal.sdp, 'mock-webrtc-offer-description');
        assert.equal(receivedSignal.sender, client1.id);
    });
});

