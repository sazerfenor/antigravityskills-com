"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import {
  NavigationMenu,
  NavigationMenuList,
} from "@/shared/components/ui/navigation-menu";

interface MarketingLayoutProps {
  children: React.ReactNode;
  /** Optional navigation items - pass NavigationMenuItem components */
  navigationItems?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * MarketingLayout - Layout for public marketing pages (landing, pricing, blog, etc.)
 * Uses NavigationMenu for top navigation with mega menu support.
 */
export function MarketingLayout({
  children,
  navigationItems,
  footer,
  className,
}: MarketingLayoutProps) {
  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 h-(--header-height) w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-full items-center justify-between">
          {/* Logo Area */}
          <div className="flex items-center gap-6">
            {/* TODO: 替换为你的 Logo 和品牌名 */}
            <a href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-primary">🎨</span>
              <span>Your Brand</span>
            </a>
          </div>

          {/* Navigation Menu */}
          <NavigationMenu viewport={true}>
            <NavigationMenuList>
              {navigationItems}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Placeholder for auth buttons, theme toggle, etc. */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      {footer && (
        <footer className="border-t border-border/40 bg-background">
          {footer}
        </footer>
      )}
    </div>
  );
}

export default MarketingLayout;
