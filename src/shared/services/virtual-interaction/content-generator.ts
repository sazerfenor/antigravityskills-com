/**
 * 虚拟人格内容生成器
 *
 * @description 根据人格特征和上下文生成评论内容
 */

import { generateText } from '@/shared/services/gemini-text';
import type {
  CommentGenerationContext,
  CommentGenerationResult,
  PersonalityTraits,
  ResponsePatterns,
  VirtualPersona,
} from '@/shared/types/virtual-persona';

// ============================================
// Prompt 模板
// ============================================

const COMMENT_GENERATION_TEMPLATE = `# Role: {{DISPLAY_NAME}} (@{{USERNAME}})

## 你的人设
- 性格特征: {{PERSONALITY_DESCRIPTION}}
- 沟通风格: {{COMMUNICATION_STYLE}}
- 专长领域: {{SPECIALTIES}}
- 常用表达: {{TYPICAL_PHRASES}}

## 上下文（重要！）

### 帖子内容
- 图片描述: {{POST_IMAGE_ALT}}
- 原始 Prompt: {{POST_PROMPT}}
- 分类: {{POST_CATEGORY}}
- 作者: {{POST_AUTHOR}}

### 对话历史（最近几条）
{{THREAD_HISTORY}}

## 任务
生成一条符合人设的评论（1-3句话）。

## 要求
1. 必须提及图片中的具体元素或效果
2. 与对话上下文连贯（如果有历史对话）
3. 符合你的性格特征和说话方式
4. 不要使用"这个"、"很棒"等模糊词汇
5. 具体、真诚、有个人观点
6. 使用中文回复

## 输出格式
直接输出评论内容，不要任何解释或标签。`;

// ============================================
// 辅助函数
// ============================================

/**
 * 解析人格特质 JSON
 */
function parsePersonalityTraits(jsonStr: string | null): PersonalityTraits {
  if (!jsonStr) {
    return { warmth: 5, professionalism: 5, humor: 5, creativity: 5, helpfulness: 5 };
  }
  try {
    return JSON.parse(jsonStr);
  } catch {
    return { warmth: 5, professionalism: 5, humor: 5, creativity: 5, helpfulness: 5 };
  }
}

/**
 * 解析响应模式 JSON
 */
function parseResponsePatterns(jsonStr: string | null): ResponsePatterns {
  if (!jsonStr) {
    return {
      greetings: [],
      closings: [],
      emojiUsage: 'minimal',
      typicalPhrases: [],
    };
  }
  try {
    return JSON.parse(jsonStr);
  } catch {
    return {
      greetings: [],
      closings: [],
      emojiUsage: 'minimal',
      typicalPhrases: [],
    };
  }
}

/**
 * 生成性格描述
 */
function generatePersonalityDescription(traits: PersonalityTraits): string {
  const descriptions: string[] = [];

  if (traits.warmth >= 7) descriptions.push('热情友好');
  else if (traits.warmth <= 3) descriptions.push('冷静理性');

  if (traits.professionalism >= 7) descriptions.push('专业严谨');
  else if (traits.professionalism <= 3) descriptions.push('随性自由');

  if (traits.humor >= 7) descriptions.push('幽默风趣');
  if (traits.creativity >= 7) descriptions.push('富有创意');
  if (traits.helpfulness >= 7) descriptions.push('乐于助人');

  return descriptions.length > 0 ? descriptions.join('、') : '平和稳重';
}

/**
 * 构建对话历史文本
 */
function buildThreadHistoryText(
  history: CommentGenerationContext['threadHistory']
): string {
  if (!history || history.length === 0) {
    return '（这是第一条评论）';
  }

  return history
    .map((h, i) => `${i + 1}. ${h.authorName}: "${h.content}"`)
    .join('\n');
}

// ============================================
// 主生成函数
// ============================================

/**
 * 生成评论内容
 */
export async function generateComment(
  context: CommentGenerationContext
): Promise<CommentGenerationResult> {
  const { persona, post, threadHistory } = context;

  // 解析人格数据
  const traits = parsePersonalityTraits(persona.personalityTraits);
  const patterns = parseResponsePatterns(persona.responsePatterns);
  const specialties = persona.specialties
    ? JSON.parse(persona.specialties).join('、')
    : '无特定专长';

  // 构建 Prompt
  const prompt = COMMENT_GENERATION_TEMPLATE
    .replace('{{DISPLAY_NAME}}', persona.displayName)
    .replace('{{USERNAME}}', persona.username)
    .replace('{{PERSONALITY_DESCRIPTION}}', generatePersonalityDescription(traits))
    .replace('{{COMMUNICATION_STYLE}}', persona.communicationStyle || 'casual')
    .replace('{{SPECIALTIES}}', specialties)
    .replace('{{TYPICAL_PHRASES}}', patterns.typicalPhrases?.slice(0, 3).join('、') || '无')
    .replace('{{POST_IMAGE_ALT}}', post.imageAlt || '（无描述）')
    .replace('{{POST_PROMPT}}', post.prompt || '（无 Prompt）')
    .replace('{{POST_CATEGORY}}', post.category || 'photography')
    .replace('{{POST_AUTHOR}}', post.authorName || '匿名用户')
    .replace('{{THREAD_HISTORY}}', buildThreadHistoryText(threadHistory));

  // 调用 AI 生成
  const result = await generateText(prompt, {
    temperature: 0.8,
    maxOutputTokens: 200,
    model: 'gemini-3-flash-preview',
  });

  // 清理结果
  const content = result
    .trim()
    .replace(/^["']|["']$/g, '') // 移除引号
    .replace(/^评论[:：]\s*/i, '') // 移除"评论："前缀
    .trim();

  // 计算置信度（基于长度和内容）
  let confidence = 0.7;
  if (content.length >= 10 && content.length <= 150) confidence += 0.1;
  if (!content.includes('很棒') && !content.includes('太好了')) confidence += 0.1;
  if (content.includes('光影') || content.includes('构图') || content.includes('色彩')) confidence += 0.1;

  return {
    content,
    confidence: Math.min(1, confidence),
  };
}

/**
 * 批量生成备选评论
 */
export async function generateCommentCandidates(
  context: CommentGenerationContext,
  count: number = 3
): Promise<CommentGenerationResult[]> {
  const results: CommentGenerationResult[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const result = await generateComment(context);
      results.push(result);
    } catch (err) {
      console.error(`[ContentGenerator] Failed to generate candidate ${i + 1}:`, err);
    }
  }

  // 按置信度排序
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * 生成最佳评论（带质量过滤）
 */
export async function generateBestComment(
  context: CommentGenerationContext
): Promise<CommentGenerationResult | null> {
  const candidates = await generateCommentCandidates(context, 2);

  // 过滤低质量评论
  const qualified = candidates.filter((c) => c.confidence >= 0.6 && c.content.length >= 5);

  if (qualified.length === 0) {
    return null;
  }

  return qualified[0];
}
