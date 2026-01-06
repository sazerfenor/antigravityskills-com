'use client';

import dynamic from 'next/dynamic';

// 🚀 Performance: Lazy load framer-motion (350KB) - not needed for initial render
// This wrapper is a Client Component, allowing ssr: false which removes framer-motion
// from the critical path and server bundle.
const LazyMotionProvider = dynamic(
  () => import('./motion-provider').then(mod => mod.MotionProvider),
  { 
    ssr: false,
    loading: () => null // No loading indicator - children render immediately
  }
);

export function MotionProviderLazy({ children }: { children: React.ReactNode }) {
  return <LazyMotionProvider>{children}</LazyMotionProvider>;
}
