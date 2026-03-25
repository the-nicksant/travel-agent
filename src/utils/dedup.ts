import { Redis } from "ioredis";
import { REDIS_URL } from "../config.js";

const redis = new Redis(REDIS_URL);

/**
 * Returns true if this messageId has been seen before (duplicate).
 * First occurrence returns false and marks the key with a 5-minute TTL.
 */
export async function isDuplicate(messageId: string): Promise<boolean> {
  const key = `msg:${messageId}`;
  // SET NX: sets only if key does not exist. Returns "OK" on first set, null if already existed.
  const result = await redis.set(key, "1", "EX", 300, "NX");
  return result === null;
}
