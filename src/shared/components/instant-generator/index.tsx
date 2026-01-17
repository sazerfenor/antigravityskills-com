'use client';

import { useState } from 'react';
import { Copy, Check, Download, Share2, Sparkles, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { showCreditsUpsell } from '@/shared/lib/toast-utils';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useAppContext } from '@/shared/contexts/app';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import { parseApiResponse } from '@/shared/types/api';

// Import from shared Hook
import {
  MODEL_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  POLL_INTERVAL,
  GENERATION_TIMEOUT,
  getProviderFromModel,
  extractImageUrls,
} from '@/shared/hooks/use-image-generation';

// ===== Types =====
interface InstantGeneratorProps {
  initialPrompt: string;
  postId: string;
  initialModel?: string;        // From post.model
  initialAspectRatio?: string;  // From post.aspectRatio
  onImageGenerated?: (imageUrl: string, taskId: string) => void;
}

/**
 * @deprecated Use RemixLauncher instead.
 *
 * This component is kept for backward compatibility but will be removed in v2.0.
 * The InstantGenerator functionality has been moved to VisionLogicPlayground
 * with the RemixLauncher as the entry point.
 *
 * Migration guide:
 * - Replace: <InstantGenerator postId={...} initialPrompt={...} />
 * - With:    <RemixLauncher postId={...} prompt={...} />
 *
 * @see PRD: docs/PRD-Smart-Remix-Access-v1.0.md
 * @see RemixLauncher: src/shared/components/remix-launcher/index.tsx
 */
