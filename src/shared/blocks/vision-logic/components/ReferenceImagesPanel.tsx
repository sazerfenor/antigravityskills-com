'use client';

import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { ImagePlus, X, Image as ImageIcon, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { m, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { uploadImageFile } from '../../common/image-uploader';

// ============================================
// Reference Images Panel Component
// Extracted from vision-logic-playground.tsx
// ============================================

export interface ReferenceImagesPanelProps {
  /** 已上传的图片 URLs */
  uploadedImageUrls: string[];
  /** 更新上传图片 URLs */
  setUploadedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  /** 是否在上传中 */
  isUploadingImages: boolean;
  /** 设置上传状态 */
  setIsUploadingImages: React.Dispatch<React.SetStateAction<boolean>>;
  /** 是否使用参考图片生成 */
  useReferenceImages: boolean;
  /** 设置是否使用参考图片 */
  setUseReferenceImages: React.Dispatch<React.SetStateAction<boolean>>;
  /** 面板是否展开 */
  isOpen: boolean;
  /** 设置面板展开状态 */
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** 点击图片预览回调 */
  onImagePreview: (url: string) => void;
}

export function ReferenceImagesPanel({
  uploadedImageUrls,
  setUploadedImageUrls,
  isUploadingImages,
  setIsUploadingImages,
  useReferenceImages,
  setUseReferenceImages,
  isOpen,
  setIsOpen,
  onImagePreview,
}: ReferenceImagesPanelProps) {
  // 删除图片
  const handleDeleteImage = (idx: number) => {
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== idx));
    // 最后一张图片删除后自动关闭 toggle
    if (uploadedImageUrls.length <= 1) {
      setUseReferenceImages(false);
    }
  };

  // 上传图片
  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (uploadedImageUrls.length + newUrls.length >= 4) break;
        const url = await uploadImageFile(file);
        if (url) newUrls.push(url);
      }
      setUploadedImageUrls(prev => [...prev, ...newUrls]);
      // 第一张图片上传后自动开启 toggle
      if (uploadedImageUrls.length === 0 && newUrls.length > 0) {
        setUseReferenceImages(true);
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImages(false);
    }
  };

  return (
    <div className="w-full">
      {/* Collapsible Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full flex items-center justify-between
          p-4 rounded-xl
          bg-glass-subtle border border-border-medium
          hover:bg-glass-strong transition-all
          cursor-pointer select-none
        "
      >
        <div className="flex items-center gap-2">
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Reference Images</span>
          <Badge variant="outline" className="text-xs">optional</Badge>
        </div>
        <div className="flex items-center gap-2">
          {uploadedImageUrls.length > 0 && (
            <Badge variant="default" className="text-xs">
              {uploadedImageUrls.length}/4
            </Badge>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <Card className="p-4 bg-glass-subtle border border-border-medium">
                {/* Image Grid - Mobile Optimized */}
                <div className="flex gap-3 flex-wrap mb-4">
                  {uploadedImageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group cursor-pointer"
                      onClick={() => onImagePreview(url)}
                    >
                      <img
                        src={url}
                        alt={`Reference ${idx + 1}`}
                        className="
                          w-16 h-16 sm:w-14 sm:h-14
                          object-cover rounded-lg
                          border border-border-medium
                          hover:border-primary/50
                          transition-all
                        "
                      />
                      {/* Delete Button */}
                      <button
                        className="
                          absolute -top-2 -right-2
                          w-6 h-6
                          flex items-center justify-center
                          bg-background/80 backdrop-blur-sm
                          border border-border-medium
                          rounded-full
                          text-muted-foreground hover:text-destructive
                          hover:border-destructive/50
                          opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                          transition-all
                          before:content-[''] before:absolute before:-inset-2
                        "
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(idx);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Button */}
                  {uploadedImageUrls.length < 4 && (
                    <label className="
                      w-16 h-16 sm:w-14 sm:h-14
                      border border-border-medium
                      bg-glass-subtle
                      rounded-lg flex items-center justify-center
                      hover:border-primary/50 hover:bg-glass-strong
                      transition-all cursor-pointer
                    ">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handleUploadImages(e.target.files);
                          e.target.value = '';
                        }}
                      />
                      {isUploadingImages ? (
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      )}
                    </label>
                  )}
                </div>

                {/* Use for Generation Toggle */}
                {uploadedImageUrls.length > 0 && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-border-light">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="use-ref-toggle" className="text-sm cursor-pointer">
                          Use for generation
                        </Label>
                        <Badge variant="outline" className="text-xs">i2i</Badge>
                      </div>
                      <Switch
                        id="use-ref-toggle"
                        checked={useReferenceImages}
                        onCheckedChange={setUseReferenceImages}
                      />
                    </div>

                    {/* Credit Info */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {uploadedImageUrls.length} reference image(s) • No extra credits
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
