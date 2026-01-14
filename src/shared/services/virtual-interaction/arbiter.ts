/**
 * 互动裁判服务 (Interaction Arbiter)
 *
 * @description 防止虚拟人格之间的无限循环互动
 *
 * 三重检查机制：
 * 1. 对话深度限制 - 同一帖子下的评论链不超过 3 层
 * 2. V2V 每日互动限制 - 虚拟对虚拟每日互动上限
 * 3. 冷却时间 - 同一目标 30 分钟内不重复互动
 */

import { and, count, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { user, virtualPersona, virtualInteractionLog, comment } from '@/config/db/schema.sqlite';
import { getUuid } from '@/shared/lib/hash';
import {
  INTERACTION_LIMITS,
  type ArbiterCheckResult,
  type LastInteractionMap,
  type VirtualPersona,
} from '@/shared/types/virtual-persona';
import { updateVirtualPersonaById } from '@/shared/models/virtual_persona';

// ============================================
// 虚拟用户检测
// ============================================

/**
 * 检查用户是否是虚拟用户
 */
export async function isVirtualUser(userId: string): Promise<boolean> {
  const [result] = await db()
    .select({ isVirtual: user.isVirtual })
    .from(user)
    .where(eq(user.id, userId));

  return result?.isVirtual ?? false;
}

/**
 * 批量检查用户是否是虚拟用户
 */
export async function getVirtualUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const { inArray } = await import('drizzle-orm');

  const results = await db()
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        inArray(user.id, userIds),
        eq(user.isVirtual, true)
      )
    );

  return new Set(results.map((r: any) => r.id));
}

// ============================================
// 对话深度检测
// ============================================

/**
 * 获取评论链的深度
 *
 * @param commentId 当前评论 ID
 * @param postId 帖子 ID
 */
export async function getThreadDepth(
  commentId: string | null,
  postId: string
): Promise<number> {
  if (!commentId) return 0;

  // 查询当前评论的父评论链
  // 这里假设评论表有 parent_id 字段，需要根据实际表结构调整
  // 简化实现：查询该帖子下人格之间的连续互动次数

  const { comment } = await import('@/config/db/schema.sqlite');

  // 递归查询深度（SQLite 版本，使用 WITH RECURSIVE）
  // 简化实现：假设 parentId 存在
  let depth = 0;
  let currentId: string | null = commentId;

  while (currentId && depth < 10) {
    const [commentData]: any = await db()
      .select({ parentId: comment.parentId })
      .from(comment)
      .where(eq(comment.id, currentId));

    if (!commentData?.parentId) break;
    currentId = commentData.parentId;
    depth++;
  }

  return depth;
}

// ============================================
// V2V 互动计数
// ============================================

/**
 * 获取今日两个虚拟用户之间的互动次数
 */
export async function getTodayV2VInteractionCount(
  fromPersonaId: string,
  targetUserId: string
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db()
    .select({ count: count() })
    .from(virtualInteractionLog)
    .where(
      and(
        eq(virtualInteractionLog.personaId, fromPersonaId),
        eq(virtualInteractionLog.targetUserId, targetUserId),
        gte(virtualInteractionLog.createdAt, today)
      )
    );

  return result?.count ?? 0;
}

/**
 * 获取今日人格的总互动次数
 */
export async function getTodayTotalInteractionCount(
  personaId: string
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db()
    .select({ count: count() })
    .from(virtualInteractionLog)
    .where(
      and(
        eq(virtualInteractionLog.personaId, personaId),
        gte(virtualInteractionLog.createdAt, today)
      )
    );

  return result?.count ?? 0;
}

// ============================================
// 冷却时间管理
// ============================================

/**
 * 解析冷却时间 Map
 */
function parseLastInteractionMap(jsonStr: string | null): LastInteractionMap {
  if (!jsonStr) return {};
  try {
    return JSON.parse(jsonStr);
  } catch {
    return {};
  }
}

/**
 * 检查是否在冷却中
 */
export function isInCooldown(
  lastInteractionMap: LastInteractionMap,
  targetUserId: string
): boolean {
  const lastTime = lastInteractionMap[targetUserId];
  if (!lastTime) return false;

  return Date.now() - lastTime < INTERACTION_LIMITS.cooldownMs;
}

