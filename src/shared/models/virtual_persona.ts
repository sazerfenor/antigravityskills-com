/**
 * 虚拟人格 Model
 *
 * @description 虚拟用户人格的 CRUD 操作
 */

import { and, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { user, virtualPersona } from '@/config/db/schema.sqlite';
import { getUuid } from '@/shared/lib/hash';
import type {
  ActivityLevel,
  LastInteractionMap,
  NewVirtualPersona,
  PersonaCategory,
  VirtualPersona,
} from '@/shared/types/virtual-persona';
import { ACTIVITY_LEVEL_CONFIG } from '@/shared/types/virtual-persona';

export type { VirtualPersona, NewVirtualPersona };

export type UpdateVirtualPersona = Partial<Omit<NewVirtualPersona, 'id' | 'createdAt'>>;

// ============================================
// 基础 CRUD 操作
// ============================================

/**
 * 创建虚拟人格
 */
export async function createVirtualPersona(
  data: NewVirtualPersona
): Promise<VirtualPersona> {
  const personaData = data.id ? data : { ...data, id: getUuid() };
  const [result] = await db().insert(virtualPersona).values(personaData).returning();
  return result;
}

/**
 * 根据 ID 查找虚拟人格
 */
export async function findVirtualPersonaById(
  id: string
): Promise<VirtualPersona | undefined> {
  const [result] = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.id, id));
  return result;
}

/**
 * 根据 userId 查找虚拟人格
 */
export async function findVirtualPersonaByUserId(
  userId: string
): Promise<VirtualPersona | undefined> {
  const [result] = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.userId, userId));
  return result;
}

/**
 * 根据 username 查找虚拟人格
 */
export async function findVirtualPersonaByUsername(
  username: string
): Promise<VirtualPersona | undefined> {
  const [result] = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.username, username));
  return result;
}

/**
 * 更新虚拟人格
 */
export async function updateVirtualPersonaById(
  id: string,
  data: UpdateVirtualPersona
): Promise<VirtualPersona> {
  const [result] = await db()
    .update(virtualPersona)
    .set(data)
    .where(eq(virtualPersona.id, id))
    .returning();
  return result;
}

/**
 * 删除虚拟人格
 */
export async function deleteVirtualPersonaById(id: string): Promise<void> {
  await db().delete(virtualPersona).where(eq(virtualPersona.id, id));
}

// ============================================
// 查询操作
// ============================================

/**
 * 获取所有活跃的虚拟人格
 */
export async function getActiveVirtualPersonas(): Promise<VirtualPersona[]> {
  return db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.isActive, true));
}

/**
 * 根据分类获取虚拟人格
 */
export async function getVirtualPersonasByCategory(
  category: PersonaCategory
): Promise<VirtualPersona[]> {
  return db()
    .select()
    .from(virtualPersona)
    .where(
      and(
        eq(virtualPersona.primaryCategory, category),
        eq(virtualPersona.isActive, true)
      )
    );
}

/**
 * 获取当前时间活跃的虚拟人格（在活跃时间窗口内）
 */
export async function getActivePersonasAtTime(
  hour: number
): Promise<VirtualPersona[]> {
  return db()
    .select()
    .from(virtualPersona)
    .where(
      and(
        eq(virtualPersona.isActive, true),
        gte(sql`${hour}`, virtualPersona.activeHoursStart),
        lt(sql`${hour}`, virtualPersona.activeHoursEnd)
      )
    );
}

/**
 * 获取有令牌余额的虚拟人格
 */
export async function getPersonasWithTokens(): Promise<VirtualPersona[]> {
  return db()
    .select()
    .from(virtualPersona)
    .where(
      and(
        eq(virtualPersona.isActive, true),
        gte(virtualPersona.dailyTokenBalance, 1)
      )
    );
}

/**
 * 获取虚拟人格总数
 */
export async function getVirtualPersonasCount(): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(virtualPersona);
  return result?.count ?? 0;
}

/**
 * 分页获取虚拟人格
 */
