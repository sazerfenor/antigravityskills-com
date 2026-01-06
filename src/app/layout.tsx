import type { Metadata } from 'next';
import '@/config/style/global.css';

import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Merriweather } from 'next/font/google';
import { getLocale, setRequestLocale } from 'next-intl/server';
import NextTopLoader from 'nextjs-toploader';

import { envConfigs, brandConfig } from '@/config';
import { locales } from '@/config/locale';
import { GlobalScripts, GlobalHeadScripts } from './global-scripts';
import { ThemeColorProvider } from '@/shared/components/theme-color-provider';

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-serif',
  display: 'swap', // Prevent FOIT, improve LCP
});

export const metadata: Metadata = {
  metadataBase: new URL(envConfigs.app_url || 'http://localhost:3000'),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  setRequestLocale(locale);

  const isProduction = process.env.NODE_ENV === 'production';
  const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true';

  // app url
  const appUrl = envConfigs.app_url || '';

  // Determine if we should load global scripts (production or debug mode)
  const shouldLoadScripts = isProduction || isDebug;

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable} ${merriweather.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* 🛡️ Defensive polyfill: Prevents __name ReferenceError from build artifacts */}
        <script dangerouslySetInnerHTML={{
          __html: `window.__name = window.__name || function(){};`
        }} />
        {/* 🚀 Prevent FOUC: Apply dark class before any JS loads */}
        <script dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.add('dark');`
        }} />
        <link rel="icon" href="/favicon.ico" />
        {/* 沉浸式视口：支持刘海屏全屏体验 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        {/* PWA 原生化 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/*
          Hreflang 标签已移至页面级 generateMetadata 动态生成
          以确保每个页面的 hreflang 指向正确的当前页面 URL
          详见: src/app/[locale]/(landing)/prompts/[slug]/page.tsx
        */}

        {/* 
          Head scripts loaded via Suspense - won't block TTFB
          Analytics/Ads meta tags and scripts load asynchronously
        */}
        {shouldLoadScripts && <GlobalHeadScripts />}

        {/* Global Organization Schema for Knowledge Graph */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": brandConfig.name,
              "url": brandConfig.domain,
              "logo": `${brandConfig.domain}/logo.png`,
              "description": brandConfig.description,
              "sameAs": [
                brandConfig.social.twitter,
                brandConfig.social.github
              ].filter(Boolean)
            })
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased text-foreground overflow-x-hidden">
        <NextTopLoader
          color="hsl(48 96% 53%)"
          shadow="0 0 10px hsl(48 96% 53%), 0 0 5px hsl(48 96% 53%)"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />

        {children}

        {/* Dynamic theme-color for status bar */}
        <ThemeColorProvider />

        {/* 
          Body scripts loaded via Suspense - won't block page render
          These load after initial HTML is sent to browser
        */}
        {shouldLoadScripts && <GlobalScripts />}
      </body>
    </html>
  );
}

