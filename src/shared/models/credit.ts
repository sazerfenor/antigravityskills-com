import { and, asc, count, desc, eq, gt, isNull, or, sum } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit } from '@/config/db/schema';
import { PaymentType } from '@/extensions/payment';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import { Order } from './order';
import { appendUserToResult, getUserByUserIds, User } from './user';

export type Credit = typeof credit.$inferSelect & {
  user?: User;
};
export type NewCredit = typeof credit.$inferInsert;
export type UpdateCredit = Partial<
  Omit<NewCredit, 'id' | 'transactionNo' | 'createdAt'>
>;

export enum CreditStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
  REVOKED = 'revoked', // 🚨 因退款/违规被撤销，用于财务审计
}

export enum CreditTransactionType {
  GRANT = 'grant', // grant credit
  CONSUME = 'consume', // consume credit
}

export enum CreditTransactionScene {
  PAYMENT = 'payment', // payment
  SUBSCRIPTION = 'subscription', // subscription
  RENEWAL = 'renewal', // renewal
  GIFT = 'gift', // gift
  AWARD = 'award', // award
}

// Calculate credit expiration time based on order and subscription info
export function calculateCreditExpirationTime({
  creditsValidDays,
  currentPeriodEnd,
}: {
  creditsValidDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  const now = new Date();

  // Check if credits should never expire
  if (!creditsValidDays || creditsValidDays <= 0) {
    // never expires
    return null;
  }

  const expiresAt = new Date();

  if (currentPeriodEnd) {
    // For subscription: credits expire at the end of current period
    expiresAt.setTime(currentPeriodEnd.getTime());
  } else {
    // For one-time payment: use configured validity days
    expiresAt.setDate(now.getDate() + creditsValidDays);
  }

  return expiresAt;
}

// Helper function to create expiration condition for queries
export function createExpirationCondition() {
  const currentTime = new Date();
  // Credit is valid if: expires_at IS NULL OR expires_at > current_time
  return or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime));
}

// create credit
export async function createCredit(newCredit: NewCredit) {
  const [result] = await db().insert(credit).values(newCredit).returning();
  return result;
}

// get credits
export async function getCredits({
  userId,
  status,
  transactionType,
  getUser = false,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
  getUser?: boolean;
  page?: number;
  limit?: number;
}): Promise<Credit[]> {
  const result = await db()
    .select()
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    )
    .orderBy(desc(credit.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

// get credits count
export async function getCreditsCount({
  userId,
  status,
  transactionType,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    );

  return result?.count || 0;
}

// consume credits
export async function consumeCredits({
  userId,
  credits,
  scene,
  description,
  metadata,
  tx: externalTx,
}: {
  userId: string;
  credits: number; // credits to consume
  scene?: string;
  description?: string;
  metadata?: string;
  tx?: any; // 可选的外部事务，用于避免嵌套事务冲突
}) {
  const currentTime = new Date();

  // 事务逻辑抽取为独立函数
  const executeConsumeLogic = async (tx: any) => {
    // 1. check credits balance
    const [creditsBalance] = await tx
      .select({
        total: sum(credit.remainingCredits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          or(
            isNull(credit.expiresAt), // Never expires
            gt(credit.expiresAt, currentTime) // Not yet expired
          )
        )
      );

    // balance is not enough
    if (
      !creditsBalance ||
      !creditsBalance.total ||
      parseInt(creditsBalance.total) < credits
    ) {
      throw new Error(
        `Insufficient credits, ${creditsBalance?.total || 0} < ${credits}`
      );
    }

    // 2. get available credits, FIFO queue with expiresAt, batch query
    let remainingToConsume = credits; // remaining credits to consume

    // only deal with 10000 credit grant records
    let batchNo = 1; // batch no
    const maxBatchNo = 10; // max batch no
    const batchSize = 1000; // batch size
    const consumedItems: any[] = [];

    while (remainingToConsume > 0) {
      // get batch credits
      const batchCredits = await tx
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE),
            gt(credit.remainingCredits, 0),
            or(
              isNull(credit.expiresAt), // Never expires
              gt(credit.expiresAt, currentTime) // Not yet expired
            )
          )
        )
        .orderBy(
          // FIFO queue: expired credits first, then by expiration date
          // NULL values (never expires) will be ordered last
          asc(credit.expiresAt)
        )
        .limit(batchSize) // batch size
        .offset((batchNo - 1) * batchSize) // offset
        .for('update'); // lock for update

      // no more credits
      if (batchCredits?.length === 0) {
        break;
      }

      // consume credits for each item
      for (const item of batchCredits) {
        // no need to consume more
        if (remainingToConsume <= 0) {
          break;
        }
        const toConsume = Math.min(remainingToConsume, item.remainingCredits);

        // update remaining credits
        await tx
          .update(credit)
          .set({ remainingCredits: item.remainingCredits - toConsume })
          .where(eq(credit.id, item.id));

        // update consumed items
        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          expiresAt: item.expiresAt,
          creditsToConsume: remainingToConsume,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: item.remainingCredits - toConsume,
          batchSize: batchSize,
          batchNo: batchNo,
        });

        batchNo += 1;
        remainingToConsume -= toConsume;

        // if too many batches, throw error
        if (batchNo > maxBatchNo) {
          throw new Error(`Too many batches: ${batchNo} > ${maxBatchNo}`);
        }
      }
    }

    // 3. create consumed credit
    const consumedCredit: NewCredit = {
      id: getUuid(),
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.CONSUME,
      transactionScene: scene,
      userId: userId,
      status: CreditStatus.ACTIVE,
      description: description,
      credits: -credits,
      consumedDetail: JSON.stringify(consumedItems),
      metadata: metadata,
    };
    await tx.insert(credit).values(consumedCredit);

    return consumedCredit;
  };

  // 如果传入了外部事务，直接使用；否则创建新事务
  if (externalTx) {
    return executeConsumeLogic(externalTx);
  }
  return db().transaction(executeConsumeLogic);
}