export async function getVirtualPersonasPaginated({
  page = 1,
  pageSize = 20,
  category,
  activityLevel,
  isActive,
}: {
  page?: number;
  pageSize?: number;
  category?: PersonaCategory;
  activityLevel?: ActivityLevel;
  isActive?: boolean;
}): Promise<VirtualPersona[]> {
  const conditions = [];

  if (category) {
    conditions.push(eq(virtualPersona.primaryCategory, category));
  }
  if (activityLevel) {
    conditions.push(eq(virtualPersona.activityLevel, activityLevel));
  }
  if (isActive !== undefined) {
    conditions.push(eq(virtualPersona.isActive, isActive));
  }

  return db()
    .select()
    .from(virtualPersona)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(virtualPersona.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

// ============================================
// 令牌桶调度操作
// ============================================

/**
 * 重置所有虚拟人格的每日令牌
 * 应在每日 00:00 调用
 */
export async function resetDailyTokens(): Promise<number> {
  const personas = await getActiveVirtualPersonas();
  let updatedCount = 0;

  for (const persona of personas) {
    const config = ACTIVITY_LEVEL_CONFIG[persona.activityLevel as ActivityLevel];
    const tokens = config.dailyTokensMin +
      Math.floor(Math.random() * (config.dailyTokensVariance + 1));

    await updateVirtualPersonaById(persona.id, {
      dailyTokenBalance: tokens,
    });
    updatedCount++;
  }

  return updatedCount;
}

/**
 * 消耗一个令牌
 */
export async function consumeToken(personaId: string): Promise<boolean> {
  const persona = await findVirtualPersonaById(personaId);
  if (!persona || persona.dailyTokenBalance <= 0) {
    return false;
  }

  await updateVirtualPersonaById(personaId, {
    dailyTokenBalance: persona.dailyTokenBalance - 1,
    lastActiveAt: new Date(),
  });

  return true;
}

// ============================================
// 互动冷却操作
// ============================================

/**
 * 更新最后互动时间
 */
export async function updateLastInteraction(
  personaId: string,
  targetUserId: string
): Promise<void> {
  const persona = await findVirtualPersonaById(personaId);
  if (!persona) return;

  const interactionMap: LastInteractionMap = persona.lastInteractionMap
    ? JSON.parse(persona.lastInteractionMap)
    : {};

  interactionMap[targetUserId] = Date.now();

  await updateVirtualPersonaById(personaId, {
    lastInteractionMap: JSON.stringify(interactionMap),
    lastActiveAt: new Date(),
  });
}

/**
 * 检查是否在冷却期内
 */
export async function isInCooldown(
  personaId: string,
  targetUserId: string,
  cooldownMs: number
): Promise<boolean> {
  const persona = await findVirtualPersonaById(personaId);
  if (!persona || !persona.lastInteractionMap) return false;

  const interactionMap: LastInteractionMap = JSON.parse(persona.lastInteractionMap);
  const lastTime = interactionMap[targetUserId];

  if (!lastTime) return false;

  return Date.now() - lastTime < cooldownMs;
}

// ============================================
// 统计更新操作
// ============================================

/**
 * 增加发帖计数
 */
export async function incrementPostCount(personaId: string): Promise<void> {
  await db()
    .update(virtualPersona)
    .set({
      totalPostsMade: sql`${virtualPersona.totalPostsMade} + 1`,
      lastActiveAt: new Date(),
    })
    .where(eq(virtualPersona.id, personaId));
}

/**
 * 增加评论计数
 */
export async function incrementCommentCount(personaId: string): Promise<void> {
  await db()
    .update(virtualPersona)
    .set({
      totalCommentsMade: sql`${virtualPersona.totalCommentsMade} + 1`,
      lastActiveAt: new Date(),
    })
    .where(eq(virtualPersona.id, personaId));
}

/**
 * 增加关注计数
 */
export async function incrementFollowCount(personaId: string): Promise<void> {
  await db()
    .update(virtualPersona)
    .set({
      totalFollowsGiven: sql`${virtualPersona.totalFollowsGiven} + 1`,
      lastActiveAt: new Date(),
    })
    .where(eq(virtualPersona.id, personaId));
}

// ============================================
// 辅助函数
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
 * 根据用户 ID 列表批量检查虚拟用户
 */
export async function getVirtualUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const results = await db()
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.id, userIds), eq(user.isVirtual, true)));

  return new Set(results.map((r: { id: string }) => r.id));
}

/**
 * 获取人格统计数据
 */
export async function getPersonaStats(): Promise<{
  total: number;
  active: number;
  byActivityLevel: Record<string, number>;
  totalTokensUsedToday: number;
}> {
  // 总数
  const [totalResult] = await db()
    .select({ count: count() })
    .from(virtualPersona);

  // 活跃数
  const [activeResult] = await db()
    .select({ count: count() })
    .from(virtualPersona)
    .where(eq(virtualPersona.isActive, true));

  // 按活跃度分组
  const activityResults = await db()
    .select({
      level: virtualPersona.activityLevel,
      count: count(),
    })
    .from(virtualPersona)
    .groupBy(virtualPersona.activityLevel);

  const byActivityLevel: Record<string, number> = {};
  for (const row of activityResults) {
    if (row.level) {
      byActivityLevel[row.level] = row.count;
    }
  }

  // 计算今日令牌消耗（通过查看当前余额与配置对比）
  // 简化处理：直接返回 0，实际应该从日志中统计
  const totalTokensUsedToday = 0;

  return {
    total: totalResult?.count ?? 0,
    active: activeResult?.count ?? 0,
    byActivityLevel,
    totalTokensUsedToday,
  };
}
