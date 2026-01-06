import { and, count, desc, eq, sql, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import { communityPost, aiTask } from '@/config/db/schema';
import { appendUserToResult, User } from '@/shared/models/user';
import { getUuid } from '@/shared/lib/hash';
import { envConfigs } from '@/config';

export type CommunityPost = typeof communityPost.$inferSelect & {
  user?: User;
};
export type NewCommunityPost = typeof communityPost.$inferInsert;
export type UpdateCommunityPost = Partial<Omit<NewCommunityPost, 'id' | 'createdAt'>>;

export enum CommunityPostStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  PRIVATE = 'private',
}

/**
 * Create a new community post
 */
export async function createCommunityPost(newPost: NewCommunityPost): Promise<CommunityPost> {
  const postData = newPost.id ? newPost : { ...newPost, id: getUuid() };
  const [result] = await db().insert(communityPost).values(postData).returning();

  return result;
}

/**
 * Find community post by ID
 */
export async function findCommunityPostById(
  id: string,
  getUser = false
): Promise<CommunityPost | undefined> {
  const [result] = await db()
    .select()
    .from(communityPost)
    .where(eq(communityPost.id, id));

  if (!result) {
    return undefined;
  }

  if (getUser) {
    const [withUser] = await appendUserToResult([result]);
    return withUser;
  }

  return result;
}

/**
 * Find community post by AI task ID
 */
export async function findCommunityPostByTaskId(
  aiTaskId: string
): Promise<CommunityPost | undefined> {
  const [result] = await db()
    .select()
    .from(communityPost)
    .where(eq(communityPost.aiTaskId, aiTaskId));

  return result;
}

/**
 * Update community post by ID
 */
export async function updateCommunityPostById(
  id: string,
  updateData: UpdateCommunityPost
): Promise<CommunityPost> {
  const [result] = await db()
    .update(communityPost)
    .set(updateData)
    .where(eq(communityPost.id, id))
    .returning();

  return result;
}

/**
 * Get community posts count
 */
export async function getCommunityPostsCount({
  userId,
  status,
  model,
}: {
  userId?: string;
  status?: CommunityPostStatus | CommunityPostStatus[];
  model?: string;
}): Promise<number> {
  const statusArray = Array.isArray(status) ? status : status ? [status] : undefined;

  const [result] = await db()
    .select({ count: count() })
    .from(communityPost)
    .where(
      and(
        userId ? eq(communityPost.userId, userId) : undefined,
        statusArray ? inArray(communityPost.status, statusArray) : undefined,
        model ? eq(communityPost.model, model) : undefined
      )
    );

  return result?.count || 0;
}

/**
 * Get community posts list (OPTIMIZED: uses indexed likeCount field)
 */
