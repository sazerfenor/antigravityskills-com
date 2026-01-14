/**
 * 虚拟人格每日令牌重置 Cron
 *
 * @description 每日凌晨执行，为所有活跃虚拟人格分配新的发帖令牌
 *
 * @schedule 每日 00:00 UTC (通过 Cloudflare Cron Triggers)
 * @trigger GET /api/cron/virtual-token-reset
 */

import { respData, respErr } from '@/shared/lib/resp';
import {
  allocateDailyTokensForAll,
  getTokenStats,
} from '@/shared/services/virtual-posting/token-scheduler';

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
    console.log('[Cron] Starting daily token reset...');
    const startTime = Date.now();

    // 分配令牌
    const results = await allocateDailyTokensForAll();

    // 获取统计
    const stats = await getTokenStats();

    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Token reset completed in ${duration}ms. ` +
      `Active: ${stats.totalActive}, Total tokens: ${stats.totalTokens}`
    );

    // 按活跃度分组统计
    const byLevel = Object.entries(stats.byActivityLevel).map(([level, data]) => ({
      level,
      count: data.count,
      tokens: data.tokens,
    }));

    return respData({
      success: true,
      duration,
      summary: {
        totalActive: stats.totalActive,
        totalTokens: stats.totalTokens,
        byActivityLevel: byLevel,
      },
      allocations: results.length <= 20 ? results : undefined, // 只在数量少时返回详情
    });
  } catch (e: any) {
    console.error('[Cron] Token reset failed:', e);
    return respErr(e.message);
  }
}
