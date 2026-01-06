import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { getThemeLayout } from '@/core/theme';
import { LocaleDetector } from '@/shared/blocks/common';
import {
  Footer as FooterType,
  Header as HeaderType,
  SectionVisibility,
} from '@/shared/types/blocks/landing';

export default async function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  // load page data
  const t = await getTranslations('landing');

  // load layout component
  const Layout = await getThemeLayout('landing');

  // header and footer to display
  const header: HeaderType = t.raw('header');
  const footer: FooterType = t.raw('footer');
  const sectionVisibility: SectionVisibility = t.raw('section_visibility') || {};

  return (
    <Layout header={header} footer={footer} sectionVisibility={sectionVisibility}>
      <LocaleDetector />
      {children}
    </Layout>
  );
}