// get remaining credits
export async function getRemainingCredits(userId: string): Promise<number> {
  const currentTime = new Date();

  const [result] = await db()
    .select({
      total: sum(credit.remainingCredits),
    })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.remainingCredits, 0),
        or(
          isNull(credit.expiresAt), // Never expires
          gt(credit.expiresAt, currentTime) // Not yet expired
        )
      )
    );

  return parseInt(result?.total || '0');
}

/**
 * Batch get remaining credits for multiple users (optimized for lists)
 * Returns a map of userId -> credits
 */
export async function getRemainingCreditsBatch(
  userIds: string[]
): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};

  try {
    const currentTime = new Date();
    const { inArray } = await import('drizzle-orm');

    const results = await db()
      .select({
        userId: credit.userId,
        total: sum(credit.remainingCredits),
      })
      .from(credit)
      .where(
        and(
          inArray(credit.userId, userIds),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          or(
            isNull(credit.expiresAt), // Never expires
            gt(credit.expiresAt, currentTime) // Not yet expired
          )
        )
      )
      .groupBy(credit.userId);

    // Convert to map
    const creditsByUser: Record<string, number> = {};
    for (const row of results) {
      creditsByUser[row.userId] = parseInt(row.total || '0');
    }

    return creditsByUser;
  } catch (error: any) {
    console.error('[getRemainingCreditsBatch] Query failed:', error.message);
    return {};
  }
}

// ============================================================================
// Credit Granting Functions
// ============================================================================

/**
 * Grant credits to a user - unified entry point for all credit granting scenarios
 *
 * This function consolidates credit granting logic to avoid code duplication across:
 * - Payment success (one-time purchase)
 * - Subscription renewal
 * - Admin manual grant
 * - New user welcome bonus
 *
 * @param params - Credit granting parameters
 * @returns Created credit record or null if credits <= 0
 */
export const grantCreditsForUser = async ({
  userId,
  userEmail,
  credits,
  validDays,
  description,
  scene = CreditTransactionScene.GIFT,
  orderNo,
  subscriptionNo,
  currentPeriodEnd,
  metadata,
}: {
  userId: string;
  userEmail: string;
  credits: number;
  validDays?: number;
  description?: string;
  scene?: CreditTransactionScene;
  orderNo?: string;
  subscriptionNo?: string;
  currentPeriodEnd?: Date;
  metadata?: Record<string, unknown>;
}): Promise<Credit | null> => {
  if (credits <= 0) return null;

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: validDays || 0,
    currentPeriodEnd,
  });

  const newCredit: NewCredit = {
    id: getUuid(),
    userId,
    userEmail,
    orderNo: orderNo || '',
    subscriptionNo: subscriptionNo || '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: scene,
    credits,
    remainingCredits: credits,
    description: description || 'Grant credits',
    expiresAt,
    status: CreditStatus.ACTIVE,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  };

  const result = await createCredit(newCredit);

  console.log(
    `[Credit] Granted ${credits} credits to ${userEmail} ` +
    `(scene: ${scene}, expires: ${expiresAt?.toISOString() || 'never'})`
  );

  return result;
};

