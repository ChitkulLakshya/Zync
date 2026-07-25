require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createClient } = require('redis');

async function run() {
  try {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    console.log('Connected to Redis');
    
    // Flush all data from Redis
    const res = await client.flushAll();
    console.log('FLUSHALL Result:', res);
    
    await client.quit();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
