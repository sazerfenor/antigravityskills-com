import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { envConfigs } from '@/config';
import { getThemePage } from '@/core/theme';
import { getChangelogEntryWithBody } from '@/shared/models/changelog-content';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('changelog.metadata');

  const canonicalUrl =
    locale !== envConfigs.locale
      ? `${envConfigs.app_url}/${locale}/changelog/${slug}`
      : `${envConfigs.app_url}/changelog/${slug}`;

  const entry = await getChangelogEntryWithBody({ slug, locale });

  if (!entry) {
    return {
      title: `${slug} | ${t('title')}`,
      description: t('description'),
      alternates: { canonical: canonicalUrl },
    };
  }

  return {
    title: `${entry.title} | ${t('title')}`,
    description: entry.summary || t('description'),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      images: entry.image ? [entry.image] : undefined,
    },
  };
}

export default async function ChangelogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const entry = await getChangelogEntryWithBody({ slug, locale });

  if (!entry) {
    notFound();
  }

  const Page = await getThemePage('changelog-detail');

  return <Page locale={locale} entry={entry} />;
}
