import { betterAuth } from 'better-auth';

import { getAuthOptions } from './config';

// Dynamic auth - with full database configuration
// Always use this in API routes that need database access
export async function getAuth(): Promise<
  Awaited<ReturnType<typeof betterAuth>>
> {
  // Type assertion needed because getAuthOptions() returns a dynamically
  // composed object that TypeScript can't fully infer
  return betterAuth((await getAuthOptions()) as any);
}
