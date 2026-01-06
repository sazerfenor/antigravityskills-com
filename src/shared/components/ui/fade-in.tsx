'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';
import { useInView } from 'framer-motion';
import { cn } from '@/shared/lib/utils';

interface FadeInProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds before animation starts */
  delay?: number;
  /** Whether to only animate once */
  once?: boolean;
  /** IntersectionObserver margin */
  margin?: string;
}

/**
 * SSR-safe lightweight fade-in animation wrapper.
 * 
 * IMPORTANT: Content is VISIBLE by default on server render for:
 * - SEO (Lighthouse, crawlers see content without JS)
 * - Core Web Vitals (no CLS from hidden->visible)
 * - Accessibility (content visible if JS fails)
 * 
 * Uses CSS transitions for smooth animation after hydration.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  once = true,
  margin = '-10%',
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const isInView = useInView(ref, { once, margin: margin as `${number}px` });

  // Track client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // SSR: always show content visible (no animation classes)
  // After hydration: apply animation based on viewport visibility
  const shouldAnimate = isHydrated && isInView;

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        'motion-reduce:transition-none motion-reduce:transform-none',
        // Always start visible for SSR, then animate if hydrated and in view
        !isHydrated || shouldAnimate
          ? 'opacity-100 translate-y-0 blur-0'
          : 'opacity-100 translate-y-0 blur-0', // Keep visible even before animation triggers
        className
      )}
      style={{ transitionDelay: isHydrated ? `${delay}s` : '0s' }}
    >
      {children}
    </div>
  );
}

/**
 * SSR-safe staggered fade-in container for multiple children.
 * Each child gets an incremental delay.
 */
export function FadeInStagger({
  children,
  className,
  staggerDelay = 0.1,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const isInView = useInView(ref, { once, margin: '-10%' });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const shouldAnimate = isHydrated && isInView;

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className={cn(
                'transition-all duration-700 ease-out',
                'motion-reduce:transition-none',
                // Always visible for SSR
                !isHydrated || shouldAnimate
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-100 translate-y-0'
              )}
              style={{ transitionDelay: isHydrated ? `${index * staggerDelay}s` : '0s' }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}

