import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getLocalPageWithBody } from '@/shared/models/post-content';
import { PolicyPage } from '@/shared/blocks/policy-page';
import { getPolicyMetadata } from '@/shared/lib/policy-config';

export const revalidate = 86400;

export const metadata: Metadata = getPolicyMetadata('Privacy Policy');

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Get MDX content from content/pages/en/privacy-policy.mdx
  const page = await getLocalPageWithBody({ slug: 'privacy-policy', locale });

  if (!page || !page.body) {
    notFound();
  }

  return <PolicyPage body={page.body} />;
}
