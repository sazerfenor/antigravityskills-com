/**
 * 令牌桶调度服务
 *
 * @description 管理虚拟人格的每日发帖令牌分配和消耗
 *
 * 核心机制：
 * 1. 每日凌晨重置所有人格的令牌余额
 * 2. 根据活跃度配置分配不同数量的令牌
 * 3. 发帖时消耗令牌，令牌用完则当日不再发帖
 * 4. 结合时段权重决定具体发帖时机
 */

import { and, eq, gt } from 'drizzle-orm';

import { db } from '@/core/db';
import { virtualPersona } from '@/config/db/schema.sqlite';
import {
  ACTIVITY_LEVEL_CONFIG,
  HOUR_WEIGHTS,
  type ActivityLevel,
  type VirtualPersona,
} from '@/shared/types/virtual-persona';

// ============================================
// 类型定义
// ============================================

export interface TokenAllocationResult {
  personaId: string;
  username: string;
  activityLevel: ActivityLevel;
  tokensAllocated: number;
}

export interface ShouldPostResult {
  shouldPost: boolean;
  reason: string;
  tokensRemaining: number;
}

// ============================================
// 令牌分配
// ============================================

/**
 * 计算单个人格的每日令牌数
 */
export function calculateDailyTokens(activityLevel: ActivityLevel): number {
  const config = ACTIVITY_LEVEL_CONFIG[activityLevel];
  if (!config) return 0;

  const { dailyTokensMin, dailyTokensVariance } = config;

  // 添加随机变化量
  const variance = dailyTokensVariance > 0
    ? Math.floor(Math.random() * (dailyTokensVariance * 2 + 1)) - dailyTokensVariance
    : 0;

  return Math.max(0, dailyTokensMin + variance);
}

/**
 * 重置所有活跃人格的每日令牌
 * 应在每日凌晨执行（通过 Cron）
 */
export async function allocateDailyTokensForAll(): Promise<TokenAllocationResult[]> {
  // 获取所有活跃人格
  const activePersonas = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.isActive, true));

  const results: TokenAllocationResult[] = [];

  for (const persona of activePersonas) {
    const activityLevel = persona.activityLevel as ActivityLevel;
    const tokens = calculateDailyTokens(activityLevel);

    // 更新令牌余额
    await db()
      .update(virtualPersona)
      .set({
        dailyTokenBalance: tokens,
        updatedAt: new Date(),
      })
      .where(eq(virtualPersona.id, persona.id));

    results.push({
      personaId: persona.id,
      username: persona.username,
      activityLevel,
      tokensAllocated: tokens,
    });
  }

  return results;
}

/**
 * 为单个人格分配令牌（用于新创建的人格）
 */
export async function allocateTokensForPersona(personaId: string): Promise<number> {
  const [persona] = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.id, personaId));

  if (!persona) {
    throw new Error(`Persona not found: ${personaId}`);
  }

  const activityLevel = persona.activityLevel as ActivityLevel;
  const tokens = calculateDailyTokens(activityLevel);

  await db()
    .update(virtualPersona)
    .set({
      dailyTokenBalance: tokens,
      updatedAt: new Date(),
    })
    .where(eq(virtualPersona.id, personaId));

  return tokens;
}

// ============================================
// 发帖决策
// ============================================

/**
 * 获取当前小时的权重
 */
export function getHourWeight(hour: number): number {
  return HOUR_WEIGHTS[hour] ?? 0.1;
}

/**
 * 检查人格是否在活跃时间段内
 */
export function isInActiveHours(
  persona: Pick<VirtualPersona, 'activeHoursStart' | 'activeHoursEnd'>,
  currentHour?: number
): boolean {
  const hour = currentHour ?? new Date().getHours();
  const start = persona.activeHoursStart ?? 9;
  const end = persona.activeHoursEnd ?? 22;

  // 处理跨午夜的情况（如 22:00 - 06:00）
  if (start <= end) {
    return hour >= start && hour < end;
  } else {
    return hour >= start || hour < end;
  }
}

