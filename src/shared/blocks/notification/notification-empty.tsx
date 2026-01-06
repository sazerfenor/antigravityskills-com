'use client';

import { Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export interface NotificationEmptyProps {
  /** Compact mode for Popover */
  compact?: boolean;
}

export function NotificationEmpty({ compact = false }: NotificationEmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6'
      )}
    >
      {/* Icon: Large muted Sparkles */}
      <div className="mb-4 rounded-full bg-card/50 p-4">
        <Sparkles
          className={cn(
            'text-muted-foreground/30',
            compact ? 'size-8' : 'size-12'
          )}
        />
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-medium text-foreground mb-1',
          compact ? 'text-sm' : 'text-lg'
        )}
      >
        All caught up
      </h3>

      {/* Subtitle */}
      <p
        className={cn(
          'text-muted-foreground max-w-xs',
          compact ? 'text-xs mb-3' : 'text-sm mb-4'
        )}
      >
        The network is quiet. Time to create something amazing.
      </p>

      {/* CTA Button - Only show in full mode */}
      {!compact && (
        <Button variant="outline" asChild className="group">
          <Link href="/prompts">
            <span className="group-hover:text-primary transition-colors">
              Explore prompts
            </span>
          </Link>
        </Button>
      )}
    </div>
  );
}
