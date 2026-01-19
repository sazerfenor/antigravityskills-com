/**
 * Skill Publisher Service
 *
 * @description 将 Antigravity Skill 发布为 communityPost 落地页
 *
 * 工作流 Agent 调用此服务，将生成的 SEO 字段写入数据库
 */

import { v4 as uuidv4 } from 'uuid';

import { db } from '@/core/db';
import { communityPost, antigravitySkills } from '@/config/db/schema.sqlite';
import { eq } from 'drizzle-orm';
import { getAntigravitySkillById, getAntigravitySkillBySlug } from '@/shared/models/antigravity_skill';
import { getCommunityPostBySlug } from '@/shared/models/community_post';
import { cleanSlugText, truncateSlug } from '@/shared/lib/seo-slug-generator';
import { envConfigs } from '@/config';

// ============================================
// 类型定义
// ============================================

export interface PublishSkillRequest {
  skillId: string;
  // 人类可读展示名称 (如 "UIUX Designer")
  displayName?: string;
  // Skill 图标 (Lucide icon 名称)
  skillIcon?: string;

  // SEO 字段 (Agent 生成)
  seoTitle: string;
  seoDescription: string;
  seoKeywords?: string;
  h1Title: string;
  contentIntro: string;

  // 可选富内容
  faqItems?: Array<{ question: string; answer: string }>;
  contentSections?: Array<{ type: string; title: string; content: string }>;
  visualTags?: string[];

  // ⭐ v19.0 新增字段 (Skill 落地页增强)
  heroSection?: {
    headline: string;
    subheadline: string;
    cta: { primary: string; secondary: string };
  };
  quickStart?: {
    title: string;
    steps: string[];
    exampleCommand: string;
  };
  capabilities?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  presets?: Array<{
    name: string;
    colors: string[];
    fonts: { heading: string; body: string };
    bestFor: string;
  }>;
  usageExamples?: Array<{
    input: string;
    output: string;
    beforeAfter?: { before: string; after: string };
  }>;
  triggerPhrases?: string[];
  skillContent?: string;
  readmeContent?: string;

  // 覆盖选项
  imageUrl?: string;
  userId?: string;
}

export interface PublishSkillResponse {
  success: boolean;
  postId: string;
  seoSlug: string;
  url: string;
}

export interface PublishSkillError {
  success: false;
  error: string;
  code: 'SKILL_NOT_FOUND' | 'SLUG_CONFLICT' | 'VALIDATION_ERROR' | 'DATABASE_ERROR';
}

// ============================================
// 常量
// ============================================

// 默认占位图（Skill 类帖子使用）
export const SKILL_DEFAULT_IMAGE = '/images/skill-default.svg';

// 默认系统用户 ID（用于自动发布）
// 可以通过环境变量覆盖，或使用虚拟人格的 userId
export const SKILL_PUBLISHER_USER_ID = process.env.SKILL_PUBLISHER_USER_ID || 'system-skill-bot';

// ============================================
// 验证函数
// ============================================

/**
 * 验证 SEO 字段约束
 *
 * 返回 errors（硬性错误，阻止发布）和 warnings（软性警告，不阻止发布）
 */
