'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge';
import { useAppContext } from '@/shared/contexts/app';
import { getModelDisplayName } from '@/shared/lib/model-names';
import { cn } from '@/shared/lib/utils';

// ==================== Types ====================

export interface PromptCardPost {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string; // 🆕 640px WebP thumbnail
  prompt: string;
  model?: string;
  seoSlug?: string;
  likeCount: number;
  viewCount: number;
  aspectRatio?: string;
  imageAlt?: string; // 🆕 SEO alt text
  user?: {
    name: string;
    image?: string;
  };
}

export interface PromptCardProps {
  post: PromptCardPost;
  /** Pre-fetched reaction types for this post (e.g., ['like']) */
  userReactions?: string[];
  /** Callback when reactions change */
  onReactionChange?: (postId: string, newReactions: string[]) => void;
  /** Index for priority loading (first 6 get priority) */
  index?: number;
  /** Additional className for the card */
  className?: string;
}

// ==================== Animation Variants ====================

/**
 * 卡片动画变体
 * 注意：使用 custom 属性传入 index，实现行优先的交错动画
 * Masonry 布局按列排列，但我们希望动画按行顺序播放
 */
const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const, // easeOut cubic-bezier
      // 基于 index 计算延迟，实现行优先的交错效果
      delay: Math.min(index * 0.06, 0.8), // 最大延迟 0.8s
    },
  }),
};


// ==================== PromptCard Component ====================

/**
 * Unified Prompt Card with "Immersive Reveal" interaction.
 * 
 * DOM Structure (fixes nested <a> issue):
 * - Container: m.div (relative, group)
 * - Main click: Link (absolute inset-0, z-0)
 * - Content layer: div (z-10, pointer-events-none)
 * - Interactive elements: pointer-events-auto
 * 
 * Features:
 * - Framer Motion entrance animation
 * - Slide-up info panel on hover
 * - Ghost-to-Neon Remix button
 */
