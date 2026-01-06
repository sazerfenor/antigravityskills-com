import { getGalleryKV, clearViewCount, getViewCount } from '@/shared/lib/kv';
import { incrementViewCount as incrementDbViewCount } from '@/shared/models/community_post';
import { respData, respErr } from '@/shared/lib/resp';

/**
 * GET /api/cron/sync-views
 * Cron job to sync view counts from KV to database
 * Should be triggered every 5 minutes via Cloudflare Cron Triggers
 */
export async function GET(request: Request) {
  // Verify this is a Cloudflare Cron request (optional security check)
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow if no secret configured, or if secret matches, or if called from Cloudflare Cron
  const isCronRequest = request.headers.get('CF-Worker') !== null;
  const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || isCronRequest;
  
  if (!isAuthorized) {
    return Response.json({ code: -1, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting view count sync...');
    
    const kv = getGalleryKV();
    const keys = await kv.list({ prefix: 'view:' });
    
    console.log(`[Cron] Found ${keys.keys.length} posts with pending view counts`);
    
    let syncedCount = 0;
    let totalViews = 0;
    const errors: string[] = [];

    for (const key of keys.keys) {
      try {
        const postId = key.name.replace('view:', '');
        const count = await getViewCount(postId);
        
        if (count > 0) {
          // Update database
          await incrementDbViewCount(postId, count);
          
          // Clear KV after successful sync
          await clearViewCount(postId);
          
          syncedCount++;
          totalViews += count;
          
          console.log(`[Cron] Synced ${count} views for post ${postId}`);
        }
      } catch (err: any) {
        console.error(`[Cron] Failed to sync post ${key.name}:`, err.message);
        errors.push(`${key.name}: ${err.message}`);
      }
    }

    console.log(`[Cron] View count sync completed. Synced ${syncedCount} posts, ${totalViews} total views`);

    return respData({
      success: true,
      syncedPosts: syncedCount,
      totalViews,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    console.error('[Cron] View count sync failed:', e);
    return respErr(e.message);
  }
}
