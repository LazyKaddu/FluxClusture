import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

let pubClient = null;
let subClient = null;

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

    pubClient = createClient({ url: redisUrl });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
        console.error('[Redis PubClient Error]:', err);
    });

    subClient.on('error', (err) => {
        console.error('[Redis SubClient Error]:', err);
    });

    await Promise.all([
        pubClient.connect(),
        subClient.connect()
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

