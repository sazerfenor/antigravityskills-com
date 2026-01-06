import { cn } from "@/shared/lib/utils";
import { GalleryCardShell } from "@/shared/components/gallery";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-white/5 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

/**
 * High-fidelity skeleton card that matches GalleryCard structure
 * to prevent layout shift during loading.
 * Uses shared GalleryCardShell for consistent styling.
 */
function GallerySkeletonCard({ className }: { className?: string }) {
  return (
    <GalleryCardShell className={className}>
      {/* Image placeholder (1:1 aspect ratio) */}
      <div className="w-full aspect-square bg-white/5 animate-pulse" />
      
      {/* Content placeholder */}
      <div className="p-3 space-y-2 sm:p-4 sm:space-y-3">
        {/* Prompt text lines - hidden on mobile */}
        <Skeleton className="hidden sm:block h-4 w-3/4" />
        <Skeleton className="hidden sm:block h-4 w-1/2" />
        
        {/* Stats row */}
        <div className="flex items-center justify-between pt-1 sm:pt-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-3 w-10 sm:w-12" />
            <Skeleton className="hidden sm:block h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        
        {/* User info row */}
        <div className="pt-2 sm:pt-3 border-t border-border-medium flex items-center gap-2">
          <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-full" />
          <Skeleton className="h-3 w-16 sm:w-20" />
        </div>
      </div>
    </GalleryCardShell>
  );
}

export { Skeleton, GallerySkeletonCard };


