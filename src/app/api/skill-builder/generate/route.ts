/**
 * Skill Builder Generate API
 *
 * POST /api/skill-builder/generate
 * 一键生成 Skill（返回 JSON，不生成 ZIP）
 */

import { z } from 'zod';
import { respData, respErr } from '@/shared/lib/resp';
import { validateRequest } from '@/shared/lib/zod';
import { checkRateLimit, getClientIP } from '@/shared/lib/rate-limit';
import { generateSkill } from '@/features/skill-builder/services/orchestrator';
import type { GenerateResponse } from '@/features/skill-builder/types';

// 请求 Schema
const generateSchema = z.object({
  input: z.string().min(10, 'Input must be at least 10 characters').max(50000, 'Input too long'),
});

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. 限流检查
    const ip = getClientIP(request);
    const { success } = await checkRateLimit(`skill-builder:${ip}`, 10, 60); // 每分钟 10 次
    if (!success) {
      return respErr('Too many requests. Please wait a moment.', 429);
    }

    // 2. 参数校验
    const validation = await validateRequest(request, generateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { input } = validation.data;

    // 3. 调用编排器生成 Skill
    console.log('[generate API] Starting skill generation...');
    const result = await generateSkill(input);
    console.log('[generate API] Generation complete:', {
      name: result.skill.name,
      passed: result.validation.passed,
      score: result.validation.score,
      iterations: result.iterations,
    });

    // 4. 返回结果
    const response: GenerateResponse = {
      success: true,
      data: result,
    };

    return respData(response);
  } catch (e: any) {
    console.error('[generate API] Error:', e);

    const response: GenerateResponse = {
      success: false,
      error: e.message || 'Failed to generate skill',
    };

    return respErr(response.error!, 500);
  }
}