/**
 * 更新冷却时间
 */
export async function updateCooldown(
  personaId: string,
  targetUserId: string,
  currentMap: LastInteractionMap
): Promise<void> {
  const newMap = {
    ...currentMap,
    [targetUserId]: Date.now(),
  };

  // 清理超过 24 小时的旧记录
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [userId, time] of Object.entries(newMap)) {
    if (time < cutoff) {
      delete newMap[userId];
    }
  }

  await updateVirtualPersonaById(personaId, {
    lastInteractionMap: JSON.stringify(newMap),
  });
}

// ============================================
// 主裁判函数
// ============================================

/**
 * 检查互动是否被允许
 *
 * @param fromPersona 发起互动的虚拟人格
 * @param targetUserId 目标用户 ID
 * @param targetPostId 目标帖子 ID
 * @param threadDepth 当前对话深度（可选，评论场景需要）
 */
export async function checkInteraction(
  fromPersona: VirtualPersona,
  targetUserId: string,
  targetPostId: string,
  threadDepth: number = 0
): Promise<ArbiterCheckResult> {
  // Check 1: 对话深度限制
  if (threadDepth > INTERACTION_LIMITS.maxThreadDepth) {
    return { allowed: false, reason: 'thread_depth_exceeded' };
  }

  // Check 2: 每日总互动上限
  const todayTotal = await getTodayTotalInteractionCount(fromPersona.id);
  if (todayTotal >= INTERACTION_LIMITS.dailyMaxInteractions) {
    return { allowed: false, reason: 'daily_limit_reached' };
  }

  // Check 3: 虚拟对虚拟限制
  if (INTERACTION_LIMITS.v2v.enabled) {
    const isTargetVirtual = await isVirtualUser(targetUserId);

    if (isTargetVirtual) {
      // V2V 对话深度限制更严格
      if (threadDepth >= INTERACTION_LIMITS.v2v.replyDepthLimit) {
        return { allowed: false, reason: 'thread_depth_exceeded' };
      }

      // V2V 每日互动上限
      const v2vCount = await getTodayV2VInteractionCount(fromPersona.id, targetUserId);
      if (v2vCount >= INTERACTION_LIMITS.v2v.dailyLimit) {
        return { allowed: false, reason: 'v2v_daily_limit' };
      }
    }
  }

  // Check 4: 冷却时间
  const lastInteractionMap = parseLastInteractionMap(fromPersona.lastInteractionMap);
  if (isInCooldown(lastInteractionMap, targetUserId)) {
    return { allowed: false, reason: 'cooldown_active' };
  }

  return { allowed: true };
}

/**
 * 记录互动并更新冷却
 */
export async function recordInteraction(
  fromPersona: VirtualPersona,
  targetUserId: string,
  interactionType: 'comment' | 'follow' | 'like',
  details: {
    targetPostId?: string;
    targetCommentId?: string;
    generatedContent?: string;
    threadDepth?: number;
  } = {}
): Promise<void> {
  const { createInteractionLog } = await import('@/shared/models/virtual_interaction_log');

  // 1. 创建互动日志
  await createInteractionLog({
    id: getUuid(),
    personaId: fromPersona.id,
    interactionType,
    targetUserId,
    targetPostId: details.targetPostId,
    targetCommentId: details.targetCommentId,
    generatedContent: details.generatedContent,
    threadDepth: details.threadDepth ?? 0,
    status: 'completed',
    createdAt: new Date(),
  });

  // 2. 更新冷却时间
  const lastInteractionMap = parseLastInteractionMap(fromPersona.lastInteractionMap);
  await updateCooldown(fromPersona.id, targetUserId, lastInteractionMap);

  // 3. 更新互动统计
  await updateVirtualPersonaById(fromPersona.id, {
    lastActiveAt: new Date(),
    totalCommentsMade: interactionType === 'comment'
      ? (fromPersona.totalCommentsMade ?? 0) + 1
      : fromPersona.totalCommentsMade,
    totalFollowsGiven: interactionType === 'follow'
      ? (fromPersona.totalFollowsGiven ?? 0) + 1
      : fromPersona.totalFollowsGiven,
  });
}
