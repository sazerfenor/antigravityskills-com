'use client';

import {
  ArrowRight,
  Calendar,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { formatChangelogDate } from '@/shared/lib/changelog-utils';
import { Container, Section } from '@/shared/components/ui/layout';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';
import type {
  ChangelogEntry,
  ChangelogList,
  ChangelogTag,
} from '@/shared/types/blocks/changelog';

// Tag color mapping following CBDS
const TAG_STYLES: Record<ChangelogTag, string> = {
  new: 'bg-green-500/20 text-green-400 border-green-500/30',
  improved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fixed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  deprecated: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  security: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function ChangelogTagBadge({ tag }: { tag: ChangelogTag }) {
  const t = useTranslations('changelog.tags');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        TAG_STYLES[tag]
      )}
    >
      {t(tag)}
    </span>
  );
}

function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  const t = useTranslations('changelog.page');

  return (
    <Link href={entry.url || '#'} className="group block">
      <article
        className={cn(
          // Glass Card style
          'relative rounded-2xl p-6',
          'border border-border/50 bg-card/40 backdrop-blur-sm',
          'hover:border-primary/50 hover:bg-primary/5',
          'transition-all duration-300'
        )}
      >
        {/* Timeline dot */}
        <div className="absolute -left-[25px] top-8 hidden size-3 rounded-full bg-primary ring-4 ring-background md:block" />

        {/* Header: Version + Date + Feedback badge */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {entry.version && (
            <span className="font-mono text-lg font-bold text-primary">
              {entry.version}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-3.5" />
            {formatChangelogDate(entry.publishedAt)}
          </span>
          {entry.isFromFeedback && (
            <span className="flex items-center gap-1 text-xs text-purple-400">
              <MessageCircle className="size-3" />
              {t('from_feedback')}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn(
            'mb-2 text-xl font-semibold text-foreground',
            'transition-colors group-hover:text-primary'
          )}
        >
          {entry.title}
        </h3>

        {/* Summary */}
        {entry.summary && (
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
            {entry.summary}
          </p>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag, idx) => (
              <ChangelogTagBadge key={idx} tag={tag} />
            ))}
          </div>
        )}

        {/* Read More arrow */}
        <div className="absolute bottom-6 right-6 opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowRight className="size-5 text-primary" />
        </div>
      </article>
    </Link>
  );
}

function ChangelogEmptyState() {
  const t = useTranslations('changelog.page');

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-card/50 p-4">
        <Sparkles className="size-10 text-muted-foreground/30" />
      </div>
      <h3 className="mb-1 text-lg font-medium text-foreground">
        No Updates Yet
      </h3>
      <p className="text-sm text-muted-foreground">{t('no_content')}</p>
    </div>
  );
}

export function Changelog({
  changelog,
  className,
}: {
  changelog: ChangelogList;
  className?: string;
}) {
  const t = useTranslations('changelog.page');

  return (
    <Section spacing="loose" id={changelog.id} className={cn('pt-24', className)}>
      <Container size="narrow">
        {/* Page header */}
        <div className="mb-16 text-center">
          <h1 className={cn(VS.typography.h1, 'mb-4')}>
            <span className={VS.gradient.hero}>
              {changelog.title || t('title')}
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            {changelog.description || t('description')}
          </p>
        </div>

        {/* Timeline list */}
        {changelog.entries && changelog.entries.length > 0 ? (
          <div className="relative">
            {/* Timeline axis */}
            <div className="absolute bottom-0 left-0 top-0 hidden w-px bg-border/50 md:block" />

            <div className="space-y-6 md:pl-8">
              {changelog.entries.map((entry, idx) => (
                <ChangelogCard key={entry.id || idx} entry={entry} />
              ))}
            </div>
          </div>
        ) : (
          <ChangelogEmptyState />
        )}
      </Container>
    </Section>
  );
}
