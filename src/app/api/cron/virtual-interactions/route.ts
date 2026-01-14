/**
 * 虚拟人格自动互动 Cron
 *
 * @description 每 5 分钟执行，让虚拟人格与社区内容互动
 *
 * @schedule 每 5 分钟 (通过 Cloudflare Cron Triggers)
 * @trigger GET /api/cron/virtual-interactions
 */

import { eq, and, gt } from 'drizzle-orm';

import { db } from '@/core/db';
import { virtualPersona } from '@/config/db/schema.sqlite';
import { respData, respErr } from '@/shared/lib/resp';
import { executeBatchInteractions } from '@/shared/services/virtual-interaction/executor';
import {
  ACTIVITY_LEVEL_CONFIG,
  type ActivityLevel,
  type VirtualPersona,
} from '@/shared/types/virtual-persona';
import { isInActiveHours } from '@/shared/services/virtual-posting/token-scheduler';

/**
 * 获取准备互动的人格
 *
 * 条件：
 * 1. 活跃状态
 * 2. 在活跃时间段内
 * 3. 根据活跃度概率筛选
 */
async function getPersonasReadyForInteraction(): Promise<VirtualPersona[]> {
  const currentHour = new Date().getHours();

  // 获取所有活跃人格
  const personas = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.isActive, true));

  const readyPersonas: VirtualPersona[] = [];

  for (const persona of personas) {
    // 检查活跃时间段
    if (!isInActiveHours(persona, currentHour)) {
      continue;
    }

    // 根据活跃度配置的回复概率决定是否互动
    const activityLevel = persona.activityLevel as ActivityLevel;
    const config = ACTIVITY_LEVEL_CONFIG[activityLevel];

    if (config && Math.random() < config.replyProbability * 0.1) {
      // 乘以 0.1 降低频率，每次 Cron 只有部分人格互动
      readyPersonas.push(persona);
    }
  }

  return readyPersonas;
}

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
    console.log('[Cron] Starting virtual interactions job...');
    const startTime = Date.now();

    // 1. 获取准备互动的人格
    const readyPersonas = await getPersonasReadyForInteraction();

    if (readyPersonas.length === 0) {
      console.log('[Cron] No personas ready for interaction at this time.');
      return respData({
        success: true,
        skipped: true,
        reason: 'no_ready_personas',
      });
    }

    console.log(`[Cron] Found ${readyPersonas.length} personas ready for interaction.`);

    // 2. 执行批量互动（每次最多 5 个，避免超时）
    const MAX_INTERACTIONS_PER_RUN = 5;
    const results = await executeBatchInteractions(readyPersonas, MAX_INTERACTIONS_PER_RUN);

    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Interaction job completed in ${duration}ms. ` +
      `Success: ${results.success}, Skipped: ${results.skipped}, Failed: ${results.failed}`
    );

    return respData({
      success: true,
      duration,
      processed: results.success + results.skipped + results.failed,
      succeeded: results.success,
      skipped: results.skipped,
      failed: results.failed,
      results: results.results,
    });
  } catch (e: any) {
    console.error('[Cron] Virtual interactions failed:', e);
    return respErr(e.message);
  }
}
