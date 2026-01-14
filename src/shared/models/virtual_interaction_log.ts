/**
 * 虚拟用户互动日志 Model
 *
 * @description 记录虚拟用户的所有互动行为
 */

import { and, count, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { virtualInteractionLog } from '@/config/db/schema.sqlite';
import { getUuid } from '@/shared/lib/hash';
import type {
  InteractionType,
  NewVirtualInteractionLog,
  VirtualInteractionLog,
} from '@/shared/types/virtual-persona';

export type { VirtualInteractionLog, NewVirtualInteractionLog };

// ============================================
// 基础 CRUD 操作
// ============================================

/**
 * 创建互动日志
 */
export async function createInteractionLog(
  data: NewVirtualInteractionLog
): Promise<VirtualInteractionLog> {
  const logData = data.id ? data : { ...data, id: getUuid() };
  const [result] = await db().insert(virtualInteractionLog).values(logData).returning();
  return result;
}

/**
 * 根据 ID 查找互动日志
 */
export async function findInteractionLogById(
  id: string
): Promise<VirtualInteractionLog | undefined> {
  const [result] = await db()
    .select()
    .from(virtualInteractionLog)
    .where(eq(virtualInteractionLog.id, id));
  return result;
}

// ============================================
// 查询操作
// ============================================

/**
 * 获取虚拟人格的今日互动次数
 */
export async function getTodayInteractionCount(
  personaId: string
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [result] = await db()
    .select({ count: count() })
    .from(virtualInteractionLog)
    .where(
      and(
        eq(virtualInteractionLog.personaId, personaId),
        gte(virtualInteractionLog.createdAt, todayStart)
      )
    );

  return result?.count ?? 0;
}

/**
 * 获取虚拟人格对特定用户的今日互动次数
 */
export async function getTodayInteractionCountWithUser(
  personaId: string,
  targetUserId: string
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [result] = await db()
    .select({ count: count() })
    .from(virtualInteractionLog)
    .where(
      and(
        eq(virtualInteractionLog.personaId, personaId),
        eq(virtualInteractionLog.targetUserId, targetUserId),
        gte(virtualInteractionLog.createdAt, todayStart)
      )
    );

  return result?.count ?? 0;
}

/**
 * 获取虚拟人格对特定帖子的互动次数
 */
export async function getInteractionCountWithPost(
  personaId: string,
  targetPostId: string
): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(virtualInteractionLog)
    .where(
      and(
        eq(virtualInteractionLog.personaId, personaId),
        eq(virtualInteractionLog.targetPostId, targetPostId)
      )
    );

  return result?.count ?? 0;
}

/**
 * 检查是否已经对某个评论互动过
 */
export async function hasInteractedWithComment(
  personaId: string,
  targetCommentId: string
): Promise<boolean> {
  const [result] = await db()
    .select({ count: count() })
    .from(virtualInteractionLog)
    .where(
      and(
        eq(virtualInteractionLog.personaId, personaId),
        eq(virtualInteractionLog.targetCommentId, targetCommentId)
      )
    );

  return (result?.count ?? 0) > 0;
}

/**
 * 获取虚拟人格的最近互动记录
 */
export async function getRecentInteractions(
  personaId: string,
  limit = 10
): Promise<VirtualInteractionLog[]> {
  return db()
    .select()
    .from(virtualInteractionLog)
    .where(eq(virtualInteractionLog.personaId, personaId))
    .orderBy(desc(virtualInteractionLog.createdAt))
    .limit(limit);
}

/**
 * 获取按类型统计的互动数据
 */
export async function getInteractionStatsByType(
  personaId: string
): Promise<Record<InteractionType, number>> {
  const results = await db()
    .select({
      type: virtualInteractionLog.interactionType,
      count: count(),
    })
    .from(virtualInteractionLog)
    .where(eq(virtualInteractionLog.personaId, personaId))
    .groupBy(virtualInteractionLog.interactionType);

  const stats: Record<InteractionType, number> = {
    comment: 0,
    follow: 0,
    like: 0,
  };

  for (const row of results) {
    const type = row.type as InteractionType;
    if (type in stats) {
      stats[type] = row.count;
    }
  }

  return stats;
}

/**
 * 获取全局今日互动统计
 */
export async function getTodayGlobalStats(): Promise<{
  totalInteractions: number;
  byType: Record<InteractionType, number>;
  activePersonas: number;
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 总互动数
  const [totalResult] = await db()
    .select({ count: count() })
    .from(virtualInteractionLog)
    .where(gte(virtualInteractionLog.createdAt, todayStart));

  // 按类型统计
  const typeResults = await db()
    .select({
      type: virtualInteractionLog.interactionType,
      count: count(),
    })
    .from(virtualInteractionLog)
    .where(gte(virtualInteractionLog.createdAt, todayStart))
    .groupBy(virtualInteractionLog.interactionType);

  // 活跃人格数
  const [activeResult] = await db()
    .select({ count: sql<number>`COUNT(DISTINCT ${virtualInteractionLog.personaId})` })
    .from(virtualInteractionLog)
    .where(gte(virtualInteractionLog.createdAt, todayStart));

  const byType: Record<InteractionType, number> = {
    comment: 0,
    follow: 0,
    like: 0,
  };

  for (const row of typeResults) {
    const type = row.type as InteractionType;
    if (type in byType) {
      byType[type] = row.count;
    }
  }

  return {
    totalInteractions: totalResult?.count ?? 0,
    byType,
    activePersonas: activeResult?.count ?? 0,
  };
}

/**
 * 分页获取互动日志
 */
export async function getInteractionLogsPaginated({
  page = 1,
  pageSize = 20,
  personaId,
  interactionType,
}: {
  page?: number;
  pageSize?: number;
  personaId?: string;
  interactionType?: InteractionType;
}): Promise<VirtualInteractionLog[]> {
  const conditions = [];

  if (personaId) {
    conditions.push(eq(virtualInteractionLog.personaId, personaId));
  }
  if (interactionType) {
    conditions.push(eq(virtualInteractionLog.interactionType, interactionType));
  }

  return db()
    .select()
    .from(virtualInteractionLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(virtualInteractionLog.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
