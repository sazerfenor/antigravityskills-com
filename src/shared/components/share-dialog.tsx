'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { toast } from 'sonner';
import { Check, Copy, Share2, Loader2, Globe } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string;
  prompt?: string;
  aiTaskId?: string;
  onShareToCommunity?: () => Promise<void>;
  isSharing?: boolean;
}

export function ShareDialog({ 
  open, 
  onOpenChange, 
  imageUrl, 
  prompt,
  aiTaskId,
  onShareToCommunity,
  isSharing = false,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate share URL (current page or image URL)
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = prompt ? `Check out this AI image: ${prompt.slice(0, 50)}...` : 'Check out this AI image!';
  // TODO: 自定义你的分享文案
  const shareText = `Created with AI Image Generator ✨`;

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // X (Twitter) share
  const handleXShare = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  // Facebook share
  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  // Instagram - Note: Instagram doesn't have a web share API, but we can guide users
  const handleInstagramShare = () => {
    // Instagram doesn't support direct web sharing, so we copy the link and show a tip
    navigator.clipboard.writeText(shareUrl);
    toast.info('Link copied! Open Instagram to share in your story or post.', { duration: 4000 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Your Creation
          </DialogTitle>
          <DialogDescription>
            Share this AI-generated image with your friends and the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Primary Action: Share to Community */}
          {onShareToCommunity && (
            <Button
              variant="glow-primary"
              className="w-full h-12 text-base"
              onClick={onShareToCommunity}
              disabled={isSharing}
            >
              {isSharing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-5 w-5" />
                  Share to Community Gallery
                </>
              )}
            </Button>
          )}

          {/* Divider */}
          {onShareToCommunity && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-medium" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or share to</span>
              </div>
            </div>
          )}

          {/* Social Share Buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* X (formerly Twitter) */}
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              onClick={handleXShare}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="hidden sm:inline">X</span>
            </Button>
            
            {/* Facebook */}
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              onClick={handleFacebookShare}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="hidden sm:inline">Facebook</span>
            </Button>
            
            {/* Instagram */}
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              onClick={handleInstagramShare}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              <span className="hidden sm:inline">Instagram</span>
            </Button>
          </div>

          {/* Copy Link Section */}
          <div className="flex items-center gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1 bg-glass-hint text-sm"
            />
            <Button
              size="sm"
              variant={copied ? 'default' : 'outline'}
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Native Share (Mobile) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
                  toast.success('Shared successfully!');
                } catch (err) {
                  if ((err as Error).name !== 'AbortError') {
                    toast.error('Failed to share');
                  }
                }
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              More sharing options...
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
