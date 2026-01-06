/**
 * Thumbnail Generation Utility
 * 
 * Generates 640px WebP thumbnails for gallery cards.
 * Used in Admin publishing flow.
 */

import imageCompression from 'browser-image-compression';
import { nanoid } from 'nanoid';

export interface ThumbnailOptions {
  /** Original image URL */
  imageUrl: string;
  /** SEO slug for naming */
  seoSlug?: string;
  /** On progress callback */
  onProgress?: (progress: number) => void;
}

export interface ThumbnailResult {
  /** Compressed thumbnail blob */
  blob: Blob;
  /** Suggested filename */
  filename: string;
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio (e.g., 0.03 = 3%) */
  ratio: number;
}

/**
 * Generate a 640px WebP thumbnail from an image URL
 */
export async function generateThumbnail({
  imageUrl,
  seoSlug,
  onProgress,
}: ThumbnailOptions): Promise<ThumbnailResult> {
  // 1. Fetch the original image (Try direct first, then proxy)
  let response;
  try {
    response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Direct fetch failed');
  } catch (e) {
    console.log('Direct fetch failed, trying proxy...', e);
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    response = await fetch(proxyUrl);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const originalBlob = await response.blob();
  const originalSize = originalBlob.size;
  
  // 2. Convert to File for compression library
  const file = new File([originalBlob], 'image.png', { type: originalBlob.type });
  
  // 3. Compress with browser-image-compression
  const compressedBlob = await imageCompression(file, {
    maxWidthOrHeight: 800,
    maxSizeMB: 0.3, // 300KB max
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.85,
    onProgress,
  });
  
  // 4. Generate filename (seoSlug already contains unique ID)
  const slug = seoSlug || `image-${nanoid(8)}`;
  const filename = `${slug}-thumb.webp`;
  
  return {
    blob: compressedBlob,
    filename,
    originalSize,
    compressedSize: compressedBlob.size,
    ratio: compressedBlob.size / originalSize,
  };
}

/**
 * Upload thumbnail blob to R2
 */
export async function uploadThumbnail(
  blob: Blob,
  filename: string
): Promise<string> {
  const formData = new FormData();
  formData.append('files', blob, filename);
  formData.append('type', 'thumbnail');
  formData.append('prefix', 'ai/image/thumbs');
  
  const response = await fetch('/api/storage/upload-image', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  const result = await response.json() as { code: number; message?: string; data?: { urls?: string[] } };
  if (result.code !== 0 || !result.data?.urls?.length) {
    throw new Error(result.message || 'Upload failed');
  }
  
  return result.data.urls[0];
}

/**
 * Generate and upload thumbnail in one step
 */
export async function generateAndUploadThumbnail(
  options: ThumbnailOptions
): Promise<string> {
  const { blob, filename } = await generateThumbnail(options);
  return uploadThumbnail(blob, filename);
}
