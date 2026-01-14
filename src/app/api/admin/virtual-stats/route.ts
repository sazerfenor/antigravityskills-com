/**
 * 虚拟人格统计 API
 *
 * @description 提供虚拟人格系统的统计数据
 */

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getTodayGlobalStats } from '@/shared/models/virtual_interaction_log';
import { getPersonaStats } from '@/shared/models/virtual_persona';

// ============================================
// GET - 获取统计数据
// ============================================

export async function GET() {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.read'))) {
      return respErr('Permission denied', 403);
    }

    // 获取今日互动统计
    const interactionStats = await getTodayGlobalStats();

    // 获取人格统计
    const personaStats = await getPersonaStats();

    // 获取今日发帖数（从 community_post 表查询虚拟人格发帖）
    // 这里简化处理，使用互动统计中的数据
    const todayStats = {
      postsCreated: 0, // TODO: 需要从 community_post 查询今日虚拟人格发帖数
      interactionsMade: interactionStats.totalInteractions,
      tokensUsed: personaStats.totalTokensUsedToday || 0,
    };

    return respData({
      ...personaStats,
      ...todayStats,
      interactionsByType: interactionStats.byType,
      activePersonasToday: interactionStats.activePersonas,
    });
  } catch (e: any) {
    console.error('[API] Get virtual stats failed:', e);
    return respErr(e.message);
  }
}