export function validateSeoFields(data: PublishSkillRequest): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // seoTitle: 30-80 字符（最小是硬性要求，超长是警告）
  if (!data.seoTitle || data.seoTitle.length < 30) {
    errors.push(`seoTitle 太短 (${data.seoTitle?.length || 0}/30 最小)`);
  }
  if (data.seoTitle && data.seoTitle.length > 80) {
    warnings.push(`seoTitle 超长 (${data.seoTitle.length}/80 建议)，可能被搜索引擎截断`);
  }

  // seoDescription: 120-200 字符（最小是硬性要求，超长是警告）
  if (!data.seoDescription || data.seoDescription.length < 120) {
    errors.push(`seoDescription 太短 (${data.seoDescription?.length || 0}/120 最小)`);
  }
  if (data.seoDescription && data.seoDescription.length > 200) {
    warnings.push(`seoDescription 超长 (${data.seoDescription.length}/200 建议)，可能被截断`);
  }

  // h1Title: 20-100 字符（最小是硬性要求，超长是警告）
  if (!data.h1Title || data.h1Title.length < 20) {
    errors.push(`h1Title 太短 (${data.h1Title?.length || 0}/20 最小)`);
  }
  if (data.h1Title && data.h1Title.length > 100) {
    warnings.push(`h1Title 超长 (${data.h1Title.length}/100 建议)`);
  }

  // contentIntro: 必填，最小 50 字符
  if (!data.contentIntro || data.contentIntro.length < 50) {
    errors.push(`contentIntro 太短 (${data.contentIntro?.length || 0}/50 最小)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Slug 生成
// ============================================

/**
 * 为 Skill 生成 SEO Slug
 * 格式: skill-{name}-{shortId}
 */
export function generateSkillSlug(skillName: string, postId: string): string {
  const prefix = 'skill';
  const namePart = cleanSlugText(skillName);
  const shortId = postId.replace(/-/g, '').slice(-8);

  const slug = `${prefix}-${namePart}-${shortId}`;
  return truncateSlug(slug, 80);
}

/**
 * 保存 Slug 并处理冲突
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let finalSlug = baseSlug;
  let attempt = 0;
  const MAX_RETRIES = 10;

  while (attempt <= MAX_RETRIES) {
    // 检查是否已存在
    const existing = await getCommunityPostBySlug(finalSlug);
    if (!existing) {
      return finalSlug;
    }

    // 冲突，添加后缀
    attempt++;
    finalSlug = `${baseSlug}-${attempt}`;
    console.log(`[ensureUniqueSlug] Conflict detected, trying: ${finalSlug}`);
  }

  throw new Error(`Failed to generate unique slug after ${MAX_RETRIES} retries`);
}

// ============================================
// 核心发布函数
// ============================================

/**
 * 将 Skill 发布为 communityPost
 *
 * @param data 发布请求数据（包含 skillId 和 SEO 字段）
 * @returns 发布结果（postId, seoSlug, url）
 */
export async function publishSkillToPost(
  data: PublishSkillRequest
): Promise<PublishSkillResponse | PublishSkillError> {
  // 1. 验证 SEO 字段
  const validation = validateSeoFields(data);
  if (!validation.valid) {
    return {
      success: false,
      error: `SEO 字段验证失败: ${validation.errors.join('; ')}`,
      code: 'VALIDATION_ERROR',
    };
  }

  // 2. 获取 Skill 数据（支持按 ID 或 slug 查找）
  const skill = await getAntigravitySkillById(data.skillId)
             || await getAntigravitySkillBySlug(data.skillId);
  if (!skill) {
    return {
      success: false,
      error: `Skill not found: ${data.skillId}`,
      code: 'SKILL_NOT_FOUND',
    };
  }

  // 3. 生成 postId 和 seoSlug
  const postId = uuidv4();
  const baseSlug = generateSkillSlug(skill.name, postId);

  let seoSlug: string;
  try {
    seoSlug = await ensureUniqueSlug(baseSlug);
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      code: 'SLUG_CONFLICT',
    };
  }

  // 4. 准备 communityPost 数据
  const now = new Date();
  const postData = {
    id: postId,
    userId: data.userId || SKILL_PUBLISHER_USER_ID,
    // 优先使用 displayName，其次从 skill 表读取，最后 fallback 到 kebab-case name
    title: data.displayName || skill.displayName || skill.name,
    prompt: skill.content, // 完整 SKILL.md 内容
    imageUrl: data.imageUrl || SKILL_DEFAULT_IMAGE,
    category: skill.category || 'tools',
    subcategory: skill.subcategory,
    status: 'published' as const,

    // SEO 字段
    seoSlug,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    seoKeywords: data.seoKeywords || '',
    h1Title: data.h1Title,
    contentIntro: data.contentIntro,

    // 富内容字段 (JSON 字符串)
    faqItems: data.faqItems ? JSON.stringify(data.faqItems) : null,
    contentSections: data.contentSections ? JSON.stringify(data.contentSections) : null,
    visualTags: data.visualTags ? JSON.stringify(data.visualTags) : (skill.tags || null),

    // ⭐ v19.0 新增字段 (Skill 落地页增强)
    // 优先使用传入的 skillIcon，其次从 skill 表读取
    skillIcon: data.skillIcon || skill.icon || null,
    heroSection: data.heroSection ? JSON.stringify(data.heroSection) : null,
    quickStart: data.quickStart ? JSON.stringify(data.quickStart) : null,
    capabilities: data.capabilities ? JSON.stringify(data.capabilities) : null,
    presets: data.presets ? JSON.stringify(data.presets) : null,
    usageExamples: data.usageExamples ? JSON.stringify(data.usageExamples) : null,
    triggerPhrases: data.triggerPhrases ? JSON.stringify(data.triggerPhrases) : null,
    skillContent: data.skillContent || skill.content || null,
    readmeContent: data.readmeContent || null,

    // Skill ZIP 下载链接 (从 antigravitySkills 表传递)
    zipUrl: skill.zipUrl || null,

    // 统计字段
    viewCount: 0,
    likeCount: 0,
    downloadCount: 0,

    // 时间戳
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };

  // 5. 写入数据库
  try {
    await db().insert(communityPost).values(postData);

    // 5.5 同时更新 antigravity_skill.icon 字段（保证数据一致性）
    if (data.skillIcon) {
      await db()
        .update(antigravitySkills)
        .set({ icon: data.skillIcon, updatedAt: now })
        .where(eq(antigravitySkills.id, skill.id));
      console.log(`[publishSkillToPost] Updated skill.icon to: ${data.skillIcon}`);
    }

    console.log('[publishSkillToPost] Success:', {
      skillId: data.skillId,
      postId,
      seoSlug,
    });

    // 6. 构建完整 URL
    const baseUrl = envConfigs.app_url || 'https://antigravityskills.com';
    const url = `${baseUrl}/skills/${seoSlug}`;

    return {
      success: true,
      postId,
      seoSlug,
      url,
    };
  } catch (err: any) {
    console.error('[publishSkillToPost] Database error:', err);
    return {
      success: false,
      error: `Database error: ${err.message}`,
      code: 'DATABASE_ERROR',
    };
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 检查 Skill 是否已发布为 Post
 * 通过搜索 seoSlug 前缀判断
 */
export async function isSkillPublished(skillName: string): Promise<boolean> {
  const slugPrefix = `skill-${cleanSlugText(skillName)}`;
  // 简单实现：尝试查找
  const existing = await getCommunityPostBySlug(slugPrefix);
  return !!existing;
}
