import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';

import { changelogSource } from '@/core/docs/source';
import type {
  ChangelogEntry,
  ChangelogTag,
} from '@/shared/types/blocks/changelog';

/**
 * Get all changelog entries (without MDX body)
 * Performance optimized: Does not import fumadocs/Shiki
 */
export async function getChangelogEntries({
  locale,
}: {
  locale: string;
}): Promise<ChangelogEntry[]> {
  const pages = changelogSource.getPages(locale);

  if (!pages || pages.length === 0) {
    return [];
  }

  const entries: ChangelogEntry[] = pages.map((page) => {
    const frontmatter = page.data as any;
    // Use file-based slug from fumadocs (matches what getPage expects)
    const slug = page.slugs?.[0] ||
      page.url.replace('/changelog/', '').replace(`/${locale}/changelog/`, '');

    return {
      id: page.url,
      slug,
      title: page.data.title || '',
      version: frontmatter.version,
      publishedAt: frontmatter.publishedAt,
      summary: frontmatter.summary,
      tags: frontmatter.tags as ChangelogTag[],
      isFromFeedback: frontmatter.isFromFeedback || false,
      image: frontmatter.image,
      relatedLinks: frontmatter.relatedLinks,
      toc: page.data.toc,
      url: `/changelog/${slug}`,
    };
  });

  // Sort by publishedAt desc
  return entries.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Get single changelog entry metadata (without body)
 */
export async function getChangelogEntry({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<ChangelogEntry | null> {
  const page = changelogSource.getPage([slug], locale);
  if (!page) return null;

  const frontmatter = page.data as any;

  return {
    id: page.url,
    slug,
    title: page.data.title || '',
    version: frontmatter.version,
    publishedAt: frontmatter.publishedAt,
    summary: frontmatter.summary,
    tags: frontmatter.tags as ChangelogTag[],
    isFromFeedback: frontmatter.isFromFeedback || false,
    image: frontmatter.image,
    relatedLinks: frontmatter.relatedLinks,
    toc: page.data.toc,
    url: `/changelog/${slug}`,
  };
}

/**
 * Format changelog date for display
 */
export function formatChangelogDate(
  dateStr: string,
  locale: string = 'en'
): string {
  const date = new Date(dateStr);
  const dateFnsLocale = locale === 'zh' ? zhCN : enUS;
  const formatStr = locale === 'zh' ? 'yyyy/MM/dd' : 'MMM d, yyyy';
  return format(date, formatStr, { locale: dateFnsLocale });
}
