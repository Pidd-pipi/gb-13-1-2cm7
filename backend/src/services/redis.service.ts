import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

class RedisService {
  private client: RedisClientType;

  async connect(): Promise<void> {
    this.client = createClient({
      url: `redis://${config.redis.host}:${config.redis.port}`,
      password: config.redis.password,
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    
    try {
      await this.client.connect();
      console.log('Redis connected successfully');
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, seconds?: number): Promise<void> {
    if (!this.client) return;
    if (seconds) {
      await this.client.set(key, value, { EX: seconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }
}

export const redisService = new RedisService();
