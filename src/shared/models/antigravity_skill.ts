/**
 * Antigravity Skill Model
 * 处理 Antigravity Skills 的数据库操作
 */

import { db } from '@/core/db';
import { antigravitySkills, skillConversionHistory } from '@/config/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

// ============================================
// 类型定义
// ============================================

export type AntigravitySkill = typeof antigravitySkills.$inferSelect;
export type NewAntigravitySkill = typeof antigravitySkills.$inferInsert;
export type ConversionHistory = typeof skillConversionHistory.$inferSelect;
export type NewConversionHistory = typeof skillConversionHistory.$inferInsert;

// ============================================
// Antigravity Skills 主表操作
// ============================================

/**
 * 创建新的 Antigravity Skill
 */
export async function createAntigravitySkill(
  skill: NewAntigravitySkill
): Promise<AntigravitySkill> {
  const [result] = await db().insert(antigravitySkills).values(skill).returning();
  return result;
}

/**
 * 根据 ID 获取 Skill
 */
export async function getAntigravitySkillById(id: string): Promise<AntigravitySkill | undefined> {
  const result = await db()
    .select()
    .from(antigravitySkills)
    .where(eq(antigravitySkills.id, id))
    .limit(1);
  return result[0];
}

/**
 * 根据 slug 获取 Skill
 */
export async function getAntigravitySkillBySlug(
  slug: string
): Promise<AntigravitySkill | undefined> {
  const result = await db()
    .select()
    .from(antigravitySkills)
    .where(eq(antigravitySkills.slug, slug))
    .limit(1);
  return result[0];
}

/**
 * 获取 Skills 列表
 */
export async function getAntigravitySkills(options?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<AntigravitySkill[]> {
  const { limit = 10, offset = 0, status = 'published' } = options || {};

  let query = db().select().from(antigravitySkills);

  if (status) {
    query = query.where(eq(antigravitySkills.status, status));
  }

  return query
    .orderBy(desc(antigravitySkills.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * 更新 Skill 的查看次数
 */
export async function incrementSkillViewCount(id: string): Promise<void> {
  await db()
    .update(antigravitySkills)
    .set({
      viewCount: db().select({ count: antigravitySkills.viewCount }).from(antigravitySkills).where(eq(antigravitySkills.id, id)).limit(1)[0].count + 1,
    })
    .where(eq(antigravitySkills.id, id));
}

/**
 * 更新 Skill 的下载次数
 */
export async function incrementSkillDownloadCount(id: string): Promise<void> {
  await db()
    .update(antigravitySkills)
    .set({
      downloadCount: db().select({ count: antigravitySkills.downloadCount }).from(antigravitySkills).where(eq(antigravitySkills.id, id)).limit(1)[0].count + 1,
    })
    .where(eq(antigravitySkills.id, id));
}

// ============================================
// Skills 转换历史表操作
// ============================================

/**
 * 创建转换历史记录
 */
export async function createConversionHistory(
  history: NewConversionHistory
): Promise<ConversionHistory> {
  const [result] = await db().insert(skillConversionHistory).values(history).returning();
  return result;
}

/**
 * 获取用户的转换历史
 */
export async function getUserConversionHistory(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<ConversionHistory[]> {
  const { limit = 10, offset = 0 } = options || {};

  return db()
    .select()
    .from(skillConversionHistory)
    .where(eq(skillConversionHistory.userId, userId))
    .orderBy(desc(skillConversionHistory.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * 获取所有转换历史（用于分析）
 */
export async function getAllConversionHistory(options?: {
  limit?: number;
  offset?: number;
}): Promise<ConversionHistory[]> {
  const { limit = 100, offset = 0 } = options || {};

  return db()
    .select()
    .from(skillConversionHistory)
    .orderBy(desc(skillConversionHistory.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============================================
// Skills 入口组件数据查询
// ============================================

/**
 * 分类统计结果类型
 */
export interface SkillCategoryStat {
  category: string;
  count: number;
}

/**
 * 获取各分类的 Skills 数量统计
 */
export async function getSkillCategoryStats(): Promise<SkillCategoryStat[]> {
  const result = await db()
    .select({
      category: antigravitySkills.category,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(antigravitySkills)
    .where(
      and(
        eq(antigravitySkills.status, 'published'),
        sql`${antigravitySkills.category} IS NOT NULL`
      )
    )
    .groupBy(antigravitySkills.category);

  return result.map((r) => ({
    category: r.category || '',
    count: Number(r.count),
  }));
}

/**
 * 获取热门 Skills（按下载次数排序）
 */
export async function getTrendingSkills(options?: {
  limit?: number;
}): Promise<AntigravitySkill[]> {
  const { limit = 5 } = options || {};

  return db()
    .select()
    .from(antigravitySkills)
    .where(eq(antigravitySkills.status, 'published'))
    .orderBy(desc(antigravitySkills.downloadCount))
    .limit(limit);
}

/**
 * 根据分类获取 Skills 列表
 */
export async function getSkillsByCategory(
  category: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<AntigravitySkill[]> {
  const { limit = 20, offset = 0 } = options || {};

  return db()
    .select()
    .from(antigravitySkills)
    .where(
      and(
        eq(antigravitySkills.status, 'published'),
        eq(antigravitySkills.category, category)
      )
    )
    .orderBy(desc(antigravitySkills.downloadCount))
    .limit(limit)
    .offset(offset);
}
