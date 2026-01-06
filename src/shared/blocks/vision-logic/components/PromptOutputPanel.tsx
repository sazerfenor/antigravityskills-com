'use client';

import { forwardRef } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Loader2, Sparkles, Image as ImageIcon, User, ChevronDown, Info, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { m, AnimatePresence } from 'framer-motion';
import { CopyButton } from '@/shared/components/copy-button';
import { GlassOverlay } from '@/shared/components/ui/glass-overlay';
import { HighlightedPrompt } from './HighlightedPrompt';
import {
  MODEL_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  ASPECT_RATIO_OPTIONS_PRO,
  IMAGE_SIZE_OPTIONS,
  getModelByValue,
} from '@/shared/hooks/use-image-generation';
import type { DynamicSchema, UIState, GeneratePhase, PromptHighlights, GeneratedImage } from '../types';
import { GeneratedImagesSection } from './GeneratedImagesSection';

// ============================================
// Prompt Output Panel Component
// Extracted from vision-logic-playground.tsx
// Contains: Prompt Display, Model/Ratio, Credits, Actions, Generated Images
// ============================================

export interface PromptOutputPanelProps {
  // Prompt State
  promptNative: string;
  promptEnglish: string;
  detectedLang: string;
  promptHighlights: PromptHighlights;
  useEnglishForGeneration: boolean;
  setPromptNative: (v: string) => void;
  setPromptEnglish: (v: string) => void;
  setUseEnglishForGeneration: (v: boolean) => void;
  onPromptChange: (prompt: string) => void;
  onHighlightClick: (fieldId: string) => void;

  // UI State
  uiState: UIState;
  generatePhase: GeneratePhase;
  optimizeMessage: string;
  /** Optimize 阶段进度 (0-100)，由父组件传入 */
  optimizeProgress: number;
  activeSchema: DynamicSchema | null;

  // Model & Ratio
  model: string;
  aspectRatio: string;
  resolution: '1K' | '2K' | '4K';
  setModel: (v: string) => void;
  setAspectRatio: (v: string) => void;
  setResolution: (v: '1K' | '2K' | '4K') => void;

  // Credits
  generateCost: number;
  compileCost: number;
  remainingCredits: number;
  insufficientCredits: boolean;
  isCheckSign: boolean;
  isCreditsLoading: boolean;

  // User & Auth
  userId: string | undefined;
  onSignIn: () => void;

  // Actions
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  isOneClickProcessing: boolean;
  isGeneratingImage: boolean;
  onOneClickGenerate: () => void;
  onCompile: () => void;
  onGenerateImage: () => void;

  // Generated Images
  generatedImages: GeneratedImage[];
  displayProgress: number;
  progressMessage: string;
  uploadedImageUrls: string[];
  downloadingImageId: string | null;
  onImagePreview: (url: string) => void;
  onUseAsReference: (url: string) => void;
  onDownload: (image: GeneratedImage) => void;
  onShare: (imageUrl: string) => void;
}

