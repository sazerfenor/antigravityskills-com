/**
 * Preset Model - Vision-Logic 预设/模板数据模型
 *
 * 提供预设的 CRUD 操作，区分系统预设和用户模板
 */

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { preset } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

// ============================================
// Types
// ============================================

export interface PresetRecord {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  type: 'system' | 'user';
  userId: string | null;
  sourcePostId: string | null;
  params: Record<string, unknown>;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePresetInput {
  slug: string;
  name: string;
  category?: string;
  type: 'system' | 'user';
  userId?: string;
  sourcePostId?: string;
  params: Record<string, unknown>;
  thumbnailUrl?: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface PresetListItem {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  params: Record<string, unknown> | null;
}

// ============================================
// Query Functions
// ============================================

/**
 * 获取所有激活的系统预设（按排序）
 */
export async function getSystemPresets(): Promise<PresetListItem[]> {
  const rows = await db()
    .select({
      id: preset.id,
      slug: preset.slug,
      name: preset.name,
      category: preset.category,
      thumbnailUrl: preset.thumbnailUrl,
      imageUrl: preset.imageUrl,
      params: preset.params,
    })
    .from(preset)
    .where(
      and(
        eq(preset.type, 'system'),
        eq(preset.isActive, true)
      )
    )
    .orderBy(asc(preset.displayOrder));

  return rows.map((row: any) => ({
    ...row,
    params: row.params ? JSON.parse(row.params) : null,
  }));
}

/**
 * 获取用户的所有模板
 */
export async function getUserPresets(userId: string): Promise<PresetListItem[]> {
  const rows = await db()
    .select({
      id: preset.id,
      slug: preset.slug,
      name: preset.name,
      category: preset.category,
      thumbnailUrl: preset.thumbnailUrl,
      imageUrl: preset.imageUrl,
      params: preset.params,
    })
    .from(preset)
    .where(
      and(
        eq(preset.type, 'user'),
        eq(preset.userId, userId),
        eq(preset.isActive, true)
      )
    )
    .orderBy(asc(preset.displayOrder));

  return rows.map((row: any) => ({
    ...row,
    params: row.params ? JSON.parse(row.params) : null,
  }));
}

/**
 * 通过 ID 或 slug 获取单个预设
 */
export async function getPresetByIdOrSlug(idOrSlug: string): Promise<PresetRecord | null> {
  // 先尝试按 ID 查询
  let [row] = await db()
    .select()
    .from(preset)
    .where(eq(preset.id, idOrSlug))
    .limit(1);

  // 如果没找到，尝试按 slug 查询
  if (!row) {
    [row] = await db()
      .select()
      .from(preset)
      .where(eq(preset.slug, idOrSlug))
      .limit(1);
  }

  if (!row) return null;

  return {
    ...row,
    type: row.type as 'system' | 'user',
    params: row.params ? JSON.parse(row.params) : {},
  };
}

// ============================================
// Mutation Functions
// ============================================

/**
 * 创建新预设
 */
export async function createPreset(input: CreatePresetInput): Promise<{ id: string; slug: string }> {
  const id = getUuid();

  await db()
    .insert(preset)
    .values({
      id,
      slug: input.slug,
      name: input.name,
      category: input.category || null,
      type: input.type,
      userId: input.userId || null,
      sourcePostId: input.sourcePostId || null,
      params: JSON.stringify(input.params),
      thumbnailUrl: input.thumbnailUrl || null,
      imageUrl: input.imageUrl || null,
      displayOrder: input.displayOrder ?? 0,
      isActive: true,
    });

  return { id, slug: input.slug };
}

/**
 * 删除预设（仅允许删除用户模板，且只能删除自己的）
 */
export async function deleteUserPreset(presetId: string, userId: string): Promise<boolean> {
  const result = await db()
    .delete(preset)
    .where(
      and(
        eq(preset.id, presetId),
        eq(preset.type, 'user'),
        eq(preset.userId, userId)
      )
    )
    .returning({ id: preset.id });

  return result.length > 0;
}

/**
 * 检查 slug 是否已存在
 */
export async function isSlugExists(slug: string): Promise<boolean> {
  const [row] = await db()
    .select({ id: preset.id })
    .from(preset)
    .where(eq(preset.slug, slug))
    .limit(1);

  return !!row;
}

/**
 * 生成唯一的用户模板 slug
 */
export async function generateUserPresetSlug(userId: string, name: string): Promise<string> {
  const baseName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const baseSlug = `user-${userId.slice(0, 8)}-${baseName}`;

  // 检查是否存在，如果存在则添加随机后缀
  if (await isSlugExists(baseSlug)) {
    const randomSuffix = Math.random().toString(36).slice(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }

  return baseSlug;
}
