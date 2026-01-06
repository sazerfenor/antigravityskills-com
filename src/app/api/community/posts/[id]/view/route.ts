import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { incrementViewCount } from '@/shared/models/community_post';

// View rate limiting configuration
const VIEW_RATE_LIMIT = {
  windowMinutes: 30, // Same user/IP only counts once per 30 minutes
};

// Simple in-memory cache for view deduplication
const viewCache = new Map<string, number>();

// Clear expired cache entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = VIEW_RATE_LIMIT.windowMinutes * 60 * 1000;
  for (const [key, timestamp] of viewCache.entries()) {
    if (now - timestamp > windowMs) {
      viewCache.delete(key);
    }
  }
}, 15 * 60 * 1000);

/**
 * POST /api/community/posts/[id]/view
 * Track page view and increment view count
 * 
 * Rate limited: Same IP/user can only increment count once per 30 minutes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    
    // Get identifier for rate limiting (IP or user ID if logged in)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const cacheKey = `view:${postId}:${ip}`;
    
    // Check rate limit
    const lastView = viewCache.get(cacheKey);
    const now = Date.now();
    const windowMs = VIEW_RATE_LIMIT.windowMinutes * 60 * 1000;
    
    if (lastView && (now - lastView) < windowMs) {
      // Already viewed recently, don't increment
      return respData({ 
        success: true, 
        counted: false,
        message: 'View not counted (already viewed recently)'
      });
    }
    
    // Update cache
    viewCache.set(cacheKey, now);
    
    // Increment view count in database
    await incrementViewCount(postId, 1);
    
    return respData({ 
      success: true, 
      counted: true 
    });
  } catch (error: any) {
    console.error('[View API] Error:', error);
    return respErr('Failed to track view');
  }
}
