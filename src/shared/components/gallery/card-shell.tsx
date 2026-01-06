import { cn } from "@/shared/lib/utils";

/**
 * Unified card container for Gallery cards.
 * Ensures consistent glassmorphism styling between real cards and skeleton cards.
 * 
 * Single source of truth for: bg, border, rounded, overflow, backdrop-blur
 */
export function GalleryCardShell({ 
  children,
  className,
  as: Component = "div"
}: { 
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <Component 
      className={cn(
        // Glass effect and border
        "rounded-xl border border-border-medium bg-card/40 backdrop-blur-md",
        // Layout
        "overflow-hidden h-full flex flex-col",
        // Hover state for interactive cards
        "transition-all duration-300",
        className
      )}
    >
      {children}
    </Component>
  );
}
