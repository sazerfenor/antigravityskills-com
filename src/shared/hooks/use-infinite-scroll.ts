'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  /** Threshold before reaching bottom to trigger load (px) */
  threshold?: number;
  /** Initial loading state */
  initialLoading?: boolean;
  /** Enable infinite loop mode (never stops loading) */
  loop?: boolean;
}

interface UseInfiniteScrollReturn {
  /** Ref to attach to the sentinel element */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** Whether more content is loading */
  isLoading: boolean;
  /** Set loading state */
  setIsLoading: (loading: boolean) => void;
  /** Whether there's more content to load */
  hasMore: boolean;
  /** Set hasMore state */
  setHasMore: (hasMore: boolean) => void;
}

/**
 * Custom hook for infinite scroll functionality using IntersectionObserver.
 *
 * @param onLoadMore - Async function to call when more content should be loaded
 * @param options - Configuration options
 * @returns Object containing sentinel ref and loading states
 */
export function useInfiniteScroll(
  onLoadMore: () => Promise<void>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const { threshold = 200, initialLoading = false, loop = false } = options;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(isLoading);
  const hasMoreRef = useRef(hasMore);

  // Keep refs in sync with state
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const handleIntersect = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      // 循环模式下忽略 hasMore 检查
      const canLoad = loop || hasMoreRef.current;
      if (entry?.isIntersecting && canLoad && !isLoadingRef.current) {
        setIsLoading(true);
        try {
          await onLoadMore();
        } finally {
          setIsLoading(false);
        }
      }
    },
    [onLoadMore, loop]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: `${threshold}px`,
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect, threshold]);

  return {
    sentinelRef,
    isLoading,
    setIsLoading,
    hasMore,
    setHasMore,
  };
}
