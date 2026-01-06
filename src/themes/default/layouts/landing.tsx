import { ReactNode } from 'react';

import {
  Footer as FooterType,
  Header as HeaderType,
  SectionVisibility,
} from '@/shared/types/blocks/landing';
import { Footer, Header } from '@/themes/default/blocks';

export default async function LandingLayout({
  children,
  header,
  footer,
  sectionVisibility,
}: {
  children: ReactNode;
  header: HeaderType;
  footer: FooterType;
  sectionVisibility?: SectionVisibility;
}) {
  const v = sectionVisibility || {};

  return (
    <div className="min-h-screen w-full flex flex-col bg-background font-sans antialiased relative overflow-x-hidden">
      {v.show_header !== false && <Header header={header} />}
      <main className="flex-1">{children}</main>
      {v.show_footer !== false && <Footer footer={footer} />}
    </div>
  );
}
