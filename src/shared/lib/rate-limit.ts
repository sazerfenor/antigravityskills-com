/**
 * Rate Limit 工具 - 基于 Cloudflare KV
 * 
 * @description
 * 使用 SESSION_KV 存储限流计数器，支持智能区分游客和登录用户。
 * 本地开发环境自动降级为"允许通过"，不阻断业务。
 * 
 * @key_format rl::{endpoint}:{prefix}:{identifier}
 * @example rl::ai:generate:ip:1.2.3.4
 * @example rl::ai:generate:user:abc123
 */

/// <reference path="../types/cloudflare.d.ts" />

import { getCloudflareContext } from '@opennextjs/cloudflare';

// In-memory store for development mode only (Global scope to survive HMR)
const globalStore = globalThis as any;
if (!globalStore.devRateLimitStore) {
  globalStore.devRateLimitStore = new Map<string, { count: number; expires: number }>();
}
const devRateLimitStore = globalStore.devRateLimitStore as Map<string, { count: number; expires: number }>;

/**
 * Rate Limit 检查结果
 */
export interface RateLimitResult {
  /** 是否允许通过 */
  success: boolean;
  /** 本次时间窗口的总限制次数 */
  limit: number;
  /** 剩余可用次数 */
  remaining: number;
  /** 重置时间戳（Unix 秒）*/
  reset: number;
}

/**
 * 检查 Rate Limit
 * 
 * @param identifier - 限流标识符（建议格式: endpoint:prefix:id）
 * @param limit - 时间窗口内的最大请求次数
 * @param windowSeconds - 时间窗口（秒）
 * @returns RateLimitResult
 * 
 * @example
 * ```typescript
 * // 游客限流
 * const result = await checkRateLimit('ai:generate:ip:1.2.3.4', 5, 60);
 * 
 * // 登录用户限流
 * const result = await checkRateLimit('ai:generate:user:userId123', 20, 60);
 * ```
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `rl::${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const reset = now + windowSeconds;

  try {
    // 尝试获取 Cloudflare KV
    let kv;
    // Force dev mode to use in-memory store, avoiding broken KV mocks
    if (process.env.NODE_ENV === 'development') {
        kv = undefined;
    } else {
        try {
            const { env } = getCloudflareContext();
            kv = env.SESSION_KV;
        } catch (e) {
            kv = undefined;
        }
    }

    if (!kv) {
      // 🚨 安全修复：生产环境必须 "Fail Close" (拒绝访问) 以保护后端服务
      if (process.env.NODE_ENV === 'production') {
        console.error('[RateLimit] CRITICAL: SESSION_KV unavailable in production. Blocking request.');
        return { success: false, limit, remaining: 0, reset: 0 };
      }

      // ✅ Dev Mode: Use in-memory fallback for testing
      console.warn(`[RateLimit] SESSION_KV missing, using in-memory store for ${key} (Dev Mode)`);
      
      const record = devRateLimitStore.get(key);
      // Clean up if expired
      if (record && record.expires < now) {
        devRateLimitStore.delete(key);
      }

      const currentRecord = devRateLimitStore.get(key);
      const currentCount = currentRecord ? currentRecord.count : 0;

      if (currentCount >= limit) {
        console.log(`[RateLimit-Dev] Blocked: ${key}, count: ${currentCount}/${limit}`);
        return { success: false, limit, remaining: 0, reset: currentRecord?.expires || reset };
      }

      const newCount = currentCount + 1;
      devRateLimitStore.set(key, { 
        count: newCount, 
        expires: currentRecord?.expires || reset 
      });
      
      console.log(`[RateLimit-Dev] Allowed: ${key}, count: ${newCount}/${limit}`);
      return { success: true, limit, remaining: limit - newCount, reset: currentRecord?.expires || reset };
    }

    // 获取当前计数
    const currentValue = await kv.get(key);
    const currentCount = currentValue ? parseInt(currentValue, 10) : 0;

    // 检查是否超限
    if (currentCount >= limit) {
      console.log(`[RateLimit] Blocked: ${key}, count: ${currentCount}/${limit}`);
      return {
        success: false,
        limit,
        remaining: 0,
        reset,
      };
    }

    // 递增计数
    const newCount = currentCount + 1;
    await kv.put(key, String(newCount), {
      expirationTtl: windowSeconds,
    });

    console.log(`[RateLimit] Allowed: ${key}, count: ${newCount}/${limit}`);

    return {
      success: true,
      limit,
      remaining: limit - newCount,
      reset,
    };
  } catch (e) {
    // 🚨 安全修复：异常时生产环境应阻断请求，防止攻击者利用 KV 异常绕过限流
    console.error('[RateLimit] Error checking rate limit:', e);
    if (process.env.NODE_ENV === 'production') {
      return { success: false, limit, remaining: 0, reset: 0 };
    }
    // 开发环境保持宽容
    return { success: true, limit, remaining: limit, reset: 0 };
  }
}

/**
 * Restore rate limit quota (decrement counter)
 * Used for dynamic quota mechanisms (e.g., restore quota after successful purchase/generation)
 */
