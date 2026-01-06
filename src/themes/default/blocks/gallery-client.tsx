'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import type { CommunityPost } from '@/shared/models/community_post';
import { GalleryGrid } from '@/shared/components/gallery';
import { PromptCard, PromptCardPost } from '@/shared/components/gallery/prompt-card';
import { useAppContext } from '@/shared/contexts/app';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { VS } from '@/shared/lib/design-tokens';
import { cn } from '@/shared/lib/utils';

// Transform CommunityPost to PromptCardPost
const transformPost = (post: CommunityPost): PromptCardPost => ({
  id: post.id,
  imageUrl: post.imageUrl || '',
  thumbnailUrl: post.thumbnailUrl || undefined,
  prompt: post.prompt || '',
  model: post.model || undefined,
  seoSlug: post.seoSlug || undefined,
  likeCount: post.likeCount || 0,
  viewCount: post.viewCount || 0,
  aspectRatio: post.aspectRatio || undefined,
  imageAlt: post.imageAlt || undefined,
  user: post.user ? {
    name: post.user.name,
    image: post.user.image || undefined,
  } : undefined,
});

/**
 * Horizontal scroll gallery for mobile
 *
 * 引用规范: CBDS v4.0 Section 5.1 (玻璃物理)
 */
function GalleryHorizontalScroll({
  posts,
  reactionsMap,
  onReactionChange,
}: {
  posts: CommunityPost[];
  reactionsMap: Record<string, string[]>;
  onReactionChange?: (postId: string, newReactions: string[]) => void;
}) {
  // Only show first 6 posts on mobile horizontal scroll
  const displayPosts = posts.slice(0, 6);

  return (
    <div className="relative -mx-4 px-4 overflow-visible">
      
      {/* Horizontal scroll container */}
      <m.div
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {displayPosts.map((post, index) => (
          <div
            key={post.id}
            className={cn(
              "flex-shrink-0 snap-center w-[280px]",
              // 玻璃卡片容器 - 引用 5.1 玻璃物理
              VS.glass.base, // bg-black/40 backdrop-blur-md
              VS.glass.border, // border border-white/10
              VS.glass.hover, // hover:border-primary/50 transition-colors
              "rounded-xl overflow-hidden"
            )}
          >
            <PromptCard
              post={transformPost(post)}
              userReactions={reactionsMap[post.id] || []}
              onReactionChange={onReactionChange}
              index={index}
            />
          </div>
        ))}
      </m.div>
    </div>
  );
}

export function CommunityGalleryClient({
  initialPosts,
}: {
  initialPosts: CommunityPost[];
}) {
  const { user } = useAppContext();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Store reactions for all posts (fetched via batch API)
  const [reactionsMap, setReactionsMap] = useState<Record<string, string[]>>({});

  // Batch fetch all reactions when user or posts change
  useEffect(() => {
    const fetchBatchReactions = async () => {
      if (!user || initialPosts.length === 0) {
        setReactionsMap({});
        return;
      }

      try {
        const postIds = initialPosts.map(p => p.id);
        const response = await fetch('/api/community/reactions/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postIds }),
        });
        const data = await response.json() as { code: number; data?: Record<string, string[]> };

        if (data.code === 0 && data.data) {
          setReactionsMap(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch batch reactions:', error);
      }
    };

    fetchBatchReactions();
  }, [user, initialPosts]);

  const handleReactionChange = (postId: string, newReactions: string[]) => {
    setReactionsMap(prev => ({
      ...prev,
      [postId]: newReactions,
    }));
  };

  // Mobile: Horizontal scroll layout
  if (isMobile) {
    return (
      <GalleryHorizontalScroll
        posts={initialPosts}
        reactionsMap={reactionsMap}
        onReactionChange={handleReactionChange}
      />
    );
  }

  // Desktop: Masonry grid layout
  return (
    <GalleryGrid
      posts={initialPosts}
      reactionsMap={reactionsMap}
      onReactionChange={handleReactionChange}
    />
  );
}
