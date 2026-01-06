"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/shared/components/ui/sidebar";
import { Separator } from "@/shared/components/ui/separator";

interface AppLayoutProps {
  children: React.ReactNode;
  /** Sidebar header content (e.g., logo, workspace switcher) */
  sidebarHeader?: React.ReactNode;
  /** Sidebar navigation content (e.g., nav groups) */
  sidebarContent?: React.ReactNode;
  /** Sidebar footer content (e.g., user menu) */
  sidebarFooter?: React.ReactNode;
  /** Breadcrumb or header content for inset area */
  headerContent?: React.ReactNode;
  /** Default sidebar open state */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * AppLayout - Layout for authenticated dashboard pages
 * Uses SidebarProvider + SidebarInset for "floating card" aesthetic.
 */
export function AppLayout({
  children,
  sidebarHeader,
  sidebarContent,
  sidebarFooter,
  headerContent,
  defaultOpen = true,
  className,
}: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar variant="inset" collapsible="icon">
        {/* Sidebar Header */}
        <SidebarHeader>
          {sidebarHeader || (
            <div className="flex items-center gap-2 px-2 py-1.5">
              {/* TODO: 替换为你的 Logo */}
              <span className="text-primary text-lg">🎨</span>
              <span className="font-semibold group-data-[collapsible=icon]:hidden">
                Dashboard
              </span>
            </div>
          )}
        </SidebarHeader>

        {/* Sidebar Navigation Content */}
        <SidebarContent>
          {sidebarContent || (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {/* Placeholder - Add SidebarGroup, SidebarMenu here */}
              Navigation items go here
            </div>
          )}
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarFooter>
          {sidebarFooter || (
            <div className="px-3 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              {/* TODO: 替换为你的品牌名 */}
              © {new Date().getFullYear()} Your Brand
            </div>
          )}
        </SidebarFooter>

        {/* Rail for resize/collapse */}
        <SidebarRail />
      </Sidebar>

      {/* Main Content Area (Inset) */}
      <SidebarInset>
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {/* Breadcrumb or additional header content */}
            {headerContent || (
              <nav className="text-sm text-muted-foreground">
                {/* Placeholder breadcrumb */}
                Dashboard
              </nav>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className={cn("flex flex-1 flex-col gap-4 p-4 pt-0", className)}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppLayout;
