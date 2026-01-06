import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/core/i18n/config';
import { ThemeProvider } from '@/core/theme/provider';
import { UtmCapture } from '@/shared/blocks/common';
import { Toaster } from '@/shared/components/ui/sonner';
import { CookieConsentBanner } from '@/shared/components/cookie-consent-banner';
import { AppContextProvider } from '@/shared/contexts/app';
import { getMetadata } from '@/shared/lib/seo';
// 🚀 Performance: Lazy load framer-motion (350KB) via Client Component wrapper
import { MotionProviderLazy } from '@/shared/components/motion-provider-lazy';

export const generateMetadata = getMetadata();

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <NextIntlClientProvider>
      <ThemeProvider>
        <AppContextProvider>
          <UtmCapture />
          <MotionProviderLazy>
            {children}
          </MotionProviderLazy>
          <Toaster position="top-center" richColors />
          <CookieConsentBanner />
        </AppContextProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
