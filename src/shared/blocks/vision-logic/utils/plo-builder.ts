/**
 * PLO (Prompt Logic Object) Builder
 *
 * 从动态表单值构建 PLO 对象，用于发送到 /api/logic/compile
 * 纯函数，无副作用
 *
 * @see PRD: VisionLogic Three-Stage Architecture
 */

import type { ContentCategory, DynamicSchema, ImageProcessingInstruction, InternalSignals, PrimaryIntent, SchemaField } from '../types';
import { parseReferenceIntent, type ReferenceIntent } from './reference-intent-parser';

// ============================================
// Types
// ============================================

/** Narrative Parameter 结构 */
export interface NarrativeParam {
  value: string;
  strength: number;
}

/** PLO 完整结构 */
export interface PLOObject {
  core: {
    subject: string;
    action: string;
  };
  narrative_params: Record<string, NarrativeParam>;
  layout_constraints: {
    ar: string;
    text_render: boolean;
  };
  sync_status: 'linked' | 'unlinked';
  custom_input?: string;
  preserved_details?: string[];
  technical_constraints?: Record<string, unknown>;
  reference_intent?: ReferenceIntent;

  // V3.1: High-level intent from Intent Analyzer
  content_category?: ContentCategory;
  style_hints?: string[];
  image_descriptions?: string[];

  // V3.0: Internal Signals - System-inferred hidden metadata for intent preservation
  internal_signals?: InternalSignals;

  // V3.2 NEW: Image Processing Instructions - How to use each uploaded image
  image_processing_instructions?: Array<{
    image_index: number;
    role: ImageProcessingInstruction['role'];
    instruction: string;
  }>;

  // V3.5 NEW: Primary Intent - Core creative intent for first-sentence anchoring
  primary_intent?: PrimaryIntent;
}

