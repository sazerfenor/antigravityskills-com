import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { CompileRequestSchema } from '@/shared/schemas/plo-schema';
import { compilePLO } from '@/shared/services/compiler';
import { getClientIP, checkRateLimit, RATE_LIMITS } from '@/shared/lib/rate-limit';
import { getUserInfo, isPaidUser } from '@/shared/models/user';
import { getRemainingCredits, consumeCredits } from '@/shared/models/credit';
import { handleApiError } from '@/shared/lib/api-error-handler';

/**
 * POST /api/logic/compile
 * 
 * Compiles a PLO (Prompt Logic Object) into a natural language prompt.
 * 
 * @see DOC/Artifacts/PRD_Handoff.md
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validation = CompileRequestSchema.safeParse(body);

    if (!validation.success) {
      return respErr(`Invalid request: ${validation.error.issues.map(e => e.message).join(', ')}`, 400);
    }

    // 🛡️ Security: Rate Limiting (Share quota with Intent/Build)
    const ip = getClientIP(request);
    const user = await getUserInfo().catch(() => null);

    let rateLimitConfig;
    let identifier;

    if (!user) {
      rateLimitConfig = RATE_LIMITS.VL_BUILD_GUEST;
      identifier = `ip:${ip}`;
    } else {
      const paid = await isPaidUser(user.id);
      rateLimitConfig = paid 
        ? RATE_LIMITS.VL_BUILD_PAID_USER 
        : RATE_LIMITS.VL_BUILD_FREE_USER;
      identifier = `user:${user.id}`;
    }

    const rateLimitResult = await checkRateLimit(
      `vl:build:${identifier}`,
      rateLimitConfig.limit,
      rateLimitConfig.window
    );

    if (!rateLimitResult.success) {
      if (!user) {
        return respErr('GUEST_BUILD_LIMIT', 429);
      }
      return respErr('Daily limit reached. Upgrade for more.', 429);
    }

    const { plo, skipCreditDeduction } = validation.data;

    // 💰 Credit Check (User only)
    // 方案 E: 如果 skipCreditDeduction=true（One-Click Generate 流程），跳过积分检查
    // 这样 0 积分用户也能预览 Prompt，只在真正生成图片时才需要积分
    if (user && !skipCreditDeduction) {
      const credits = await getRemainingCredits(user.id);
      if (credits < 1) {
        return respErr('Insufficient credits. 1 credit required.', 402);
      }
    }

    // 2. Call compiler service (returns bilingual prompts + highlights)
    const { native, english, detectedLang, highlights } = await compilePLO(plo);

    // 3. Return bilingual prompts with highlights
    const response = { native, english, detectedLang, highlights };

    // 💰 Deduct Credit (Async, non-blocking)
    // 方案 D: 如果 skipCreditDeduction=true（用户即将生成图片），则免费 compile
    // 因为图片生成费用已经足够覆盖 Prompt 生成成本
    if (user && !skipCreditDeduction) {
      // Don't await to keep latency low, but handle errors
      consumeCredits({
        userId: user.id,
        credits: 1,
        scene: 'logic_compile',
        description: 'VisionLogic Prompt Generation',
      }).catch(e => console.error('[API Logic Compile] Credit deduction failed:', e));
    }

    return respData(response);


  } catch (e: unknown) {
    return handleApiError(e, { feature: 'vision_logic' });
  }
}
