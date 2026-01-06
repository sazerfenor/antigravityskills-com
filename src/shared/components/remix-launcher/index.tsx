'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

interface RemixLauncherProps {
  prompt: string;
  postId: string;
  model?: string;
  aspectRatio?: string;
}

/**
 * RemixLauncher - Smart Remix Access entry point
 *
 * Replaces the old InstantGenerator with a lightweight launcher that
 * redirects users to the full VisionLogicPlayground with context preserved.
 *
 * @see PRD: docs/PRD-Smart-Remix-Access-v1.0.md
 */
export const RemixLauncher = ({
  prompt,
  postId,
  model,
  aspectRatio = '1:1'
}: RemixLauncherProps) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Prompt copied!');
  };

  const handleRemix = () => {
    setIsRedirecting(true);

    // Use remix_id to let server fetch complete params (including formValues, schema, etc.)
    // This ensures full Creation Recipe restoration, matching Gallery's Remix behavior
    router.push(`/ai-image-generator?remix_id=${postId}`);
  };

  return (
    <Card
      variant="feature"
      className={cn(
        // Glass background (CBDS §5.1)
        'bg-card/60 backdrop-blur-xl',
        // Neon border (CBDS §5.2)
        'border-primary/20',
        // Glow shadow (CBDS §11.1)
        'shadow-[0_0_30px_-10px_rgba(250,204,21,0.15)]',
        // Layout
        'rounded-xl p-6 space-y-5'
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Icon with glow (CBDS §11.3) */}
          <Sparkles className="h-[18px] w-[18px] text-primary drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
          <h2 className="font-bold text-base text-foreground">Remix Station</h2>
        </div>
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          onClick={handleCopyPrompt}
          aria-label={copied ? 'Copied to clipboard' : 'Copy prompt to clipboard'}
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Prompt Preview - Read-only, clickable to copy */}
      <div
        className={cn(
          // Glass preview area (CBDS §11.5)
          'bg-glass-subtle backdrop-blur-sm',
          'rounded-lg border border-border-medium/50',
          'p-3 min-h-[12rem] max-h-[20rem]',
          // Typography - more visible white text
          'text-sm font-mono text-foreground/90 leading-relaxed',
          // Overflow handling - auto scrollbar (hidden until needed)
          'overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
          // Interaction
          'cursor-pointer hover:border-primary/30 transition-colors'
        )}
        onClick={handleCopyPrompt}
        title="Click to copy prompt"
      >
        {prompt || 'No prompt available'}
      </div>

      {/* Remix Button - Primary CTA with enhanced glow */}
      <Button
        onClick={handleRemix}
        disabled={isRedirecting || !prompt}
        variant="glow-shimmer"
        size="xl"
        className="w-full h-12 rounded-lg shadow-[0_0_30px_-8px_rgba(250,204,21,0.5)] hover:shadow-[0_0_40px_-8px_rgba(250,204,21,0.7)]"
      >
        {isRedirecting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Redirecting to Studio...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Remix in Studio
          </>
        )}
      </Button>
    </Card>
  );
};
