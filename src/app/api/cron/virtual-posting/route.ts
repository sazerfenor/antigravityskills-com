/**
 * 虚拟人格自动发帖 Cron
 *
 * @description 每小时执行，检查哪些虚拟人格应该发帖，并执行发帖流程
 *
 * @schedule 每小时执行 (通过 Cloudflare Cron Triggers)
 * @trigger GET /api/cron/virtual-posting
 */

import { respData, respErr } from '@/shared/lib/resp';
import { getPersonasReadyToPost } from '@/shared/services/virtual-posting/token-scheduler';
import { executeBatchPosting } from '@/shared/services/virtual-posting/post-creator';
import { getQueueStats } from '@/shared/models/prompt_queue';

export async function GET(request: Request) {
  // Cron 安全验证
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  const isCronRequest = request.headers.get('CF-Worker') !== null;
  const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || isCronRequest;

  if (!isAuthorized) {
    return Response.json({ code: -1, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting virtual posting job...');
    const startTime = Date.now();

    // 1. 检查队列是否有待处理的 Prompts
    const queueStats = await getQueueStats();
    if (queueStats.pending === 0) {
      console.log('[Cron] No pending prompts in queue, skipping.');
      return respData({
        success: true,
        skipped: true,
        reason: 'no_pending_prompts',
        queueStats,
      });
    }

    // 2. 获取准备发帖的人格
    const readyPersonas = await getPersonasReadyToPost();

    if (readyPersonas.length === 0) {
      console.log('[Cron] No personas ready to post at this time.');
      return respData({
        success: true,
        skipped: true,
        reason: 'no_ready_personas',
        queueStats,
      });
    }

    console.log(`[Cron] Found ${readyPersonas.length} personas ready to post.`);

    // 3. 执行批量发帖（每次最多 3 个，避免超时）
    const MAX_POSTS_PER_RUN = 3;
    const results = await executeBatchPosting(readyPersonas, MAX_POSTS_PER_RUN);

    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Posting job completed in ${duration}ms. ` +
      `Success: ${results.success}, Failed: ${results.failed}`
    );

    return respData({
      success: true,
      duration,
      posted: results.success,
      failed: results.failed,
      results: results.results,
      queueStats,
    });
  } catch (e: any) {
    console.error('[Cron] Virtual posting failed:', e);
    return respErr(e.message);
  }
}
