'use client';

import { RefObject } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Loader2, Sparkles, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImageFile } from '../../common/image-uploader';
import { useDebug } from '@/shared/contexts/debug';
import type { UIState, DynamicSchema } from '../types';

// ============================================
// Hero Input Section Component
// Extracted from vision-logic-playground.tsx
// Contains: Main input field, image upload button, build button
// ============================================

export interface HeroInputSectionProps {
  // Input State
  input: string;
  setInput: (v: string) => void;
  activeSchema: DynamicSchema | null;

  // UI State
  uiState: UIState;
  isOneClickProcessing: boolean;
  isGeneratingImage: boolean;

  // Image Upload
  uploadedImageUrls: string[];
  setUploadedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  isUploadingImages: boolean;
  setIsUploadingImages: React.Dispatch<React.SetStateAction<boolean>>;
  setUseReferenceImages: React.Dispatch<React.SetStateAction<boolean>>;
  setRefSectionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: RefObject<HTMLInputElement | null>;

  // Actions
  onAnalyzeIntent: (input: string) => void;
}

export function HeroInputSection({
  // Input State
  input,
  setInput,
  activeSchema,
  // UI State
  uiState,
  isOneClickProcessing,
  isGeneratingImage,
  // Image Upload
  uploadedImageUrls,
  setUploadedImageUrls,
  isUploadingImages,
  setIsUploadingImages,
  setUseReferenceImages,
  setRefSectionOpen,
  fileInputRef,
  // Actions
  onAnalyzeIntent,
}: HeroInputSectionProps) {
  const { pushDebug } = useDebug();

  const handleImageUpload = async (files: File[]) => {
    if (!files.length) return;

    if (files.length + uploadedImageUrls.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }

    // Open Reference Images section to show upload progress
    setRefSectionOpen(true);
    setIsUploadingImages(true);

    try {
      const newUrls: string[] = [];
      for (const file of files) {
        if (uploadedImageUrls.length + newUrls.length >= 4) break;
        const url = await uploadImageFile(file, 'ai-image-reference');
        if (url) newUrls.push(url);
      }

      setUploadedImageUrls(prev => [...prev, ...newUrls]);

      // Auto-enable toggle when first image is uploaded
      if (uploadedImageUrls.length === 0 && newUrls.length > 0) {
        setUseReferenceImages(true);
      }

      // Debug: Log image upload
      pushDebug('vision-logic', 'Images Uploaded to Reference', {
        uploadedCount: newUrls.length,
        totalCount: uploadedImageUrls.length + newUrls.length,
      });

      toast.success(`${newUrls.length} image(s) uploaded`);
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImages(false);
    }
  };

  return (
    <div className="relative flex items-center group">
      {/* Glow effect - same as homepage */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-purple-600/50 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt" />

      <input
        id="vision-prompt-input"
        type="text"
        name="vision-prompt-input-unique"
        aria-label="Enter your creative idea"
        placeholder={activeSchema ? "Want something else? Enter new idea..." : "Describe your idea..."}
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        list="empty-datalist"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            onAnalyzeIntent(input);
          }
        }}
        className="relative border-border-medium bg-glass-strong backdrop-blur-xl ring-offset-background placeholder:text-muted-foreground focus-visible:ring-primary/50 flex h-16 w-full rounded-full border px-8 py-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-44 sm:pr-52 shadow-2xl transition-all"
      />
      {/* Empty datalist to prevent browser autocomplete */}
      <datalist id="empty-datalist"></datalist>

      {/* Hidden file input - uploads directly to Reference Images section */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = ''; // Reset input immediately
          await handleImageUpload(files);
        }}
        className="hidden"
      />

      {/* Image upload button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-28 sm:right-36 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 hover:bg-primary/10"
        onClick={() => fileInputRef.current?.click()}
        disabled={uiState === 'ANALYZING' || uploadedImageUrls.length >= 4 || isUploadingImages}
      >
        {isUploadingImages ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
        {uploadedImageUrls.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
            {uploadedImageUrls.length}
          </span>
        )}
      </Button>

      <Button
        type="button"
        size="lg"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6 sm:px-8"
        onClick={() => onAnalyzeIntent(input)}
        disabled={!input.trim() || uiState === 'ANALYZING' || isOneClickProcessing || isGeneratingImage || isUploadingImages}
      >
        {uiState === 'ANALYZING' || isOneClickProcessing ? (
          <>
            <Sparkles className="mr-2 size-4 opacity-50" />
            <span className="hidden sm:inline">Build</span>
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4" />
            <span className="hidden sm:inline">Build</span>
          </>
        )}
      </Button>
    </div>
  );
}
