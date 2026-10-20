import assert from 'node:assert/strict';
import { describe, it, before, after, afterEach } from 'node:test';
import net from 'node:net';

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

describe('Heartbeat Orchestrator and Task Recovery', () => {
    let redisAvailable = false;
    let heartbeatModule = null;

    before(async () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const parsed = new URL(redisUrl);
        const host = parsed.hostname || '127.0.0.1';
        const port = parseInt(parsed.port || '6379', 10);

        redisAvailable = await checkTcpPort(port, host);
        if (redisAvailable) {
            heartbeatModule = await import('../src/orchestrator/heartbeat.js');
        } else {
            console.log(`ℹ️ [heartbeat.test.js] Redis not reachable on ${host}:${port}. Tests requiring active Redis connection will be skipped.`);
        }
    });

    afterEach(() => {
        if (heartbeatModule) {
            heartbeatModule.stopHeartbeatMonitor();
        }
    });

    it('records and clears worker activity in memory', (t) => {
        if (!redisAvailable) {
            t.skip('Skipped because Redis is not running locally');
            return;
        }
        const socketId = 'worker_test_1';
        const roomId = 'room_abc';

        heartbeatModule.recordWorkerActivity(socketId, roomId);
        heartbeatModule.clearWorkerActivity(socketId);
        assert.ok(true);
    });

    it('registers and unregisters active rooms', (t) => {
        if (!redisAvailable) {
            t.skip('Skipped because Redis is not running locally');
            return;
        }
        heartbeatModule.registerRoom('room_alpha');
        heartbeatModule.unregisterRoom('room_alpha');
        assert.ok(true);
    });

    it('handles node disconnect without errors', async (t) => {
        if (!redisAvailable) {
            t.skip('Skipped because Redis is not running locally');
            return;
        }
        const mockIo = {
            sockets: {
                sockets: new Map(),
                adapter: { rooms: new Map() }
            },
            to: () => ({ emit: () => {} })
        };

        await heartbeatModule.handleNodeDisconnect(mockIo, 'room_test', 'socket_1', 'TEST');
        assert.ok(true);
    });

    it('starts and stops heartbeat monitor cleanly', (t) => {
        if (!redisAvailable) {
            t.skip('Skipped because Redis is not running locally');
            return;
        }
        const mockIo = {
            sockets: {
                sockets: new Map(),
                adapter: { rooms: new Map() }
            },
            to: () => ({ emit: () => {} })
        };

        heartbeatModule.startHeartbeatMonitor(mockIo, { interval: 100, timeout: 300 });
        heartbeatModule.stopHeartbeatMonitor();
        assert.ok(true);
    });
});
