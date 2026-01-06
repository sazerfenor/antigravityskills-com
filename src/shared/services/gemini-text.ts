import { getAIService } from './ai';

/**
 * Gemini Text Generation Service
 * 通用的 Gemini 文本生成服务，供多个功能复用
 * 
 * ✅ 重构后：所有调用都通过 GeminiProvider 标准接口
 */

export interface GeminiTextOptions {
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
  jsonMode?: boolean;
}

export interface GeminiEmbeddingResult {
  embedding: number[];
  model: string;
}

/**
 * Generate text using Gemini
 * ✅ 通过 GeminiProvider.chat() 标准接口调用
 */
export async function generateText(
  prompt: string,
  options: GeminiTextOptions = {}
): Promise<string> {
  const {
    temperature = 0.7,
    maxOutputTokens = 2048,
    model = 'gemini-3-flash-preview',
    jsonMode = false,
  } = options;

  // ✅ 使用标准 AI Provider 接口
  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini');

  if (!geminiProvider) {
    throw new Error('Gemini provider not configured');
  }

  if (!geminiProvider.chat) {
    throw new Error('Gemini provider does not support chat method');
  }

  // 调用标准 chat() 方法
  const result = await geminiProvider.chat({
    model,
    prompt,
    temperature,
    maxTokens: maxOutputTokens,
    jsonMode,
  });

  return result;
}

/**
 * Generate embedding using Gemini
 * ✅ 通过 GeminiProvider.embed() 标准接口调用
 */
export async function generateEmbedding(
  text: string,
  model: string = 'text-embedding-004'
): Promise<GeminiEmbeddingResult> {
  // ✅ 使用标准 AI Provider 接口
  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini');

  if (!geminiProvider) {
    throw new Error('Gemini provider not configured');
  }

  if (!geminiProvider.embed) {
    throw new Error('Gemini provider does not support embed method');
  }

  // 调用标准 embed() 方法
  const embedding = await geminiProvider.embed({
    text,
    model,
  });

  return {
    embedding,
    model,
  };
}

/**
 * Multimodal image for generateMultimodal
 */
export interface MultimodalImage {
  mimeType: string; // e.g., 'image/jpeg', 'image/png'
  data: string;     // Base64 encoded image data
}

/**
 * Generate text from multimodal input (text + images) using Gemini
 * Used by Intent Analyzer for image analysis
 * 
 * @param prompt - Text prompt
 * @param images - Array of base64 encoded images with mime types
 * @param options - Generation options
 */
export async function generateMultimodal(
  prompt: string,
  images: MultimodalImage[],
  options: GeminiTextOptions = {}
): Promise<string> {
  const {
    temperature = 0.3, // Lower for more consistent analysis
    maxOutputTokens = 2048,
    model = 'gemini-3-flash-preview', // Upgraded: 3.0 has better multimodal capabilities
    jsonMode = false,
  } = options;

  // ✅ 使用 GeminiProvider 获取 API Key（与 generateText 保持一致）
  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini') as any;
  
  if (!geminiProvider || !geminiProvider.configs?.apiKey) {
    throw new Error('Gemini provider not configured or missing API key');
  }
  
  const apiKey = geminiProvider.configs.apiKey;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build multimodal parts: text + images
  const parts: any[] = [];
  
  // 诊断日志：记录图片信息
  console.log('[generateMultimodal] Processing images:', {
    count: images.length,
    images: images.map((img, i) => ({
      index: i,
      mimeType: img.mimeType,
      dataLength: img.data?.length || 0,
      dataSample: img.data?.substring(0, 50) + '...',
    })),
  });
  
  // Add images first (Gemini best practice for vision)
  for (const image of images) {
    if (!image.data || image.data.length < 100) {
      console.error('[generateMultimodal] ⚠️ Image data is empty or too small:', {
        mimeType: image.mimeType,
        dataLength: image.data?.length || 0,
      });
    }
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }
  
  // Add text prompt
  parts.push({ text: prompt });

  const payload: any = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  // V3.3 DEBUG: Log generation config
  console.log('[generateMultimodal] Generation config:', {
    model,
    temperature,
    maxOutputTokens,
    jsonMode,
  });

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
      `Gemini multimodal failed with status: ${resp.status}, body: ${errorText}`
    );
  }

  const data = (await resp.json()) as any;

  // V3.3 DEBUG: Log API response metadata to diagnose truncation
  const finishReason = data.candidates?.[0]?.finishReason;
  const usageMetadata = data.usageMetadata;
  console.log('[generateMultimodal] API response metadata:', {
    finishReason,
    usageMetadata,
    candidatesCount: data.candidates?.length || 0,
  });

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No candidates returned from Gemini multimodal');
  }

  // Check for truncation
  if (finishReason === 'MAX_TOKENS') {
    console.warn('[generateMultimodal] ⚠️ Response was truncated due to MAX_TOKENS!');
  }

  const textPart = data.candidates[0]?.content?.parts?.[0]?.text;
  if (!textPart) {
    throw new Error('No text returned from Gemini multimodal');
  }

  return textPart;
}

