'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { Link, usePathname, useRouter } from '@/core/i18n/navigation';
import {
  BrandLogo,
  LocaleSelector,
  NotificationButton,
  SignUser,
  SmartIcon,
  ThemeToggler,
} from '@/shared/blocks/common';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger as RawNavigationMenuTrigger,
} from '@/shared/components/ui/navigation-menu';
import { useMedia } from '@/shared/hooks/use-media';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';
import { NavItem } from '@/shared/types/blocks/common';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

// For Next.js hydration mismatch warning, conditionally render NavigationMenuTrigger only after mount to avoid inconsistency between server/client render
function NavigationMenuTrigger(
  props: React.ComponentProps<typeof RawNavigationMenuTrigger>
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Only render after client has mounted, to avoid SSR/client render id mismatch
  if (!mounted) return null;
  return <RawNavigationMenuTrigger {...props} />;
}

export function Header({ header }: { header: HeaderType }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isLarge = useMedia('(min-width: 64rem)');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Optimized scroll listener with requestAnimationFrame throttling
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation menu for large screens
  const NavMenu = () => {
    const menuRef = useRef<React.ElementRef<typeof NavigationMenu>>(null);

    // Calculate dynamic viewport height for animated menu
    const handleViewportHeight = () => {
      requestAnimationFrame(() => {
        const menuNode = menuRef.current;
        if (!menuNode) return;

        const openContent = document.querySelector<HTMLElement>(
          '[data-slot="navigation-menu-viewport"][data-state="open"]'
        );

        if (openContent) {
          const height = openContent.scrollHeight;
          document.documentElement.style.setProperty(
            '--navigation-menu-viewport-height',
            `${height}px`
          );
        } else {
          document.documentElement.style.removeProperty(
            '--navigation-menu-viewport-height'
          );
        }
      });
    };

    return (
      <nav aria-label="Main navigation" className="max-lg:hidden">
        <NavigationMenu
          ref={menuRef}
          onValueChange={handleViewportHeight}
          className="[--color-muted:color-mix(in_oklch,var(--color-foreground)_5%,transparent)] [--viewport-outer-px:2rem] **:data-[slot=navigation-menu-viewport]:rounded-none **:data-[slot=navigation-menu-viewport]:border-0 **:data-[slot=navigation-menu-viewport]:bg-transparent **:data-[slot=navigation-menu-viewport]:shadow-none **:data-[slot=navigation-menu-viewport]:ring-0"
        >
          <NavigationMenuList className="gap-3">
            {header.nav?.items?.map((item, idx) => (
              <NavigationMenuItem key={idx} value={item.title || ''}>
                {item.children && item.children.length > 0 ? (
                  <>
                    <NavigationMenuTrigger className="flex flex-row items-center gap-2 text-sm">
                      {item.icon && (
                        <SmartIcon
                          name={item.icon as string}
                          className="h-4 w-4"
                        />
                      )}
                      {item.title}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="mt-4.5 origin-top pt-5 pb-14 shadow-none ring-0">
                      <div className="divide-foreground/10 grid w-full min-w-6xl grid-cols-4 gap-4 divide-x pr-22">
                        <div className="col-span-2 row-span-2 grid grid-rows-subgrid gap-1 border-r-0">
                          <span className="text-muted-foreground ml-2 text-xs">
                            {item.title}
                          </span>
                          <ul className="mt-1 grid grid-cols-2 gap-2">
                            {item.children?.map((subItem: NavItem, iidx) => (
                              <ListItem
                                key={iidx}
                                href={subItem.url || ''}
                                title={subItem.title || ''}
                                description={subItem.description || ''}
                              >
                                {subItem.icon && (
                                  <SmartIcon name={subItem.icon as string} />
                                )}
                              </ListItem>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.url || ''}
                      target={item.target || '_self'}
                      className={cn(
                        'flex flex-row items-center gap-2 text-sm transition-all duration-200 rounded-md px-3 py-2',
                        'hover:bg-primary/10 hover:text-primary hover:shadow-glow-primary',
                        item.is_active || pathname.endsWith(item.url as string)
                          ? 'text-primary font-semibold bg-primary/10 shadow-glow-primary'
                          : 'text-foreground'
                      )}
                    >
                      {item.icon && <SmartIcon name={item.icon as string} />}
                      {item.title}
                    </Link>
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </nav>
    );
  };

  // Mobile menu content - now renders inside Drawer
  const MobileMenuContent = ({ closeMenu }: { closeMenu: () => void }) => {
    return (
      <nav
        role="navigation"
        className="w-full px-4 pb-8 safe-area-bottom"
      >
        <Accordion
          type="single"
          collapsible
          className="space-y-1"
        >
          {header.nav?.items?.map((item, idx) => {
            return (
              <AccordionItem
                key={idx}
                value={item.title || ''}
                className="border-b-0"
              >
                {item.children && item.children.length > 0 ? (
                  <>
                    <AccordionTrigger className="data-[state=open]:bg-primary/10 data-[state=open]:text-primary flex items-center justify-between px-4 py-3.5 text-lg rounded-xl hover:bg-primary/5 hover:text-primary hover:shadow-glow-primary transition-all duration-200">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-2 pt-1">
                      <ul className="space-y-1">
                        {item.children?.map((subItem: NavItem, iidx) => (
                          <li key={iidx}>
                            <Link
                              href={subItem.url || ''}
                              onClick={closeMenu}
                              className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-primary/5 transition-colors"
                            >
                              {subItem.icon && (
                                <SmartIcon name={subItem.icon as string} className="size-5 text-muted-foreground" />
                              )}
                              <span className="text-base">{subItem.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </>
                ) : (
                  <Link
                    href={item.url || ''}
                    onClick={closeMenu}
                    className="flex items-center px-4 py-3.5 text-lg rounded-xl hover:bg-primary/5 hover:text-primary hover:shadow-glow-primary transition-all duration-200"
                  >
                    {item.title}
                  </Link>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
        
        {/* Mobile-specific actions */}
        <div className="mt-6 pt-6 border-t border-border-medium/30 flex flex-wrap items-center justify-center gap-4">
          {header.show_theme && <ThemeToggler />}
          {header.show_locale && <LocaleSelector />}
        </div>
      </nav>
    );
  };

  // List item for submenus in NavigationMenu
  function ListItem({
    title,
    description,
    children,
    href,
    ...props
  }: React.ComponentPropsWithoutRef<'li'> & {
    href: string;
    title: string;
    description?: string;
  }) {
    return (
      <li {...props}>
        <NavigationMenuLink asChild>
          <Link href={href} className="grid grid-cols-[auto_1fr] gap-3.5 rounded-lg p-2 -m-2 transition-all duration-200 hover:bg-primary/10 hover:shadow-glow-primary group">
            <div className="bg-background ring-foreground/10 relative flex size-9 items-center justify-center rounded border border-transparent shadow shadow-sm ring-1">
              {children}
            </div>
            <div className="space-y-0.5">
              <div className="text-foreground text-sm font-medium group-hover:text-primary transition-colors">{title}</div>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {description}
              </p>
            </div>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  }

  return (
    <>
      <header
        data-state={isMobileMenuOpen ? 'active' : 'inactive'}
        {...(isScrolled && { 'data-scrolled': true })}
        className="has-data-[state=open]:bg-background/50 fixed inset-x-0 top-0 z-50 has-data-[state=open]:h-screen has-data-[state=open]:backdrop-blur"
      >
        <div
          className={cn(
            'absolute inset-x-0 top-0 z-50 h-18 border-transparent ring-1 ring-transparent transition-all duration-300',
            // Scrolled state: Apply VS glass styling with Cyberpunk border
            'in-data-scrolled:border-primary/20 in-data-scrolled:bg-glass-subtle in-data-scrolled:border-b in-data-scrolled:backdrop-blur-md',
            // Menu open state (desktop)
            'has-data-[state=open]:ring-primary/10 has-data-[state=open]:bg-glass-subtle has-data-[state=open]:h-[calc(var(--navigation-menu-viewport-height)+3.4rem)] has-data-[state=open]:border-b has-data-[state=open]:border-primary/20 has-data-[state=open]:shadow-lg has-data-[state=open]:shadow-primary/5 has-data-[state=open]:backdrop-blur-md',
            // Mobile state
            'max-lg:in-data-[state=active]:bg-glass-subtle max-lg:h-14 max-lg:overflow-hidden max-lg:border-b max-lg:border-primary/10 max-lg:in-data-[state=active]:h-screen max-lg:in-data-[state=active]:backdrop-blur-md'
          )}
        >
          <div className="container">
            <div className="relative flex flex-wrap items-center justify-between lg:py-5">
              <div className="flex justify-between gap-8 max-lg:h-14 max-lg:w-full max-lg:border-b">
                {/* Brand Logo */}
                {header.brand && <BrandLogo brand={header.brand} />}

                {/* Desktop Navigation Menu */}
                {isLarge && <NavMenu />}
                {/* Hamburger menu button - triggers bottom drawer */}
                <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label={
                      isMobileMenuOpen == true ? 'Close Menu' : 'Open Menu'
                    }
                    className="relative z-20 -m-2.5 -mr-3 block cursor-pointer p-2.5 lg:hidden"
                  >
                    <Menu className="m-auto size-5 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0" />
                    <X className="absolute inset-0 m-auto size-5 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100" />
                  </button>
                  
                  <DrawerContent className="max-h-[85vh] bg-glass-subtle backdrop-blur-xl border-t border-primary/20 shadow-[0_-10px_40px_-15px_rgba(250,204,21,0.15)]">
                    <DrawerHeader className="border-b border-primary/20">
                      <DrawerTitle className="text-center">Menu</DrawerTitle>
                    </DrawerHeader>
                    <div className="overflow-y-auto">
                      <MobileMenuContent closeMenu={() => setIsMobileMenuOpen(false)} />
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>

              {/* Header right section: theme toggler, locale selector, sign, buttons */}
              <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 in-data-[state=active]:flex max-lg:in-data-[state=active]:mt-6 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                <div className="flex w-full flex-row items-center gap-4 sm:flex-row sm:gap-6 sm:space-y-0 md:w-fit">
                  {header.show_theme ? <ThemeToggler /> : null}
                  {header.show_locale ? <LocaleSelector /> : null}
                  <div className="flex-1 md:hidden"></div>
                  <NotificationButton />
                  {header.show_sign ? (
                    <SignUser userNav={header.user_nav} />
                  ) : null}

                  {header.buttons &&
                    header.buttons.map((button, idx) => (
                      <Link
                        key={idx}
                        href={button.url || ''}
                        target={button.target || '_self'}
                        className={cn(
                          'focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                          'h-7 px-3 ring-0',
                          button.variant === 'outline'
                            ? 'bg-background ring-foreground/10 hover:bg-primary/10 hover:text-primary dark:ring-foreground/15 border border-transparent shadow-sm ring-1 shadow-black/15 duration-200'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90 border-[0.5px] border-border-strong shadow-md ring-1 shadow-black/20 ring-(--ring-color) [--ring-color:color-mix(in_oklab,var(--color-foreground)15%,var(--color-primary))]'
                        )}
                      >
                        {button.icon && (
                          <SmartIcon name={button.icon as string} />
                        )}
                        <span>{button.title}</span>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
