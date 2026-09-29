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

describe('Worker task ownership validation and atomic ACK_TILE (Issue #5)', () => {
    let serverProc = null;
    let redis = null;
    let initializeJob = null;
    let getNextTask = null;
    let acknowledgeTask = null;
    let getTaskOwner = null;
    let requeueTask = null;
    let getRoomWorkers = null;
    let setWorkerState = null;
    const testKeys = new Set();

    function trackRoom(roomId) {
        testKeys.add(`macro_queue:${roomId}`);
        testKeys.add(`micro_queue:${roomId}`);
        testKeys.add(`pending_chunks:${roomId}`);
        testKeys.add(`task_owner:${roomId}`);
        testKeys.add(`completed_chunks:${roomId}`);
        testKeys.add(`job_meta:${roomId}`);
        testKeys.add(`task_start:${roomId}`);
        testKeys.add(`chunk_stats:${roomId}`);
        testKeys.add(`workers:${roomId}`);
    }

    before(async () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const parsed = new URL(redisUrl);
        const host = parsed.hostname || '127.0.0.1';
        const port = parseInt(parsed.port || '6379', 10);

        const isReachable = await checkTcpPort(port, host);
        if (!isReachable) {
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

        const connectionModule = await import('../src/redis/connection.js');
        redis = connectionModule.default;

        const queuesModule = await import('../src/redis/queues.js');
        initializeJob = queuesModule.initializeJob;
        getNextTask = queuesModule.getNextTask;
        acknowledgeTask = queuesModule.acknowledgeTask;
        getTaskOwner = queuesModule.getTaskOwner;
        requeueTask = queuesModule.requeueTask;

        const workersModule = await import('../src/redis/workers.js');
        getRoomWorkers = workersModule.getRoomWorkers;
        setWorkerState = workersModule.setWorkerState;
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

    it('Test 1: Valid owner can ACK its task (removes pending, clears owner, marks worker idle)', async () => {
        const roomId = `room_ack_test1_${Date.now()}`;
        trackRoom(roomId);

        await initializeJob(roomId, 1, 1, 128, 128, 24, 'glb1', 64, 0.1, 0, 'master');

        const workerId = 'worker-socket-alpha';
        await setWorkerState(roomId, workerId, { status: 'idle', task: null });

        // Worker claims the task
        const task = await getNextTask(roomId, workerId);
        assert.ok(task, 'Task must be claimed');
        await setWorkerState(roomId, workerId, { status: 'working', task });

        // Verify task ownership was recorded
        const recordedOwner = await getTaskOwner(roomId, task.id);
        assert.equal(recordedOwner, workerId, 'Task owner must be recorded as claiming worker');

        // Verify task is in pending_chunks
        const pendingBefore = await redis.sIsMember(`pending_chunks:${roomId}`, task.id);
        assert.equal(pendingBefore, 1, 'Task must be in pending_chunks');

        // Valid owner acknowledges task
        const result = await acknowledgeTask(roomId, workerId, task.id);
        assert.equal(result.accepted, true, 'ACK must be accepted for legitimate owner');
        assert.equal(result.status, 'OK');

        // Assert pending task removed
        const pendingAfter = await redis.sIsMember(`pending_chunks:${roomId}`, task.id);
        assert.equal(pendingAfter, 0, 'Pending task must be removed from pending_chunks');

        // Assert task ownership removed
        const ownerAfter = await getTaskOwner(roomId, task.id);
        assert.equal(ownerAfter, null, 'Task ownership must be removed');

        // Assert worker becomes idle
        const workers = await getRoomWorkers(roomId);
        assert.ok(workers[workerId], 'Worker must exist in room workers');
        assert.equal(workers[workerId].status, 'idle', 'Worker status must be idle');
    });

    it('Test 2: Wrong worker cannot ACK someone else\'s task', async () => {
        const roomId = `room_ack_test2_${Date.now()}`;
        trackRoom(roomId);

        await initializeJob(roomId, 1, 1, 128, 128, 24, 'glb1', 64, 0.1, 0, 'master');

        const ownerWorker = 'worker-legit';
        const impostorWorker = 'worker-impostor';

        await setWorkerState(roomId, ownerWorker, { status: 'idle', task: null });
        await setWorkerState(roomId, impostorWorker, { status: 'idle', task: null });

        // Legit worker claims task
        const task = await getNextTask(roomId, ownerWorker);
        assert.ok(task, 'Task must be claimed');
        await setWorkerState(roomId, ownerWorker, { status: 'working', task });

        // Impostor worker tries to ACK the task
        const result = await acknowledgeTask(roomId, impostorWorker, task.id);

        assert.equal(result.accepted, false, 'ACK from wrong worker must be rejected');
        assert.equal(result.reason, 'TASK_NOT_OWNED', 'Reason must be TASK_NOT_OWNED');

        // Assert task remains pending
        const isPending = await redis.sIsMember(`pending_chunks:${roomId}`, task.id);
        assert.equal(isPending, 1, 'Task must remain in pending_chunks');

        // Assert original owner remains unchanged
        const currentOwner = await getTaskOwner(roomId, task.id);
        assert.equal(currentOwner, ownerWorker, 'Original owner must remain unchanged');
    });

    it('Test 3: Duplicate ACK is rejected safely and pending set remains empty', async () => {
        const roomId = `room_ack_test3_${Date.now()}`;
        trackRoom(roomId);

        await initializeJob(roomId, 1, 1, 128, 128, 24, 'glb1', 64, 0.1, 0, 'master');

        const workerId = 'worker-repeat';
        await setWorkerState(roomId, workerId, { status: 'idle', task: null });

        const task = await getNextTask(roomId, workerId);
        assert.ok(task, 'Task must be claimed');
        await setWorkerState(roomId, workerId, { status: 'working', task });

        // First ACK
        const first = await acknowledgeTask(roomId, workerId, task.id);
        assert.equal(first.accepted, true, 'First ACK must be accepted');

        // Second ACK
        const second = await acknowledgeTask(roomId, workerId, task.id);
        assert.equal(second.accepted, false, 'Second ACK must be rejected');
        assert.equal(second.reason, 'TASK_ALREADY_COMPLETED', 'Reason must be TASK_ALREADY_COMPLETED');

        // Assert pending set remains empty
        const pendingCount = await redis.sCard(`pending_chunks:${roomId}`);
        assert.equal(pendingCount, 0, 'Pending chunks set must remain empty');
    });

    it('Test 4: Unknown task ID is rejected', async () => {
        const roomId = `room_ack_test4_${Date.now()}`;
        trackRoom(roomId);

        await initializeJob(roomId, 1, 1, 128, 128, 24, 'glb1', 64, 0.1, 0, 'master');

        const workerId = 'worker-random';
        const unknownTaskId = 'f999_x9999_y9999_nonexistent';

        const result = await acknowledgeTask(roomId, workerId, unknownTaskId);
        assert.equal(result.accepted, false, 'Unknown task ID must be rejected');
        assert.equal(result.reason, 'TASK_NOT_ASSIGNED', 'Reason must be TASK_NOT_ASSIGNED');
    });

    it('Test 5: Unassigned task in pending_chunks cannot be acknowledged', async () => {
        const roomId = `room_ack_test5_${Date.now()}`;
        trackRoom(roomId);

        await initializeJob(roomId, 1, 1, 128, 128, 24, 'glb1', 64, 0.1, 0, 'master');

        // Read a task from pending_chunks without claiming it via getNextTask
        const pendingChunks = await redis.sMembers(`pending_chunks:${roomId}`);
        assert.ok(pendingChunks.length > 0, 'Job must have pending chunks');
        const unassignedTaskId = pendingChunks[0];

        const owner = await getTaskOwner(roomId, unassignedTaskId);
        assert.equal(owner, null, 'Task must have no owner yet');

        const workerId = 'worker-eager';
        const result = await acknowledgeTask(roomId, workerId, unassignedTaskId);

        assert.equal(result.accepted, false, 'Unassigned task must be rejected');
        assert.equal(result.reason, 'TASK_NOT_ASSIGNED', 'Reason must be TASK_NOT_ASSIGNED');
    });

    it('Test 6: A requeued task cannot be completed by its stale previous owner after another worker claims it', async () => {
        const roomId = `room_ack_test6_${Date.now()}`;
        trackRoom(roomId);

        await initializeJob(roomId, 1, 1, 128, 128, 24, 'glb1', 64, 0.1, 0, 'master');

        const workerA = 'worker-a';
        const workerB = 'worker-b';

        // 1. Worker A claims task
        const task = await getNextTask(roomId, workerA);
        assert.ok(task, 'Worker A must get task');
        assert.equal(await getTaskOwner(roomId, task.id), workerA);

        // 2. Task is considered stranded/requeued (e.g. Worker A disconnects or times out)
        const requeued = await requeueTask(roomId, task, workerA);
        assert.equal(requeued, true, 'Task must be requeued');

        // Verify ownership was released upon requeue
        assert.equal(await getTaskOwner(roomId, task.id), null, 'Ownership must be null after requeue');

        // 3. Worker B claims the requeued task
        const taskB = await getNextTask(roomId, workerB);
        assert.ok(taskB, 'Worker B must claim task');
        assert.equal(taskB.id, task.id, 'Worker B must receive the same task');
        assert.equal(await getTaskOwner(roomId, task.id), workerB, 'Worker B must now be recorded owner');

        // 4. Stale Worker A attempts to ACK the task -> must be rejected!
        const ackFromA = await acknowledgeTask(roomId, workerA, task.id);
        assert.equal(ackFromA.accepted, false, 'Stale Worker A must be rejected');
        assert.equal(ackFromA.reason, 'TASK_NOT_OWNED', 'Reason must be TASK_NOT_OWNED');

        // Task must still belong to Worker B and remain pending
        assert.equal(await getTaskOwner(roomId, task.id), workerB);
        assert.equal(await redis.sIsMember(`pending_chunks:${roomId}`, task.id), 1);

        // 5. Worker B ACKs the task -> must be accepted!
        const ackFromB = await acknowledgeTask(roomId, workerB, task.id);
        assert.equal(ackFromB.accepted, true, 'Current owner Worker B must be accepted');
        assert.equal(ackFromB.status, 'OK');
        assert.equal(await getTaskOwner(roomId, task.id), null);
    });

    it('Test 7: Redis-side ACK operation is atomic under concurrent attempts', async () => {
        const roomId = `room_ack_test7_${Date.now()}`;
        trackRoom(roomId);

        await initializeJob(roomId, 1, 1, 128, 128, 24, 'glb1', 64, 0.1, 0, 'master');

        const workerId = 'worker-concurrent';
        const task = await getNextTask(roomId, workerId);
        assert.ok(task, 'Task must be claimed');

        // Fire two concurrent ACK attempts for the same task
        const [res1, res2] = await Promise.all([
            acknowledgeTask(roomId, workerId, task.id),
            acknowledgeTask(roomId, workerId, task.id)
        ]);

        // Exactly one attempt must succeed and the other must fail
        const successCount = (res1.accepted ? 1 : 0) + (res2.accepted ? 1 : 0);
        assert.equal(successCount, 1, 'Exactly one concurrent ACK attempt must succeed');

        const rejectedRes = res1.accepted ? res2 : res1;
        assert.equal(rejectedRes.accepted, false, 'The losing attempt must be rejected');
        assert.equal(rejectedRes.reason, 'TASK_ALREADY_COMPLETED');
    });

    it('handles malformed arguments safely without crashing', async () => {
        const resNull = await acknowledgeTask(null, 'worker', 'task');
        assert.equal(resNull.accepted, false);

        const resEmpty = await acknowledgeTask('room', '', 'task');
        assert.equal(resEmpty.accepted, false);

        const resNoTask = await acknowledgeTask('room', 'worker', '');
        assert.equal(resNoTask.accepted, false);
    });
});
