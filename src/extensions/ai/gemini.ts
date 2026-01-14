import { nanoid } from 'nanoid';

import {
  AIConfigs,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
  AIChatParams,
  AIEmbedParams,
} from './types';

// ==================== Retry Helper ====================

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Delay helper with exponential backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (only 429/5xx, never 400 or safety errors)
 */
function isRetryableError(statusCode: number, errorMessage: string): boolean {
  // Never retry safety/content filter errors
  if (errorMessage.includes('safety') || 
      errorMessage.includes('blocked') || 
      errorMessage.includes('flagged') ||
      errorMessage.includes('SAFETY')) {
    return false;
  }
  
  // Only retry 429 and 5xx errors
  return DEFAULT_RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
}

/**
 * Fetch with retry (exponential backoff)
 * PRD v1.0: 1 retry max, only for 429/5xx
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  let delayMs = config.initialDelayMs;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If response is ok, return it
      if (response.ok) {
        return response;
      }
      
      // Parse error to check if retryable
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorText;
      } catch { }
      
      // Check if we should retry
      if (attempt < config.maxRetries && isRetryableError(response.status, errorMessage)) {
        console.log(`[Gemini Retry] Attempt ${attempt + 1} failed with ${response.status}, retrying in ${delayMs}ms...`);
        await delay(delayMs);
        delayMs = Math.min(delayMs * 2, config.maxDelayMs);
        continue;
      }
      
      // Not retryable or max retries reached, throw error
      // Create a new Response with the error text for downstream handling
      return new Response(errorText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      
    } catch (error) {
      // Network error - retry if possible
      lastError = error as Error;
      if (attempt < config.maxRetries) {
        console.log(`[Gemini Retry] Network error on attempt ${attempt + 1}, retrying in ${delayMs}ms...`);
        await delay(delayMs);
        delayMs = Math.min(delayMs * 2, config.maxDelayMs);
        continue;
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}


/**
 * Gemini configs
 */
export interface GeminiConfigs extends AIConfigs {
  apiKey: string;
}

/**
 * Gemini provider
 */
export class GeminiProvider implements AIProvider {
  // provider name
  readonly name = 'gemini';
  // provider configs
  configs: GeminiConfigs;

  // init provider
  constructor(configs: GeminiConfigs) {
    this.configs = configs;
  }

