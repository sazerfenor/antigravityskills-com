import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Cached session data structure
 */
export interface CachedSession {
  userId: string;
  email: string;
  name: string;
  image?: string;
  emailVerified?: boolean;
  cachedAt: number;
}

// Session cache TTL: 5 minutes
const SESSION_CACHE_TTL = 300;

/**
 * Get SESSION_KV namespace
 * 返回 null 表示 KV 不可用（本地开发环境或未配置）
 */
function getSessionKV(): KVNamespace | null {
  try {
    const { env } = getCloudflareContext();
    if (!env?.SESSION_KV) {
      return null;
    }
    return env.SESSION_KV;
  } catch {
    // getCloudflareContext() 在非 Cloudflare 环境会抛错
    return null;
  }
}

/**
 * Hash the session token for use as KV key
 * Uses Web Crypto API (compatible with Cloudflare Workers)
 * (Don't store raw tokens in KV keys for security)
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32);
}

/**
 * Get cached session from KV
 * @param token - Session token from cookie
 * @returns Cached session or null if not found/expired
 */
export async function getCachedSession(token: string): Promise<CachedSession | null> {
  const kv = getSessionKV();
  if (!kv) {
    // KV 不可用，跳过缓存
    return null;
  }

  try {
    const key = `session:${await hashToken(token)}`;

    const cached = await kv.get<CachedSession>(key, 'json');

    if (!cached) {
      console.log('[SessionCache] Cache miss for token');
      return null;
    }

    // Check if cache is still valid (within TTL)
    const age = (Date.now() - cached.cachedAt) / 1000;
    if (age > SESSION_CACHE_TTL) {
      console.log('[SessionCache] Cache expired, age:', age, 'seconds');
      return null;
    }

    console.log('[SessionCache] Cache hit for user:', cached.userId);
    return cached;
  } catch (error: any) {
    console.error('[SessionCache] Error getting cached session:', error.message);
    return null;
  }
}

/**
 * Store session in KV cache
 * @param token - Session token from cookie
 * @param user - User data to cache
 */
export async function setCachedSession(
  token: string,
  user: { id: string; email: string; name: string; image?: string; emailVerified?: boolean }
): Promise<void> {
  const kv = getSessionKV();
  if (!kv) {
    // KV 不可用，跳过缓存
    return;
  }

  try {
    const key = `session:${await hashToken(token)}`;

    const cachedSession: CachedSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      cachedAt: Date.now(),
    };

    // Store with TTL slightly longer than our check (for cleanup)
    await kv.put(key, JSON.stringify(cachedSession), {
      expirationTtl: SESSION_CACHE_TTL + 60, // Extra minute for buffer
    });

    console.log('[SessionCache] Cached session for user:', user.id);
  } catch (error: any) {
    console.error('[SessionCache] Error caching session:', error.message);
    // Don't throw - caching failure shouldn't break auth
  }
}

/**
 * Delete cached session from KV
 * Should be called on sign-out
 * @param token - Session token from cookie
 */
export async function deleteCachedSession(token: string): Promise<void> {
  const kv = getSessionKV();
  if (!kv) {
    // KV 不可用，跳过
    return;
  }

  try {
    const key = `session:${await hashToken(token)}`;

    await kv.delete(key);
    console.log('[SessionCache] Deleted cached session');
  } catch (error: any) {
    console.error('[SessionCache] Error deleting cached session:', error.message);
  }
}

/**
 * Get session token from cookie header
 * @param cookieHeader - Cookie header string
 * @returns Session token or null
 */
export function getSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  // better-auth uses 'better-auth.session_token' as cookie name
  const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
  return match ? match[1] : null;
}
