'use client';

import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

// ==================== Types ====================

export interface GallerySkeletonProps {
  /** Number of skeleton items to render */
  count?: number;
  /** Additional className */
  className?: string;
}

// ==================== GallerySkeleton Component ====================

/**
 * High-fidelity skeleton that matches the exact layout of the gallery.
 * Uses CSS Grid instead of JS-based Masonry for SSR-compatible responsive layout.
 * Prevents Cumulative Layout Shift (CLS) during loading.
 * 
 * Breakpoints:
 * - Mobile (<640px): 1 column
 * - Tablet (640px-1024px): 2 columns
 * - Desktop (>1024px): 3 columns
 */
export function GallerySkeleton({
  count = 6,
  className,
}: GallerySkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="group relative w-full overflow-hidden rounded-xl bg-card/40 border border-border-medium"
        >
          {/* Image Skeleton - aspect-square for consistent CLS prevention */}
          <Skeleton className="w-full aspect-square" />
          
          {/* Overlay Content Skeleton */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Prompt Text Skeleton */}
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            
            {/* User & Button Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>

          {/* Top Badges Skeleton */}
          <div className="absolute top-3 left-3">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="absolute top-3 right-3">
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

