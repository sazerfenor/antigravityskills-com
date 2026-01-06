import { NextRequest } from 'next/server';
import { z } from 'zod';
import { respData, respErr } from '@/shared/lib/resp';
import { generateCustomFieldsBatch } from '@/shared/services/custom-field-generator';
import { getUserInfo, isPaidUser } from '@/shared/models/user';
import { getRemainingCredits, consumeCredits } from '@/shared/models/credit';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/shared/lib/rate-limit';
import { handleApiError } from '@/shared/lib/api-error-handler';

/**
 * POST /api/logic/generate-field
 *
 * Generates custom form fields based on user-provided dimension names.
 * Uses AI to generate appropriate options for each dimension.
 * Costs 1 credit per batch (regardless of dimension count).
 *
 * Request body:
 *   - dimensions: string[] (required) - Array of dimension names, e.g., ["Background", "Lighting"]
 *   - context: string (optional) - Current scene context, e.g., "portrait photography"
 *   - existingFields: Array<{id, label, type}> (optional) - Existing fields for duplicate check
 */

const CREDIT_COST = 1; // 1 credit per batch (fixed cost)
const MAX_DIMENSIONS = 10; // Maximum dimensions per request

const GenerateFieldSchema = z.object({
  dimensions: z.array(z.string().min(1).max(50)).min(1).max(MAX_DIMENSIONS),
  context: z.string().optional().default(''),
  existingFields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.string(),
  })).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = getClientIP(request);
    const user = await getUserInfo().catch(() => null);

    // Guest users cannot use this feature
    if (!user) {
      return respErr('LOGIN_REQUIRED', 401);
    }

    const paid = await isPaidUser(user.id);
    const rateLimitConfig = paid
      ? { limit: 50, window: 86400 } // Paid: 50/day
      : { limit: 20, window: 86400 }; // Free: 20/day

    const rateLimitResult = await checkRateLimit(
      `vl:generate-field:user:${user.id}`,
      rateLimitConfig.limit,
      rateLimitConfig.window
    );

    if (!rateLimitResult.success) {
      return respErr('Daily field generation limit reached.', 429);
    }

    // Credit Check
    const credits = await getRemainingCredits(user.id);
    if (credits < CREDIT_COST) {
      return respErr(`Insufficient credits. ${CREDIT_COST} credit required.`, 402);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = GenerateFieldSchema.safeParse(body);

    if (!validation.success) {
      return respErr(
        `Invalid request: ${validation.error.issues.map(e => e.message).join(', ')}`,
        400
      );
    }

    const { dimensions, context, existingFields } = validation.data;

    console.log(`[API Generate Field] dimensions=${dimensions.join(',')}, context="${context}", userId="${user.id}"`);

    // Call AI to generate fields (batch)
    const result = await generateCustomFieldsBatch(
      dimensions,
      context,
      existingFields
    );

    // Deduct Credit (Async, non-blocking) - 1 credit per batch
    consumeCredits({
      userId: user.id,
      credits: CREDIT_COST,
      scene: 'logic_generate_field',
      description: `VisionLogic Custom Dimensions: ${dimensions.join(', ')}`,
    }).catch(e => console.error('[API Generate Field] Credit deduction failed:', e));

    return respData({
      results: result.results,
      totalSuccess: result.totalSuccess,
      totalFailed: result.totalFailed,
    });

  } catch (e: unknown) {
    return handleApiError(e, { feature: 'vision_logic' });
  }
}
