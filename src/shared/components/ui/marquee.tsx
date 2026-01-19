'use client';

import { cn } from '@/shared/lib/utils';
import { ReactNode, useRef, useState } from 'react';

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  /** Animation duration in seconds */
  duration?: number;
  /** Direction of the marquee */
  direction?: 'left' | 'right';
  /** Pause on hover */
  pauseOnHover?: boolean;
  /** Gap between items */
  gap?: number;
}

/**
 * Infinite Scroll Marquee Component
 *
 * CSS-only infinite scroll animation with:
 * - Seamless loop (duplicated content)
 * - Pause on hover
 * - Configurable speed and direction
 *
 * @see .agent/rules/UIUX_Guidelines.md Section 6 - Motion Discipline
 */
export function Marquee({
  children,
  className,
  duration = 30,
  direction = 'left',
  pauseOnHover = true,
  gap = 16,
}: MarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const animationDirection = direction === 'left' ? 'normal' : 'reverse';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        // Removed gradient masks to allow particles to show through
        className
      )}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div
        className="flex w-max"
        style={{
          gap: `${gap}px`,
          animationName: 'marquee',
          animationDuration: `${duration}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDirection: animationDirection,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {/* Original content */}
        <div className="flex shrink-0" style={{ gap: `${gap}px` }}>
          {children}
        </div>
        {/* Duplicated content for seamless loop */}
        <div className="flex shrink-0" style={{ gap: `${gap}px` }} aria-hidden="true">
          {children}
        </div>
      </div>

      {/* Keyframes injection */}
      <style jsx global>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
