import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

export interface NotificationSkeletonProps {
  /** Compact mode for Popover */
  compact?: boolean;
}

/**
 * High-fidelity skeleton that matches NotificationItem layout exactly.
 * Prevents layout shift during loading.
 */
export function NotificationSkeleton({ compact = false }: NotificationSkeletonProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3',
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Avatar skeleton */}
      <Skeleton className={cn('rounded-full shrink-0', compact ? 'size-8' : 'size-10')} />

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        {/* Title line */}
        <Skeleton className={cn('w-3/4', compact ? 'h-3' : 'h-4')} />
        
        {/* Preview text line */}
        <Skeleton className={cn('w-full', compact ? 'h-3' : 'h-4')} />
        
        {/* Timestamp */}
        <Skeleton className={cn('w-16', compact ? 'h-2' : 'h-3')} />
      </div>

      {/* Unread dot placeholder */}
      <Skeleton className="size-2 rounded-full shrink-0" />
    </div>
  );
}

/**
 * Multiple skeleton items for list loading
 */
export function NotificationSkeletonList({
  count = 3,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}
