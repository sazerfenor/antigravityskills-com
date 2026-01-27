'use client';

import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, usePathname } from '@/core/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { SignUser } from '@/shared/blocks/sign/sign-user';
import { LocaleSelector } from '@/shared/blocks/common/locale-selector';

// Localized nav items
const NAV_ITEMS: Record<string, { title: string; url: string }[]> = {
  en: [
    { title: 'What is MoltBot', url: '/#what-is-moltbot' },
    { title: 'Use Cases', url: '/#installation' },
    { title: 'FAQ', url: '/#faq' },
  ],
  'zh-TW': [
    { title: 'MoltBot 是什麼', url: '/#what-is-moltbot' },
    { title: '使用情境', url: '/#installation' },
    { title: '常見問題', url: '/#faq' },
  ],
};

// Handle anchor link click with smooth scroll
const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
  if (url.startsWith('/#')) {
    e.preventDefault();
    const id = url.replace('/#', '');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash without page reload
      window.history.pushState(null, '', url);
    }
  }
};

export function MoltbotHeader({ className }: { className?: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Detect locale from pathname
  const locale = pathname.startsWith('/zh-TW') ? 'zh-TW' : 'en';
  const navItems = NAV_ITEMS[locale] || NAV_ITEMS.en;

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-primary/10 bg-background/80 backdrop-blur-md",
      className
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/favicon-96x96.png"
            alt="MoltBot"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="text-xl font-bold tracking-tight">
            Molt<span className="text-primary">Bot</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.title}
              href={item.url}
              onClick={(e) => handleAnchorClick(e, item.url)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.title}
            </a>
          ))}
        </nav>

        {/* Sign In / User Avatar */}
        <div className="hidden md:flex items-center gap-3">
          <LocaleSelector />
          <SignUser signButtonSize="sm" userNav={{ show_name: true, show_sign_out: true, items: [] }} />
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-primary/10 bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col p-4 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.title}
                href={item.url}
                onClick={(e) => {
                  handleAnchorClick(e, item.url);
                  setIsMenuOpen(false);
                }}
                className="text-base font-medium hover:text-primary transition-colors py-2"
              >
                {item.title}
              </a>
            ))}
          </nav>
          <div className="px-4 pb-4 flex items-center gap-3">
            <LocaleSelector />
            <SignUser signButtonSize="sm" userNav={{ show_name: true, show_sign_out: true, items: [] }} />
          </div>
        </div>
      )}
    </header>
  );
}
