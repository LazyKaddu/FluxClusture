import redis from './connection.js';

const CHUNK_SIZE = 128;

export async function initializeJob(
    roomId, 
    startFrame, 
    endFrame, 
    width, 
    height, 
    fps, 
    glbHash, 
    samples, 
    noiseThreshold, 
    animationIndex, 
    ownerId
) {
    // 1. Clear any old data
    await redis.del(`macro_queue:${roomId}`);
    await redis.del(`micro_queue:${roomId}`);
    await redis.del(`pending_chunks:${roomId}`);
    await redis.del(`task_owner:${roomId}`);
    await redis.del(`completed_chunks:${roomId}`);
    await redis.del(`job_meta:${roomId}`);
    await redis.del(`task_start:${roomId}`);
    await redis.del(`chunk_stats:${roomId}`);

    // 2. Store global job configuration centrally as a single JSON object
    const jobMeta = { 
        ownerId, 
        glbHash, 
        width, 
        height, 
        fps,
        samples,
        noiseThreshold,
        animationIndex
    };
    await redis.set(`job_meta:${roomId}`, JSON.stringify(jobMeta));

    const sFrame = parseInt(startFrame, 10);
    const eFrame = parseInt(endFrame, 10);

    // 3. Populate the Macro Queue with the exact frame range
    for (let i = sFrame; i <= eFrame; i++) {
        await redis.rPush(`macro_queue:${roomId}`, i.toString());
    }
    
    // 4. Explode the first frame to kick off the swarm
    await advanceFrame(roomId);
}

export async function advanceFrame(roomId) {
    const frameStr = await redis.lPop(`macro_queue:${roomId}`);
    if (!frameStr) return false;

    const frame = parseInt(frameStr, 10);
    console.log(`[Room: ${roomId}] 💥 Exploding Frame ${frame}`);

    // Fetch the stored dimensions and render settings
    const metaStr = await redis.get(`job_meta:${roomId}`);
    if (!metaStr) throw new Error("Job metadata missing");
    
    // Unpack all the settings we stored in initializeJob
    const { width, height, samples, noiseThreshold, animationIndex } = JSON.parse(metaStr);

    const chunkIds = [];
    const chunkTasks = [];
    const cols = Math.ceil(width / CHUNK_SIZE);
    const rows = Math.ceil(height / CHUNK_SIZE);

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            const startX = x * CHUNK_SIZE;
            const startY = y * CHUNK_SIZE;
            
            const chunkWidth = Math.min(CHUNK_SIZE, width - startX);
            const chunkHeight = Math.min(CHUNK_SIZE, height - startY);

            const chunkId = `f${frame}_x${startX}_y${startY}`;
            chunkIds.push(chunkId);

            // Construct the exact payload the Worker requires
            const chunkTask = {
                id: chunkId,
                roomId,
                frame,
                startX,
                startY,
                chunkWidth,
                chunkHeight
            };
            
            chunkTasks.push(chunkTask);
        }
    }

    // Shuffle the tasks array using Fisher-Yates to randomize render order
    for (let i = chunkTasks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chunkTasks[i], chunkTasks[j]] = [chunkTasks[j], chunkTasks[i]];
    }

    for (const task of chunkTasks) {
        await redis.lPush(`micro_queue:${roomId}`, JSON.stringify(task));
    }
    
    if (chunkIds.length > 0) {
        await redis.sAdd(`pending_chunks:${roomId}`, chunkIds);
    }
    
    return true;
}

export async function getNextTask(roomId, workerId = null) {
    const script = `
        local taskStr = redis.call('RPOP', KEYS[1])
        if not taskStr then
            return nil
        end
        if ARGV[1] and ARGV[1] ~= '' then
            local task = cjson.decode(taskStr)
            if task and task.id then
                redis.call('HSET', KEYS[2], task.id, ARGV[1])
            end
        end
        return taskStr
    `;

    const taskStr = await redis.eval(script, {
        keys: [`micro_queue:${roomId}`, `task_owner:${roomId}`],
        arguments: [workerId || '']
    });

    return taskStr ? JSON.parse(taskStr) : null;
}

