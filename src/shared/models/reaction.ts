import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { reaction } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type Reaction = typeof reaction.$inferSelect;
export type NewReaction = typeof reaction.$inferInsert;

export enum ReactionType {
  LIKE = 'like',
  HEART = 'heart',
  LAUGH = 'laugh',
  CRY = 'cry',
  BOLT = 'bolt',
}

/**
 * Toggle reaction: if exists, delete; if not exists, create
 * @returns true if created, false if deleted
 */
export async function toggleReaction(
  userId: string,
  postId: string,
  type: ReactionType
): Promise<boolean> {
  console.log('[toggleReaction] Start:', { userId, postId, type });
  
  // Check if reaction exists
  const [existing] = await db()
    .select()
    .from(reaction)
    .where(
      and(
        eq(reaction.userId, userId),
        eq(reaction.postId, postId),
        eq(reaction.type, type)
      )
    );

  console.log('[toggleReaction] Existing reaction:', existing ? 'Found' : 'Not found');

  if (existing) {
    // Delete existing reaction
    await db()
      .delete(reaction)
      .where(eq(reaction.id, existing.id));
    console.log('[toggleReaction] Deleted reaction:', { id: existing.id });
    return false;
  } else {
    // Create new reaction
    const newId = getUuid();
    await db().insert(reaction).values({
      id: newId,
      userId,
      postId,
      type,
    });
    console.log('[toggleReaction] Created reaction:', { id: newId, userId, postId, type });
    return true;
  }
}

/**
 * Get user's reactions for a post
 */
export async function getUserReactionsForPost(
  userId: string,
  postId: string
): Promise<Reaction[]> {
  const result = await db()
    .select()
    .from(reaction)
    .where(
      and(
        eq(reaction.userId, userId),
        eq(reaction.postId, postId)
      )
    );

  return result;
}

/**
 * Get reaction counts for a post
 */
export async function getReactionCounts(postId: string): Promise<Record<string, number>> {
  const result = await db()
    .select()
    .from(reaction)
    .where(eq(reaction.postId, postId));

  const counts: Record<string, number> = {};
  result.forEach((r: any) => {
    counts[r.type] = (counts[r.type] || 0) + 1;
  });

  return counts;
}

/**
 * Get total reaction count for a post
 */
export async function getTotalReactionCount(postId: string): Promise<number> {
  const result = await db()
    .select()
    .from(reaction)
    .where(eq(reaction.postId, postId));

  return result.length;
}
