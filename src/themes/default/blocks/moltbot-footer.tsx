'use client';

import { Link, usePathname } from '@/core/i18n/navigation';
import { cn } from '@/shared/lib/utils';

// Handle anchor link click with smooth scroll
const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
  if (url.startsWith('/#')) {
    e.preventDefault();
    const id = url.replace('/#', '');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', url);
    }
  }
};

// Localized footer content
const FOOTER_CONTENT: Record<string, {
  brand: string;
  description: string;
  guideTitle: string;
  legalTitle: string;
  guide: { title: string; url: string }[];
  legal: { title: string; url: string }[];
  copyright: string;
  disclaimer: string;
}> = {
  en: {
    brand: 'MoltBot Hub',
    description: 'Community-built resource for MoltBot/ClawdBot users. Not affiliated with the official team.',
    guideTitle: 'Guide',
    legalTitle: 'Legal',
    guide: [
      { title: 'What is MoltBot', url: '/#what-is-moltbot' },
      { title: 'Use Cases', url: '/#installation' },
      { title: 'FAQ', url: '/#faq' },
    ],
    legal: [
      { title: 'Privacy Policy', url: '/privacy-policy' },
      { title: 'Terms of Service', url: '/terms-of-service' },
    ],
    copyright: 'MoltBot Community Hub',
    disclaimer: 'MoltBot (formerly ClawdBot) is developed by Peter Steinberger & the open-source community.',
  },
  'zh-TW': {
    brand: 'MoltBot 社群站',
    description: '本站由社群愛好者打造，提供 MoltBot/ClawdBot 入門指南。與官方團隊無關聯。',
    guideTitle: '入門指南',
    legalTitle: '法律條款',
    guide: [
      { title: 'MoltBot 是什麼', url: '/#what-is-moltbot' },
      { title: '使用情境', url: '/#installation' },
      { title: '常見問題', url: '/#faq' },
    ],
    legal: [
      { title: '隱私權政策', url: '/privacy-policy' },
      { title: '服務條款', url: '/terms-of-service' },
    ],
    copyright: 'MoltBot 社群服務站',
    disclaimer: 'MoltBot（前身為 ClawdBot）由 Peter Steinberger 與社群開發。',
  },
};

export function MoltbotFooter({ className }: { className?: string }) {
  const pathname = usePathname();
  const locale = pathname.startsWith('/zh-TW') ? 'zh-TW' : 'en';
  const content = FOOTER_CONTENT[locale] || FOOTER_CONTENT.en;

  return (
    <footer className={cn(
      "border-t border-border bg-card/40 py-12",
      className
    )}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Branding */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-lg font-bold tracking-tight">{content.brand}</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {content.description}
            </p>
          </div>

          {/* Guide Links */}
          <div className="space-y-4">
            <h5 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {content.guideTitle}
            </h5>
            <ul className="space-y-2 text-sm">
              {content.guide.map((link) => (
                <li key={link.title}>
                  <a
                    href={link.url}
                    onClick={(e) => handleAnchorClick(e, link.url)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h5 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {content.legalTitle}
            </h5>
            <ul className="space-y-2 text-sm">
              {content.legal.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.url}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} {content.copyright}</p>
          <p className="mt-2 text-xs">{content.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
