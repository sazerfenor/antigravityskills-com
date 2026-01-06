'use client';

import { useState } from 'react';
import { Code2, FileJson, ImageIcon, XCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Badge } from '@/shared/components/ui/badge';

export function JsonPreview({
  value,
  placeholder,
  metadata,
  className,
}: {
  value: string | object;
  placeholder?: string;
  metadata?: Record<string, any>;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!value) {
    return placeholder ? <div className={className}>{placeholder}</div> : null;
  }

  let jsonObject: any = value;
  let isJson = false;

  // Try to parse if it's a string
  if (typeof value === 'string') {
    try {
      jsonObject = JSON.parse(value);
      isJson = true;
    } catch (e) {
      // Not JSON, just display truncated text
      return (
        <div className={`truncate max-w-[200px] ${className}`} title={value}>
          {value}
        </div>
      );
    }
  } else if (typeof value === 'object') {
    isJson = true;
  }

  // Check if JSON is empty object
  if (isJson && typeof jsonObject === 'object' && !Array.isArray(jsonObject)) {
    const keys = Object.keys(jsonObject);
    if (keys.length === 0) {
      return <span className="text-muted-foreground">-</span>;
    }
  }

  // Helper to find image URL in common fields
  const findImageUrl = (obj: any): string | null => {
    if (!obj) return null;
    
    // Direct url fields
    if (typeof obj.url === 'string' && obj.url.startsWith('http')) {
      return obj.url;
    }
    if (typeof obj.image_url === 'string' && obj.image_url.startsWith('http')) {
      return obj.image_url;
    }
    
    // Gemini API response format: candidates[0].content.parts[0]
    if (obj.candidates && Array.isArray(obj.candidates) && obj.candidates.length > 0) {
      const candidate = obj.candidates[0];
      if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
        for (const part of candidate.content.parts) {
          // Check for file URI or URL in text
          if (part.fileData?.fileUri) {
            return part.fileData.fileUri;
          }
          // Check for inline data - might be base64 OR a URL
          if (part.inlineData?.data) {
            const data = part.inlineData.data;
            // Check if it's actually an HTTP URL stored in the data field
            if (typeof data === 'string' && data.startsWith('http')) {
              console.log('📸 Image URL found:', data);
              return data;
            }
            // Otherwise it's base64 data
            const mimeType = part.inlineData.mimeType || 'image/png';
            const dataUrl = `data:${mimeType};base64,${data}`;
            return dataUrl;
          }
          // Check for text containing URL
          if (typeof part.text === 'string' && part.text.startsWith('http')) {
            return part.text;
          }
        }
      }
    }
    
    // image_input array (user's input images)
    if (obj.image_input && Array.isArray(obj.image_input) && obj.image_input.length > 0) {
      const firstImage = obj.image_input[0];
      if (typeof firstImage === 'string' && firstImage.startsWith('http')) {
        return firstImage;
      }
    }
    
    // Array with url (e.g. output: ["url"])
    if (Array.isArray(obj)) {
        const first = obj[0];
        if (typeof first === 'string' && first.startsWith('http')) {
          return first;
        }
        if (typeof first === 'object') return findImageUrl(first);
    }
    
    // Nested common structures
    if (Array.isArray(obj.images) && obj.images.length > 0) return findImageUrl(obj.images);
    if (Array.isArray(obj.output) && obj.output.length > 0) return findImageUrl(obj.output);
    if (obj.data) return findImageUrl(obj.data);
    
    return null;
  };

  const imageUrl = findImageUrl(jsonObject);
  
  // Debug: log image URL when found
  if (imageUrl) {
    console.log('📸 Image URL found:', imageUrl);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}>
          {imageUrl && !imageError ? (
            <div className="relative h-10 w-10 rounded-md overflow-hidden border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt="Result Preview" 
                className="h-full w-full object-cover"
                onError={(e) => {
                  console.error('❌ Image load failed:', imageUrl);
                  setImageError(true);
                }}
              />
            </div>
          ) : imageUrl && imageError ? (
            <Badge variant="destructive" className="h-8">
              <XCircle className="h-3 w-3 mr-1" />
              Failed
            </Badge>
          ) : (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
              <FileJson className="h-4 w-4 mr-2" />
              <span className="text-xs">View Data</span>
            </Button>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {imageUrl ? <ImageIcon className="h-5 w-5" /> : <Code2 className="h-5 w-5" />}
            Data Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {imageUrl && (
            <div className="flex justify-center bg-muted/30 rounded-lg p-4 border border-dashed">
              {imageError ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <XCircle className="h-12 w-12 text-destructive" />
                  <p className="text-sm text-muted-foreground">Image failed to load</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded max-w-md truncate">{imageUrl}</code>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={imageUrl} 
                  alt="Full Result" 
                  className="max-h-[300px] object-contain rounded shadow-sm"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
          )}
          
          <div className="flex-1 relative min-h-[200px] border rounded-md bg-muted/50">
             <ScrollArea className="h-full w-full absolute inset-0">
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(jsonObject, null, 2)}
                </pre>
             </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
