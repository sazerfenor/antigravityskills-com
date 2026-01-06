import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { analyzeIntent } from '@/shared/services/intent-analyzer';
import { type MultimodalImage } from '@/shared/services/gemini-text';
import { z } from 'zod';
import { getUserInfo, isPaidUser } from '@/shared/models/user';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/shared/lib/rate-limit';
import { handleApiError } from '@/shared/lib/api-error-handler';

/**
 * POST /api/logic/intent
 * 
 * Analyzes user input and returns a dynamic form schema.
 * Supports both JSON and multipart/form-data requests.
 * 
 * JSON format (legacy):
 *   { "input": "..." }
 * 
 * FormData format (multimodal):
 *   - input: string (required)
 *   - images: File[] (optional, max 4)
 */

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image

export async function POST(request: NextRequest) {
  try {
    // 🛡️ Security: Rate Limiting
    const ip = getClientIP(request);
    const user = await getUserInfo().catch(() => null);

    let rateLimitConfig;
    let identifier;

    if (!user) {
      // Guest: 3 req/day
      rateLimitConfig = RATE_LIMITS.VL_BUILD_GUEST;
      identifier = `ip:${ip}`;
    } else {
      const paid = await isPaidUser(user.id);
      if (paid) {
        // Paid User: 100 req/day + Dynamic Restore
        rateLimitConfig = RATE_LIMITS.VL_BUILD_PAID_USER;
        identifier = `user:${user.id}`;
      } else {
        // Free User: 10 req/day
        rateLimitConfig = RATE_LIMITS.VL_BUILD_FREE_USER;
        identifier = `user:${user.id}`;
      }
    }

    const rateLimitResult = await checkRateLimit(
      `vl:build:${identifier}`,
      rateLimitConfig.limit,
      rateLimitConfig.window
    );

    if (!rateLimitResult.success) {
      if (!user) {
        // Guest specific error code to trigger login modal
        return respErr('GUEST_BUILD_LIMIT', 429);
      }
      return respErr('Daily build limit reached. Upgrade for more.', 429);
    }

    const contentType = request.headers.get('content-type') || '';
    console.log(`[API Logic Intent] Content-Type: ${contentType}`);

    let input: string;
    let images: MultimodalImage[] = []; // Updated type for multimodal

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (multimodal)
      const formData = await request.formData();
      const inputField = formData.get('input');
      
      if (!inputField || typeof inputField !== 'string' || inputField.trim().length < 1) {
        return respErr('Input is required', 400);
      }
      input = inputField;
      
      // Process images
      const imageFiles = formData.getAll('images') as File[];
      if (imageFiles.length > MAX_IMAGES) {
        return respErr(`Maximum ${MAX_IMAGES} images allowed`, 400);
      }
      
      for (const file of imageFiles) {
        if (!(file instanceof File)) continue;
        if (file.size > MAX_IMAGE_SIZE) {
          return respErr(`Image ${file.name} exceeds 5MB limit`, 400);
        }
        
        // Convert to MultimodalImage format
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        images.push({
          mimeType: file.type || 'image/jpeg',
          data: base64,
        });
      }
      
      console.log(`[API Logic Intent] FormData: input="${input.substring(0, 50)}...", images=${images.length}`);
      // 诊断日志：详细输出图片信息
      if (images.length > 0) {
        console.log('[API Logic Intent] Image details:', images.map((img, i) => ({
          index: i,
          mimeType: img.mimeType,
          base64Length: img.data.length,
          isValidBase64: /^[A-Za-z0-9+/=]+$/.test(img.data.slice(0, 100)),
        })));
      }
    } else {
      // Handle JSON (legacy or with imageUrls)
      const body = await request.json() as { input?: string; imageUrls?: string[] };
      console.log(`[API Logic Intent] JSON body received:`, { input: body.input?.substring(0, 50), imageUrls: body.imageUrls });

      const validation = z.object({
        input: z.string().min(1, 'Input is required'),
        imageUrls: z.array(z.string().url()).max(MAX_IMAGES).optional(),
      }).safeParse(body);

      if (!validation.success) {
        return respErr(`Invalid request: ${validation.error.issues.map(e => e.message).join(', ')}`, 400);
      }

      input = validation.data.input;

      // FIX: Fetch reference images from URLs for multimodal analysis
      if (validation.data.imageUrls && validation.data.imageUrls.length > 0) {
        console.log(`[API Logic Intent] 🖼️ Fetching ${validation.data.imageUrls.length} reference images from URLs:`, validation.data.imageUrls);

        const fetchPromises = validation.data.imageUrls.map(async (url, index) => {
          const startTime = Date.now();
          try {
            console.log(`[API Logic Intent] Fetching image ${index}: ${url.substring(0, 80)}...`);
            const response = await fetch(url, {
              // Add timeout to prevent hanging
              signal: AbortSignal.timeout(30000), // 30 second timeout
            });
            if (!response.ok) {
              console.warn(`[API Logic Intent] ❌ Failed to fetch image ${index}: HTTP ${response.status}`);
              return null;
            }

            const contentType = response.headers.get('content-type') || 'image/jpeg';
            const arrayBuffer = await response.arrayBuffer();
            console.log(`[API Logic Intent] ✅ Image ${index} fetched: ${contentType}, ${arrayBuffer.byteLength} bytes, ${Date.now() - startTime}ms`);

            if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
              console.warn(`[API Logic Intent] ⚠️ Image ${index} exceeds 5MB limit (${arrayBuffer.byteLength} bytes), skipping`);
              return null;
            }

            const base64 = Buffer.from(arrayBuffer).toString('base64');
            return {
              mimeType: contentType.split(';')[0],  // Remove charset if present
              data: base64,
            } as MultimodalImage;
          } catch (err: any) {
            console.error(`[API Logic Intent] ❌ Error fetching image ${index} (${Date.now() - startTime}ms):`, err.message || err);
            return null;
          }
        });

        const fetchedImages = await Promise.all(fetchPromises);
        images = fetchedImages.filter((img): img is MultimodalImage => img !== null);

        console.log(`[API Logic Intent] 📊 Successfully fetched ${images.length}/${validation.data.imageUrls.length} images`);
      } else {
        console.log(`[API Logic Intent] 📝 No imageUrls provided, text-only mode`);
      }

      console.log(`[API Logic Intent] JSON: input="${input.substring(0, 50)}...", images=${images.length}`);
    }

    // Call AI intent analyzer
    // FIX: Pass images array directly, not wrapped in an object
    const schema = await analyzeIntent(input, images.length > 0 ? images : undefined);

    if (!schema) {
      return respErr('Could not analyze intent. Please try a different description.', 400);
    }

    return respData({ schema });

  } catch (e: unknown) {
    return handleApiError(e, { feature: 'vision_logic' });
  }
}
