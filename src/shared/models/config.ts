import { cache } from 'react';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { config } from '@/config/db/schema';

import { publicSettingNames } from '../services/settings';

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type UpdateConfig = Partial<Omit<NewConfig, 'name'>>;

export type Configs = Record<string, string>;

// Config cache TTL: 10 minutes
const CONFIG_CACHE_TTL = 600;
const CONFIG_CACHE_KEY = 'config:all';

/**
 * Get SESSION_KV for config caching
 */
function getConfigKV(): KVNamespace | null {
  try {
    const { env } = getCloudflareContext();
    return env.SESSION_KV;
  } catch {
    return null;
  }
}

/**
 * Clear config cache (should be called after saveConfigs)
 */
export async function clearConfigCache(): Promise<void> {
  try {
    const kv = getConfigKV();
    if (kv) {
      await kv.delete(CONFIG_CACHE_KEY);
      console.log('[Config] Cache cleared');
    }
  } catch (error: any) {
    console.error('[Config] Failed to clear cache:', error.message);
  }
}

export async function saveConfigs(configs: Record<string, string>) {
  const result = await db().transaction(async (tx: any) => {
    const configEntries = Object.entries(configs);
    const results = [];

    for (const [name, configValue] of configEntries) {
      const [upsertResult] = await tx
        .insert(config)
        .values({ name, value: configValue })
        .onConflictDoUpdate({
          target: config.name,
          set: { value: configValue },
        })
        .returning();

      results.push(upsertResult);
    }

    return results;
  });

  // Clear cache after saving
  await clearConfigCache();

  return result;
}

export async function addConfig(newConfig: NewConfig) {
  const [result] = await db().insert(config).values(newConfig).returning();

  // Clear cache after adding
  await clearConfigCache();

  return result;
}

export async function getConfigs(): Promise<Configs> {
  const configs: Record<string, string> = {};

  try {
    console.log('[getConfigs] Attempting to fetch configs from database...');
    const result = await db().select().from(config);
    if (!result) {
      console.log('[getConfigs] No configs found in database');
      return configs;
    }

    for (const c of result) {
      configs[c.name] = c.value ?? '';
    }
    console.log('[getConfigs] Successfully loaded', Object.keys(configs).length, 'configs');
  } catch (error: any) {
    console.error('[getConfigs] Database query failed:', error.message);
    return configs;
  }

  return configs;
}

// 🚀 TTFB Optimization: Request-level memoization
// Prevents 4 redundant getAllConfigs calls per request
const _getAllConfigs = async (): Promise<Configs> => {
  // Try to get from KV cache first
  try {
    const kv = getConfigKV();
    if (kv) {
      const cached = await kv.get<Configs>(CONFIG_CACHE_KEY, 'json');
      if (cached) {
        return cached;
      }
    }
  } catch (error: any) {
    // Silent fail for cache read
  }

  // Cache miss - fetch from database
  let dbConfigs: Configs = {};

  try {
    dbConfigs = await getConfigs();
  } catch (e: any) {
    console.error(`[Config] DB fetch failed:`, e.message);
    dbConfigs = {};
  }

  const configs = {
    ...envConfigs,
    ...dbConfigs,
  };

  // Store in KV cache
  try {
    const kv = getConfigKV();
    if (kv) {
      await kv.put(CONFIG_CACHE_KEY, JSON.stringify(configs), {
        expirationTtl: CONFIG_CACHE_TTL,
      });
    }
  } catch (error: any) {
    // Silent fail for cache write
  }

  return configs;
};

// Export memoized version - deduplicates calls within same request
export const getAllConfigs = cache(_getAllConfigs);

export async function getPublicConfigs(): Promise<Configs> {
  let dbConfigs: Configs = {};

  // Only get configs from db in server side
  if (typeof window === 'undefined') {
    try {
      dbConfigs = await getConfigs();
    } catch (e: any) {
      console.error('[getPublicConfigs] get configs from db failed:', e.message);
      dbConfigs = {};
    }
  }

  const publicConfigs: Record<string, string> = {};

  // get public configs from db
  for (const key in dbConfigs) {
    if (publicSettingNames.includes(key)) {
      publicConfigs[key] = dbConfigs[key];
    }
  }

  const configs = {
    ...publicConfigs,
  };

  return configs;
}

/**
 * Get configs by specific keys
 */
export async function getConfigsByKeys(keys: string[]): Promise<Configs> {
  const allConfigs = await getConfigs();
  const result: Configs = {};
  
  for (const key of keys) {
    if (allConfigs[key]) {
      result[key] = allConfigs[key];
    }
  }
  
  return result;
}

/**
 * Set a single config
 */
export async function setConfig(name: string, value: string) {
  return saveConfigs({ [name]: value });
}
