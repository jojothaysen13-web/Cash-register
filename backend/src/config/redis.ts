import Redis from 'ioredis';
import { env } from './env';

let client: Redis | null = null;

if (env.redisUrl) {
  client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
  });
  client.on('error', (err) => {
    console.warn('[redis] unavailable, falling back to direct DB reads:', err.message);
  });
  client.connect().catch(() => {
    console.warn('[redis] could not connect at startup, will keep retrying lazily');
  });
}

const PRODUCT_TTL_SECONDS = 300;

export async function getCachedProduct(barcode: string): Promise<string | null> {
  if (!client || client.status !== 'ready') return null;
  try {
    return await client.get(`product:barcode:${barcode}`);
  } catch {
    return null;
  }
}

export async function setCachedProduct(barcode: string, json: string): Promise<void> {
  if (!client || client.status !== 'ready') return;
  try {
    await client.set(`product:barcode:${barcode}`, json, 'EX', PRODUCT_TTL_SECONDS);
  } catch {
    // cache is best-effort; ignore failures
  }
}

export async function invalidateCachedProduct(barcode: string): Promise<void> {
  if (!client || client.status !== 'ready') return;
  try {
    await client.del(`product:barcode:${barcode}`);
  } catch {
    // ignore
  }
}

const SCAN_DEBOUNCE_MS = 400;

export async function isDuplicateScan(cashierId: number, barcode: string): Promise<boolean> {
  if (!client || client.status !== 'ready') return false;
  const key = `scan:debounce:${cashierId}:${barcode}`;
  try {
    const result = await client.set(key, '1', 'PX', SCAN_DEBOUNCE_MS, 'NX');
    return result === null;
  } catch {
    return false;
  }
}

export const redisClient = client;