/** 构建 PLO 的输入参数 */
export interface PLOBuildOptions {
  /** 用户原始输入 (subject) */
  input: string;
  /** 动态表单 Schema */
  schema: DynamicSchema;
  /** 表单当前值 */
  formValues: Record<string, unknown>;
  /** 用户触碰过的字段 ID 集合 (用于区分"从未操作"和"主动清空") */
  touchedFields?: Set<string>;
  /** 用户补充输入 */
  customInput?: string;
  /** 画面比例 */
  aspectRatio?: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * 处理 Slider 字段，生成 NarrativeParam
 */
function processSliderField(
  field: SchemaField,
  value: unknown
): NarrativeParam {
  const numValue = Number(value ?? field.defaultValue ?? 0.5);
  const min = field.min ?? 0;
  const max = field.max ?? 1;

  // Normalize to 0-1 range
  const normalizedStrength = max === min ? 0.5 : (numValue - min) / (max - min);
  // Clamp to valid range
  const clampedStrength = Math.max(0, Math.min(1, normalizedStrength));

  // Convert to semantic value
  const semanticValue =
    clampedStrength >= 0.7 ? 'high' : clampedStrength >= 0.4 ? 'moderate' : 'low';

  return {
    value: semanticValue,
    strength: clampedStrength,
  };
}

/**
 * 处理 Select 字段，生成 NarrativeParam
 *
 * V3.2: 区分"从未操作"和"主动清空"两种场景
 * - 从未操作 (wasTouched=false) + 空值 → 使用 defaultValue
 * - 主动清空 (wasTouched=true) + 空值 → 尊重用户意图，返回 null
 * - 有值 → 使用用户选择的值
 */
function processSelectField(
  field: SchemaField,
  value: unknown,
  wasTouched: boolean
): NarrativeParam | null {
  // 处理数组（多选）
  if (Array.isArray(value)) {
    const filtered = value.filter(v => v != null && v !== '');
    if (filtered.length === 0) {
      // 空数组场景
      if (wasTouched) {
        // 用户主动清空 → 尊重用户意图，跳过此字段
        return null;
      }
      // 用户从未操作 → 使用 defaultValue 作为 fallback
      if (field.defaultValue != null && field.defaultValue !== '') {
        return {
          value: String(field.defaultValue),
          strength: 0.7, // 默认值用稍低的 strength
        };
      }
      return null;
    }
    return {
      value: filtered.join(', '),
      strength: 0.8,
    };
  }

  // 处理单值（单选）
  let stringValue = value != null && value !== '' ? String(value) : '';

  if (!stringValue) {
    // 空值场景
    if (wasTouched) {
      // 用户主动清空 → 跳过
      return null;
    }
    // 用户从未操作 → 使用 defaultValue
    if (field.defaultValue != null && field.defaultValue !== '') {
      return {
        value: String(field.defaultValue),
        strength: 0.7,
      };
    }
    return null;
  }

  return {
    value: stringValue,
    strength: 0.8,
  };
}

/**
 * 处理 Text 字段，生成 NarrativeParam
 */
function processTextField(
  field: SchemaField,
  value: unknown
): NarrativeParam | null {
  const textValue = String(value || field.defaultValue || '');

  if (!textValue) return null;

  return {
    value: textValue,
    strength: 0.9,
  };
}

// ============================================
// Main Builder Function
// ============================================

/**
 * 构建 PLO 对象
 *
 * @param options - 构建参数
 * @returns PLO 对象，可直接发送到 /api/logic/compile
 *
 * @example
 * const plo = buildPLO({
 *   input: 'portrait of a woman',
 *   schema: activeSchema,
 *   formValues: { style: ['Cinematic'], mood: ['Dramatic'] },
 *   touchedFields: new Set(['style', 'mood']),
 *   customInput: 'with blue eyes',
 * });
 */
export function buildPLO(options: PLOBuildOptions): PLOObject {
  const { input, schema, formValues, touchedFields, customInput, aspectRatio = '1:1' } = options;

  const narrativeParams: Record<string, NarrativeParam> = {};
  const technicalConstraints: Record<string, unknown> = {};

  // Process each field in schema
  for (const field of schema.fields) {
    // V3.1: 使用 field.id 作为 key，保持与 formValues 和高亮系统的一致性
    const key = field.id;
    const fieldValue = formValues[field.id];
    const wasTouched = touchedFields?.has(field.id) ?? false;

    switch (field.type) {
      case 'slider': {
        const param = processSliderField(field, fieldValue);
        narrativeParams[key] = param;
        break;
      }

      case 'select': {
        const param = processSelectField(field, fieldValue, wasTouched);
        if (param) {
          narrativeParams[key] = param;
        }
        break;
      }

      case 'text': {
        const param = processTextField(field, fieldValue);
        if (param) {
          narrativeParams[key] = param;
        }
        break;
      }

      case 'toggle': {
        // Toggle fields go to technical_constraints
        technicalConstraints[field.id] = fieldValue ?? field.defaultValue ?? false;
        break;
      }

      // character_mapper and other types are handled elsewhere
    }
  }

  // Extract reference_intent using the parser
  const referenceIntent = parseReferenceIntent(formValues['reference_intent']);

  // V3.0: Multi-Source Intent Resolution (Priority Order)
  // Priority 1: Schema Internal Signals (system-inferred, highest priority)
  // Priority 2: User Manual Override (UI Select field, explicit user choice)
  // Priority 3: Default Fallback (only when images are present)
  let resolvedReferenceIntent: ReferenceIntent | undefined = undefined;

  // Priority 1: Use internalSignals from Schema (system-inferred from Intent Analyzer)
  if (schema.internalSignals?.referenceIntent) {
    resolvedReferenceIntent = schema.internalSignals.referenceIntent;
  }

  // Priority 2: User manual override (from reference_intent UI field)
  // This allows users to explicitly change the system's inference
  if (referenceIntent) {
    resolvedReferenceIntent = referenceIntent;
  }

  // Priority 3: Default fallback (only when images are present but no intent detected)
  const hasImages = schema.imageDescriptions && schema.imageDescriptions.length > 0;
  if (!resolvedReferenceIntent && hasImages) {
    resolvedReferenceIntent = 'malleable';
  }

  // V3.1 FIX: 使用精确的文本内容字段白名单 + 非空值检查
  // 只有这些字段存在且有非空值时，才启用 text_render
  const TEXT_CONTENT_FIELD_IDS = ['text_content', 'text_position', 'text_style', 'title_text', 'headline', 'body_text', 'caption'];

  const hasTextContent = Object.entries(narrativeParams).some(([key, param]) => {
    // 检查 1: key 必须是明确的文本内容字段
    const isTextContentField = TEXT_CONTENT_FIELD_IDS.includes(key);
    // 检查 2: value 必须非空
    const hasValue = param && param.value && param.value.trim() !== '';
    return isTextContentField && hasValue;
  });

  // Build final PLO object
  return {
    core: {
      subject: input,
      action: '',
    },
    narrative_params: narrativeParams,
    layout_constraints: {
      ar: aspectRatio,
      text_render: hasTextContent,
    },
    sync_status: 'linked',
    custom_input: customInput || undefined,
    preserved_details: schema.preservedDetails || undefined,
    technical_constraints:
      Object.keys(technicalConstraints).length > 0 ? technicalConstraints : undefined,
    reference_intent: resolvedReferenceIntent,  // V3.0: Use resolved multi-source intent

    // V3.1: Pass high-level intent from DynamicSchema to Compiler
    content_category: schema.contentCategory,
    style_hints: schema.styleHints,
    image_descriptions: schema.imageDescriptions,

    // V3.0: Pass internal signals for Compiler awareness
    internal_signals: schema.internalSignals,

    // V3.2 NEW: Pass image processing instructions to Compiler
    image_processing_instructions: schema.imageProcessingInstructions?.map(inst => ({
      image_index: inst.imageIndex,
      role: inst.role,
      instruction: inst.instruction,
    })),

    // V3.5 NEW: Pass primary intent for first-sentence anchoring in Compiler
    // Note: Convert null to undefined to satisfy Zod schema (.optional() doesn't accept null)
    primary_intent: schema.primaryIntent ?? undefined,
  };
}
