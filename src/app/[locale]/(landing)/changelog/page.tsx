import { setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import { getChangelogEntries } from '@/shared/models/changelog';
import type { ChangelogList } from '@/shared/types/blocks/changelog';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'changelog.metadata',
  canonicalUrl: '/changelog',
});

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const entries = await getChangelogEntries({ locale });

  const changelogList: ChangelogList = {
    id: 'changelog',
    title: 'Changelog',
    description: 'Follow our journey. Every feature, fix, and improvement.',
    entries,
  };

  const Page = await getThemePage('changelog');

  return <Page locale={locale} changelog={changelogList} />;
}
