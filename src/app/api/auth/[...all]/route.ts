import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/core/auth';
import { isCloudflareWorker } from '@/shared/lib/env';
import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';

// Server-side rate limiting for get-session endpoint (v1.7.1)
const AUTH_GET_SESSION_MIN_INTERVAL_MS =
  Number(process.env.AUTH_GET_SESSION_MIN_INTERVAL_MS) || 800;

function maybeRateLimitGetSession(request: Request): Response | null {
  const url = new URL(request.url);
  // Skip rate limiting in Cloudflare Worker (has its own rate limiting)
  // Only apply rate limiting to get-session endpoint
  if (isCloudflareWorker || !url.pathname.endsWith('/api/auth/get-session')) {
    return null;
  }

  return enforceMinIntervalRateLimit(request, {
    intervalMs: AUTH_GET_SESSION_MIN_INTERVAL_MS,
    keyPrefix: 'auth-get-session',
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  console.log('[AUTH POST] ===== Request Start =====');
  console.log('[AUTH POST] URL:', url.pathname);
  console.log('[AUTH POST] Origin:', request.headers.get('origin'));
  console.log('[AUTH POST] Host:', request.headers.get('host'));
  console.log('[AUTH POST] Content-Type:', request.headers.get('content-type'));
  
  // Check if this is a sign-out request - clear session cache before processing
  const isSignOut = url.pathname.includes('sign-out');
  if (isSignOut) {
    try {
      const { deleteCachedSession, getSessionTokenFromCookie } = await import('@/core/auth/session-cache');
      const cookieHeader = request.headers.get('cookie');
      const token = getSessionTokenFromCookie(cookieHeader);
      if (token) {
        await deleteCachedSession(token);
        console.log('[AUTH POST] Cleared session cache on sign-out');
      }
      
      // 清除 impersonation cookie（如果存在）
      // 这可以防止管理员在模拟状态下退出登录后，重新登录时出现 invalid_code 错误
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const impersonationCookie = cookieStore.get('impersonation');
      if (impersonationCookie) {
        cookieStore.delete('impersonation');
        console.log('[AUTH POST] Cleared impersonation cookie on sign-out');
      }
    } catch (error: any) {
      console.error('[AUTH POST] Failed to clear session cache:', error.message);
    }
  }
  
  try {
    console.log('[AUTH POST] Getting auth instance...');
    const auth = await getAuth();
    console.log('[AUTH POST] Auth instance created successfully');
    
    const handler = toNextJsHandler(auth.handler);
    console.log('[AUTH POST] Handler created, calling POST...');
    
    const response = await handler.POST(request);
    console.log('[AUTH POST] Response status:', response.status);
    
    return response;
  } catch (error: any) {
    console.error('[AUTH POST] ERROR:', error.message);
    console.error('[AUTH POST] Stack:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request: Request) {
  try {
    // Server-side rate limiting for get-session (v1.7.1)
    const limited = maybeRateLimitGetSession(request);
    if (limited) return limited;

    const auth = await getAuth();
    const handler = toNextJsHandler(auth.handler);
    return await handler.GET(request);
  } catch (error: any) {
    console.error('[AUTH GET] ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
