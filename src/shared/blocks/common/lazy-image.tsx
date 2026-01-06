'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

import { cn } from '@/shared/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholderSrc?: string;
  title?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

/**
 * 🚀 Performance-optimized LazyImage component
 * 
 * ARCHITECTURE PRINCIPLES:
 * 1. Smart sizing - infers dimensions from Tailwind classes when not specified
 * 2. Sensible defaults - 100x100 instead of 800x600 to prevent byte waste
 * 3. Dev warnings - alerts when dimensions missing in development
 * 
 * This prevents the common pitfall of requesting 750px images for 40px displays.
 */

// Map common Tailwind height classes to pixel values
const TAILWIND_HEIGHT_MAP: Record<string, number> = {
  'h-4': 16, 'h-5': 20, 'h-6': 24, 'h-8': 32, 'h-10': 40, 'h-12': 48,
  'h-14': 56, 'h-16': 64, 'h-20': 80, 'h-24': 96, 'h-32': 128, 'h-40': 160,
  'h-48': 192, 'h-56': 224, 'h-64': 256,
};

const TAILWIND_WIDTH_MAP: Record<string, number> = {
  'w-4': 16, 'w-5': 20, 'w-6': 24, 'w-8': 32, 'w-10': 40, 'w-12': 48,
  'w-14': 56, 'w-16': 64, 'w-20': 80, 'w-24': 96, 'w-32': 128, 'w-40': 160,
  'w-48': 192, 'w-56': 224, 'w-64': 256,
};

/**
 * Infer dimensions from Tailwind classes in className
 * Returns 2x the display size for retina screens
 */
function inferDimensionsFromClassName(className?: string): { width: number; height: number } {
  if (!className) return { width: 100, height: 100 };
  
  const classes = className.split(' ');
  let inferredWidth = 100;
  let inferredHeight = 100;
  
  for (const cls of classes) {
    if (TAILWIND_HEIGHT_MAP[cls]) {
      inferredHeight = TAILWIND_HEIGHT_MAP[cls] * 2; // 2x for retina
    }
    if (TAILWIND_WIDTH_MAP[cls]) {
      inferredWidth = TAILWIND_WIDTH_MAP[cls] * 2; // 2x for retina
    }
  }
  
  // If only height is specified (e.g., h-10 w-auto), use height for both
  if (className.includes('w-auto') && inferredHeight !== 100) {
    inferredWidth = inferredHeight;
  }
  
  return { width: inferredWidth, height: inferredHeight };
}

export function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  placeholderSrc,
  title,
  fill,
  priority,
  sizes,
  quality = 75,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Smart sizing: use provided values, or infer from className
  const inferred = inferDimensionsFromClassName(className);
  const finalWidth = width || inferred.width;
  const finalHeight = height || inferred.height;

  // Dev warning for missing dimensions (helps catch performance issues early)
  if (process.env.NODE_ENV === 'development' && !width && !height && !fill) {
    // Only warn if no size hints in className either
    if (finalWidth === 100 && finalHeight === 100) {
      console.warn(
        `[LazyImage] Missing dimensions for image: ${src}. ` +
        `Using default 100x100. Add width/height props or use Tailwind size classes.`
      );
    }
  }

  // Simple gray placeholder for blur effect
  const blurDataURL = 
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==';

  // Common image props
  const commonProps = {
    src,
    alt: alt || 'Image',
    title,
    quality,
    placeholder: 'blur' as const,
    blurDataURL,
    onLoad: () => setIsLoaded(true),
    onError: () => {
      setHasError(true);
      setIsLoaded(true); // Show image container even on error
    },
    className: cn(
      'transition-opacity duration-300',
      isLoaded || hasError ? 'opacity-100' : 'opacity-0',
      className
    ),
  };

  // Fill mode (for containers with aspect-ratio or explicit dimensions)
  if (fill) {
    return (
      <Image
        {...commonProps}
        fill
        priority={priority}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px'}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  // Priority images (LCP optimization)
  if (priority) {
    return (
      <Image
        {...commonProps}
        width={finalWidth}
        height={finalHeight}
        priority
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px'}
        style={{ width: '100%', height: 'auto' }}
      />
    );
  }

  // Standard lazy-loaded images with smart sizing
  return (
    <Image
      {...commonProps}
      width={finalWidth}
      height={finalHeight}
      loading="lazy"
      sizes={sizes || `${Math.min(finalWidth, 640)}px`}
    />
  );
}