export function PromptCard({
  post,
  userReactions = [],
  onReactionChange,
  index = 0,
  className,
}: PromptCardProps) {
  const { setIsShowSignModal, user } = useAppContext();
  
  // Like state
  const [isLiked, setIsLiked] = useState(userReactions.includes('like'));
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);

  // Sync like count when prop changes
  useEffect(() => {
    setLikeCount(post.likeCount || 0);
  }, [post.likeCount]);

  // Sync isLiked when userReactions prop changes
  useEffect(() => {
    setIsLiked(userReactions.includes('like'));
  }, [userReactions]);

  // ==================== Handlers ====================

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLiking) return;

    setIsLiking(true);
    const previousLikedState = isLiked;
    const previousLikeCount = likeCount;
    const newLikedState = !isLiked;
    const delta = newLikedState ? 1 : -1;

    // Optimistic update
    setIsLiked(newLikedState);
    setLikeCount((prev) => prev + delta);

    try {
      const response = await fetch(`/api/community/posts/${post.id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'like' }),
      });

      const data = await response.json() as { 
        code: number; 
        message: string; 
        data?: { isCreated: boolean } 
      };

      if (!response.ok || data.code !== 0) {
        if (data.message?.includes('sign in')) {
          toast.error('Please sign in to like this post');
          setIsShowSignModal(true);
        } else {
          toast.error(data.message || 'Failed to like post');
        }
        setIsLiked(previousLikedState);
        setLikeCount(previousLikeCount);
      } else {
        const { isCreated } = data.data!;
        setIsLiked(isCreated);
        if (onReactionChange) {
          const newReactions = isCreated 
            ? [...userReactions.filter(r => r !== 'like'), 'like']
            : userReactions.filter(r => r !== 'like');
          onReactionChange(post.id, newReactions);
        }
      }
    } catch (error) {
      console.error('Like request failed:', error);
      toast.error('Network error. Please try again.');
      setIsLiked(previousLikedState);
      setLikeCount(previousLikeCount);
    } finally {
      setIsLiking(false);
    }
  };

  // ==================== URLs ====================

  const detailUrl = post.seoSlug 
    ? `/prompts/${post.seoSlug}` 
    : `/image/${post.id}`;

  const remixUrl = `/ai-image-generator?remix_id=${post.id}`;

  // ==================== Render ====================

  return (
    <m.div
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      className={cn(
        // Base: Glass Card
        'group relative mb-6 w-full overflow-hidden rounded-xl',
        'bg-card/40 backdrop-blur-md border border-border-medium shadow-lg',
        // Hover: Enhanced Neon Glow
        'transition-all duration-300 hover:-translate-y-1',
        'hover:border-primary/50 hover:shadow-[0_0_20px_-10px_var(--color-primary)]',
        className
      )}
    >
      <article className="h-full w-full">
        {/* Image Container */}
        <div className="relative aspect-square w-full overflow-hidden">
          
          {/* === Layer 0: Main Click Area (Background Link) === */}
          <Link 
            href={detailUrl} 
            className="absolute inset-0 z-0"
            aria-label={`View details: ${post.prompt?.slice(0, 50) || 'AI Image'}`}
          />

          {/* === Layer 1: Image (pointer-events-none to pass clicks through) === */}
          <div className="relative z-[1] w-full h-full pointer-events-none">
            <Image
              src={post.thumbnailUrl || post.imageUrl || '/placeholder.jpg'}
              alt={post.imageAlt || post.prompt || 'AI generated image'}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={index !== undefined && index < 3}
            />
          </div>

          {/* === Layer 2: Static Overlays (z-20) === */}
          
          {/* Model Badge (Top Left) */}
          {post.model && (
            <Badge 
              variant="glass" 
              className="absolute left-3 top-3 z-20 text-[10px] font-bold uppercase tracking-wider pointer-events-none"
            >
              {getModelDisplayName(post.model)}
            </Badge>
          )}

          {/* Like Button (Top Right) */}
          <Badge
            variant="glass"
            className="absolute right-3 top-3 z-20 gap-1.5 cursor-pointer hover:bg-primary/20 hover:border-primary/50 transition-all pointer-events-auto"
            onClick={handleLike}
          >
            <span className={isLiked ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'opacity-70'}>
              {isLiked ? '❤️' : '🤍'}
            </span>
            <span>{likeCount}</span>
          </Badge>

          {/* === Layer 3: Slide-Up Info Panel (z-10) === */}
          <div 
            className={cn(
              'absolute bottom-0 left-0 right-0 z-10',
              'transform translate-y-[calc(100%-64px)] group-hover:translate-y-0',
              'transition-transform duration-500 ease-out',
              'pointer-events-none group-hover:pointer-events-auto'
            )}
          >
            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-4 px-4">
              
              {/* Prompt Text */}
              <p 
                className={cn(
                  'text-sm text-white/90 font-medium drop-shadow-md mb-2',
                  'line-clamp-1 group-hover:line-clamp-3',
                  'transition-all duration-300'
                )}
              >
                              {post.prompt || 'No prompt available'}
              </p>

              {/* User & Remix Row */}
              <div 
                className={cn(
                  'flex items-center justify-between',
                  'opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-300 delay-100'
                )}
              >
                {/* User Info */}
                {post.user ? (
                  <div className="flex items-center gap-2">
                    {post.user.image && (
                      <Image
                        src={post.user.image}
                        alt={post.user.name}
                        width={24}
                        height={24}
                        className="rounded-full ring-2 ring-white/30"
                      />
                    )}
                    <span className="text-xs text-white/80 font-medium">{post.user.name}</span>
                  </div>
                ) : (
                  <div />
                )}

                {/* Remix Button */}
                <Link
                  href={remixUrl}
                  className={cn(
                    'z-20 relative inline-flex items-center justify-center gap-1.5',
                    'rounded-full px-3 py-1.5 text-xs font-medium',
                    // Ghost Mode
                    'bg-white/10 backdrop-blur-md border border-white/20 text-white',
                    // Neon Mode
                    'group-hover:bg-primary group-hover:text-black group-hover:border-primary',
                    'group-hover:shadow-[0_0_15px_var(--color-primary)]',
                    'transition-all duration-300',
                    'hover:scale-105'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Remix</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </m.div>
  );
}