// ===== Component =====
export function InstantGenerator({ initialPrompt, postId, initialModel, initialAspectRatio, onImageGenerated }: InstantGeneratorProps) {
  // Development warning
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[Deprecated] InstantGenerator is deprecated. Use RemixLauncher instead.\n' +
      'See: src/shared/components/remix-launcher/index.tsx'
    );
  }

  const tError = useTranslations('common.imageGeneration');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [model, setModel] = useState(initialModel || MODEL_OPTIONS[0].value);
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio || '1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareToPublic, setShareToPublic] = useState(true);
  const [isSharingImage, setIsSharingImage] = useState(false);

  const { user, setIsShowSignModal, fetchUserCredits } = useAppContext();
  const remainingCredits = user?.credits?.remainingCredits ?? 0;
  
  // Dynamic credit cost based on selected model
  const currentModel = MODEL_OPTIONS.find(m => m.value === model) || MODEL_OPTIONS[0];
  const costCredits = currentModel.baseCredits;

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Prompt copied!');
  };

  const handleGenerate = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (remainingCredits < costCredits) {
      showCreditsUpsell('Insufficient credits. Get more to keep creating.');
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast.error('Please enter a prompt');
      return;
    }

    const provider = getProviderFromModel(model);

    setIsGenerating(true);
    setProgress(15);
    setGeneratedImage(null);

    try {
      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: AIMediaType.IMAGE,
          scene: 'text-to-image',
          provider,
          model,
          prompt: trimmedPrompt,
          options: { aspectRatio },
        }),
      });

      // 🆕 Always parse response body to get real error message
      const responseData = await resp.json();
      const { code, message, data } = parseApiResponse(responseData);
      
      if (!resp.ok || code !== 0) {
        // 🆕 Build error object with metadata for ErrorHandler
        const errorWithMeta: any = new Error(message || `Request failed: ${resp.status}`);
        errorWithMeta.errorId = data?.errorId;
        errorWithMeta.errorType = data?.errorType;
        errorWithMeta.shouldRetry = data?.shouldRetry || false;
        errorWithMeta.retryDelay = data?.retryDelay;
        throw errorWithMeta;
      }

      const taskId = data?.id;
      if (!taskId) {
        throw new Error('Task ID missing');
      }
      
      setCurrentTaskId(taskId);

      // Handle immediate success (Gemini sync response)
      if (data.status === AITaskStatus.SUCCESS && data.taskInfo) {
        const parsedResult = typeof data.taskInfo === 'string' ? JSON.parse(data.taskInfo) : data.taskInfo;
        const imageUrls = extractImageUrls(parsedResult);
        if (imageUrls.length > 0) {
          setGeneratedImage(imageUrls[0]);
          onImageGenerated?.(imageUrls[0], taskId);
          toast.success('Image generated!');
          setProgress(100);
          setIsGenerating(false);
          await fetchUserCredits();
          return;
        }
      }

      // Poll for async tasks
      setProgress(25);
      await pollTask(taskId);
    } catch (error: any) {
      console.error('[InstantGenerator] Error:', error);
      
      // 🆕 Use unified ErrorHandler for consistent error display and retry
      const { ErrorHandler } = await import('@/shared/lib/error-handler');
      
      await ErrorHandler.handle(error, {
        feature: 'instant-generator',
        onRetry: () => handleGenerate(),
      });
      
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const pollTask = async (taskId: string) => {
    const startTime = Date.now();

    const poll = async (): Promise<boolean> => {
      if (Date.now() - startTime > GENERATION_TIMEOUT) {
        toast.error('Generation timed out');
        setIsGenerating(false);
        setProgress(0);
        return true;
      }

      try {
        const resp = await fetch('/api/ai/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId }),
        });

        const { code, data } = parseApiResponse(await resp.json());
        if (code !== 0) return false;

        if (data.status === AITaskStatus.SUCCESS) {
          const parsedResult = typeof data.taskResult === 'string' ? JSON.parse(data.taskResult) : data.taskResult;
          const imageUrls = extractImageUrls(parsedResult);
          if (imageUrls.length > 0) {
            setGeneratedImage(imageUrls[0]);
            onImageGenerated?.(imageUrls[0], taskId);
            toast.success('Image generated!');
            setProgress(100);
            setIsGenerating(false);
            await fetchUserCredits();
            return true;
          }
        }

        if (data.status === AITaskStatus.FAILED) {
          toast.error('Generation failed');
          setIsGenerating(false);
          setProgress(0);
          return true;
        }

        setProgress((prev) => Math.min(prev + 10, 90));
        return false;
      } catch {
        return false;
      }
    };

    // Initial poll
    if (await poll()) return;

    // Continue polling
    const interval = setInterval(async () => {
      if (await poll()) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL);
  };

  // Download handler
  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  // Share to Community handler (same as main ImageGenerator)
  const handleShareToCommunity = async () => {
    if (!currentTaskId) {
      toast.error('No image to share');
      return;
    }

    setIsSharingImage(true);
    try {
      const resp = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiTaskId: currentTaskId,
          shareToPublic,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Request failed with status: ${resp.status}`);
      }

      const { code, message }: any = await resp.json();
      if (code !== 0) {
        throw new Error(message || 'Failed to share image');
      }

      toast.success(
        shareToPublic
          ? 'Image submitted for review!'
          : 'Image saved to your private gallery'
      );
      setShowShareDialog(false);
    } catch (error: any) {
      console.error('Failed to share image:', error);
      toast.error(`Failed to share: ${error.message}`);
    } finally {
      setIsSharingImage(false);
    }
  };

  // Open share dialog
  const handleShare = () => {
    if (!generatedImage || !currentTaskId) {
      toast.error('Generate an image first');
      return;
    }
    setShowShareDialog(true);
  };

  // ===== Render =====
  return (
    <Card variant="feature" padding="default" className="relative space-y-6 bg-card/60 backdrop-blur-xl border-primary/20 shadow-[0_0_30px_-10px_var(--color-primary)] overflow-hidden">

      {/* 🌟 Glass Overlay for Loading State - Deeper Glass, Centered Progress */}
      {isGenerating && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl rounded-xl">
          {/* Center Content - No Light Spot */}
          <div className="relative flex flex-col items-center gap-4">
            {/* Spinning Loader */}
            <div className="h-12 w-12 text-primary animate-spin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
              </svg>
            </div>
            
            {/* Loading Text */}
            <p className="text-sm font-medium text-muted-foreground">
              Dreaming in Neon...
            </p>
            
            {/* Centered Progress Bar */}
            <div className="w-48 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/70">Progress</span>
                <span className="text-primary font-mono tabular-nums">{progress}%</span>
              </div>
              <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center relative z-10">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Sparkles className="h-[18px] w-[18px] text-primary" />
          Instant Generator
        </h3>
      </div>

      <div className="space-y-2 relative z-10 group">
        <div className="flex justify-between items-end mb-1">
          <label className="text-xs text-muted-foreground font-medium ml-1">Prompt</label>
          <button 
            className="text-[10px] text-text-quaternary hover:text-foreground transition-colors flex items-center gap-1"
            onClick={handleCopyPrompt}
          >
            {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <Textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          variant="default"
          className="h-40 font-mono text-text-secondary leading-relaxed custom-scrollbar bg-black/20" 
          spellCheck={false}
          placeholder="Enter your prompt..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3 relative z-10">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Model</label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider ml-1">Aspect Ratio</label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger className="w-full text-xs">
              <SelectValue placeholder="Select Ratio" />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Credits Display - Cost and Your Balance */}
      <div className="flex justify-between items-center text-[10px] w-full relative z-10">
        <span className="text-muted-foreground">
          Cost: <span className="text-primary font-medium">{costCredits} Credits</span>
        </span>
        <span className="text-muted-foreground">
          Your Balance: <span className={remainingCredits >= costCredits ? "text-primary font-medium" : "text-destructive font-medium"}>
            {user ? remainingCredits : '—'}
          </span>
        </span>
      </div>

      {/* Generate Button - Fixed text visibility */}
      <Button 
        id="generate-btn" 
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        variant="default"
        size="xl"
        className="w-full z-10 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Sparkles className="h-5 w-5 mr-2" />
        {isGenerating ? 'Generating...' : 'GENERATE'}
      </Button>

      {/* Generated Image with Download/Share */}
      {generatedImage && (
        <div className="relative z-10 space-y-3 mt-4">
          <div className="rounded-lg overflow-hidden border border-border-medium">
            <img src={generatedImage} alt="Generated" className="w-full h-auto" />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      )}

      {/* Share to Community Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share to Community</DialogTitle>
            <DialogDescription>
              Share your amazing creation with the community!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Share to Community Gallery</div>
                <div className="text-muted-foreground text-xs">
                  {shareToPublic
                    ? 'Your image will be reviewed before appearing in the public gallery'
                    : 'Save to your private gallery (only visible to you)'}
                </div>
              </div>
              <Switch
                checked={shareToPublic}
                onCheckedChange={setShareToPublic}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(false)}
              disabled={isSharingImage}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShareToCommunity}
              disabled={isSharingImage}
            >
              {isSharingImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  {shareToPublic ? 'Share' : 'Save'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
