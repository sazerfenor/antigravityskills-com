import { oneTapClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { envConfigs } from '@/config';

/**
 * Client-side get-session request throttling (v1.7.1)
 * Prevents request storms and duplicate requests
 */
function createGetSessionThrottledFetch({
  minIntervalMs,
}: {
  minIntervalMs: number;
}): typeof fetch {
  const inFlight = new Map<string, Promise<Response>>();
  let lastStartedAt = 0;

  function isGetSessionRequest(input: RequestInfo | URL, init?: RequestInit) {
    const method =
      (
        init?.method ?? (input instanceof Request ? input.method : 'GET')
      )?.toUpperCase?.() ?? 'GET';

    if (method !== 'GET') return false;

    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://local';
    const url = new URL(rawUrl, base);
    return url.pathname.endsWith('/get-session');
  }

  function getDedupeKey(input: RequestInfo | URL) {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://local';
    const url = new URL(rawUrl, base);
    // Drop query/hash: session endpoint should be safe to dedupe across params.
    return `GET ${url.origin}${url.pathname}`;
  }

  return async (input, init) => {
    if (!minIntervalMs || !isGetSessionRequest(input, init)) {
      return fetch(input, init);
    }

    // Deduplication: return existing in-flight promise
    const key = getDedupeKey(input);
    const existing = inFlight.get(key);
    if (existing) return existing;

    // Throttling: wait if last request was too recent
    const now = Date.now();
    const waitMs = Math.max(0, lastStartedAt + minIntervalMs - now);

    const promise = (async () => {
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
      lastStartedAt = Date.now();
      return fetch(input, init);
    })().finally(() => {
      inFlight.delete(key);
    });

    inFlight.set(key, promise);
    return promise;
  };
}

// Client-side throttle to avoid get-session request storms in browser.
// Note: must be NEXT_PUBLIC_* to be inlined into client bundles.
const AUTH_GET_SESSION_MIN_INTERVAL_MS =
  Number(process.env.NEXT_PUBLIC_AUTH_GET_SESSION_MIN_INTERVAL_MS) || 2000;

// auth client for client-side use - 优化 session 请求频率
export const authClient = createAuthClient({
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  fetchOptions: {
    // Avoid amplifying request storms (e.g. during env/db switching in dev).
    // IMPORTANT: auth mutations (sign-in/sign-up) must be non-retriable,
    // otherwise we may send verification emails multiple times.
    retry: 0,
    customFetchImpl: createGetSessionThrottledFetch({
      minIntervalMs: AUTH_GET_SESSION_MIN_INTERVAL_MS,
    }),
    onError: (ctx) => {
      // 静默处理错误
      console.error('[Auth] Session error:', ctx.error?.message);
    },
  },
});

// export auth client methods
export const { signIn, signUp, signOut, useSession } = authClient;

// get auth client with configs
export function getAuthClient(configs: Record<string, string>) {
  const authClient = createAuthClient({
    baseURL: envConfigs.auth_url,
    secret: envConfigs.auth_secret,
    plugins:
      configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [
            oneTapClient({
              clientId: configs.google_client_id,
              // Optional client configuration:
              autoSelect: false,
              cancelOnTapOutside: false,
              context: 'signin',
              additionalOptions: {
                // Any extra options for the Google initialize method
              },
              // Configure prompt behavior and exponential backoff:
              promptOptions: {
                baseDelay: 1000, // Base delay in ms (default: 1000)
                maxAttempts: 1, // Only attempt once to avoid multiple error logs (default: 5)
              },
            }),
          ]
        : [],
    fetchOptions: {
      retry: 0,
      customFetchImpl: createGetSessionThrottledFetch({
        minIntervalMs: AUTH_GET_SESSION_MIN_INTERVAL_MS,
      }),
    },
  });

  return authClient;
}
