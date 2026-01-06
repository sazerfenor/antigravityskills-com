'use client';

import { useState, useEffect } from 'react';
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
  prompt: string;
  model?: string;
  seoSlug?: string;
  likeCount: number;
  viewCount: number;
  aspectRatio?: string;
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
  /** Additional className for the card */
  className?: string;
}

// ==================== PromptCard Component ====================

/**
 * Unified Prompt Card with "Immersive Reveal" interaction.
 * 
 * DOM Structure (fixes nested <a> issue):
 * - Container: div (relative, group)
 * - Background click: Link (absolute inset-0, z-0)
 * - Interactive elements: z-20 (float above the Link)
 * 
 * Features:
 * - Slide-up info panel on hover
 * - Ghost-to-Neon Remix button
 * - Model badge (SEO essential)
 * - Like button with optimistic updates
 */
export function PromptCard({
  post,
  userReactions = [],
  onReactionChange,
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

  // Sync isLiked when userReactions prop changes (from batch API)
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
        // Revert optimistic update
        setIsLiked(previousLikedState);
        setLikeCount(previousLikeCount);
      } else {
        const { isCreated } = data.data!;
        setIsLiked(isCreated);
        // Notify parent of reaction change
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

  // Detail page URL (for image click)
  const detailUrl = post.seoSlug 
    ? `/prompts/${post.seoSlug}` 
    : `/image/${post.id}`;

  // Remix URL (canonical: loads full post data server-side)
  const remixUrl = `/ai-image-generator?remix_id=${post.id}`;

  // ==================== Render ====================

  return (
    <div
      className={cn(
        // Base: Glass Card with full width for Masonry
        'group relative mb-6 w-full overflow-hidden rounded-xl',
        'bg-card/40 backdrop-blur-md border border-border-medium shadow-lg',
        // Hover: Neon Glow Effect + lift
        'transition-all duration-300 hover:-translate-y-1',
        'hover:shadow-[0_0_25px_-10px_var(--color-primary)] hover:border-primary/30',
        className
      )}
    >
      <article className="h-full w-full">
        {/* Image Container */}
        <div className="relative aspect-square w-full overflow-hidden">
          
          {/* === Background Click Layer: Link to Detail Page === */}
          <Link 
            href={detailUrl} 
            className="absolute inset-0 z-0"
            aria-label={`View details: ${post.prompt?.slice(0, 50) || 'AI Image'}`}
          >
            <Image
              src={post.imageUrl || '/placeholder.jpg'}
              alt={post.prompt || 'AI generated image'}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </Link>

          {/* ==================== STATIC ELEMENTS (z-20, Always Visible) ==================== */}
          
          {/* Model Badge (Top Left) - SEO Essential */}
          {post.model && (
            <Badge 
              variant="glass" 
              className="absolute left-3 top-3 z-20 text-[10px] font-bold uppercase tracking-wider pointer-events-none"
            >
              {getModelDisplayName(post.model)}
            </Badge>
          )}

          {/* Like Button (Top Right) - Interactive, above Link */}
          <Badge
            variant="glass"
            className="absolute right-3 top-3 z-20 gap-1.5 cursor-pointer hover:bg-primary/20 hover:border-primary/50 transition-all"
            onClick={handleLike}
          >
            <span className={isLiked ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'opacity-70'}>
              {isLiked ? '❤️' : '🤍'}
            </span>
            <span>{likeCount}</span>
          </Badge>

          {/* ==================== SLIDE-UP PANEL (z-10) ==================== */}
          
          {/* 
            Bottom Info Panel Container:
            - Default: Pushed down, only showing ~56px (1 line prompt + ghost remix)
            - Hover: Slides up to reveal full content
          */}
          <div 
            className={cn(
              'absolute bottom-0 left-0 right-0 z-10',
              // Slide-up animation
              'transform translate-y-[calc(100%-56px)] group-hover:translate-y-0',
              'transition-transform duration-500 ease-out'
            )}
          >
            {/* Strong gradient background for readability */}
            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-5 px-4">
              
              {/* Prompt Text - 1 line default, 3 lines on hover */}
              <p 
                className={cn(
                  'text-sm text-white/90 font-medium drop-shadow-md mb-3',
                  'line-clamp-1 group-hover:line-clamp-3',
                  'transition-all duration-300'
                )}
              >
                {post.prompt || 'No prompt available'}
              </p>

              {/* User & Remix Button Row - Fades in on hover */}
              <div 
                className={cn(
                  'flex items-center justify-between',
                  // Fade in with delay
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

                {/* Remix Button - z-20 to float above background Link */}
                {/* Ghost Mode → Neon Mode on hover */}
                <Link
                  href={remixUrl}
                  className={cn(
                    'z-20 relative inline-flex items-center justify-center gap-1.5',
                    'rounded-full px-3 py-1.5 text-xs font-medium',
                    // Ghost Mode (Default)
                    'bg-white/10 backdrop-blur-md border border-white/20 text-white',
                    // Neon Mode (Hover)
                    'group-hover:bg-primary group-hover:text-black group-hover:border-primary',
                    'group-hover:shadow-[0_0_15px_var(--color-primary)]',
                    'transition-all duration-300',
                    // Hover on button itself
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
    </div>
  );
}