export async function getTaskOwner(roomId, taskId) {
    return (await redis.hGet(`task_owner:${roomId}`, taskId)) ?? null;
}

export async function requeueTask(roomId, task, expectedWorkerId = null) {
    const taskId = typeof task === 'object' && task !== null ? task.id : task;
    const taskObj = typeof task === 'object' && task !== null ? task : { id: taskId };
    const taskStr = JSON.stringify(taskObj);

    const script = `
        local currentOwner = redis.call('HGET', KEYS[2], ARGV[1])
        if ARGV[2] and ARGV[2] ~= '' then
            if currentOwner ~= ARGV[2] then
                return 0
            end
        end
        redis.call('HDEL', KEYS[2], ARGV[1])
        redis.call('RPUSH', KEYS[1], ARGV[3])
        return 1
    `;

    const res = await redis.eval(script, {
        keys: [`micro_queue:${roomId}`, `task_owner:${roomId}`],
        arguments: [taskId, expectedWorkerId || '', taskStr]
    });

    return res === 1;
}

export async function acknowledgeTask(roomId, workerId, taskId) {
    if (!roomId || !workerId || !taskId) {
        return { accepted: false, success: false, reason: 'INVALID_ARGUMENTS' };
    }

    const idleStateStr = JSON.stringify({ status: 'idle', task: null });

    const script = `
        local owner = redis.call('HGET', KEYS[1], ARGV[2])
        local isPending = redis.call('SISMEMBER', KEYS[2], ARGV[2])
        local isCompleted = redis.call('SISMEMBER', KEYS[4], ARGV[2])

        if not owner then
            if isCompleted == 1 then
                return cjson.encode({ accepted = false, success = false, reason = "TASK_ALREADY_COMPLETED" })
            elseif isPending == 1 then
                return cjson.encode({ accepted = false, success = false, reason = "TASK_NOT_ASSIGNED" })
            else
                return cjson.encode({ accepted = false, success = false, reason = "TASK_NOT_ASSIGNED" })
            end
        end

        if owner ~= ARGV[1] then
            return cjson.encode({ accepted = false, success = false, reason = "TASK_NOT_OWNED" })
        end

        -- Task is validly owned by workerId
        -- 1. Remove task ownership
        redis.call('HDEL', KEYS[1], ARGV[2])

        -- 2. Remove task from pending_chunks
        redis.call('SREM', KEYS[2], ARGV[2])

        -- 3. Record task as completed
        redis.call('SADD', KEYS[4], ARGV[2])

        -- 4. Mark worker as idle in workers hash
        if ARGV[3] and ARGV[3] ~= '' then
            redis.call('HSET', KEYS[3], ARGV[1], ARGV[3])
        end

        -- 5. Check if frame is complete
        local remaining = redis.call('SCARD', KEYS[2])
        local isFrameDone = (remaining == 0)

        return cjson.encode({ accepted = true, success = true, status = "OK", isFrameDone = isFrameDone })
    `;

    const res = await redis.eval(script, {
        keys: [
            `task_owner:${roomId}`,
            `pending_chunks:${roomId}`,
            `workers:${roomId}`,
            `completed_chunks:${roomId}`
        ],
        arguments: [
            workerId,
            taskId,
            idleStateStr
        ]
    });

    return JSON.parse(res);
}

export async function completeChunk(roomId, chunkId) {
    const removedCount = await redis.sRem(`pending_chunks:${roomId}`, chunkId);
    if (removedCount === 0) return false;
    await redis.sAdd(`completed_chunks:${roomId}`, chunkId);
    await redis.hDel(`task_owner:${roomId}`, chunkId);
    const remaining = await redis.sCard(`pending_chunks:${roomId}`);
    return remaining === 0;
}