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
 * 获取所有 Skills（管理后台用，支持分页和状态过滤）
 */
export async function getAllAntigravitySkills(options?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<{ skills: AntigravitySkill[]; total: number }> {
  const { limit = 20, offset = 0, status } = options || {};

  // 构建条件
  const conditions = status ? eq(antigravitySkills.status, status) : undefined;

  // 并行获取数据和总数
  const [skills, countResult] = await Promise.all([
    conditions
      ? db()
          .select()
          .from(antigravitySkills)
          .where(conditions)
          .orderBy(desc(antigravitySkills.createdAt))
          .limit(limit)
          .offset(offset)
      : db()
          .select()
          .from(antigravitySkills)
          .orderBy(desc(antigravitySkills.createdAt))
          .limit(limit)
          .offset(offset),
    conditions
      ? db()
          .select({ count: sql<number>`count(*)` })
          .from(antigravitySkills)
          .where(conditions)
      : db()
          .select({ count: sql<number>`count(*)` })
          .from(antigravitySkills),
  ]);

  return {
    skills,
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * 删除 Skill
 */
export async function deleteAntigravitySkill(id: string): Promise<void> {
  await db().delete(antigravitySkills).where(eq(antigravitySkills.id, id));
}

/**
 * 根据 Skill ID 删除转换历史
 */
export async function deleteConversionHistoryBySkillId(skillId: string): Promise<void> {
  await db()
    .delete(skillConversionHistory)
    .where(eq(skillConversionHistory.skillId, skillId));
}

/**
 * 更新 Skill 状态
 */
export async function updateAntigravitySkillStatus(
  id: string,
  status: string
): Promise<AntigravitySkill | undefined> {
  const [result] = await db()
    .update(antigravitySkills)
    .set({ status, updatedAt: new Date() })
    .where(eq(antigravitySkills.id, id))
    .returning();
  return result;
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

  return result.map((r: { category: string | null; count: number }) => ({
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

// ============================================
// Skills 列表页分页查询
// ============================================

/**
 * Skills 列表查询选项
 */
export interface SkillListOptions {
  category?: string;
  subcategory?: string;
  sort?: 'newest' | 'popular' | 'downloads';
  page?: number;
  limit?: number;
}

/**
 * Skills 列表查询结果
 */
export interface SkillListResult {
  skills: AntigravitySkill[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

/**
 * 获取 Skills 列表（支持分类过滤、排序、分页）
 * 供 /api/skills 和 /skills 页面使用
 */
export async function getSkillsWithPagination(
  options: SkillListOptions
): Promise<SkillListResult> {
  const { category, subcategory, sort = 'newest', page = 1, limit = 12 } = options;

  // 构建 WHERE 条件
  const conditions: ReturnType<typeof eq>[] = [eq(antigravitySkills.status, 'published')];

  if (category && category !== 'all') {
    conditions.push(eq(antigravitySkills.category, category));
  }

  // subcategory 过滤 (JSON 数组字符串，使用 LIKE 匹配)
  // 注意：subcategory 存储为 JSON 数组字符串，如 '["frontend", "backend"]'
  const subcategoryCondition = subcategory
    ? sql`${antigravitySkills.subcategory} LIKE ${'%"' + subcategory + '"%'}`
    : undefined;

  // 组合所有条件
  const whereClause = subcategoryCondition
    ? and(...conditions, subcategoryCondition)
    : and(...conditions);

  // 构建 ORDER BY
  const orderByClause =
    sort === 'downloads'
      ? desc(antigravitySkills.downloadCount)
      : sort === 'popular'
        ? desc(antigravitySkills.viewCount)
        : desc(antigravitySkills.createdAt);

  // 并行获取数据和总数
  const [skills, countResult] = await Promise.all([
    db()
      .select()
      .from(antigravitySkills)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset((page - 1) * limit),
    db()
      .select({ count: sql<number>`count(*)` })
      .from(antigravitySkills)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    skills,
    pagination: {
      page,
      totalPages: Math.ceil(total / limit) || 1,
      total,
    },
  };
}
