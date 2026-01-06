'use client';

import Image from 'next/image';
import { Link } from '@/core/i18n/navigation';
import { Section, Container } from '@/shared/components/ui/layout';
import { Button } from '@/shared/components/ui/button';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { LocaleSelector } from '@/shared/blocks/common';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';
import { NavItem } from '@/shared/types/blocks/common';
import { Footer as FooterType } from '@/shared/types/blocks/landing';

/**
 * Footer component - Cyberpunk Terminal Style (v5.0)
 *
 * Matches the overall Cyberpunk design system with glass effects,
 * neon accents, and atmospheric background.
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 5, 8
 */
export function Footer({ footer }: { footer: FooterType }) {
  return (
    <Section
      as="footer"
      spacing="none"
      id={footer.id}
      className={cn(
        "py-16 relative overflow-hidden",
        // Glass background with Cyberpunk border
        "bg-glass-subtle backdrop-blur-xl",
        "border-t border-primary/20",
        footer.className
      )}
    >
      {/* 8.1 Atmosphere: Subtle top glow */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "w-[600px] h-[200px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"
      )} />

      {/* Scanline effect overlay */}
      <div className={cn(
        "absolute inset-0 pointer-events-none opacity-30",
        VS.atmosphere.scanline
      )} />

      <Container className="relative z-10">
        <div className="space-y-10">
          {/* Main Grid */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            {/* Branding Column (span-2 on desktop) */}
            <div className="col-span-2 space-y-4">
              {/* Logo */}
              {footer.brand?.logo && (
                <Link 
                  href="/" 
                  className="inline-flex items-center gap-2 group"
                  aria-label="Home"
                >
                  <Image
                    src={typeof footer.brand.logo === 'string' ? footer.brand.logo : footer.brand.logo.src}
                    alt={typeof footer.brand.logo === 'string' ? (footer.brand.title || 'Logo') : (footer.brand.logo.alt || footer.brand.title || 'Logo')}
                    width={32}
                    height={32}
                    className="size-8"
                  />
                  {footer.brand.title && (
                    <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                      {footer.brand.title}
                    </span>
                  )}
                </Link>
              )}
              
              {/* Slogan/Description */}
              {footer.brand?.description && (
                <p
                  className="text-muted-foreground text-sm max-w-sm"
                  dangerouslySetInnerHTML={{ __html: footer.brand.description }}
                />
              )}
            </div>

            {/* Navigation Columns */}
            {footer.nav?.items.map((item, idx) => (
              <div key={idx} className="space-y-4">
                {/* Column header with neon accent */}
                <span className="text-xs font-bold text-primary uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                  {item.title}
                </span>
                <div className="flex flex-col gap-3">
                  {item.children?.map((subItem, iidx) => (
                    <Link
                      key={iidx}
                      href={subItem.url || ''}
                      target={subItem.target || '_self'}
                      className="text-muted-foreground text-sm transition-all duration-300 hover:text-primary hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] hover:translate-x-1"
                    >
                      {subItem.title || ''}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Divider - Neon line */}
          <div
            aria-hidden
            className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />

          {/* Bottom Row: Copyright + Social */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Copyright */}
            <div className="flex items-center gap-4">
              {footer.copyright ? (
                <p
                  className="text-muted-foreground text-sm"
                  dangerouslySetInnerHTML={{ __html: footer.copyright }}
                />
              ) : footer.brand?.title ? (
                <p className="text-muted-foreground text-sm">
                  © {new Date().getFullYear()} {footer.brand.title}. All rights reserved.
                </p>
              ) : null}

              {/* Locale Selector */}
              {footer.show_locale !== false && (
                <LocaleSelector type="button" />
              )}
            </div>

            {/* Right: Social Icons with enhanced glow */}
            {footer.social && footer.show_social !== false && (
              <div className="flex items-center gap-2">
                {footer.social.items.map((item: NavItem, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon"
                    asChild
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 hover:shadow-[0_0_15px_-3px_rgba(250,204,21,0.5)] transition-all duration-300"
                  >
                    <Link
                      href={item.url || ''}
                      target={item.target || '_blank'}
                      aria-label={`Follow us on ${item.title || 'social media'}`}
                    >
                      {item.icon && (
                        <SmartIcon name={item.icon as string} className="size-5" />
                      )}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer - Trademark & Affiliation Notice */}
          {footer.disclaimer && (
            <p
              className="text-muted-foreground/60 text-xs mt-4 text-center max-w-3xl mx-auto"
              dangerouslySetInnerHTML={{ __html: footer.disclaimer }}
            />
          )}
        </div>
      </Container>
    </Section>
  );
}
