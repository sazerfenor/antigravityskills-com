/**
 * Unified AI Model Configuration (Single Source of Truth)
 * 
 * This is the ONLY place to define model configurations.
 * Both frontend (via API) and backend (direct import) use this.
 */

// ===== Model Configuration Interface =====
export interface ModelConfig {
  value: string;                  // Model ID (sent to AI provider)
  label: string;                  // Display name
  provider: string;               // AI provider (gemini, openai, etc.)
  scenes: string[];               // Supported scenes: text-to-image, image-to-image
  supportsAdvanced: boolean;      // Supports batch output, person generation
  supportsImageSize: boolean;     // Supports image size/resolution selection
  maxInputImages: number;         // Max reference images for image-to-image
  maxOutputImages: number;        // Max images that can be generated
  supportedResolutions: string[]; // Supported output resolutions
  baseCredits: number;            // Base credits for 1 image generation
}

// ===== Polling Constants =====
export const POLL_INTERVAL = 5000;
export const GENERATION_TIMEOUT = 180000;
export const MAX_PROMPT_LENGTH = 2000;

// ===== Model Options =====
// TODO: 自定义你的 AI 模型名称和配置
export const MODEL_OPTIONS: ModelConfig[] = [
  // Standard Model (Default)
  {
    value: 'gemini-2.5-flash-image',
    label: 'Standard',
    provider: 'gemini',
    scenes: ['text-to-image', 'image-to-image'],
    supportsAdvanced: false,
    supportsImageSize: false,
    maxInputImages: 3,
    maxOutputImages: 1,
    supportedResolutions: ['1K'],
    baseCredits: 10,
  },
  // Pro Model (Premium)
  {
    value: 'gemini-3-pro-image-preview',
    label: 'Pro',
    provider: 'gemini',
    scenes: ['text-to-image', 'image-to-image'],
    supportsAdvanced: false,
    supportsImageSize: true,
    maxInputImages: 14,
    maxOutputImages: 1,
    supportedResolutions: ['1K', '2K', '4K'],
    baseCredits: 30,
  },
  // Imagen 4 (Advanced features)
  {
    value: 'imagen-4.0-generate-001',
    label: 'Imagen 4 (Advanced)',
    provider: 'gemini',
    scenes: ['text-to-image'],
    supportsAdvanced: true,
    supportsImageSize: true,
    maxInputImages: 0,
    maxOutputImages: 4,
    supportedResolutions: ['1K', '2K'],
    baseCredits: 15,
  },
  // Imagen 4 Fast
  {
    value: 'imagen-4.0-fast-generate-001',
    label: 'Imagen 4 Fast',
    provider: 'gemini',
    scenes: ['text-to-image'],
    supportsAdvanced: true,
    supportsImageSize: false,
    maxInputImages: 0,
    maxOutputImages: 4,
    supportedResolutions: ['1K'],
    baseCredits: 10,
  },
];

// ===== Aspect Ratio Options =====
export const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '3:4', label: '3:4 Portrait' },
];

// Extended aspect ratios for Gemini 3 Pro
export const ASPECT_RATIO_OPTIONS_PRO = [
  { value: '1:1', label: '1:1 Square' },
  { value: '2:3', label: '2:3 Poster' },
  { value: '3:2', label: '3:2 Classic' },
  { value: '3:4', label: '3:4 Portrait' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '4:5', label: '4:5 Instagram' },
  { value: '5:4', label: '5:4 Photo' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '21:9', label: '21:9 Ultrawide' },
];

// ===== Image Size Options =====
export const IMAGE_SIZE_OPTIONS = [
  { value: '1K', label: '1K (Default)' },
  { value: '2K', label: '2K (High Resolution)' },
  { value: '4K', label: '4K (Ultra HD)' },
];

// ===== Person Generation Options =====
export const PERSON_GENERATION_OPTIONS = [
  { value: 'allow_adult', label: 'Adults Only (Default)' },
  { value: 'allow_all', label: 'Allow All' },
  { value: 'dont_allow', label: 'No People' },
];

