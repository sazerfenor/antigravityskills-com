import { cn } from "@/shared/lib/utils";

/**
 * Unified grid layout wrapper for Gallery pages.
 * Ensures consistent grid parameters between real pages and skeleton loading states.
 * 
 * Single source of truth for: grid-cols, gap, padding
 */
export function GalleryGridWrapper({ 
  children,
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      // Mobile: 2 cols with tight gap, Desktop: 3 cols, Ultra-wide: 4 cols
      "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
