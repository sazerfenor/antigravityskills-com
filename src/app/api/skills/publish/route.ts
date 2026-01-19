/**
 * POST /api/skills/publish
 *
 * 将 Antigravity Skill 发布为 communityPost 落地页
 *
 * 工作流 Agent 调用此 API，将生成的 SEO 字段写入数据库
 */

import { z } from 'zod';

import { respData, respErr } from '@/shared/lib/resp';
import { checkRateLimit, getClientIP } from '@/shared/lib/rate-limit';
import { logError } from '@/shared/lib/error-logger';
import {
  publishSkillToPost,
  type PublishSkillRequest,
} from '@/shared/services/skill-publisher';

// ============================================
// 请求验证 Schema
// ============================================

const FaqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const ContentSectionSchema = z.object({
  type: z.string(),
  title: z.string(),
  content: z.string(),
});

const PublishSkillSchema = z.object({
  skillId: z.string().min(1, 'skillId is required'),

  // SEO 字段 (Agent 必须生成)
  seoTitle: z.string().min(30, 'seoTitle must be at least 30 characters').max(60, 'seoTitle must be at most 60 characters'),
  seoDescription: z.string().min(120, 'seoDescription must be at least 120 characters').max(160, 'seoDescription must be at most 160 characters'),
  seoKeywords: z.string().optional(),
  h1Title: z.string().min(20, 'h1Title must be at least 20 characters').max(100, 'h1Title must be at most 100 characters'),
  contentIntro: z.string().min(50, 'contentIntro must be at least 50 characters'),

  // 可选富内容
  faqItems: z.array(FaqItemSchema).optional(),
  contentSections: z.array(ContentSectionSchema).optional(),
  visualTags: z.array(z.string()).optional(),

  // 覆盖选项
  imageUrl: z.string().url().optional(),
  userId: z.string().optional(),
});

// ============================================
// POST Handler
// ============================================

export async function POST(request: Request) {
  try {
    // 1. 限流检查
    const ip = getClientIP(request);
    const { success: rateLimitOk } = await checkRateLimit(`skill-publish:${ip}`, 10, 60);
    if (!rateLimitOk) {
      return respErr('Too many requests. Please try again later.', 429);
    }

    // 2. 解析请求体
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return respErr('Invalid JSON body', 400);
    }

    // 3. 验证请求参数
    const validation = PublishSkillSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return respErr(`Validation failed: ${errors.join('; ')}`, 400);
    }

    const data = validation.data as PublishSkillRequest;

    // 4. 调用发布服务
    const result = await publishSkillToPost(data);

    // 5. 返回结果
    if (result.success) {
      return respData({
        postId: result.postId,
        seoSlug: result.seoSlug,
        url: result.url,
      });
    } else {
      // 根据错误类型返回不同状态码
      const statusMap: Record<string, number> = {
        SKILL_NOT_FOUND: 404,
        VALIDATION_ERROR: 400,
        SLUG_CONFLICT: 409,
        DATABASE_ERROR: 500,
      };
      const errorResult = result as { success: false; error: string; code: string };
      const status = statusMap[errorResult.code] || 500;
      return respErr(errorResult.error, status);
    }
  } catch (e: any) {
    await logError(e, { context: 'api:skills:publish' });
    return respErr(e.message || 'Internal server error', 500);
  }
}

// ============================================
// OPTIONS Handler (CORS)
// ============================================

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
