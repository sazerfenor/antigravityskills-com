'use client';

import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Separator } from '@/shared/components/ui/separator';
import { useSidebar } from '@/shared/components/ui/sidebar';
import { NavItem } from '@/shared/types/blocks/common';
import { SidebarFooter as SidebarFooterType } from '@/shared/types/blocks/dashboard';

import { LocaleSelector, ThemeToggler } from '../common';

const LEGAL_LINKS = [
  { title: 'Privacy', url: '/privacy-policy' },
  { title: 'Terms', url: '/terms-of-service' },
  { title: 'Refunds', url: '/refund-policy' },
  { title: 'Cookies', url: '/cookie-policy' },
  { title: 'Guidelines', url: '/community-guidelines' },
  { title: 'DMCA', url: '/dmca-policy' },
];

export function SidebarFooter({ footer }: { footer: SidebarFooterType }) {
  const { open } = useSidebar();

  return (
    <>
      {open ? (
        <div className="border-t">
          {/* Legal Links Section */}
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Legal</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {LEGAL_LINKS.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Original Footer Content */}
          <div className="mx-auto flex w-full items-center justify-start gap-x-4 border-t px-4 py-3">
            {footer.nav?.items?.map((item: NavItem, idx: number) => (
              <div className="hover:text-primary cursor-pointer" key={idx}>
                <Link href={item.url || ''} target={item.target || '_self'}>
                  {item.icon && (
                    <SmartIcon
                      name={item.icon as string}
                      className="text-md"
                      size={20}
                    />
                  )}
                </Link>
              </div>
            ))}

            <div className="flex-1"></div>

            {(footer.show_theme || footer.show_locale) && (
              <Separator orientation="vertical" className="h-4" />
            )}
            {footer.show_theme && <ThemeToggler />}
            {footer.show_locale && <LocaleSelector />}
          </div>
        </div>
      ) : null}
    </>
  );
}
