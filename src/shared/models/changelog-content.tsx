/**
 * changelog-content.tsx
 *
 * PERFORMANCE OPTIMIZATION:
 * This file isolates fumadocs/Shiki dependencies from the core changelog data functions.
 * Only import this module when you need to render MDX content.
 *
 * The fumadocs-ui/mdx package pulls in Shiki (~780KB) for syntax highlighting.
 * By isolating it here, we prevent it from being bundled into pages that only
 * need changelog metadata (title, slug, description).
 */

import { getMDXComponents } from '@/mdx-components';
import { createRelativeLink } from 'fumadocs-ui/mdx';

import { changelogSource } from '@/core/docs/source';
import type {
  ChangelogEntry,
  ChangelogTag,
} from '@/shared/types/blocks/changelog';

/**
 * Get a changelog entry with full MDX body rendering.
 * This function includes fumadocs dependencies and should only be used
 * when the full changelog content (including body) is needed.
 */
export async function getChangelogEntryWithBody({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<ChangelogEntry | null> {
  const page = changelogSource.getPage([slug], locale);
  if (!page) return null;

  const MDXContent = page.data.body;
  const body = (
    <MDXContent
      components={getMDXComponents({
        a: createRelativeLink(changelogSource, page),
      })}
    />
  );

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
    body,
    toc: page.data.toc,
    url: `/changelog/${slug}`,
  };
}