/**
 * 判断人格当前是否应该发帖
 *
 * 考虑因素：
 * 1. 令牌余额 > 0
 * 2. 在活跃时间段内
 * 3. 时段权重概率
 */
export async function shouldPostNow(personaId: string): Promise<ShouldPostResult> {
  const [persona] = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.id, personaId));

  if (!persona) {
    return { shouldPost: false, reason: 'persona_not_found', tokensRemaining: 0 };
  }

  if (!persona.isActive) {
    return { shouldPost: false, reason: 'persona_inactive', tokensRemaining: 0 };
  }

  const tokens = persona.dailyTokenBalance ?? 0;

  if (tokens <= 0) {
    return { shouldPost: false, reason: 'no_tokens', tokensRemaining: 0 };
  }

  if (!isInActiveHours(persona)) {
    return { shouldPost: false, reason: 'outside_active_hours', tokensRemaining: tokens };
  }

  // 根据时段权重决定
  const hourWeight = getHourWeight(new Date().getHours());
  const shouldPost = Math.random() < hourWeight;

  if (!shouldPost) {
    return { shouldPost: false, reason: 'hour_weight_skip', tokensRemaining: tokens };
  }

  return { shouldPost: true, reason: 'ok', tokensRemaining: tokens };
}

/**
 * 获取所有应该发帖的人格
 */
export async function getPersonasReadyToPost(): Promise<VirtualPersona[]> {
  const currentHour = new Date().getHours();

  // 获取有令牌且活跃的人格
  const personas = await db()
    .select()
    .from(virtualPersona)
    .where(
      and(
        eq(virtualPersona.isActive, true),
        gt(virtualPersona.dailyTokenBalance, 0)
      )
    );

  // 过滤：在活跃时间段内 + 时段权重概率
  const readyPersonas: VirtualPersona[] = [];

  for (const persona of personas) {
    if (!isInActiveHours(persona, currentHour)) {
      continue;
    }

    const hourWeight = getHourWeight(currentHour);
    if (Math.random() < hourWeight) {
      readyPersonas.push(persona);
    }
  }

  return readyPersonas;
}

// ============================================
// 令牌消耗
// ============================================

/**
 * 消耗一个发帖令牌
 */
export async function consumePostingToken(personaId: string): Promise<boolean> {
  const [persona] = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.id, personaId));

  if (!persona || (persona.dailyTokenBalance ?? 0) <= 0) {
    return false;
  }

  await db()
    .update(virtualPersona)
    .set({
      dailyTokenBalance: (persona.dailyTokenBalance ?? 1) - 1,
      totalPostsMade: (persona.totalPostsMade ?? 0) + 1,
      lastActiveAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(virtualPersona.id, personaId));

  return true;
}

// ============================================
// 统计查询
// ============================================

/**
 * 获取令牌分配统计
 */
export async function getTokenStats(): Promise<{
  totalActive: number;
  totalTokens: number;
  byActivityLevel: Record<ActivityLevel, { count: number; tokens: number }>;
}> {
  const personas = await db()
    .select()
    .from(virtualPersona)
    .where(eq(virtualPersona.isActive, true));

  const stats = {
    totalActive: personas.length,
    totalTokens: 0,
    byActivityLevel: {
      low: { count: 0, tokens: 0 },
      moderate: { count: 0, tokens: 0 },
      high: { count: 0, tokens: 0 },
      very_high: { count: 0, tokens: 0 },
    } as Record<ActivityLevel, { count: number; tokens: number }>,
  };

  for (const persona of personas) {
    const level = persona.activityLevel as ActivityLevel;
    const tokens = persona.dailyTokenBalance ?? 0;

    stats.totalTokens += tokens;

    if (stats.byActivityLevel[level]) {
      stats.byActivityLevel[level].count++;
      stats.byActivityLevel[level].tokens += tokens;
    }
  }

  return stats;
}
