/**
 * post-content.tsx
 * 
 * PERFORMANCE OPTIMIZATION:
 * This file isolates fumadocs/Shiki dependencies from the core post data functions.
 * Only import this module when you need to render MDX content.
 * 
 * The fumadocs-ui/mdx package pulls in Shiki (~780KB) for syntax highlighting.
 * By isolating it here, we prevent it from being bundled into pages that only
 * need post metadata (title, slug, description).
 */

import { getMDXComponents } from '@/mdx-components';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { pagesSource, postsSource } from '@/core/docs/source';
import { generateTOC } from '@/core/docs/toc';
import { MarkdownContent } from '@/shared/blocks/common/markdown-content';
import type { Post as BlogPostType } from '@/shared/types/blocks/blog';
import { getPostDate } from './post';

/**
 * Get a local post with full MDX body rendering.
 * This function includes fumadocs dependencies and should only be used
 * when the full post content (including body) is needed.
 */
export async function getLocalPostWithBody({
  slug,
  locale,
  postPrefix = '/blog/',
}: {
  slug: string;
  locale: string;
  postPrefix?: string;
}): Promise<BlogPostType | null> {
  const localPost = await postsSource.getPage([slug], locale);
  if (!localPost) {
    return null;
  }

  const MDXContent = localPost.data.body;
  const body = (
    <MDXContent
      components={getMDXComponents({
        a: createRelativeLink(postsSource, localPost),
      })}
    />
  );

  const frontmatter = localPost.data as any;

  const post: BlogPostType = {
    id: localPost.path,
    slug: slug,
    title: localPost.data.title || '',
    description: localPost.data.description || '',
    content: '',
    body: body,
    toc: localPost.data.toc,
    created_at: frontmatter.created_at
      ? getPostDate({
          created_at: frontmatter.created_at,
          locale,
        })
      : '',
    author_name: frontmatter.author_name || '',
    author_image: frontmatter.author_image || '',
    author_role: '',
    url: `${postPrefix}${slug}`,
  };

  return post;
}

/**
 * Get a local page with full MDX body rendering.
 */
export async function getLocalPageWithBody({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<BlogPostType | null> {
  const localPage = await pagesSource.getPage([slug], locale);
  if (!localPage) {
    return null;
  }

  const MDXContent = localPage.data.body;
  const body = (
    <MDXContent
      components={getMDXComponents({
        a: createRelativeLink(pagesSource, localPage),
      })}
    />
  );

  const frontmatter = localPage.data as any;

  const post: BlogPostType = {
    id: localPage.path,
    slug: slug,
    title: localPage.data.title || '',
    description: localPage.data.description || '',
    content: '',
    body: body,
    toc: localPage.data.toc,
    created_at: frontmatter.created_at
      ? getPostDate({
          created_at: frontmatter.created_at,
          locale,
        })
      : '',
    author_name: frontmatter.author_name || '',
    author_image: frontmatter.author_image || '',
    author_role: '',
    url: `/${locale}/${slug}`,
  };

  return post;
}

/**
 * Render markdown content with MDX components.
 * Use this for database-stored posts that have raw markdown.
 */
export function renderDatabasePostBody(content: string) {
  return content ? <MarkdownContent content={content} /> : undefined;
}

/**
 * Generate TOC from markdown content.
 */
export function generatePostTOC(content: string) {
  return content ? generateTOC(content) : undefined;
}
