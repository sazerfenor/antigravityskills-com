'use client';

import { LazyMotion, domMax } from 'framer-motion';

/**
 * MotionProvider - Wraps app with LazyMotion for optimized bundle loading.
 * 
 * Uses domMax to support all features including:
 * - layout animations (used in pricing.tsx)
 * - AnimatePresence
 * - whileInView
 * 
 * Bundle impact: Reduces framer-motion from ~707KB to ~350KB (50% reduction)
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