// ===== Helper Functions =====

/**
 * Get model config by model value
 */
export function getModelByValue(value: string): ModelConfig | undefined {
  return MODEL_OPTIONS.find(m => m.value === value);
}

/**
 * Get provider from model value
 */
export function getProviderFromModel(modelValue: string): string {
  const model = getModelByValue(modelValue);
  return model?.provider ?? 'gemini';
}

/**
 * Calculate credit cost based on model, output images, resolution, and scene
 *
 * Formula (Additive, v3):
 *   baseCost + advancedModelBonus + resolutionBonus + imageToImageBonus
 *
 * Bonus values:
 * - baseCost: 10 credits (all models)
 * - advancedModelBonus: +10 if using Pro model or Imagen 4 Advanced
 * - resolutionBonus: +10 for 2K, +20 for 4K
 * - imageToImageBonus: +10 if image-to-image scene
 *
 * Examples:
 * - Standard + 1K + text-to-image = 10
 * - Standard + 1K + image-to-image = 10 + 10 = 20
 * - Pro/Imagen4 + 1K + text-to-image = 10 + 10 = 20
 * - Pro/Imagen4 + 2K + text-to-image = 10 + 10 + 10 = 30
 * - Pro + 4K + text-to-image = 10 + 10 + 20 = 40
 * - Pro + 4K + image-to-image = 10 + 10 + 20 + 10 = 50
 *
 * @param model - Model config or model value string
 * @param outputImageCount - Number of images to generate (default: 1)
 * @param resolution - Output resolution: '1K' | '2K' | '4K' (default: '1K')
 * @param scene - Generation scene: 'text-to-image' | 'image-to-image' (default: 'text-to-image')
 */
export function calculateCreditCost(
  model: string | ModelConfig,
  outputImageCount: number = 1,
  resolution: '1K' | '2K' | '4K' = '1K',
  scene: 'text-to-image' | 'image-to-image' = 'text-to-image'
): number {
  const modelConfig = typeof model === 'string' ? getModelByValue(model) : model;

  if (!modelConfig) {
    console.warn(`[Credit] Unknown model: ${model}, using default 10 credits`);
    return 10;
  }

  // Base cost: 10 credits for all models
  const BASE_COST = 10;

  // Advanced model bonus: +10 credits (Pro model or Imagen 4 Advanced)
  const isAdvancedModel =
    modelConfig.value === 'gemini-3-pro-image-preview' ||
    modelConfig.value === 'imagen-4.0-generate-001';
  const advancedModelBonus = isAdvancedModel ? 10 : 0;

  // Resolution bonus (only for models that support it):
  // - 2K: +10 credits
  // - 4K: +20 credits
  let resolutionBonus = 0;
  if (modelConfig.supportsImageSize) {
    if (resolution === '4K') {
      resolutionBonus = 20;
    } else if (resolution === '2K') {
      resolutionBonus = 10;
    }
  }

  // Image-to-image bonus: +10 credits
  const imageToImageBonus = scene === 'image-to-image' ? 10 : 0;

  // Output multiplier (for models that support batch generation)
  const outputMultiplier = Math.max(1, outputImageCount);

  // Total = (base + bonuses) × output count
  const singleImageCost = BASE_COST + advancedModelBonus + resolutionBonus + imageToImageBonus;
  return singleImageCost * outputMultiplier;
}

/**
 * Get all model configs for API response
 */
export function getAllModelConfigs() {
  return {
    models: MODEL_OPTIONS,
    aspectRatios: ASPECT_RATIO_OPTIONS,
    aspectRatiosPro: ASPECT_RATIO_OPTIONS_PRO,
    imageSizes: IMAGE_SIZE_OPTIONS,
    personGeneration: PERSON_GENERATION_OPTIONS,
    constants: {
      pollInterval: POLL_INTERVAL,
      generationTimeout: GENERATION_TIMEOUT,
      maxPromptLength: MAX_PROMPT_LENGTH,
    },
  };
}