export const PromptOutputPanel = forwardRef<HTMLDivElement, PromptOutputPanelProps>(
  function PromptOutputPanel(props, ref) {
    const {
      // Prompt State
      promptNative,
      promptEnglish,
      detectedLang,
      promptHighlights,
      useEnglishForGeneration,
      setPromptNative,
      setPromptEnglish,
      setUseEnglishForGeneration,
      onPromptChange,
      onHighlightClick,
      // UI State
      uiState,
      generatePhase,
      optimizeMessage,
      optimizeProgress,
      activeSchema,
      // Model & Ratio
      model,
      aspectRatio,
      resolution,
      setModel,
      setAspectRatio,
      setResolution,
      // Credits
      generateCost,
      compileCost,
      remainingCredits,
      insufficientCredits,
      isCheckSign,
      isCreditsLoading,
      // User & Auth
      userId,
      onSignIn,
      // Actions
      showAdvanced,
      setShowAdvanced,
      isOneClickProcessing,
      isGeneratingImage,
      onOneClickGenerate,
      onCompile,
      onGenerateImage,
      // Generated Images
      generatedImages,
      displayProgress,
      progressMessage,
      uploadedImageUrls,
      downloadingImageId,
      onImagePreview,
      onUseAsReference,
      onDownload,
      onShare,
    } = props;

    const isBilingual = detectedLang !== 'English' && promptNative !== promptEnglish && (promptNative || promptEnglish);

    // Get current model config to check resolution support
    const currentModelConfig = getModelByValue(model);
    const supportsResolution = currentModelConfig?.supportsImageSize ?? false;
    // Filter resolution options based on model's supported resolutions
    const availableResolutions = supportsResolution
      ? IMAGE_SIZE_OPTIONS.filter(opt =>
          currentModelConfig?.supportedResolutions?.includes(opt.value)
        )
      : [];

    return (
      <div className="space-y-6 md:sticky md:top-24">
        <Card variant="glass" className="p-6 min-h-[500px] flex flex-col relative">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generated Prompt
            </h3>
            {(promptNative || promptEnglish) && (
              <CopyButton value={useEnglishForGeneration ? promptEnglish : promptNative} />
            )}
          </div>

          {/* Prompt Display */}
          {uiState === 'ANALYZING' ? (
            <div className="min-h-[120px] rounded-lg bg-glass-subtle border border-border-medium flex flex-col justify-center items-center">
              <p className="text-sm text-muted-foreground">Waiting for parameters...</p>
            </div>
          ) : (
            <div className="min-h-[200px] rounded-lg bg-glass-subtle border border-border-medium p-4 flex flex-col relative">
              {/* Optimizing Overlay */}
              {generatePhase === 'OPTIMIZING' && (
                <div className="absolute inset-0 z-10 rounded-lg overflow-hidden">
                  <GlassOverlay
                    autoSimulate={false}
                    progress={optimizeProgress}
                    dynamicMessages={false}
                    message={optimizeMessage || "Reading your creative vision..."}
                    showProgress={true}
                    variant="local"
                  />
                </div>
              )}

              {/* Bilingual Display */}
              {isBilingual ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
                  {/* Native */}
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      {detectedLang}
                    </span>
                    <Textarea
                      value={promptNative}
                      onChange={(e) => setPromptNative(e.target.value)}
                      className="min-h-[80px] w-full bg-transparent border-none text-foreground/90 leading-relaxed p-0 resize-none focus:ring-0 focus:outline-none placeholder:text-muted-foreground/30"
                      placeholder="Enter prompt..."
                    />
                  </div>
                  <div className="border-t border-border/30" />
                  {/* English */}
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      English (Recommended)
                    </span>
                    <Textarea
                      value={promptEnglish}
                      onChange={(e) => setPromptEnglish(e.target.value)}
                      className="min-h-[180px] w-full bg-transparent border-none text-foreground font-mono leading-relaxed p-0 resize-none focus:ring-0 focus:outline-none placeholder:text-muted-foreground/30 selection:bg-primary/20"
                      placeholder="Enter prompt..."
                    />
                  </div>
                </div>
              ) : (
                <div className="relative group w-full flex-1 flex flex-col">
                  <HighlightedPrompt
                    prompt={useEnglishForGeneration ? promptEnglish : promptNative}
                    highlights={promptHighlights.english}
                    onPromptChange={onPromptChange}
                    onHighlightClick={onHighlightClick}
                    editable={true}
                    placeholder="Your optimized prompt will appear here..."
                    className="w-full flex-1"
                  />
                </div>
              )}
            </div>
          )}

          {/* Model & Ratio Selectors */}
          {activeSchema && (
            <div className="space-y-3 mt-4">
              <div className={cn(
                "grid gap-3",
                supportsResolution ? "grid-cols-3" : "grid-cols-2"
              )}>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground/70">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="h-9 bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.filter(m => m.scenes.includes('text-to-image')).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground/70">Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="h-9 bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(model === 'gemini-3-pro-image-preview' ? ASPECT_RATIO_OPTIONS_PRO : ASPECT_RATIO_OPTIONS).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Resolution Selector - For models that support resolution selection */}
                {supportsResolution && availableResolutions.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground/70">Resolution</Label>
                    <Select value={resolution} onValueChange={(v) => setResolution(v as '1K' | '2K' | '4K')}>
                      <SelectTrigger className="h-9 bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableResolutions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Use English Checkbox */}
              {isBilingual && (
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Checkbox
                    checked={useEnglishForGeneration}
                    onCheckedChange={(checked) => setUseEnglishForGeneration(checked === true)}
                  />
                  <span>Use English prompt for generation <span className="text-primary/70">(recommended)</span></span>
                </label>
              )}
            </div>
          )}

          {/* Credits Display */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
              <Zap className="w-4 h-4 text-primary drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
              <span className="text-sm font-semibold text-primary drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                {generateCost} credits
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className={cn("font-medium", insufficientCredits ? 'text-amber-400' : 'text-foreground')}>
                {isCheckSign || isCreditsLoading ? '...' : remainingCredits}
              </span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <Collapsible className="mb-4">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
              <Info className="w-3 h-3" />
              <span>How credits work</span>
              <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="text-xs text-muted-foreground space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="grid grid-cols-[1fr,auto] gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-primary" />
                    {/* TODO: 自定义你的模型名称 */}
                    Base (Standard)
                  </span>
                  <span className="text-primary font-medium">10</span>
                  <span className="flex items-center gap-1 pl-4 text-muted-foreground/70">+ Pro/Advanced model</span>
                  <span className="text-muted-foreground/70">+10</span>
                  <span className="flex items-center gap-1 pl-4 text-muted-foreground/70">+ 2K resolution</span>
                  <span className="text-muted-foreground/70">+10</span>
                  <span className="flex items-center gap-1 pl-4 text-muted-foreground/70">+ 4K resolution</span>
                  <span className="text-muted-foreground/70">+20</span>
                  <span className="flex items-center gap-1 pl-4 text-muted-foreground/70">+ Image-to-Image</span>
                  <span className="text-muted-foreground/70">+10</span>
                  <span className="flex items-center gap-1 border-t border-border/50 pt-1 mt-1">
                    <Sparkles className="w-3 h-3 text-muted-foreground" />
                    Refine Prompt only
                  </span>
                  <span className="text-muted-foreground font-medium border-t border-border/50 pt-1 mt-1">{compileCost}</span>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <p className="flex items-start gap-1">
                    <Zap className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                    <span><strong>Tip:</strong> Generate Image includes free prompt optimization. Use Refine Prompt separately to preview before generating.</span>
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="space-y-3 mt-6">
            {isCheckSign ? (
              <Button size="xl" variant="glow-primary" className="w-full" disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </Button>
            ) : !userId ? (
              <Button size="xl" variant="glow-primary" className="w-full" onClick={onSignIn}>
                <User className="w-4 h-4 mr-2" />
                Sign In & Generate
              </Button>
            ) : (
              <div className="space-y-3">
                <Button
                  size="xl"
                  variant="glow-primary"
                  className="w-full"
                  onClick={onOneClickGenerate}
                  disabled={!activeSchema || isOneClickProcessing || isGeneratingImage}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Generate Image
                </Button>

                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Checkbox checked={showAdvanced} onCheckedChange={(c) => setShowAdvanced(c === true)} />
                  <span>Show Prompt Editor</span>
                </label>

                <AnimatePresence>
                  {showAdvanced && (
                    <m.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 grid grid-cols-2 gap-2">
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={onCompile}
                          disabled={!activeSchema || uiState === 'COMPILING' || remainingCredits < compileCost}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Refine Prompt
                          <span className="ml-1.5 text-xs opacity-70">({compileCost})</span>
                        </Button>
                        <Button
                          size="lg"
                          variant="secondary"
                          onClick={onGenerateImage}
                          disabled={isGeneratingImage || !(promptNative || promptEnglish) || remainingCredits < generateCost}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Use This Prompt
                          <span className="ml-1.5 text-xs opacity-70">({generateCost})</span>
                        </Button>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Credits Upsell */}
          {userId && insufficientCredits && (
            <div className="mt-4 p-4 rounded-xl bg-glass-subtle backdrop-blur-sm border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Preview your prompt for free!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click Generate to see your prompt, then get {generateCost} credits to create the image
                  </p>
                </div>
              </div>
              <a href="/pricing" className="block mt-3">
                <Button variant="default" className="w-full" size="lg">
                  <Zap className="mr-2 h-4 w-4" />
                  Get Credits
                </Button>
              </a>
            </div>
          )}

          {/* Generated Images */}
          <GeneratedImagesSection
            ref={ref}
            isGenerating={isGeneratingImage}
            displayProgress={displayProgress}
            progressMessage={progressMessage}
            generatedImages={generatedImages}
            uploadedImageUrls={uploadedImageUrls}
            downloadingImageId={downloadingImageId}
            onImagePreview={onImagePreview}
            onUseAsReference={onUseAsReference}
            onDownload={onDownload}
            onShare={onShare}
          />
        </Card>
      </div>
    );
  }
);
