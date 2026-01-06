// src/shared/blocks/vision-logic/default-preset.ts
/**
 * V15.0: 预设系统已迁移到数据库
 *
 * 系统预设现在存储在 community_post 表中 (isPreset=true)
 * 使用 /api/logic/presets 端点获取预设列表
 *
 * 此文件只保留类型定义以保持向后兼容性
 */

import type { PromptHighlights, DynamicSchema } from './types';

/**
 * Preset data structure (V2 format)
 * @deprecated Use API-based presets from /api/logic/presets instead
 */
export interface PresetData {
  input: string;
  schema: DynamicSchema;
  formValues: Record<string, string | string[] | number>;
  promptEnglish: string;
  promptNative: string;
  promptHighlights: PromptHighlights;
  presetImageUrl: string;
}

/**
 * @deprecated All presets are now stored in database
 */
export type PresetIntent = 'portrait' | 'landscape' | 'logo';

/**
 * @deprecated Use /api/logic/presets API instead
 */
export const PRESETS: Record<string, PresetData> = {};

/**
 * @deprecated Use first system preset from /api/logic/presets instead
 */
export const DEFAULT_PRESET: PresetData | null = null;
