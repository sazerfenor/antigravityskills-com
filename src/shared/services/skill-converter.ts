/**
 * Skill Converter Service
 * 将 Claude Skills 或自然语言想法转换为 Antigravity Skills
 */

import { generateText } from '@/shared/services/gemini-text';
import {
  createAntigravitySkill,
  createConversionHistory,
} from '@/shared/models/antigravity_skill';
import { getUuid } from '@/shared/lib/hash';
import { buildConversionPrompt } from '@/shared/prompts/skill-converter';

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

  const { name, description, skillMd } = parsedResult;

  if (!name || !description || !skillMd) {
    throw new Error(
      `AI response missing required fields. Got: ${JSON.stringify(Object.keys(parsedResult))}`
    );
  }

  // 3. 保存到数据库（如果需要）
  let skillId: string | undefined;

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
      authorId: userId || null,
      status: 'published',
    });

    // 4. 记录转换历史
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
