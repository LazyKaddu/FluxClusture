import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config(); // Loads your .env file

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

redis.on('error', (err) => console.error('Redis Error:', err));

// Top-level await is supported in modern Node
await redis.connect();
console.log('🔥 Redis connected');

export default redis;