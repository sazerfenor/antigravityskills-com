/**
 * 虚拟人格发帖创建服务
 *
 * @description 处理虚拟人格的自动发帖流程
 *
 * 流程：
 * 1. 从 Prompt 队列获取待发布的 Prompt
 * 2. 匹配合适的虚拟人格
 * 3. 生成图片
 * 4. 创建社区帖子
 * 5. 触发 SEO 生成
 */

import { v4 as uuidv4 } from 'uuid';

import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema.sqlite';
import { getAIService } from '@/shared/services/ai';
import {
  getMatchingPromptForCategory,
  assignPromptToPersona,
  markPromptProcessing,
  markPromptCompleted,
  markPromptFailed,
} from '@/shared/models/prompt_queue';
import {
  updateVirtualPersonaById,
  type VirtualPersona,
} from '@/shared/models/virtual_persona';
import {
  updatePostScheduleById,
  createPostSchedule,
  type VirtualPostSchedule,
} from '@/shared/models/virtual_post_schedule';
import { consumePostingToken } from './token-scheduler';
import type { PersonaCategory } from '@/shared/types/virtual-persona';

// ============================================
// 类型定义
// ============================================

export interface PostCreationResult {
  success: boolean;
  postId?: string;
  imageUrl?: string;
  error?: string;
  step?: string;
}

export interface PostCreationContext {
  persona: VirtualPersona;
  prompt: string;
  category?: PersonaCategory;
  scheduleId?: string;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 清理 Prompt 中的 XML 标签
 */
export function cleanPromptXmlTags(prompt: string): string {
  return (prompt || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 生成帖子标题（从 Prompt 提取）
 */
export function generateTitleFromPrompt(prompt: string): string {
  const cleaned = cleanPromptXmlTags(prompt);

  // 取前 50 个字符作为标题
  if (cleaned.length <= 50) {
    return cleaned;
  }

  // 尝试在标点或空格处截断
  const truncated = cleaned.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastComma = truncated.lastIndexOf(',');
  const cutPoint = Math.max(lastSpace, lastComma);

  if (cutPoint > 20) {
    return truncated.substring(0, cutPoint) + '...';
  }

  return truncated + '...';
}

// ============================================
// 图片生成
// ============================================

/**
 * 使用 AI 生成图片
 */
export async function generateImageForPost(
  prompt: string,
  category?: PersonaCategory
): Promise<string> {
  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini');

  if (!geminiProvider?.generate) {
    throw new Error('Gemini provider not available for image generation');
  }

  // 调用图片生成
  const result = await geminiProvider.generate({
    params: {
      mediaType: 'image' as any,
      model: 'gemini-3-pro-image-preview',
      prompt: cleanPromptXmlTags(prompt),
      options: {
        aspectRatio: '1:1',
      },
    },
  });

  // 处理返回结果
  if (result.taskInfo?.images?.[0]?.imageUrl) {
    return result.taskInfo.images[0].imageUrl;
  }

  throw new Error('No image URL in generation result');
}

// ============================================
// 帖子创建
// ============================================

/**
 * 创建社区帖子
 */
export async function createCommunityPost(params: {
  userId: string;
  imageUrl: string;
  prompt: string;
  title?: string;
  category?: PersonaCategory;
  model?: string;
}): Promise<string> {
  const postId = uuidv4();
  const now = new Date();
  const cleanPrompt = cleanPromptXmlTags(params.prompt);
  const title = params.title || generateTitleFromPrompt(params.prompt);

  await db().insert(communityPost).values({
    id: postId,
    userId: params.userId,
    imageUrl: params.imageUrl,
    prompt: cleanPrompt,
    title,
    category: params.category || 'photography',
    model: params.model || 'gemini-3-pro-image-preview',
    status: 'published', // 虚拟用户帖子直接发布
    viewCount: 0,
    likeCount: 0,
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  });

  return postId;
}

// ============================================
// 完整发帖流程
// ============================================

/**
 * 执行单个人格的发帖流程
 *
 * @param persona 虚拟人格
 * @param prompt 可选的指定 Prompt（否则从队列获取）
 */
export async function executePostingForPersona(
  persona: VirtualPersona,
  prompt?: string
): Promise<PostCreationResult> {
  const category = persona.primaryCategory as PersonaCategory;
  let promptText = prompt;
  let promptQueueId: string | undefined;

  try {
    // 1. 如果没有指定 Prompt，从队列获取
    if (!promptText) {
      const queueItem = await getMatchingPromptForCategory(category);
      if (!queueItem) {
        return { success: false, error: 'No prompts available in queue', step: 'get_prompt' };
      }

      promptQueueId = queueItem.id;
      promptText = queueItem.prompt;

      // 标记为已分配
      await assignPromptToPersona(queueItem.id, persona.id);
      await markPromptProcessing(queueItem.id);
    }

    // 2. 生成图片
    let imageUrl: string;
    try {
      imageUrl = await generateImageForPost(promptText, category);
    } catch (imgErr: any) {
      if (promptQueueId) {
        await markPromptFailed(promptQueueId, `Image generation failed: ${imgErr.message}`);
      }
      return { success: false, error: imgErr.message, step: 'generate_image' };
    }

    // 3. 创建帖子
    let postId: string;
    try {
      postId = await createCommunityPost({
        userId: persona.userId,
        imageUrl,
        prompt: promptText,
        category,
      });
    } catch (postErr: any) {
      if (promptQueueId) {
        await markPromptFailed(promptQueueId, `Post creation failed: ${postErr.message}`);
      }
      return { success: false, error: postErr.message, step: 'create_post', imageUrl };
    }

    // 4. 消耗发帖令牌
    await consumePostingToken(persona.id);

    // 5. 更新 Prompt 队列状态
    if (promptQueueId) {
      await markPromptCompleted(promptQueueId, postId);
    }

    // 6. 更新人格统计
    await updateVirtualPersonaById(persona.id, {
      lastActiveAt: new Date(),
      totalPostsMade: (persona.totalPostsMade ?? 0) + 1,
    });

    return {
      success: true,
      postId,
      imageUrl,
    };
  } catch (err: any) {
    if (promptQueueId) {
      await markPromptFailed(promptQueueId, err.message);
    }
    return { success: false, error: err.message, step: 'unknown' };
  }
}

/**
 * 批量执行发帖（供 Cron 调用）
 *
 * @param personas 准备发帖的人格列表
 * @param maxPosts 本次最多发布数量（防止超时）
 */
export async function executeBatchPosting(
  personas: VirtualPersona[],
  maxPosts: number = 5
): Promise<{
  success: number;
  failed: number;
  results: PostCreationResult[];
}> {
  const results: PostCreationResult[] = [];
  let success = 0;
  let failed = 0;

  // 限制本次处理数量
  const toProcess = personas.slice(0, maxPosts);

  for (const persona of toProcess) {
    const result = await executePostingForPersona(persona);
    results.push(result);

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    // 避免过快请求
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { success, failed, results };
}
