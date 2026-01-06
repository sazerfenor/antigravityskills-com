import { eq, and } from 'drizzle-orm';

import { db } from '@/core/db';
import { tag, postTag } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export type Tag = typeof tag.$inferSelect;
export type NewTag = typeof tag.$inferInsert;
export type PostTag = typeof postTag.$inferSelect;

export enum TagType {
  STYLE = 'style',
  CONTENT = 'content',
  MODEL = 'model',
  CUSTOM = 'custom',
}

/**
 * Create a new tag
 */
export async function createTag(newTag: Omit<NewTag, 'id'>): Promise<Tag> {
  const [result] = await db().insert(tag).values({
    id: getUuid(),
    ...newTag,
  }).returning();

  return result;
}

/**
 * Find tag by name
 */
export async function findTagByName(name: string): Promise<Tag | undefined> {
  const [result] = await db()
    .select()
    .from(tag)
    .where(eq(tag.name, name));

  return result;
}

/**
 * Find or create tag
 */
export async function findOrCreateTag(
  name: string,
  type: TagType = TagType.CUSTOM,
  isSystem = false
): Promise<Tag> {
  const existing = await findTagByName(name);
  if (existing) {
    return existing;
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return createTag({ name, slug, type, isSystem });
}

/**
 * Get all system tags
 */
export async function getSystemTags(): Promise<Tag[]> {
  const result = await db()
    .select()
    .from(tag)
    .where(eq(tag.isSystem, true));

  return result;
}

/**
 * Add tag to post
 */
export async function addTagToPost(postId: string, tagId: string): Promise<void> {
  await db().insert(postTag).values({
    postId,
    tagId,
  });
}

/**
 * Remove tag from post
 */
export async function removeTagFromPost(postId: string, tagId: string): Promise<void> {
  await db()
    .delete(postTag)
    .where(
      and(
        eq(postTag.postId, postId),
        eq(postTag.tagId, tagId)
      )
    );
}

/**
 * Get tags for a post
 */
export async function getTagsForPost(postId: string): Promise<Tag[]> {
  const result = await db()
    .select({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      type: tag.type,
      isSystem: tag.isSystem,
      createdAt: tag.createdAt,
    })
    .from(postTag)
    .innerJoin(tag, eq(postTag.tagId, tag.id))
    .where(eq(postTag.postId, postId));

  return result;
}

/**
 * Get posts by tag
 */
export async function getPostsByTag(tagId: string): Promise<string[]> {
  const result = await db()
    .select({ postId: postTag.postId })
    .from(postTag)
    .where(eq(postTag.tagId, tagId));

  return result.map((r) => r.postId);
}
