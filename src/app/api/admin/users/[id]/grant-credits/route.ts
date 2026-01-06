/**
 * Admin API: Grant Credits to User
 * POST /api/admin/users/[id]/grant-credits
 *
 * Security:
 * - Auth required
 * - CREDITS_WRITE permission required
 * - Rate limited: 10/minute per admin
 * - Amount validated: 1-10000
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS, hasPermission } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { getUserInfo, findUserById } from '@/shared/models/user';
import {
  grantCreditsForUser,
  CreditTransactionScene,
} from '@/shared/models/credit';

// Zod schema for input validation
const grantCreditsSchema = z.object({
  amount: z
    .number()
    .int()
    .min(1, 'Amount must be at least 1')
    .max(10000, 'Amount cannot exceed 10000'),
  reason: z.string().max(500).optional(),
  validDays: z.number().int().min(0).max(3650).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    // 1. Authentication check
    const admin = await getUserInfo();
    if (!admin) {
      return respErr('Unauthorized', 401);
    }

    // 2. Authorization check
    const hasCreditsWrite = await hasPermission(
      admin.id,
      PERMISSIONS.CREDITS_WRITE
    );
    if (!hasCreditsWrite) {
      console.warn(
        `[GrantCredits] Permission denied for user ${admin.id} (${admin.email})`
      );
      return respErr('Permission denied', 403);
    }

    // 3. Rate limiting (10 grants per minute per admin)
    const rateLimitResult = await checkRateLimit(
      `admin:grant-credits:${admin.id}`,
      10,
      60
    );
    if (!rateLimitResult.success) {
      console.warn(
        `[GrantCredits] Rate limit exceeded for admin ${admin.id}`
      );
      return respErr(
        'Too many requests. Please wait before granting more credits.',
        429
      );
    }

    // 4. Parse and validate input
    const body = await request.json();
    const parseResult = grantCreditsSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return respErr(firstError?.message || 'Invalid input', 400);
    }
    const { amount, reason, validDays } = parseResult.data;

    // 5. Verify target user exists
    const targetUser = await findUserById(targetUserId);
    if (!targetUser) {
      return respErr('User not found', 404);
    }

    // 6. Grant credits using unified function
    const result = await grantCreditsForUser({
      userId: targetUserId,
      userEmail: targetUser.email,
      credits: amount,
      validDays: validDays, // undefined means never expires
      description: reason || `Admin grant by ${admin.email}`,
      scene: CreditTransactionScene.GIFT,
      metadata: {
        source: 'admin_grant',
        grantedBy: admin.id,
        grantedByEmail: admin.email,
        reason: reason || null,
      },
    });

    if (!result) {
      return respErr('Failed to grant credits', 500);
    }

    console.log(
      `[GrantCredits] Admin ${admin.email} granted ${amount} credits to ${targetUser.email} (${targetUserId})`
    );

    return respData({
      success: true,
      creditId: result.id,
      transactionNo: result.transactionNo,
      amount,
      message: `Successfully granted ${amount} credits to ${targetUser.email}`,
    });
  } catch (error: any) {
    console.error('[GrantCredits] Error:', error);
    return respErr(error.message || 'Failed to grant credits');
  }
}
