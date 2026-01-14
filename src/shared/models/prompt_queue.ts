/**
 * Prompt 队列 Model
 *
 * @description 管理待发布的 Prompt 队列
 */

import { and, count, desc, eq, isNull, lte, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { promptQueue, virtualPersona } from '@/config/db/schema.sqlite';
import { getUuid } from '@/shared/lib/hash';
import type {
  NewPromptQueueItem,
  PersonaCategory,
  PromptQueueItem,
  PromptQueueStatus,
} from '@/shared/types/virtual-persona';

export type { PromptQueueItem, NewPromptQueueItem };

export type UpdatePromptQueueItem = Partial<Omit<NewPromptQueueItem, 'id' | 'createdAt'>>;

// ============================================
// 基础 CRUD 操作
// ============================================

/**
 * 创建 Prompt 队列项
 */
export async function createPromptQueueItem(
  data: NewPromptQueueItem
): Promise<PromptQueueItem> {
  const itemData = data.id ? data : { ...data, id: getUuid() };
  const [result] = await db().insert(promptQueue).values(itemData).returning();
  return result;
}

/**
 * 批量创建 Prompt 队列项
 */
export async function createPromptQueueItems(
  items: NewPromptQueueItem[]
): Promise<PromptQueueItem[]> {
  const itemsWithIds = items.map((item) => ({
    ...item,
    id: item.id ?? getUuid(),
  }));
  return db().insert(promptQueue).values(itemsWithIds).returning();
}

/**
 * 根据 ID 查找 Prompt 队列项
 */
export async function findPromptQueueItemById(
  id: string
): Promise<PromptQueueItem | undefined> {
  const [result] = await db()
    .select()
    .from(promptQueue)
    .where(eq(promptQueue.id, id));
  return result;
}

/**
 * 更新 Prompt 队列项
 */
export async function updatePromptQueueItemById(
  id: string,
  data: UpdatePromptQueueItem
): Promise<PromptQueueItem> {
  const [result] = await db()
    .update(promptQueue)
    .set(data)
    .where(eq(promptQueue.id, id))
    .returning();
  return result;
}

/**
 * 删除 Prompt 队列项
 */
export async function deletePromptQueueItemById(id: string): Promise<void> {
  await db().delete(promptQueue).where(eq(promptQueue.id, id));
}

// ============================================
// 队列操作
// ============================================

/**
 * 获取待处理的 Prompt（按优先级排序）
 */
export async function getPendingPrompts(
  limit = 10
): Promise<PromptQueueItem[]> {
  return db()
    .select()
    .from(promptQueue)
    .where(eq(promptQueue.status, 'pending'))
    .orderBy(desc(promptQueue.priority), promptQueue.createdAt)
    .limit(limit);
}

/**
 * 获取匹配特定分类的待处理 Prompt
 */
export async function getMatchingPromptForCategory(
  category: PersonaCategory
): Promise<PromptQueueItem | undefined> {
  // 优先匹配指定分类，其次匹配无分类的
  const [result] = await db()
    .select()
    .from(promptQueue)
    .where(
      and(
        eq(promptQueue.status, 'pending'),
        isNull(promptQueue.assignedPersonaId)
      )
    )
    .orderBy(
      sql`CASE WHEN ${promptQueue.category} = ${category} THEN 0
          WHEN ${promptQueue.category} IS NULL THEN 1
          ELSE 2 END`,
      desc(promptQueue.priority),
      promptQueue.createdAt
    )
    .limit(1);

  return result;
}

/**
 * 分配 Prompt 给虚拟人格
 */
export async function assignPromptToPersona(
  promptId: string,
  personaId: string
): Promise<PromptQueueItem> {
  const [result] = await db()
    .update(promptQueue)
    .set({
      assignedPersonaId: personaId,
      status: 'assigned',
    })
    .where(eq(promptQueue.id, promptId))
    .returning();
  return result;
}

/**
 * 标记 Prompt 为处理中
 */
export async function markPromptProcessing(
  promptId: string
): Promise<PromptQueueItem> {
  const [result] = await db()
    .update(promptQueue)
    .set({ status: 'processing' })
    .where(eq(promptQueue.id, promptId))
    .returning();
  return result;
}

/**
 * 标记 Prompt 为完成
 */
export async function markPromptCompleted(
  promptId: string,
  postId: string
): Promise<PromptQueueItem> {
  const [result] = await db()
    .update(promptQueue)
    .set({
      status: 'completed',
      postId,
      processedAt: new Date(),
    })
    .where(eq(promptQueue.id, promptId))
    .returning();
  return result;
}

/**
 * 标记 Prompt 为失败
 */
export async function markPromptFailed(
  promptId: string,
  errorMessage: string
): Promise<PromptQueueItem> {
  const [result] = await db()
    .update(promptQueue)
    .set({
      status: 'failed',
      errorMessage,
      processedAt: new Date(),
    })
    .where(eq(promptQueue.id, promptId))
    .returning();
  return result;
}

// ============================================
// 统计查询
// ============================================

/**
 * 获取队列统计
 */
export async function getQueueStats(): Promise<{
  pending: number;
  assigned: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const results = await db()
    .select({
      status: promptQueue.status,
      count: count(),
    })
    .from(promptQueue)
    .groupBy(promptQueue.status);

  const stats = {
    pending: 0,
    assigned: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  };

  for (const row of results) {
    const status = row.status as PromptQueueStatus;
    if (status in stats) {
      stats[status] = row.count;
    }
    stats.total += row.count;
  }

  return stats;
}

/**
 * 获取分类统计
 */
export async function getQueueCategoryStats(): Promise<
  Array<{ category: string | null; count: number }>
> {
  return db()
    .select({
      category: promptQueue.category,
      count: count(),
    })
    .from(promptQueue)
    .where(eq(promptQueue.status, 'pending'))
    .groupBy(promptQueue.category);
}

/**
 * 分页获取队列项
 */
export async function getPromptQueuePaginated({
  page = 1,
  pageSize = 20,
  status,
}: {
  page?: number;
  pageSize?: number;
  status?: PromptQueueStatus;
}): Promise<PromptQueueItem[]> {
  const conditions = status ? eq(promptQueue.status, status) : undefined;

  return db()
    .select()
    .from(promptQueue)
    .where(conditions)
    .orderBy(desc(promptQueue.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}

/**
 * 清理过期的失败任务（可选）
 */
export async function cleanupFailedPrompts(olderThanDays = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db()
    .delete(promptQueue)
    .where(
      and(
        eq(promptQueue.status, 'failed'),
        lte(promptQueue.createdAt, cutoffDate)
      )
    );

  return result.rowsAffected ?? 0;
}
