import { ContentSection, ContentSections } from '@/shared/schemas/api-schemas';

/**
 * V14.0 Content Sections Converter
 * 
 * Utility functions to convert legacy post data (faqItems, useCases, etc.)
 * to the new V14.0 contentSections format. This enables backward compatibility
 * so that old posts can be rendered using the new DynamicRenderer.
 * 
 * @architecture Three-Tier Strategy:
 * 1. If post has `contentSections` (V14.0) -> Use directly
 * 2. If post has legacy fields only -> Convert on-the-fly
 * 3. Caching: Converted sections can be saved back to DB (optional migration)
 */

interface LegacyPostData {
  faqItems?: string | null | Array<{ question: string; answer: string }>;
  useCases?: string | null | Array<string>;
  visualTags?: string | null | Array<string>;
  contentIntro?: string | null;
  promptBreakdown?: string | null;
  dynamicHeaders?: string | null | Record<string, string>;
  expertCommentary?: string | null | { whyItWorks?: string; optimizationTips?: string; modelAdvantage?: string };
}

/**
 * Parse a potentially JSON-stringified field safely
 */
function safeJsonParse<T>(value: string | null | undefined | T, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Generate a unique, deterministic ID for a section from legacy conversion
 * V14.1 Fix: Removed Date.now() to prevent React Hydration Mismatch errors
 */
function generateSectionId(prefix: string, index: number): string {
  // Deterministic ID based on prefix and index
  return `legacy_converted_${prefix}_${index}`;
}

/**
 * Convert legacy post fields to V14.0 contentSections format
 * 
 * @param legacyData - Legacy post data with old-style fields
 * @returns ContentSections array compatible with DynamicRenderer
 */
export function convertLegacyToSections(legacyData: LegacyPostData): ContentSections {
  const sections: ContentSections = [];
  let sectionIndex = 0;

  const dynamicHeaders = safeJsonParse<Record<string, string>>(
    legacyData.dynamicHeaders, 
    {}
  );

  // 1. Content Intro -> Rich Text Section
  if (legacyData.contentIntro) {
    sections.push({
      id: generateSectionId('intro', sectionIndex++),
      type: 'rich-text',
      title: dynamicHeaders.about || 'About This Prompt',
      headingLevel: 'h2',
      data: { text: legacyData.contentIntro },
    });
  }

  // 2. FAQ Items -> FAQ Accordion Section
  const faqItems = safeJsonParse<Array<{ question: string; answer: string }>>(
    legacyData.faqItems,
    []
  );
  if (faqItems.length > 0) {
    sections.push({
      id: generateSectionId('faq', sectionIndex++),
      type: 'faq-accordion',
      title: dynamicHeaders.faq || 'Frequently Asked Questions',
      headingLevel: 'h2',
      data: {
        items: faqItems.map(item => ({
          q: item.question,
          a: item.answer,
        })),
      },
    });
  }

  // 3. Use Cases -> Checklist Section
  const useCases = safeJsonParse<Array<string>>(legacyData.useCases, []);
  if (useCases.length > 0) {
    sections.push({
      id: generateSectionId('usecases', sectionIndex++),
      type: 'checklist',
      title: 'Use Cases',
      headingLevel: 'h2',
      data: { items: useCases },
    });
  }

  // 4. Expert Commentary -> Rich Text Section
  const expertCommentary = safeJsonParse<{ 
    whyItWorks?: string; 
    optimizationTips?: string; 
    modelAdvantage?: string 
  }>(legacyData.expertCommentary, {});
  
  if (expertCommentary.whyItWorks || expertCommentary.optimizationTips) {
    const commentaryText = [
      expertCommentary.whyItWorks && `**Why It Works:** ${expertCommentary.whyItWorks}`,
      expertCommentary.optimizationTips && `**Optimization Tips:** ${expertCommentary.optimizationTips}`,
      expertCommentary.modelAdvantage && `**Model Advantage:** ${expertCommentary.modelAdvantage}`,
    ].filter(Boolean).join('\n\n');

    sections.push({
      id: generateSectionId('expert', sectionIndex++),
      type: 'rich-text',
      title: dynamicHeaders.analysis || 'Expert Analysis',
      headingLevel: 'h2',
      data: { text: commentaryText },
    });
  }

  return sections;
}

/**
 * Get contentSections from a post, preferring V14 native data,
 * falling back to conversion from legacy fields.
 * 
 * @param post - Post data (could be V14 or legacy)
 * @returns ContentSections array ready for DynamicRenderer
 */
export function getContentSections(post: LegacyPostData & { contentSections?: ContentSections | string | null }): ContentSections {
  // Priority 1: Native V14.0 contentSections
  if (post.contentSections) {
    const sections = safeJsonParse<ContentSections>(post.contentSections, []);
    if (sections.length > 0) {
      return sections;
    }
  }

  // Priority 2: Convert from legacy fields
  return convertLegacyToSections(post);
}

/**
 * Check if a post has V14.0 native content sections
 */
export function hasNativeContentSections(post: { contentSections?: ContentSections | string | null }): boolean {
  if (!post.contentSections) return false;
  const sections = safeJsonParse<ContentSections>(post.contentSections, []);
  return sections.length > 0;
}