export async function restoreRateLimit(identifier: string): Promise<boolean> {
  const key = `rl::${identifier}`;
  
  try {
    const { env } = getCloudflareContext();
    const kv = env.SESSION_KV;

    if (!kv) {
      console.warn('[RateLimit] SESSION_KV not available, skipping restore');
      return false;
    }

    const currentValue = await kv.get(key);
    if (!currentValue) return false;

    const currentCount = parseInt(currentValue, 10);
    if (currentCount > 0) {
      const newCount = currentCount - 1;
      // Preserve the key but decrement count. TTL handling is tricky here as put resets TTL.
      // We accept resetting TTL to 24h as a reasonable compromise for building long-term engagement.
      await kv.put(key, String(newCount), { expirationTtl: 86400 });
      console.log(`[RateLimit] Restored: ${key}, new count: ${newCount}`);
      return true;
    }
    return false;
  } catch (e) {
    console.error('[RateLimit] Error restoring rate limit:', e);
    return false;
  }
}


/**
 * 从 Request 获取客户端 IP
 * 
 * @description
 * 优先使用 Cloudflare 的 cf-connecting-ip，回退到 x-forwarded-for
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Rate Limit 配置
 */
export interface RateLimitConfig {
  limit: number;
  window: number;
}

/**
 * Rate Limit 配置常量
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  /** AI 生成接口 - 游客 */
  AI_GENERATE_GUEST: { limit: 5, window: 60 },
  /** AI 生成接口 - 登录用户 */
  AI_GENERATE_USER: { limit: 20, window: 60 },
  /** Prompt 优化接口 - 游客 (2次/7天免费试用) */
  AI_OPTIMIZE_GUEST: { limit: 2, window: 604800 },
  /** Prompt 优化接口 - 登录用户 */
  AI_OPTIMIZE_USER: { limit: 30, window: 60 },
  /** 支付接口 - 统一限制 */
  PAYMENT_CHECKOUT: { limit: 5, window: 60 },
  /** 社区发布 - 游客（极严，防刷屏） */
  COMMUNITY_POST_GUEST: { limit: 1, window: 60 },
  /** 社区发布 - 登录用户 */
  COMMUNITY_POST_USER: { limit: 30, window: 60 },

  /** VisionLogic Build/Compile - 游客 (3次/24h) */
  VL_BUILD_GUEST: { limit: 3, window: 86400 },
  /** VisionLogic Build/Compile - 免费用户 (6次/24h) - 足够完整体验1-2次流程 */
  VL_BUILD_FREE_USER: { limit: 6, window: 86400 },
  /** VisionLogic Build/Compile - 付费用户 (100次/24h + 动态返还) */
  VL_BUILD_PAID_USER: { limit: 100, window: 86400 },

  /** Skill 转换接口 - 游客 (5次/小时) */
  SKILL_CONVERT_GUEST: { limit: 5, window: 3600 },
  /** Skill 转换接口 - 登录用户 (20次/小时) */
  SKILL_CONVERT_USER: { limit: 20, window: 3600 },
};

// ============================================
// Minimum Interval Rate Limiting (v1.7.1)
// For endpoints that should only be called once per N seconds
// ============================================

/**
 * In-memory store for minimum interval rate limiting
 * Uses a simple Map with IP+path as key and timestamp as value
 */
const minIntervalStore = new Map<string, number>();

/**
 * Build a unique key for minimum interval rate limiting
 */
function buildMinIntervalKey(
  request: Request,
  keyPrefix: string
): string {
  const ip = getClientIP(request);
  const url = new URL(request.url);
  // Use cookie hash for better user identification
  const cookieHeader = request.headers.get('cookie') || '';
  // Simple hash: take first 16 chars of cookie to avoid memory bloat
  const cookieShort = cookieHeader.slice(0, 16).replace(/[^\w]/g, '');
  return `${keyPrefix}|${request.method}|${url.pathname}|${ip}|${cookieShort}`;
}

export interface MinIntervalOptions {
  /** Minimum interval in milliseconds between requests */
  intervalMs: number;
  /** Prefix for the rate limit key */
  keyPrefix: string;
}

/**
 * Enforce minimum interval rate limiting
 * Returns null if allowed, or a 429 Response if rate limited
 *
 * @example
 * ```typescript
 * const limited = enforceMinIntervalRateLimit(request, {
 *   intervalMs: 800,
 *   keyPrefix: 'auth-get-session',
 * });
 * if (limited) return limited; // Return 429 response
 * ```
 */
export function enforceMinIntervalRateLimit(
  request: Request,
  opts: MinIntervalOptions
): Response | null {
  const key = buildMinIntervalKey(request, opts.keyPrefix);
  const now = Date.now();
  const last = minIntervalStore.get(key);

  if (last && now - last < opts.intervalMs) {
    // Too soon, rate limit
    return Response.json(
      { error: 'too_many_requests', message: 'Please slow down' },
      { status: 429 }
    );
  }

  // Update last request time
  minIntervalStore.set(key, now);

  // Cleanup old entries periodically (every 1000 requests)
  if (minIntervalStore.size > 10000) {
    const cutoff = now - 60000; // 1 minute ago
    for (const [k, v] of minIntervalStore) {
      if (v < cutoff) {
        minIntervalStore.delete(k);
      }
    }
  }

  return null;
}

