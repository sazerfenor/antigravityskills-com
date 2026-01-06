'use client';

import { forwardRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { Loader2, Sparkles, ImagePlus, Download, Share2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { LazyImage } from '@/shared/blocks/common';
import type { GeneratedImage } from '../types';

// ============================================
// Generated Images Section Component
// Extracted from vision-logic-playground.tsx
// ============================================

export interface GeneratedImagesSectionProps {
  /** 是否正在生成图片 */
  isGenerating: boolean;
  /** 生成进度 (0-100) */
  displayProgress: number;
  /** 进度消息 */
  progressMessage: string;
  /** 生成的图片列表 */
  generatedImages: GeneratedImage[];
  /** 已上传的参考图片 URLs (用于检查重复) */
  uploadedImageUrls: string[];
  /** 正在下载的图片 ID */
  downloadingImageId: string | null;
  /** 点击图片预览回调 */
  onImagePreview: (url: string) => void;
  /** 用作参考图片回调 */
  onUseAsReference: (url: string) => void;
  /** 下载图片回调 */
  onDownload: (image: GeneratedImage) => void;
  /** 分享图片回调 */
  onShare: (imageUrl: string) => void;
}

export const GeneratedImagesSection = forwardRef<HTMLDivElement, GeneratedImagesSectionProps>(
  function GeneratedImagesSection(
    {
      isGenerating,
      displayProgress,
      progressMessage,
      generatedImages,
      uploadedImageUrls,
      downloadingImageId,
      onImagePreview,
      onUseAsReference,
      onDownload,
      onShare,
    },
    ref
  ) {
    // 如果没有生成中也没有已生成图片，不渲染
    if (!isGenerating && generatedImages.length === 0) {
      return null;
    }

    return (
      <div ref={ref} className="mt-6">
        {isGenerating ? (
          // 生成中状态
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-full h-[400px] rounded-xl border border-border-medium bg-glass-subtle backdrop-blur-xl overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 blur-3xl animate-pulse" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">{progressMessage}</p>
                <div className="w-40 h-1 bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 已生成图片
          <div className="grid gap-4">
            {generatedImages.map((image) => (
                <div
                  key={image.id}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-border/50 cursor-pointer",
                    "transition-all duration-300 ease-out",
                    "hover:border-primary/50"
                  )}
                  onClick={() => onImagePreview(image.url)}
                >
                  <LazyImage
                    src={image.url}
                    alt="Generated image"
                    className="w-full h-auto"
                    width={1024}
                    height={1024}
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                  <div className="absolute right-2 bottom-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Use as Reference Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-background/80 backdrop-blur-sm"
                          onClick={() => onUseAsReference(image.url)}
                          disabled={uploadedImageUrls.length >= 4 || uploadedImageUrls.includes(image.url)}
                        >
                          <ImagePlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {uploadedImageUrls.includes(image.url) ? 'Already in references' : 'Use as Reference'}
                      </TooltipContent>
                    </Tooltip>
                    {/* Download Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-background/80 backdrop-blur-sm"
                          onClick={() => onDownload(image)}
                          disabled={downloadingImageId === image.id}
                        >
                          {downloadingImageId === image.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Download Image</TooltipContent>
                    </Tooltip>
                    {/* Share Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--color-primary),0.5)] hover:shadow-[0_0_25px_rgba(var(--color-primary),0.7)] hover:bg-primary/90 transition-all duration-300 border border-primary/20"
                          onClick={() => onShare(image.url)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Share</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }
);