  // generate task
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, options } = params;

    if (mediaType !== AIMediaType.IMAGE) {
      throw new Error(`mediaType not supported: ${mediaType}`);
    }

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    // Determine if this is an Imagen model (uses :predict endpoint) or Gemini model (uses :generateContent)
    const isImagenModel = model.startsWith('imagen-');
    
    if (isImagenModel) {
      // =============== Imagen API (:predict endpoint) ===============
      // Supports: numberOfImages, aspectRatio, personGeneration, imageSize (Ultra/Standard only)
      return this.generateWithImagen(model, prompt, options, params);
    } else {
      // =============== Gemini API (:generateContent endpoint) ===============
      // Supports: aspectRatio (via imageConfig)
      return this.generateWithGemini(model, prompt, options, params);
    }
  }

  /**
   * Generate image using Imagen API (:predict endpoint)
   * Supports full parameters: numberOfImages, aspectRatio, personGeneration, imageSize
   */
  private async generateWithImagen(
    model: string,
    prompt: string,
    options: any,
    params: AIGenerateParams
  ): Promise<AITaskResult> {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${this.configs.apiKey}`;

    const { 
      aspectRatio,
      numberOfImages = 1,
      imageSize,
      personGeneration,
    } = options || {};

    // Imagen uses different parameter names
    const parameters: Record<string, any> = {
      sampleCount: numberOfImages,
    };
    if (aspectRatio) parameters.aspectRatio = aspectRatio;
    if (imageSize) parameters.outputOptions = { mimeType: 'image/png', compressionQuality: 100, outputImageSize: imageSize };
    if (personGeneration) parameters.personGeneration = personGeneration;

    const payload = {
      instances: [{ prompt }],
      parameters,
    };

    const resp = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      // Parse error for better user messaging
      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.error?.message || errorText;
        const errorCode = errorJson.error?.code || resp.status;
        
        // Common Imagen errors
        if (errorCode === 400 && errorMessage.includes('safety')) {
          throw new Error('Your prompt was blocked by content safety filters. Please try a different prompt.');
        }
        if (errorCode === 403) {
          throw new Error('Imagen API is not enabled for this project. Please use Standard or Pro model instead.');
        }
        if (errorCode === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        throw new Error(`Imagen error (${errorCode}): ${errorMessage}`);
      } catch (e) {
        if (e instanceof Error && e.message.includes('Imagen')) throw e;
        throw new Error(`Imagen request failed with status: ${resp.status}`);
      }
    }

    const data = await resp.json() as any;
    
    // Check for filtered content or empty response
    const predictions = data.predictions || [];
    
    // Imagen may return empty results due to safety filters
    if (predictions.length === 0) {
      // Check if there's a blockReason in the response
      if (data.promptFeedback?.blockReason) {
        throw new Error(`Image generation was blocked: ${data.promptFeedback.blockReason}. Please modify your prompt.`);
      }
      // Check for safety ratings that caused blocking
      if (data.promptFeedback?.safetyRatings) {
        const harmful = data.promptFeedback.safetyRatings.find((r: any) => r.probability === 'HIGH');
        if (harmful) {
          throw new Error(`Your prompt was flagged for ${harmful.category}. Please try a different prompt.`);
        }
      }
      // Generic fallback with suggestion
      // TODO: 自定义你的模型名称
      throw new Error('Imagen did not generate any images. This may be due to content filters or an unsupported prompt. Try using Standard or Pro model for better results.');
    }

    // Upload all generated images
    const { getStorageService } = await import('@/shared/services/storage');
    const storageService = await getStorageService();
    const { generateImageFilename } = await import('@/shared/lib/image-naming');
    
    const images: AIImage[] = [];
    
    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i];
      const base64Data = prediction.bytesBase64Encoded;
      const mimeType = prediction.mimeType || 'image/png';
      
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = mimeType.split('/')[1] || 'png';
      
      const filename = await generateImageFilename({
        anchorKeywords: params.seoHints || undefined,
        prompt,
        type: 'generated',
      }, ext);
      
      const key = `generated/images/${filename}`;
      const uploadResult = await storageService.uploadFile({
        body: buffer,
        key,
        contentType: mimeType,
      });

      if (uploadResult?.url) {
        images.push({
          id: nanoid(),
          createTime: new Date(),
          imageType: mimeType,
          imageUrl: uploadResult.url,
        });
      }
    }

    if (images.length === 0) {
      throw new Error('Failed to upload Imagen generated images');
    }

    return {
      taskStatus: AITaskStatus.SUCCESS,
      taskId: nanoid(),
      taskInfo: {
        images,
        status: 'success',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }

  /**
   * Generate image using Gemini API (:generateContent endpoint)
   * Supports: aspectRatio (via imageConfig)
   *
   * @param retryCount - Internal retry counter for "text instead of image" errors
   */
  private async generateWithGemini(
    model: string,
    prompt: string,
    options: any,
    params: AIGenerateParams,
    retryCount: number = 0
  ): Promise<AITaskResult> {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.configs.apiKey}`;

    const hasImages = options?.image_input && Array.isArray(options.image_input) && options.image_input.length > 0;

    // 🎯 官方文档最佳实践：图片应该放在文本之前！
    // "When using a single image with text, place the text prompt *after* the image part"
    const requestParts: any[] = [];

    // Step 1: 先添加所有图片（放在文本之前，这是官方推荐的顺序）
    if (hasImages) {
      for (const imageUrl of options.image_input) {
        try {
          const imageResp = await fetch(imageUrl);
          if (imageResp.ok) {
            const arrayBuffer = await imageResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = buffer.toString('base64');
            const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
            requestParts.push({
              inlineData: { mimeType, data: base64Image },
            });
          } else {
            console.error(`[Gemini] Failed to fetch image: ${imageUrl}, status: ${imageResp.status}`);
          }
        } catch (e) {
          console.error('[Gemini] Failed to fetch image input', imageUrl, e);
        }
      }
    }

    // Step 2: 添加文本提示（在图片之后）
    // V4 FIX: 直接使用用户的 prompt，Gemini 原生理解图生图意图
    requestParts.push({ text: prompt });

    // 🔴 排除不属于 Gemini generationConfig 的字段
    const { image_input, aspectRatio, imageSize, reference_intent, ...generationConfig } = options || {};

    // Build imageConfig for Gemini
    // - aspectRatio: supported by all Gemini image models
    // - imageSize: only supported by gemini-3-pro-image-preview (1K, 2K, 4K)
    const imageConfig: Record<string, any> = {};
    if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
    if (imageSize && model.includes('gemini-3')) imageConfig.imageSize = imageSize;

    const payload: any = {
      contents: { role: 'user', parts: requestParts },
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        ...(Object.keys(imageConfig).length > 0 && { imageConfig }),
        ...generationConfig,
      },
    };

    const resp = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      // 🔍 添加错误日志用于诊断
      console.error('[Gemini generateWithGemini] API Error:', resp.status, errorText);
      // Parse error for better user messaging
      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.error?.message || errorText;
        const errorCode = errorJson.error?.code || resp.status;

        if (errorCode === 400) {
          if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
            throw new Error('Your prompt was blocked by content safety filters. Please try a different, more neutral prompt.');
          }
          if (errorMessage.includes('INVALID_ARGUMENT')) {
            throw new Error('Invalid request. Please simplify your prompt and try again.');
          }
        }
        if (errorCode === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (errorCode === 503) {
          throw new Error('Service temporarily unavailable. Please try again in a few seconds.');
        }
        throw new Error(`Generation failed: ${errorMessage}`);
      } catch (e) {
        if (e instanceof Error && !e.message.includes('JSON')) throw e;
        throw new Error(`Generation request failed (${resp.status})`);
      }
    }

    const data = await resp.json() as any;

    // Check for prompt feedback (safety filters)
    if (data.promptFeedback?.blockReason) {
      const reason = data.promptFeedback.blockReason;
      if (reason === 'SAFETY') {
        throw new Error('Your prompt was blocked by safety filters. Please modify your prompt to be more appropriate.');
      }
      if (reason === 'OTHER') {
        throw new Error('Your prompt could not be processed. Please try rephrasing it.');
      }
      throw new Error(`Prompt blocked: ${reason}. Please try a different prompt.`);
    }

    // Check candidates
    if (!data.candidates || data.candidates.length === 0) {
      // Check for safety ratings in feedback
      if (data.promptFeedback?.safetyRatings) {
        const harmful = data.promptFeedback.safetyRatings.find(
          (r: any) => r.probability === 'HIGH' || r.probability === 'MEDIUM'
        );
        if (harmful) {
          throw new Error(`Your prompt was flagged for potential ${harmful.category?.replace('HARM_CATEGORY_', '').toLowerCase() || 'safety'} concerns. Please try a different prompt.`);
        }
      }
      throw new Error('No image was generated. Please try a different prompt or check if the model is available.');
    }

    const taskId = nanoid();
    const candidate = data.candidates[0];
    
    // Check finish reason for issues
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Image generation was stopped due to safety concerns. Please try a more neutral prompt.');
    }
    if (candidate.finishReason === 'RECITATION') {
      throw new Error('Generation was blocked due to content policy. Please try a different prompt.');
    }
    
    const parts = candidate.content?.parts;

    if (!parts || parts.length === 0) {
      throw new Error('The model did not return any content. Please try again with a different prompt.');
    }

    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart) {
      // Check if only text was returned (might help debugging)
      const textPart = parts.find((p: any) => p.text);
      if (textPart) {
        console.log('Model returned text instead of image:', textPart.text);

        // Retry once for "text instead of image" error (model hallucination)
        if (retryCount < 1) {
          console.log(`[Gemini Retry] Text-only response, retrying (attempt ${retryCount + 1})...`);
          await delay(1000); // Wait 1 second before retry
          return this.generateWithGemini(model, prompt, options, params, retryCount + 1);
        }

        throw new Error('The model returned text instead of an image. Please ensure your prompt asks for image generation.');
      }
      throw new Error('No image was generated. Please try a more descriptive prompt.');
    }

    const mimeType = imagePart.inlineData.mimeType;
    const base64Data = imagePart.inlineData.data;

    // Upload to storage
    const { getStorageService } = await import('@/shared/services/storage');
    const storageService = await getStorageService();
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = mimeType.split('/')[1] || 'png';
    
    const { generateImageFilename } = await import('@/shared/lib/image-naming');
    const filename = await generateImageFilename({
      anchorKeywords: params.seoHints || undefined,
      prompt: params.prompt,
      type: 'generated',
    }, ext);
    
    const key = `generated/images/${filename}`;

    const uploadResult = await storageService.uploadFile({
      body: buffer,
      key,
      contentType: mimeType,
    });

    if (!uploadResult || !uploadResult.url) {
      throw new Error('Upload image failed');
    }

    // Replace base64 data with URL
    if (imagePart.inlineData) {
      imagePart.inlineData.data = uploadResult.url;
      const partIndex = parts.findIndex((p: any) => p === imagePart);
      if (partIndex !== -1 && data.candidates?.[0]?.content?.parts) {
        data.candidates[0].content.parts[partIndex].inlineData.data = uploadResult.url;
        data.candidates[0].content.parts[partIndex].thoughtSignature = '';
      }
    }

    const image: AIImage = {
      id: nanoid(),
      createTime: new Date(),
      imageType: mimeType,
      imageUrl: uploadResult.url,
    };

    return {
      taskStatus: AITaskStatus.SUCCESS,
      taskId: taskId,
      taskInfo: {
        images: [image],
        status: 'success',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }

  /**
   * 同步文本生成 (对应 Gemini generateContent)
   * 用于 SEO 生成、Prompt 优化等场景
   */
  async chat(params: AIChatParams): Promise<string> {
    const {
      model = 'gemini-3-flash-preview',
      prompt,
      systemPrompt,
      temperature = 0.7,
      maxTokens = 2048,
      jsonMode = false,
    } = params;

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.configs.apiKey}`;

    // 构建请求内容
    const contents: any[] = [];
    
    // 如果有 systemPrompt，作为第一条消息
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }
    
    // 用户输入
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const payload: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      // Safety settings: 使用 BLOCK_NONE 完全禁用安全过滤
      // 内部批量生成场景，不需要 Gemini 的安全过滤
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    // JSON 模式：添加响应 MIME 类型
    if (jsonMode) {
      payload.generationConfig.responseMimeType = 'application/json';
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(
        `Gemini chat failed with status: ${resp.status}, body: ${errorText}`
      );
    }

    const data = (await resp.json()) as any;

    if (!data.candidates || data.candidates.length === 0) {
      // 诊断：检查 Gemini 的 block reason 和 safety ratings
      const blockReason = data.promptFeedback?.blockReason;
      const safetyRatings = data.promptFeedback?.safetyRatings;

      if (blockReason) {
        console.error('[Gemini] Request blocked:', blockReason, safetyRatings);
        throw new Error(`Gemini blocked: ${blockReason}`);
      }

      // 打印完整响应用于调试
      console.error('[Gemini] No candidates, full response:', JSON.stringify(data, null, 2));
      throw new Error('No candidates returned from Gemini');
    }

    const textPart = data.candidates[0]?.content?.parts?.[0]?.text;
    if (!textPart) {
      throw new Error('No text returned from Gemini');
    }

    return textPart;
  }

  /**
   * 文本向量化 (对应 Gemini embedContent)
   * 用于 Case Embedding 生成、语义搜索
   */
  async embed(params: AIEmbedParams): Promise<number[]> {
    const { text, model = 'text-embedding-004' } = params;

    if (!text) {
      throw new Error('text is required for embedding');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${this.configs.apiKey}`;

    const payload = {
      model: `models/${model}`,
      content: {
        parts: [{ text }],
      },
    };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(
        `Gemini embed failed with status: ${resp.status}, body: ${errorText}`
      );
    }

    const data = (await resp.json()) as any;

    if (!data.embedding?.values) {
      throw new Error('No embedding values returned from Gemini');
    }

    return data.embedding.values;
  }
}
