'use client';

import { m } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { Sparkles } from 'lucide-react';
import type { CommunityPost } from '@/shared/models/community_post';
import { PromptCard, PromptCardPost } from './prompt-card';
import { GallerySkeleton } from './gallery-skeleton';

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

export interface GalleryGridProps {
  posts: CommunityPost[];
  /** Map of postId -> reaction types (e.g., ['like']) */
  reactionsMap?: Record<string, string[]>;
  /** Callback when reactions change */
  onReactionChange?: (postId: string, newReactions: string[]) => void;
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Number of skeleton items to show */
  skeletonCount?: number;
  /** Empty state message */
  emptyMessage?: string;
}

// ==================== Breakpoints ====================

const breakpointColumns = {
  default: 3,
  1024: 2,
  640: 1,
};

// ==================== GalleryGrid Component ====================

/**
 * Responsive Masonry Grid for displaying prompt cards.
 * 
 * Features:
 * - Framer Motion staggered entrance animations
 * - react-masonry-css for responsive layout
 * - Loading skeleton state
 * - Empty state handling
 */
export function GalleryGrid({
  posts,
  reactionsMap = {},
  onReactionChange,
  isLoading = false,
  skeletonCount = 6,
  emptyMessage = 'No images yet. Be the first to share!',
}: GalleryGridProps) {
  // Show skeleton while loading
  if (isLoading) {
    return <GallerySkeleton count={skeletonCount} />;
  }

  // Empty state
  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Sparkles className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-lg">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Transform CommunityPost to PromptCardPost
  const transformPost = (post: CommunityPost): PromptCardPost => ({
    id: post.id,
    imageUrl: post.imageUrl || '',
    thumbnailUrl: post.thumbnailUrl || undefined, // 🆕 缩略图
    prompt: post.prompt || '',
    model: post.model || undefined,
    seoSlug: post.seoSlug || undefined,
    likeCount: post.likeCount || 0,
    viewCount: post.viewCount || 0,
    aspectRatio: post.aspectRatio || undefined,
    imageAlt: post.imageAlt || undefined, // 🆕 SEO alt
    user: post.user ? {
      name: post.user.name,
      image: post.user.image || undefined,
    } : undefined,
  });

  return (
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
            key={post.id}
            post={transformPost(post)}
            userReactions={reactionsMap[post.id] || []}
            onReactionChange={onReactionChange}
            index={index}
          />
        ))}
      </Masonry>
    </m.div>
  );
}
