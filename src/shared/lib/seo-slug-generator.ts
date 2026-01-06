/**
 * SEO Slug Generator
 * Generates SEO-friendly URL slugs with model name prefix
 */

import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getModelDisplayName } from '@/shared/lib/model-names';
import { extractSEOKeywords } from './seo-keyword-extractor';
import { extractKeywordsSimple } from './simple-keyword-extractor';

export interface SlugOptions {
  prompt: string;
  model: string;
  postId: string;
  useAI?: boolean; // Whether to use AI extraction
}

/**
 * Generate SEO-friendly URL slug
 * Format: {model}-{keywords}-{short-id}
 * Example: your-model-woman-chinese-golden-dress-twilight-771ee6
 */
export async function generateSEOSlug(options: SlugOptions): Promise<string> {
  const { prompt, model, postId, useAI = true } = options;
  
  // 1. Extract keywords (AI or simple algorithm)
  let keywords: string;
  if (useAI) {
    try {
      keywords = await extractSEOKeywords(prompt);
    } catch (error) {
      console.warn('[generateSEOSlug] AI extraction failed, falling back to simple:', error);
      keywords = extractKeywordsSimple(prompt);
    }
  } else {
    keywords = extractKeywordsSimple(prompt);
  }
  
  // 2. Get model friendly name and convert to slug format
  const modelSlug = modelNameToSlug(model);
  
  // 3. Generate short ID (remove hyphens, take last 8 chars)
  // UUID: f07384ed-7955-4d90-8509-195f8b17eed7
  // Result: 8b17eed7 (8 hex chars)
  const shortId = postId.replace(/-/g, '').slice(-8);
  
  // 4. Assemble slug (model name first!)
  const keywordsPart = cleanSlugText(keywords);
  const finalSlug = `${modelSlug}-${keywordsPart}-${shortId}`;
  
  // 5. Ensure reasonable length (limit to 80 chars)
  return truncateSlug(finalSlug, 80);
}

/**
 * Convert model ID to slug-friendly format
 * Uses model-names.ts mapping
 */
export function modelNameToSlug(modelId: string): string {
  // 1. Get friendly name (e.g., "Model Pro")
  const displayName = getModelDisplayName(modelId);
  
  // 2. Convert to slug format
  return displayName
    .toLowerCase()
    .replace(/\s+/g, '-')        // Spaces to hyphens
    .replace(/[^a-z0-9-]/g, '')  // Remove special chars
    .replace(/-+/g, '-');        // Merge consecutive hyphens
  
  // Result: "Model Pro" → "model-pro"
}

/**
 * Clean keyword text for URL slug
 */
export function cleanSlugText(text: string): string {
  return text
    .toLowerCase()
    .replace(/,\s*/g, '-')      // Commas to hyphens
    .replace(/\s+/g, '-')       // Spaces to hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special chars
    .replace(/-+/g, '-')        // Merge consecutive hyphens
    .replace(/^-|-$/g, '');     // Remove leading/trailing hyphens
}

/**
 * Truncate slug to reasonable length
 * Tries to cut at word boundaries (hyphens)
 */
export function truncateSlug(slug: string, maxLength: number): string {
  if (slug.length <= maxLength) {
    return slug;
  }
  
  // Cut at hyphen to preserve word integrity
  const truncated = slug.slice(0, maxLength);
  const lastDash = truncated.lastIndexOf('-');
  
  return lastDash > 0 ? truncated.slice(0, lastDash) : truncated;
}

/**
 * Save slug with automatic conflict retry (Database-level interception - 方案2)
 * Catches Postgres unique constraint violation and auto-retries with numeric suffix
 */
export async function saveSlugWithRetry(
  postId: string,
  baseSlug: string
): Promise<string> {
  let finalSlug = baseSlug;
  let attempt = 0;
  const MAX_RETRIES = 10;
  
  while (attempt <= MAX_RETRIES) {
    try {
      // Try to update database
      await db()
        .update(communityPost)
        .set({ seoSlug: finalSlug })
        .where(eq(communityPost.id, postId));
      
      // Success!
      console.log(`✓ [saveSlugWithRetry] Slug saved: ${finalSlug}`);
      return finalSlug;
      
    } catch (error: any) {
      // Check for unique constraint violation (Postgres error code 23505)
      if (error.code === '23505' && attempt < MAX_RETRIES) {
        attempt++;
        
        // Auto-add numeric suffix
        finalSlug = `${baseSlug}-${attempt}`;
        console.log(`⚠ [saveSlugWithRetry] Conflict detected, retrying: ${finalSlug}`);
        
        // Continue while loop to retry
        continue;
      }
      
      // Other error or max retries exceeded, throw
      console.error(`✗ [saveSlugWithRetry] Failed after ${attempt} retries:`, error);
      throw error;
    }
  }
  
  // Should never reach here, but for type safety
  throw new Error(`Failed to save slug after ${MAX_RETRIES} retries`);
}
