import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { spawn } from 'node:child_process';
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

describe('GLB hash storage and retrieval', () => {
    let serverProc = null;
    let redis = null;
    let getGlbHash = null;
    let initializeJob = null;
    const testKeys = new Set();

    before(async () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const parsed = new URL(redisUrl);
        const host = parsed.hostname || '127.0.0.1';
        const port = parseInt(parsed.port || '6379', 10);

        const isReachable = await checkTcpPort(port, host);
        if (!isReachable) {
            // Attempt to launch local redis-server / valkey-server if available
            try {
                serverProc = spawn('redis-server', ['--port', String(port), '--save', ''], { stdio: 'ignore' });
                serverProc.on('error', () => {
                    serverProc = null;
                });

                let started = false;
                for (let i = 0; i < 20; i++) {
                    if (await checkTcpPort(port, host)) {
                        started = true;
                        break;
                    }
                    await new Promise((r) => setTimeout(r, 100));
                }

                if (!started) {
                    throw new Error(`Failed to start redis-server on ${host}:${port}`);
                }
            } catch (err) {
                throw new Error(
                    `Redis instance is unavailable locally at ${redisUrl} and redis-server could not be spawned: ${err.message}`
                );
            }
        }

        // Dynamically import modules now that Redis is verified to be listening
        const connectionModule = await import('../src/redis/connection.js');
        redis = connectionModule.default;

        const workersModule = await import('../src/redis/workers.js');
        getGlbHash = workersModule.getGlbHash;

        const queuesModule = await import('../src/redis/queues.js');
        initializeJob = queuesModule.initializeJob;
    });

    after(async () => {
        if (redis && testKeys.size > 0) {
            for (const key of testKeys) {
                await redis.del(key);
            }
        }
        if (redis) {
            await redis.quit();
        }
        if (serverProc) {
            serverProc.kill();
        }
    });

    it('stores the GLB hash in job_meta and retrieves the exact same value', async () => {
        const roomId = `room_test_${Date.now()}_lifecycle`;
        const expectedGlbHash = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
        testKeys.add(`job_meta:${roomId}`);
        testKeys.add(`macro_queue:${roomId}`);
        testKeys.add(`micro_queue:${roomId}`);
        testKeys.add(`pending_chunks:${roomId}`);

        // 1. Store GLB hash through initializeJob
        await initializeJob(
            roomId,
            1,
            1,
            256,
            256,
            24,
            expectedGlbHash,
            32,
            0.01,
            0,
            'owner_test_socket'
        );

        // Verify the canonical storage location
        const storedMetaStr = await redis.get(`job_meta:${roomId}`);
        assert.ok(storedMetaStr, 'job_meta key must exist in Redis');
        const storedMeta = JSON.parse(storedMetaStr);
        assert.equal(storedMeta.glbHash, expectedGlbHash, 'job_meta must store the correct glbHash');

        // Verify that no glb_hash key is created
        const legacyKeyVal = await redis.get(`glb_hash:${roomId}`);
        assert.equal(legacyKeyVal, null, 'glb_hash:{roomId} key must not be created or populated');

        // 2. Retrieve via getGlbHash
        const retrievedHash = await getGlbHash(roomId);
        assert.equal(retrievedHash, expectedGlbHash, 'getGlbHash must return the exact GLB hash stored in job_meta');
    });

    it('returns null when job metadata does not exist', async () => {
        const roomId = `room_nonexistent_${Date.now()}`;
        const retrieved = await getGlbHash(roomId);
        assert.equal(retrieved, null, 'getGlbHash must return null when job_meta does not exist');
    });

    it('returns null when job metadata exists but glbHash is not set', async () => {
        const roomId = `room_missing_hash_${Date.now()}`;
        testKeys.add(`job_meta:${roomId}`);

        // Set metadata without glbHash
        await redis.set(`job_meta:${roomId}`, JSON.stringify({
            ownerId: 'some_owner',
            width: 1920,
            height: 1080
        }));

        const retrieved = await getGlbHash(roomId);
        assert.equal(retrieved, null, 'getGlbHash must return null if job_meta has no glbHash property');
    });

    it('does not depend on or read from legacy glb_hash key', async () => {
        const roomId = `room_canonical_check_${Date.now()}`;
        testKeys.add(`job_meta:${roomId}`);
        testKeys.add(`glb_hash:${roomId}`);

        const canonicalHash = 'canonical_glb_hash_456';
        const legacyHash = 'stale_legacy_hash_789';

        await redis.set(`job_meta:${roomId}`, JSON.stringify({ glbHash: canonicalHash }));
        await redis.set(`glb_hash:${roomId}`, legacyHash);

        const retrieved = await getGlbHash(roomId);
        assert.equal(retrieved, canonicalHash, 'getGlbHash must read canonical job_meta and ignore glb_hash');
    });
});
