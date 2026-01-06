'use server';

import { headers } from 'next/headers';

/**
 * Get client IP address from request headers
 * Supports Cloudflare, Vercel, and standard reverse proxy headers
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();

  const ip =
    h.get('cf-connecting-ip') || // Cloudflare IP
    h.get('x-real-ip') || // Vercel or other reverse proxies
    (h.get('x-forwarded-for') || '127.0.0.1').split(',')[0]; // Standard header

  return ip?.trim() || '127.0.0.1';
}