export async function getCommunityPosts({
  userId,
  status,
  model,
  sort = 'newest',
  page = 1,
  limit = 30,
  getUser = false,
}: {
  userId?: string;
  status?: CommunityPostStatus | CommunityPostStatus[];
  model?: string;
  sort?: 'newest' | 'trending' | 'weighted';
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<CommunityPost[]> {
  const statusArray = Array.isArray(status) ? status : status ? [status] : undefined;

  // Determine order by
  let orderBy;
  if (sort === 'weighted') {
    // 🆕 加权排序算法
    // Score = EngagementScore + FreshnessBonus
    // EngagementScore = (likes × 3) + (views × 0.1)
    // FreshnessBonus = max(0, 100 - hoursAge × 0.5)
    const isSqlite = ['sqlite', 'turso', 'd1'].includes(envConfigs.database_provider);

    if (isSqlite) {
      // SQLite 语法
      orderBy = [
        sql`(
          COALESCE(${communityPost.likeCount}, 0) * 3 +
          COALESCE(${communityPost.viewCount}, 0) * 0.1 +
          MAX(0, 100 - (strftime('%s', 'now') - strftime('%s', COALESCE(${communityPost.publishedAt}, ${communityPost.createdAt})))/3600.0 * 0.5)
        ) DESC`,
      ];
    } else {
      // PostgreSQL 语法
      orderBy = [
        sql`(
          COALESCE(${communityPost.likeCount}, 0) * 3 +
          COALESCE(${communityPost.viewCount}, 0) * 0.1 +
          GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - COALESCE(${communityPost.publishedAt}, ${communityPost.createdAt})))/3600 * 0.5)
        ) DESC`,
      ];
    }
  } else if (sort === 'trending') {
    orderBy = [desc(communityPost.likeCount), desc(communityPost.viewCount)];
  } else {
    orderBy = [desc(communityPost.publishedAt), desc(communityPost.createdAt)];
  }

  // Optimized query: use indexed likeCount field directly (no JOIN!)
  const result = await db()
    .select({
      id: communityPost.id,
      userId: communityPost.userId,
      aiTaskId: communityPost.aiTaskId,
      imageUrl: communityPost.imageUrl,
      thumbnailUrl: communityPost.thumbnailUrl, // 🆕 缩略图
      prompt: communityPost.prompt,
      model: communityPost.model,
      params: communityPost.params,
      aspectRatio: communityPost.aspectRatio,
      title: communityPost.title,
      description: communityPost.description,
      status: communityPost.status,
      viewCount: communityPost.viewCount,
      likeCount: communityPost.likeCount, // Direct field read (FAST!)
      publishedAt: communityPost.publishedAt,
      createdAt: communityPost.createdAt,
      updatedAt: communityPost.updatedAt,
      // SEO fields
      seoSlug: communityPost.seoSlug,
      seoTitle: communityPost.seoTitle,
      seoDescription: communityPost.seoDescription,
      seoKeywords: communityPost.seoKeywords,
      seoSlugKeywords: communityPost.seoSlugKeywords,
      contentIntro: communityPost.contentIntro,
      promptBreakdown: communityPost.promptBreakdown,
      imageAlt: communityPost.imageAlt,
      dynamicHeaders: communityPost.dynamicHeaders,
      faqItems: communityPost.faqItems,
      useCases: communityPost.useCases,
      visualTags: communityPost.visualTags,
      relatedPosts: communityPost.relatedPosts,
      expertCommentary: communityPost.expertCommentary,
    })
    .from(communityPost)
    .where(
      and(
        userId ? eq(communityPost.userId, userId) : undefined,
        statusArray ? inArray(communityPost.status, statusArray) : undefined,
        model ? eq(communityPost.model, model) : undefined
      )
    )
    .orderBy(...orderBy)
    .limit(limit)
    .offset((page - 1) * limit);

  console.log('[getCommunityPosts] Fetched posts (optimized):', {
    count: result.length,
  });

  if (getUser) {
    return appendUserToResult(result) as unknown as CommunityPost[];
  }

  return result as unknown as CommunityPost[];
}

/**
 * Get a single community post by ID with REAL-TIME like count
 */
export async function getCommunityPostById(
  postId: string,
  { getUser = false }: { getUser?: boolean } = {}
): Promise<CommunityPost | null> {
  // Import reaction schema
  const { reaction } = await import('@/config/db/schema');

  const result = await db()
    .select({
      id: communityPost.id,
      userId: communityPost.userId,
      aiTaskId: communityPost.aiTaskId,
      imageUrl: communityPost.imageUrl,
      thumbnailUrl: communityPost.thumbnailUrl, // 🆕 缩略图
      prompt: communityPost.prompt,
      model: communityPost.model,
      params: communityPost.params,
      aspectRatio: communityPost.aspectRatio,
      title: communityPost.title,
      description: communityPost.description,
      status: communityPost.status,
      viewCount: communityPost.viewCount,
      downloadCount: communityPost.downloadCount,
      publishedAt: communityPost.publishedAt,
      createdAt: communityPost.createdAt,
      updatedAt: communityPost.updatedAt,
      // SEO fields
      seoSlug: communityPost.seoSlug,
      seoTitle: communityPost.seoTitle,
      seoDescription: communityPost.seoDescription,
      seoKeywords: communityPost.seoKeywords,
      seoSlugKeywords: communityPost.seoSlugKeywords,
      contentIntro: communityPost.contentIntro,
      promptBreakdown: communityPost.promptBreakdown,
      imageAlt: communityPost.imageAlt,
      dynamicHeaders: communityPost.dynamicHeaders,
      faqItems: communityPost.faqItems,
      useCases: communityPost.useCases,
      visualTags: communityPost.visualTags,
      relatedPosts: communityPost.relatedPosts,
      expertCommentary: communityPost.expertCommentary,
      // 🆕 V12.0 fields
      remixIdeas: communityPost.remixIdeas,
      relatedConcepts: communityPost.relatedConcepts,
      // 🆕 V14.0 fields - CRITICAL: Must be included for content rendering!
      h1Title: communityPost.h1Title,
      contentSections: communityPost.contentSections,
      anchor: communityPost.anchor,
      microFocus: communityPost.microFocus,
      // Calculate real-time like count from reaction table
      likeCount: sql<number>`CAST(COUNT(DISTINCT ${reaction.id}) AS INTEGER)`.as('like_count'),
    })
    .from(communityPost)
    .leftJoin(
      reaction,
      and(
        eq(reaction.postId, communityPost.id),
        eq(reaction.type, 'like')
      )
    )
    .where(eq(communityPost.id, postId))
    .groupBy(communityPost.id)
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  console.log('[getCommunityPostById] Fetched post with real-time like count:', {
    id: result[0].id,
    likeCount: result[0].likeCount
  });

  if (getUser) {
    const withUser = await appendUserToResult(result);
    return withUser[0] as CommunityPost;
  }

  return result[0] as unknown as CommunityPost;
}

/**
 * Get community post by SEO slug (for /prompts/[slug] route)
 */
export async function getCommunityPostBySlug(
  slug: string,
  { getUser = false }: { getUser?: boolean } = {}
): Promise<CommunityPost | null> {
  const { reaction } = await import('@/config/db/schema');

  const result = await db()
    .select({
      id: communityPost.id,
      userId: communityPost.userId,
      aiTaskId: communityPost.aiTaskId,
      imageUrl: communityPost.imageUrl,
      thumbnailUrl: communityPost.thumbnailUrl, // 🆕 缩略图
      prompt: communityPost.prompt,
      model: communityPost.model,
      params: communityPost.params,
      aspectRatio: communityPost.aspectRatio,
      title: communityPost.title,
      description: communityPost.description,
      status: communityPost.status,
      viewCount: communityPost.viewCount,
      downloadCount: communityPost.downloadCount,
      publishedAt: communityPost.publishedAt,
      createdAt: communityPost.createdAt,
      updatedAt: communityPost.updatedAt,
      // SEO fields
      seoSlug: communityPost.seoSlug,
      seoTitle: communityPost.seoTitle,
      seoDescription: communityPost.seoDescription,
      seoKeywords: communityPost.seoKeywords,
      seoSlugKeywords: communityPost.seoSlugKeywords,
      contentIntro: communityPost.contentIntro,
      promptBreakdown: communityPost.promptBreakdown,
      imageAlt: communityPost.imageAlt,
      dynamicHeaders: communityPost.dynamicHeaders,
      faqItems: communityPost.faqItems,
      useCases: communityPost.useCases,
      visualTags: communityPost.visualTags,
      relatedPosts: communityPost.relatedPosts,
      expertCommentary: communityPost.expertCommentary,
      // 🆕 V12.0 fields
      remixIdeas: communityPost.remixIdeas,
      relatedConcepts: communityPost.relatedConcepts,
      // 🆕 V14.0 fields - CRITICAL: Must be included for content rendering!
      h1Title: communityPost.h1Title,
      contentSections: communityPost.contentSections,
      anchor: communityPost.anchor,
      microFocus: communityPost.microFocus,
      likeCount: sql<number>`CAST(COUNT(DISTINCT ${reaction.id}) AS INTEGER)`.as('like_count'),
    })
    .from(communityPost)
    .leftJoin(
      reaction,
      and(
        eq(reaction.postId, communityPost.id),
        eq(reaction.type, 'like')
      )
    )
    .where(eq(communityPost.seoSlug, slug))
    .groupBy(communityPost.id)
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  if (getUser) {
    const withUser = await appendUserToResult(result);
    return withUser[0] as CommunityPost;
  }

  return result[0] as unknown as CommunityPost;
}


/**
 * Increment view count
 */
export async function incrementViewCount(postId: string, count: number): Promise<void> {
  await db()
    .update(communityPost)
    .set({
      viewCount: sql`${communityPost.viewCount} + ${count}`,
    })
    .where(eq(communityPost.id, postId));
}

/**
 * Increment like count
 */
export async function incrementLikeCount(postId: string, delta: number): Promise<void> {
  console.log('[incrementLikeCount] Start:', { postId, delta });
  
  await db()
    .update(communityPost)
    .set({
      likeCount: sql`${communityPost.likeCount} + ${delta}`,
    })
    .where(eq(communityPost.id, postId));
  
  console.log('[incrementLikeCount] Updated like count for post:', { postId, delta });
}

/**
 * Recalculate like count from reactions table
 * Used for daily calibration
 */
export async function recalculateLikeCount(postId: string): Promise<void> {
  const { reaction } = await import('@/config/db/schema');
  
  const [result] = await db()
    .select({ count: count() })
    .from(reaction)
    .where(eq(reaction.postId, postId));

  const likeCount = result?.count || 0;

  await db()
    .update(communityPost)
    .set({ likeCount })
    .where(eq(communityPost.id, postId));
}
