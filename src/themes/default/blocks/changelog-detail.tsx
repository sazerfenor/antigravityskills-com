'use client';

import { TOCItems, TOCProvider } from 'fumadocs-ui/components/layout/toc';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  ListIcon,
  MessageCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Link } from '@/core/i18n/navigation';
import { formatChangelogDate } from '@/shared/lib/changelog-utils';
import { Container, Section } from '@/shared/components/ui/layout';
import { cn } from '@/shared/lib/utils';
import type { ChangelogEntry, ChangelogTag } from '@/shared/types/blocks/changelog';

// Tag styles
const TAG_STYLES: Record<ChangelogTag, string> = {
  new: 'bg-green-500/20 text-green-400 border-green-500/30',
  improved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fixed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  deprecated: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  security: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function ChangelogDetail({ entry }: { entry: ChangelogEntry }) {
  const t = useTranslations('changelog.page');
  const tTags = useTranslations('changelog.tags');
  const showToc = entry.toc && entry.toc.length > 0;

  return (
    <TOCProvider toc={entry.toc || []}>
      <Section as="article" spacing="loose">
        <Container size="default">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-1/4 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />
          </div>

          {/* Back link */}
          <Link
            href="/changelog"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            <span>{t('back')}</span>
          </Link>

          {/* Main content with optional TOC */}
          <div className="flex gap-8">
            {/* Main content area */}
            <div className="min-w-0 flex-1">
              <div className="relative overflow-hidden rounded-2xl border border-border-medium bg-card/40 p-6 backdrop-blur-xl md:p-12">
                {/* Decorative glow */}
                <div className="pointer-events-none absolute right-0 top-0 size-40 rounded-full bg-primary/10 blur-3xl" />

                {/* Header info */}
                <header className="relative mb-10">
                  {/* Version + Date + Feedback badge */}
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    {entry.version && (
                      <span className="font-mono text-2xl font-bold text-primary">
                        {entry.version}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="size-4" />
                      {formatChangelogDate(entry.publishedAt)}
                    </span>
                    {entry.isFromFeedback && (
                      <span className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-400">
                        <MessageCircle className="size-3.5" />
                        {t('from_feedback')}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {entry.title}
                  </h1>

                  {/* Summary */}
                  {entry.summary && (
                    <p className="mb-6 text-lg text-muted-foreground">
                      {entry.summary}
                    </p>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      {entry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium',
                            TAG_STYLES[tag]
                          )}
                        >
                          {tTags(tag)}
                        </span>
                      ))}
                    </div>
                  )}
                </header>

                {/* Cover image */}
                {entry.image && (
                  <div className="relative mb-12">
                    <Image
                      src={entry.image}
                      alt={entry.title}
                      width={1200}
                      height={630}
                      priority
                      className="aspect-video size-full rounded-xl border border-border-medium object-cover"
                    />
                  </div>
                )}

                {/* MDX content */}
                <article className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-primary prose-code:rounded-md prose-code:bg-primary/10 prose-code:px-1 prose-code:text-primary prose-img:rounded-xl">
                  {entry.body}
                </article>

                {/* Related links */}
                {entry.relatedLinks && entry.relatedLinks.length > 0 && (
                  <div className="mt-12 border-t border-border-medium pt-8">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">
                      {t('related_links')}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {entry.relatedLinks.map((link, idx) => (
                        <Link
                          key={idx}
                          href={link.url}
                          className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                        >
                          {link.label}
                          <ExternalLink className="size-3.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TOC sidebar - only on large screens */}
            {showToc && (
              <aside className="sticky top-24 hidden h-fit w-56 shrink-0 lg:block">
                <div className="rounded-lg border border-border-medium/50 bg-card/60 p-4 backdrop-blur-sm">
                  <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <ListIcon className="size-3" />
                    {t('toc')}
                  </h2>
                  <nav className="max-h-[60vh] overflow-y-auto text-xs">
                    <TOCItems />
                  </nav>
                </div>
              </aside>
            )}
          </div>
        </Container>
      </Section>
    </TOCProvider>
  );
}
