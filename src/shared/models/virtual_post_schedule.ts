/**
 * 虚拟用户发帖计划 Model
 *
 * @description 追踪虚拟用户发帖任务的状态机
 */

import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { virtualPostSchedule } from '@/config/db/schema.sqlite';
import { getUuid } from '@/shared/lib/hash';
import type {
  NewVirtualPostSchedule,
  PostScheduleStatus,
  VirtualPostSchedule,
} from '@/shared/types/virtual-persona';

export type { VirtualPostSchedule, NewVirtualPostSchedule };

export type UpdateVirtualPostSchedule = Partial<Omit<NewVirtualPostSchedule, 'id' | 'createdAt'>>;

// ============================================
// 基础 CRUD 操作
// ============================================

/**
 * 创建发帖计划
 */
export async function createPostSchedule(
  data: NewVirtualPostSchedule
): Promise<VirtualPostSchedule> {
  const scheduleData = data.id ? data : { ...data, id: getUuid() };
  const [result] = await db().insert(virtualPostSchedule).values(scheduleData).returning();
  return result;
}

/**
 * 根据 ID 查找发帖计划
 */
export async function findPostScheduleById(
  id: string
): Promise<VirtualPostSchedule | undefined> {
  const [result] = await db()
    .select()
    .from(virtualPostSchedule)
    .where(eq(virtualPostSchedule.id, id));
  return result;
}

/**
 * 更新发帖计划
 */
export async function updatePostScheduleById(
  id: string,
  data: UpdateVirtualPostSchedule
): Promise<VirtualPostSchedule> {
  const [result] = await db()
    .update(virtualPostSchedule)
    .set(data)
    .where(eq(virtualPostSchedule.id, id))
    .returning();
  return result;
}

/**
 * 删除发帖计划
 */
export async function deletePostScheduleById(id: string): Promise<void> {
  await db().delete(virtualPostSchedule).where(eq(virtualPostSchedule.id, id));
}

// ============================================
// 状态机操作
// ============================================

/**
 * 状态机步骤顺序
 */
const STATUS_ORDER: PostScheduleStatus[] = [
  'pending',
  'prompt',
  'image',
  'post',
  'seo',
  'completed',
];

/**
 * 推进到下一个状态
 */
export async function advanceToNextStatus(
  id: string
): Promise<VirtualPostSchedule | undefined> {
  const schedule = await findPostScheduleById(id);
  if (!schedule) return undefined;

  const currentIndex = STATUS_ORDER.indexOf(schedule.status as PostScheduleStatus);
  if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) {
    return schedule; // 已完成或无效状态
  }

  const nextStatus = STATUS_ORDER[currentIndex + 1];

  return updatePostScheduleById(id, {
    status: nextStatus,
    currentStep: nextStatus,
  });
}

/**
 * 标记为失败
 */
export async function markScheduleFailed(
  id: string,
  errorMessage: string
): Promise<VirtualPostSchedule> {
  return updatePostScheduleById(id, {
    status: 'failed',
    lastError: errorMessage,
  });
}

/**
 * 标记为完成
 */
export async function markScheduleCompleted(
  id: string,
  postId: string
): Promise<VirtualPostSchedule> {
  return updatePostScheduleById(id, {
    status: 'completed',
    postId,
    completedAt: new Date(),
  });
}

// ============================================
// 查询操作
// ============================================

/**
 * 获取待处理的发帖计划（按调度时间排序）
 */
export async function getPendingSchedules(
  limit = 10
): Promise<VirtualPostSchedule[]> {
  const now = new Date();

  return db()
    .select()
    .from(virtualPostSchedule)
    .where(
      and(
        eq(virtualPostSchedule.status, 'pending'),
        lte(virtualPostSchedule.scheduledAt, now)
      )
    )
    .orderBy(virtualPostSchedule.scheduledAt)
    .limit(limit);
}

