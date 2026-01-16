/**
 * POST /api/skills/convert
 * 将 Claude Skills 或自然语言想法转换为 Antigravity Skills
 */

import { type NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { validateRequest } from '@/shared/lib/zod';
import { checkRateLimit, getClientIP } from '@/shared/lib/rate-limit';
import { getUserInfo } from '@/shared/models/user';
import { handleApiError } from '@/shared/lib/api-error-handler';
import { convertSkillToAntigravity } from '@/shared/services/skill-converter';
import { skillConvertSchema } from '@/shared/schemas/skill-schemas';

export async function POST(request: NextRequest) {
  try {
    // 1. 参数校验
    const validation = await validateRequest(request, skillConvertSchema);
    if (!validation.success) return validation.response;

    const { input, sourceType, saveToDatabase } = validation.data;

    // 2. 限流（游客 5次/小时，登录用户 20次/小时）
    const ip = getClientIP(request);
    const user = await getUserInfo().catch(() => null);

    const identifier = user ? `user:${user.id}` : `ip:${ip}`;
    const limit = user ? 20 : 5;
    const window = 3600; // 1 hour

    const rateLimitResult = await checkRateLimit(
      `skill:convert:${identifier}`,
      limit,
      window
    );

    if (!rateLimitResult.success) {
      return respErr(
        `Rate limit exceeded. Please try again later. ${user ? 'Limit: 20/hour' : 'Limit: 5/hour (login for more)'}`,
        429
      );
    }

    // 3. 调用转换服务
    const result = await convertSkillToAntigravity({
      input,
      sourceType,
      userId: user?.id,
      saveToDatabase,
    });

    return respData(result);
  } catch (e: unknown) {
    return handleApiError(e, { feature: 'skill_converter' });
  }
}
