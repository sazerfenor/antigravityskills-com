import type { ReactNode } from 'react';

import type { TOCItemType } from 'fumadocs-core/server';

/**
 * Changelog tag type
 */
export type ChangelogTag =
  | 'new'
  | 'improved'
  | 'fixed'
  | 'deprecated'
  | 'security';

/**
 * Related link in changelog entry
 */
export interface RelatedLink {
  label: string;
  url: string;
  icon?: string;
}

/**
 * Single changelog entry
 */
export interface ChangelogEntry {
  id?: string;
  slug: string;
  title: string;
  version?: string; // e.g., "V2.0"
  publishedAt: string; // ISO date string
  summary?: string;
  tags?: ChangelogTag[];
  isFromFeedback?: boolean; // User feedback driven update
  image?: string; // Cover image
  relatedLinks?: RelatedLink[];
  body?: ReactNode; // Rendered MDX content
  toc?: TOCItemType[];
  url?: string;
}

/**
 * Changelog list page data structure
 */
export interface ChangelogList {
  id?: string;
  title?: string;
  description?: string;
  entries: ChangelogEntry[];
  className?: string;
}