/**
 * 获取处理中的发帖计划（需要继续执行）
 */
export async function getInProgressSchedules(
  limit = 10
): Promise<VirtualPostSchedule[]> {
  // 获取不是 pending、completed、failed 的任务
  return db()
    .select()
    .from(virtualPostSchedule)
    .where(
      and(
        sql`${virtualPostSchedule.status} NOT IN ('pending', 'completed', 'failed')`,
      )
    )
    .orderBy(virtualPostSchedule.scheduledAt)
    .limit(limit);
}

/**
 * 获取虚拟人格的今日发帖数
 */
export async function getTodayPostCount(
  personaId: string
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [result] = await db()
    .select({ count: count() })
    .from(virtualPostSchedule)
    .where(
      and(
        eq(virtualPostSchedule.personaId, personaId),
        eq(virtualPostSchedule.status, 'completed'),
        gte(virtualPostSchedule.completedAt, todayStart)
      )
    );

  return result?.count ?? 0;
}

/**
 * 获取虚拟人格的发帖计划历史
 */
export async function getPersonaScheduleHistory(
  personaId: string,
  limit = 20
): Promise<VirtualPostSchedule[]> {
  return db()
    .select()
    .from(virtualPostSchedule)
    .where(eq(virtualPostSchedule.personaId, personaId))
    .orderBy(desc(virtualPostSchedule.createdAt))
    .limit(limit);
}

// ============================================
// 统计查询
// ============================================

/**
 * 获取发帖计划统计
 */
export async function getScheduleStats(): Promise<{
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const results = await db()
    .select({
      status: virtualPostSchedule.status,
      count: count(),
    })
    .from(virtualPostSchedule)
    .groupBy(virtualPostSchedule.status);

  const stats = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    total: 0,
  };

  for (const row of results) {
    const status = row.status as PostScheduleStatus;
    if (status === 'completed') {
      stats.completed = row.count;
    } else if (status === 'failed') {
      stats.failed = row.count;
    } else if (status === 'pending') {
      stats.pending = row.count;
    } else {
      stats.inProgress += row.count;
    }
    stats.total += row.count;
  }

  return stats;
}

/**
 * 获取今日发帖统计
 */
export async function getTodayPostStats(): Promise<{
  completed: number;
  pending: number;
  failed: number;
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const results = await db()
    .select({
      status: virtualPostSchedule.status,
      count: count(),
    })
    .from(virtualPostSchedule)
    .where(gte(virtualPostSchedule.createdAt, todayStart))
    .groupBy(virtualPostSchedule.status);

  const stats = {
    completed: 0,
    pending: 0,
    failed: 0,
  };

  for (const row of results) {
    if (row.status === 'completed') {
      stats.completed = row.count;
    } else if (row.status === 'failed') {
      stats.failed = row.count;
    } else if (row.status === 'pending') {
      stats.pending = row.count;
    }
  }

  return stats;
}

/**
 * 分页获取发帖计划
 */
export async function getPostSchedulesPaginated({
  page = 1,
  pageSize = 20,
  personaId,
  status,
}: {
  page?: number;
  pageSize?: number;
  personaId?: string;
  status?: PostScheduleStatus;
}): Promise<VirtualPostSchedule[]> {
  const conditions = [];

  if (personaId) {
    conditions.push(eq(virtualPostSchedule.personaId, personaId));
  }
  if (status) {
    conditions.push(eq(virtualPostSchedule.status, status));
  }

  return db()
    .select()
    .from(virtualPostSchedule)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(virtualPostSchedule.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

/**
 * 清理旧的失败任务
 */
export async function cleanupFailedSchedules(olderThanDays = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db()
    .delete(virtualPostSchedule)
    .where(
      and(
        eq(virtualPostSchedule.status, 'failed'),
        lte(virtualPostSchedule.createdAt, cutoffDate)
      )
    );

  return result.rowsAffected ?? 0;
}
