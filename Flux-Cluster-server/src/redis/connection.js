import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config(); // Loads your .env file

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 25) {
                return new Error('Redis reconnection attempts exhausted');
            }
            return Math.min(retries * 200, 3000);
        }
    }
});

redis.on('error', (err) => {
    if (redis.isOpen) {
        console.error('[Redis Error]:', err.message || err);
    }
});

// Robust initial connection retry loop (prevents crash on container startup race conditions)
async function connectWithRetry(client, maxRetries = 15, delayMs = 1500) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (!client.isOpen) {
                await client.connect();
            }
            console.log(`[Redis] Connected successfully to ${redisUrl}`);
            return client;
        } catch (err) {
            console.warn(`[Redis] Connection attempt ${attempt}/${maxRetries} failed (${err.message}). Retrying in ${delayMs}ms...`);
            if (attempt === maxRetries) {
                console.error(`[Redis] Fatal: Could not connect to ${redisUrl} after ${maxRetries} attempts.`);
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}

// Top-level await is supported in modern Node
await connectWithRetry(redis);

export default redis;
