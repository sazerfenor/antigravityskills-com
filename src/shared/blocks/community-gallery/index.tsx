'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { m } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Masonry from 'react-masonry-css';
import { toast } from 'sonner';

import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
// 统一使用 gallery 版本的 PromptCard（修复文字截断 + 动画）
import { PromptCard, PromptCardPost } from '@/shared/components/gallery/prompt-card';
import { GallerySkeleton } from '@/shared/components/gallery';
import { useAppContext } from '@/shared/contexts/app';
import { useInfiniteScroll } from '@/shared/hooks/use-infinite-scroll';

// ==================== Animation Variants ====================

// 容器只需要简单的淡入，卡片动画由 PromptCard 自己控制（基于 index 实现行优先交错）
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

// ==================== Types ====================

interface CommunityPost {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  prompt: string;
  model: string;
  seoSlug: string;
  likeCount: number;
  viewCount: number;
  aspectRatio: string;
  imageAlt?: string;
  user?: {
    name: string;
    image?: string;
  };
}

// ==================== Constants ====================

const LIMIT = 15;

const breakpointColumns = {
  default: 3,
  1024: 2,
  640: 1,
};

// ==================== Component ====================

/** Initial data passed from SSR */
export interface InitialGalleryData {
  posts: CommunityPost[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

export function CommunityGallery({
  sort = 'newest',
  model,
  initialData,
}: {
  sort?: 'newest' | 'trending';
  model?: string;
  /** SSR initial data to eliminate first API call */
  initialData?: InitialGalleryData;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAppContext();

  // Use initialData if provided (SSR), otherwise start empty (CSR)
  const [posts, setPosts] = useState<CommunityPost[]>(initialData?.posts || []);
  const [page, setPage] = useState(initialData?.pagination.page || 1);
  const [totalPages, setTotalPages] = useState(initialData?.pagination.totalPages || 1);
  const [loading, setLoading] = useState(!initialData); // Skip loading if SSR data provided
  const [reactionsMap, setReactionsMap] = useState<Record<string, string[]>>(
    {}
  );

  // Track if we should skip initial fetch (when SSR data is provided)
  const hasInitialData = useRef(!!initialData);

  // ==================== Data Fetching ====================

  const fetchPosts = useCallback(
    async (pageNum: number, append: boolean = false) => {
      try {
        const params = new URLSearchParams({
          sort,
          page: String(pageNum),
          limit: String(LIMIT),
        });
        if (model) params.append('model', model);

        const resp = await fetch(`/api/community/posts?${params}`);
        if (!resp.ok) throw new Error('Failed to fetch posts');

        const { data }: any = await resp.json();

        if (append) {
          setPosts((prev) => [...prev, ...(data.posts || [])]);
        } else {
          setPosts(data.posts || []);
        }

        setTotalPages(data.pagination?.totalPages || 1);
        return (data.posts?.length || 0) > 0;
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        toast.error('Failed to load gallery');
        return false;
      }
    },
    [sort, model]
  );

  // Initial load - reset when filters change
  // Skip initial fetch if SSR data was provided (only on first mount)
  useEffect(() => {
    if (hasInitialData.current) {
      // First mount with SSR data - skip fetch, just mark as loaded
      hasInitialData.current = false;
      return;
    }

    setLoading(true);
    setPage(1);
    setPosts([]);
    fetchPosts(1, false).finally(() => setLoading(false));
  }, [sort, model, fetchPosts]);

  // ==================== Infinite Scroll (循环模式) ====================

  const loadMore = useCallback(async () => {
    // 循环无限滚动：到达最后一页后从头开始
    const nextPage = page >= totalPages ? 1 : page + 1;
    const hasMore = await fetchPosts(nextPage, true);
    if (hasMore) {
      setPage(nextPage);
    }
  }, [page, totalPages, fetchPosts]);

  const {
    sentinelRef,
    isLoading: isLoadingMore,
  } = useInfiniteScroll(loadMore, { threshold: 400, loop: true });

  // ==================== Batch Reactions ====================

  useEffect(() => {
    const fetchBatchReactions = async () => {
      if (!user || posts.length === 0) {
        setReactionsMap({});
        return;
      }

      try {
        const postIds = posts.map((p) => p.id);
        const response = await fetch('/api/community/reactions/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postIds }),
        });
        const data = (await response.json()) as {
          code: number;
          data?: Record<string, string[]>;
        };

        if (data.code === 0 && data.data) {
          setReactionsMap(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch batch reactions:', error);
      }
    };

    fetchBatchReactions();
  }, [user, posts]);

  // ==================== Filter Handlers ====================

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    params.delete('page'); // Reset page on filter change
    router.push(`?${params.toString()}`);
  };

  const handleModelChange = (newModel: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newModel === 'all') {
      params.delete('model');
    } else {
      params.set('model', newModel);
    }
    params.delete('page'); // Reset page on filter change
    router.push(`?${params.toString()}`);
  };

  // ==================== Loading State ====================

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Filters skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-card/40" />
          <div className="h-10 w-[200px] animate-pulse rounded-lg bg-card/40" />
        </div>
        <GallerySkeleton count={9} />
      </div>
    );
  }

  // ==================== Render ====================

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={sort} onValueChange={handleSortChange}>
          <TabsList>
            <TabsTrigger value="newest">Newest</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={model || 'all'} onValueChange={handleModelChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Models" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {/* TODO: 自定义你的模型名称 */}
            <SelectItem value="gemini-2.5-flash-image">Standard</SelectItem>
            <SelectItem value="gemini-3-pro-image-preview">
              Pro
            </SelectItem>
            <SelectItem value="black-forest-labs/flux-schnell">
              FLUX Schnell
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            No images yet. Be the first to share!
          </p>
        </div>
      ) : (
        <>
          {/* Masonry Grid with Framer Motion */}
          <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Masonry
              breakpointCols={breakpointColumns}
              className="flex w-auto gap-6"
              columnClassName="masonry-grid_column"
            >
              {posts.map((post, index) => (
                <PromptCard
                  key={`${post.id}-${index}`}
                  post={post as PromptCardPost}
                  userReactions={reactionsMap[post.id] || []}
                  onReactionChange={(postId, newReactions) => {
                    setReactionsMap((prev) => ({
                      ...prev,
                      [postId]: newReactions,
                    }));
                  }}
                  index={index}
                />
              ))}
            </Masonry>
          </m.div>

          {/* Infinite scroll sentinel - 循环模式，永远显示加载状态 */}
          <div ref={sentinelRef} className="flex justify-center py-8">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading more...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { CommunityGalleryLoading } from './loading';
