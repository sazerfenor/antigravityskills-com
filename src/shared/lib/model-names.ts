/**
 * Model display name mapping
 * Maps technical model IDs to user-friendly display names
 *
 * ⚠️ 模板化说明：
 * 如果你想给 AI 模型起品牌名称，请修改下方的映射。
 * 例如：'gemini-3-pro-image-preview': 'Your Brand Pro'
 *
 * 品牌名称也可以通过 src/config/brand.ts 中的 modelBrand 配置。
 */

import { brandConfig } from '@/config';

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // ✨ 品牌化模型 (根据 brandConfig.modelBrand 配置)
  // 如果 brandConfig.modelBrand.premium 为空，则显示原始模型名
  'gemini-3-pro-image-preview': brandConfig.modelBrand.premium || 'Gemini 3 Pro Image',
  'gemini-2.5-flash-image': brandConfig.modelBrand.fast || 'Gemini 2.5 Flash Image',

  // 📋 Standard Gemini Models (Keep original names)
  'gemini-3-flash-preview': 'Gemini 3 Flash',  // Latest fast model (Dec 2025)
  'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
  'gemini-2.5-flash-latest': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',

  // Add more model mappings here as needed
};

/**
 * Get user-friendly display name for a model
 * @param modelId - Technical model ID
 * @returns User-friendly display name or the original ID if no mapping exists
 */
export function getModelDisplayName(modelId: string | null | undefined): string {
  if (!modelId) return '';
  
  // Check if we have a custom display name
  if (MODEL_DISPLAY_NAMES[modelId]) {
    return MODEL_DISPLAY_NAMES[modelId];
  }
  
  // Fallback: clean up the model ID for display
  // Remove provider prefix and make it more readable
  return modelId
    .replace(/^(gemini|gpt|claude|dalle)-/, '') // Remove common prefixes
    .replace(/-/g, ' ') // Replace hyphens with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(' ');
}
