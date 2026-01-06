/// <reference path="../types/cloudflare.d.ts" />

import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Get KV namespace for community gallery
 * @returns KV namespace instance
 */
export function getGalleryKV(): KVNamespace {
  const { env } = getCloudflareContext();
  return env.GALLERY_KV;
}

/**
 * Increment view count for a post in KV
 * Data will be synced to database by Cron job every 5 minutes
 * @param postId - Community post ID
 */
export async function incrementViewCount(postId: string): Promise<void> {
  const kv = getGalleryKV();
  const key = `view:${postId}`;
  
  const currentCount = await kv.get(key);
  const newCount = currentCount ? parseInt(currentCount) + 1 : 1;
  
  // Store without TTL - will be cleared after Cron sync
  await kv.put(key, String(newCount));
}

/**
 * Get current view count from KV
 * @param postId - Community post ID
 */
export async function getViewCount(postId: string): Promise<number> {
  const kv = getGalleryKV();
  const key = `view:${postId}`;
  const count = await kv.get(key);
  return count ? parseInt(count) : 0;
}

/**
 * Clear view count from KV (after syncing to database)
 * @param postId - Community post ID
 */
export async function clearViewCount(postId: string): Promise<void> {
  const kv = getGalleryKV();
  const key = `view:${postId}`;
  await kv.delete(key);
}
