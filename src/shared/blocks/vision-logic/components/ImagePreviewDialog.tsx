'use client';

import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { X } from 'lucide-react';

// ============================================
// Image Preview Dialog Component
// Extracted from vision-logic-playground.tsx
// ============================================

export interface ImagePreviewDialogProps {
  /** 预览的图片 URL，null 时关闭 */
  imageUrl: string | null;
  /** 关闭对话框回调 */
  onClose: () => void;
}

export function ImagePreviewDialog({
  imageUrl,
  onClose,
}: ImagePreviewDialogProps) {
  return (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent
        showCloseButton={false}
        className="
          w-auto max-w-[95vw] h-auto max-h-[90vh]
          bg-transparent border-none shadow-none p-0
          overflow-visible
          data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
          data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
          duration-300 ease-out
        "
      >
        <DialogTitle className="sr-only">Image Preview</DialogTitle>

        {/* Image container with close button */}
        <div className="relative inline-block">
          {imageUrl && (
            <img
              src={imageUrl}
              className="
                max-w-[95vw] max-h-[90vh] w-auto h-auto
                object-contain rounded-lg
                shadow-2xl
              "
              alt="Preview"
            />
          )}

          {/* Close button - positioned relative to image */}
          <DialogClose className="
            absolute -top-3 -right-3
            w-9 h-9
            flex items-center justify-center
            bg-background/90 backdrop-blur-sm
            border border-border-medium
            rounded-full
            text-foreground/70 hover:text-foreground
            hover:bg-background
            transition-all duration-200
            shadow-lg
            z-10
          ">
            <X className="w-4 h-4" />
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
