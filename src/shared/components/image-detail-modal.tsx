'use client';

import { Heart, Sparkles, Copy, X, Laugh, Zap } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { getModelDisplayName } from '@/shared/lib/model-names';

interface ImageDetailModalProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PostDetail {
  id: string;
  imageUrl: string;
  prompt: string;
  model: string;
  likeCount: number;
  viewCount: number;
  aspectRatio: string;
  params: string;
  user?: {
    name: string;
    image?: string;
  };
  tags?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

const REACTION_ICONS = {
  like: Heart,
  heart: Heart,
  laugh: Laugh,
  cry: Heart, // Use Heart as placeholder
  bolt: Zap,
};

export function ImageDetailModal({
  postId,
  open,
  onOpenChange,
}: ImageDetailModalProps) {
  const router = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [reacting, setReacting] = useState(false);

  useEffect(() => {
    if (open && postId) {
      fetchPostDetail();
      fetchUserReactions();
    }
  }, [postId, open]);

  const fetchPostDetail = async () => {
    if (!postId) return;

    setLoading(true);
    try {
      const resp = await fetch(`/api/community/posts/${postId}`);
      if (!resp.ok) throw new Error('Failed to fetch post');

      const { data }: any = await resp.json();
      setPost(data);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      toast.error('Failed to load image details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReactions = async () => {
    if (!postId) return;

    try {
      const resp = await fetch(`/api/community/posts/${postId}/reaction`);
      if (resp.ok) {
        const { data }: any = await resp.json();
        setUserReactions(data.userReactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    }
  };

  const handleReaction = async (type: string) => {
    if (!postId || reacting) return;

    setReacting(true);
    try {
      const resp = await fetch(`/api/community/posts/${postId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!resp.ok) throw new Error('Failed to toggle reaction');

      const { data }: any = await resp.json();
      setUserReactions(data.userReactions || []);

      // Update like count optimistically
      if (post) {
        const isAdded = data.isCreated;
        setPost({
          ...post,
          likeCount: post.likeCount + (isAdded ? 1 : -1),
        });
      }
    } catch (error) {
      console.error('Failed to react:', error);
      toast.error('Failed to react. Please sign in.');
    } finally {
      setReacting(false);
    }
  };

  const handleCopy = () => {
    if (post) {
      navigator.clipboard.writeText(post.prompt);
      toast.success('Prompt copied!');
    }
  };

  const handleRemix = () => {
    if (post) {
      router.push(`/ai-image-generator?remix_id=${post.id}`);
      onOpenChange(false);
    }
  };

  if (loading || !post) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="bg-muted aspect-square animate-pulse rounded-lg" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
        <div className="grid gap-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Image Section */}
          <div className="bg-muted relative flex items-center justify-center p-4">
            <div className="relative h-full w-full max-w-2xl">
              <Image
                src={post.imageUrl}
                alt={post.prompt}
                width={800}
                height={800}
                className="h-auto w-full rounded-lg object-contain"
                priority
              />
            </div>
          </div>

          {/* Details Section */}
          <div className="flex flex-col gap-4 p-6">
            <DialogHeader>
              <DialogTitle className="sr-only">Image Details</DialogTitle>
            </DialogHeader>

            {/* User Info */}
            {post.user && (
              <div className="flex items-center gap-3">
                {post.user.image && (
                  <Image
                    src={post.user.image}
                    alt={post.user.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{post.user.name}</p>
                  <p className="text-muted-foreground text-xs">Creator</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Prompt</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8"
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
              <p className="text-sm leading-relaxed">{post.prompt}</p>
            </div>

            <Separator />

            {/* Model & Stats */}
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs">Model</p>
                <Badge variant="secondary" className="mt-1">
                  {getModelDisplayName(post.model)}
                </Badge>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Likes</p>
                  <p className="text-lg font-semibold">{post.likeCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Views</p>
                  <p className="text-lg font-semibold">{post.viewCount}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Reactions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">React</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(REACTION_ICONS).map(([type, Icon]) => (
                  <Button
                    key={type}
                    variant={
                      userReactions.includes(type) ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => handleReaction(type)}
                    disabled={reacting}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="mt-auto space-y-2">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleRemix}
              >
                <Sparkles className="h-4 w-4" />
                Remix This Image
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
