import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

let pubClient = null;
let subClient = null;

/**
 * Robust connection retry helper for Redis clients during container startup.
 */
async function connectClientWithRetry(client, label, redisUrl, maxRetries = 15, delayMs = 1500) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (!client.isOpen) {
                await client.connect();
            }
            return;
        } catch (err) {
            console.warn(`[Redis ${label}] Connection attempt ${attempt}/${maxRetries} failed (${err.message}). Retrying in ${delayMs}ms...`);
            if (attempt === maxRetries) {
                console.error(`[Redis ${label}] Fatal: Could not connect to ${redisUrl} after ${maxRetries} attempts.`);
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}

/**
 * Initializes and binds the Redis Pub/Sub adapter to a Socket.IO Server instance.
 * Enables horizontal scaling across multiple container pods.
 *
 * @param {import('socket.io').Server} io
 * @param {object} [options]
 * @returns {Promise<{ pubClient: any, subClient: any }>}
 */
export async function setupRedisAdapter(io, options = {}) {
    const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    pubClient = createClient({
        url: redisUrl,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 25) {
                    return new Error('Redis pubClient reconnection attempts exhausted');
                }
                return Math.min(retries * 200, 3000);
            }
        }
    });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
        if (pubClient.isOpen) {
            console.error('[Redis PubClient Error]:', err.message || err);
        }
    });

    subClient.on('error', (err) => {
        if (subClient.isOpen) {
            console.error('[Redis SubClient Error]:', err.message || err);
        }
    });

    await Promise.all([
        connectClientWithRetry(pubClient, 'PubClient', redisUrl),
        connectClientWithRetry(subClient, 'SubClient', redisUrl)
    ]);

    console.log('Redis Pub/Sub Adapter connected and mounted');
    io.adapter(createAdapter(pubClient, subClient));

    return { pubClient, subClient };
}

/**
 * Cleanly closes the Pub/Sub Redis clients. Useful during testing or shutdown.
 */
export async function closeRedisAdapter() {
    const promises = [];
    if (pubClient && pubClient.isOpen) {
        promises.push(pubClient.quit().catch(() => { }));
    }
    if (subClient && subClient.isOpen) {
        promises.push(subClient.quit().catch(() => { }));
    }
    await Promise.all(promises);
    pubClient = null;
    subClient = null;
}

/**
 * Returns active pub/sub clients.
 */
export function getRedisAdapterClients() {
    return { pubClient, subClient };
}