/**
 * Grant initial credits for newly registered users
 *
 * Reads configuration from database:
 * - initial_credits_enabled: 'true' to enable
 * - initial_credits_amount: number of credits to grant
 * - initial_credits_valid_days: expiration in days (0 = never expires)
 * - initial_credits_description: custom description
 *
 * @param user - User object with id and email
 * @returns Created credit record or null if disabled/zero credits
 */
export const grantCreditsForNewUser = async (user: {
  id: string;
  email: string;
}): Promise<Credit | null> => {
  // Dynamic import to avoid circular dependency
  const { getAllConfigs } = await import('./config');
  const configs = await getAllConfigs();

  // Check if initial credits feature is enabled
  if (configs.initial_credits_enabled !== 'true') {
    return null;
  }

  const credits = parseInt(configs.initial_credits_amount as string) || 0;
  if (credits <= 0) return null;

  const validDays = parseInt(configs.initial_credits_valid_days as string) || 0;
  const description =
    (configs.initial_credits_description as string) || 'Welcome bonus';

  const result = await grantCreditsForUser({
    userId: user.id,
    userEmail: user.email,
    credits,
    validDays,
    description,
    scene: CreditTransactionScene.GIFT,
    metadata: {
      source: 'new_user_registration',
      registeredAt: new Date().toISOString(),
    },
  });

  if (result) {
    console.log(
      `[Credit] New user welcome bonus: ${credits} credits granted to ${user.email}`
    );
  }

  return result;
};

// ============================================================================
// Credit Revocation Functions
// ============================================================================

/**
 * Revoke credits for a refunded order
 * Used when payment is refunded to prevent "money back but credits kept" scenario
 *
 * @param orderNo - The order number to revoke credits for
 * @returns Object with revoked count and details
 */
export async function revokeCreditsForOrder(orderNo: string): Promise<{
  success: boolean;
  revokedCount: number;
  totalCreditsRevoked: number;
  message: string;
}> {
  if (!orderNo) {
    return {
      success: false,
      revokedCount: 0,
      totalCreditsRevoked: 0,
      message: 'Order number is required',
    };
  }

  try {
    const result = await db().transaction(async (tx: any) => {
      // 1. Find all active credits granted for this order
      const creditsToRevoke = await tx
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.orderNo, orderNo),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE)
          )
        );

      if (creditsToRevoke.length === 0) {
        console.log(`[Credit] No active credits found to revoke for order ${orderNo}`);
        return {
          revokedCount: 0,
          totalCreditsRevoked: 0,
        };
      }

      // 2. Calculate total credits being revoked (for logging)
      const totalRemaining = creditsToRevoke.reduce(
        (sum: number, c: any) => sum + (c.remainingCredits || 0),
        0
      );
      const totalOriginal = creditsToRevoke.reduce(
        (sum: number, c: any) => sum + (c.credits || 0),
        0
      );

      // 3. Revoke all credits - set status to REVOKED and clear remaining credits
      await tx
        .update(credit)
        .set({
          status: CreditStatus.REVOKED,
          remainingCredits: 0, // 🚨 Force to 0 to prevent concurrent deduction race condition
        })
        .where(
          and(
            eq(credit.orderNo, orderNo),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE)
          )
        );

      console.warn(
        `[Credit] REVOKED credits for Order ${orderNo}. ` +
        `Records: ${creditsToRevoke.length}, ` +
        `Original: ${totalOriginal}, ` +
        `Remaining revoked: ${totalRemaining}`
      );

      return {
        revokedCount: creditsToRevoke.length,
        totalCreditsRevoked: totalRemaining,
      };
    });

    return {
      success: true,
      ...result,
      message: result.revokedCount > 0
        ? `Revoked ${result.totalCreditsRevoked} credits from ${result.revokedCount} records`
        : 'No active credits to revoke',
    };
  } catch (error: any) {
    console.error(`[Credit] Failed to revoke credits for order ${orderNo}:`, error.message);
    return {
      success: false,
      revokedCount: 0,
      totalCreditsRevoked: 0,
      message: `Revocation failed: ${error.message}`,
    };
  }
}
