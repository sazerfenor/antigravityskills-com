/**
 * Skill Converter Service
 * 将 Claude Skills 或自然语言想法转换为 Antigravity Skills
 */

import { eq } from 'drizzle-orm';

import { generateText } from '@/shared/services/gemini-text';
import {
  createAntigravitySkill,
  createConversionHistory,
} from '@/shared/models/antigravity_skill';
import { getUuid } from '@/shared/lib/hash';
import { buildConversionPrompt } from '@/shared/prompts/skill-converter';
import {
  isValidCategory,
  isValidSubcategory,
} from '@/config/skill-categories';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';

// ============================================
// 类型定义
// ============================================

interface ConvertSkillParams {
  input: string;
  sourceType: 'claude-skill' | 'user-idea' | 'other';
  userId?: string;
  saveToDatabase?: boolean;
}

interface ConvertSkillResult {
  name: string;
  description: string;
  skillMd: string;
  skillId?: string;
  category: string;
  subcategories: string[];
  tags: string[];
}

// ============================================
// 核心转换函数
// ============================================

/**
 * 将用户输入转换为 Antigravity Skill
 */
export async function convertSkillToAntigravity(
  params: ConvertSkillParams
): Promise<ConvertSkillResult> {
  const { input, sourceType, userId, saveToDatabase = true } = params;

  // 1. 调用 Gemini API 进行转换
  const prompt = buildConversionPrompt(input);

  const rawResponse = await generateText(prompt, {
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
    maxOutputTokens: 4096,
    jsonMode: true, // 要求返回 JSON
  });

  // 2. 解析 JSON 响应
  let parsedResult: any;
  try {
    parsedResult = JSON.parse(rawResponse);
  } catch (e) {
    throw new Error('Failed to parse AI response as JSON. Response: ' + rawResponse.substring(0, 200));
  }

  const { name, description, skillMd, category, subcategories, tags } = parsedResult;

  // 3. 验证必填字段
  if (!name || !description || !skillMd) {
    throw new Error(
      `AI response missing required fields. Got: ${JSON.stringify(Object.keys(parsedResult))}`
    );
  }

  // 4. 验证分类字段（必填，验证失败则报错）
  if (!category || typeof category !== 'string') {
    throw new Error('AI response missing required field: category');
  }
  if (!isValidCategory(category)) {
    throw new Error(`Invalid category: "${category}". Must be a valid category ID.`);
  }

  if (!Array.isArray(subcategories) || subcategories.length === 0) {
    throw new Error('AI response missing required field: subcategories (must be non-empty array)');
  }
  for (const sub of subcategories) {
    if (!isValidSubcategory(sub)) {
      throw new Error(`Invalid subcategory: "${sub}". Must be a valid subcategory ID.`);
    }
  }

  if (!Array.isArray(tags) || tags.length === 0 || !tags.every((t) => typeof t === 'string')) {
    throw new Error('AI response missing required field: tags (must be non-empty string array)');
  }

  // 5. 保存到数据库（如果需要）
  let skillId: string | undefined;
  let validUserId = userId;

  // 验证 userId 是否真实存在于 user 表（防止外键约束失败）
  if (validUserId) {
    const userExists = await db()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, validUserId))
      .limit(1);

    if (userExists.length === 0) {
      console.warn('[skill-converter] userId not found in user table, setting to null:', validUserId);
      validUserId = undefined;
    }
  }

  if (saveToDatabase) {
    skillId = getUuid();
    const slug = name; // MVP: slug = name

    await createAntigravitySkill({
      id: skillId,
      name,
      slug,
      description,
      content: skillMd,
      sourceType,
      sourceContent: input,
      authorId: validUserId || null,
      status: 'published',
      category,
      subcategory: JSON.stringify(subcategories),
      tags: JSON.stringify(tags),
    });

    // 6. 记录转换历史
    await createConversionHistory({
      id: getUuid(),
      skillId,
      inputContent: input,
      outputContent: skillMd,
      sourceType,
      userId: userId || null,
    });
  }

  return {
    name,
    description,
    skillMd,
    skillId,
    category,
    subcategories,
    tags,
  };
}

/**
 * 从 Skill Markdown 中提取 frontmatter 字段
 */
export function extractFrontmatterField(
  markdown: string,
  field: string
): string | null {
  const regex = new RegExp(`^${field}:\\s*(.+)$`, 'm');
  const match = markdown.match(regex);
  return match ? match[1].trim() : null;
}
