/**
 * Server-side Thumbnail Utility
 *
 * NOTE: Actual thumbnail generation happens on the client side using
 * browser-image-compression (see thumbnail-generator.ts).
 *
 * This file provides:
 * 1. Helper to check if thumbnail is needed
 * 2. Helper to generate Cloudflare Image Resizing URLs (on-the-fly resizing)
 */

/**
 * Check if a post needs thumbnail generation
 * Returns true if thumbnailUrl is missing or same as imageUrl
 */
export function needsThumbnail(imageUrl: string, thumbnailUrl: string | null): boolean {
  if (!thumbnailUrl) return true;
  if (thumbnailUrl === imageUrl) return true;
  // Check if thumbnailUrl doesn't contain 'thumb' in the path
  if (!thumbnailUrl.includes('-thumb') && !thumbnailUrl.includes('/thumbs/')) {
    return true;
  }
  return false;
}

/**
 * Generate thumbnail URL using Cloudflare Image Resizing (on-the-fly)
 * This doesn't create a new file, just returns a URL that will be resized on request
 *
 * Use this for immediate display without waiting for upload
 */
export function getCloudflareResizedUrl(
  imageUrl: string,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  const { width = 640, height = 640, quality = 80 } = options;

  // If already a CF image URL, return as-is
  if (imageUrl.includes('/cdn-cgi/image/')) {
    return imageUrl;
  }

  // Extract the domain and path
  try {
    const url = new URL(imageUrl);

    // TODO: 配置你的域名以启用 Cloudflare Image Resizing
    // Only works for images on your own domain or R2
    if (url.hostname.includes('your-domain.com') || url.hostname.includes('r2.')) {
      // Cloudflare Image Resizing URL format
      return `${url.origin}/cdn-cgi/image/width=${width},height=${height},fit=cover,format=webp,quality=${quality}${url.pathname}`;
    }
  } catch {
    // Invalid URL, return original
  }

  return imageUrl;
}
