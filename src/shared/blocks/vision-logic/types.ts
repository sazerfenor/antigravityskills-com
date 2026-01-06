// ============================================
// VisionLogic Playground Types
// ============================================

// Dynamic Schema Field Types
export type FieldType = 'slider' | 'select' | 'text' | 'toggle' | 'character_mapper';

export interface SchemaField {
  id: string;
  type: FieldType;
  label: string;
  isAdvanced?: boolean; // true = hidden by default
  multiSelect?: boolean; // false = single select (radio), true/undefined = multi-select (checkbox)
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  minLabel?: string;  // Semantic label for slider min value
  maxLabel?: string;  // Semantic label for slider max value
  defaultValue?: number | string | boolean;
  options?: string[];
  source?: 'user_constraint' | 'image_derived' | 'auto_style' | 'expanded' | 'default' | 'creative_param' | 'ambiguity_resolution';
  // Character Mapper specific
  images?: { index: number; role: string }[];
}

// Content Category for scene-aware compilation (V3.1)
export type ContentCategory = 'photography' | 'graphic_design' | 'infographic' | 'illustration' | 'other';

export interface DynamicSchema {
  context: string;
  fields: SchemaField[];
  followUpQuestion?: string | null;
  preservedDetails?: string[]; // V2: Details that couldn't be mapped to form fields
  extractedRatio?: string | null; // Extracted aspect ratio from user input
  /** Debug info from Intent API (admin-only) */
  _debug?: {
    stage1_intent?: string;
    detectedLanguage?: string;
  };

  // V3.1: High-level intent from Intent Analyzer
  contentCategory?: ContentCategory;  // What type of content is the user creating
  styleHints?: string[];              // Style keywords extracted from input ["Y2K", "minimalist"]
  imageDescriptions?: string[];       // Content descriptions of uploaded reference images

  // V3.0: Internal Signals - System-inferred hidden signals for intent preservation
  internalSignals?: InternalSignals;

  // V3.2 NEW: Image Processing Instructions - How to use each uploaded image
  imageProcessingInstructions?: ImageProcessingInstruction[];

  // V3.5 NEW: Primary Intent - Core creative intent for first-sentence anchoring
  primaryIntent?: PrimaryIntent;
}

// V3.0: Internal Signals - Hidden metadata for downstream intent handling
// These are auto-detected by Intent Analyzer and NOT exposed as UI fields
export interface InternalSignals {
  /** Reference image intent (from image_analysis[].user_apparent_intent) */
  referenceIntent?: ReferenceIntent;
  /** Primary mood inferred from text/image analysis */
  primaryMood?: string;
  /** Visual complexity level */
  visualComplexity?: 'focused' | 'balanced' | 'complex';
  /** Detected subject type from image analysis */
  detectedSubjectType?: 'person' | 'product' | 'scene' | 'abstract' | 'other';
}

// V3.2: Image Processing Instruction - How to use each image in generation
export interface ImageProcessingInstruction {
  imageIndex: number;
  role: 'face_source' | 'style_reference' | 'composition_reference' | 'redraw_target' | 'product_reference';
  instruction: string;
}

// V3.5: Primary Intent - Core creative intent for first-sentence anchoring
// This ensures the user's primary style/technique/format is prominently featured in the final prompt
export type PrimaryIntentCategory = 'style' | 'technique' | 'aesthetic' | 'theme' | 'format';

export interface PrimaryIntent {
  /** 核心创作意图短语 (e.g., "3D Clay Style Portrait", "Corporate PPT Slide Design") */
  phrase: string;
  /** 意图类别 */
  category: PrimaryIntentCategory;
  /** 信心度 0-1 (1.0=Explicit, 0.8=Implicit but clear, <0.8=should be null) */
  confidence: number;
}

// Re-export ReferenceIntent type from plo-schema for use in InternalSignals
export type ReferenceIntent =
  | 'malleable'
  | 'structure'
  | 'subject'
  | 'style_ref'
  | 'face_swap'
  | 'pose_transfer'
  | 'inpaint'
  | 'outpaint';

// State Machine Types (PRD v2.1)
export type UIState = 'IDLE' | 'COMMAND_OPEN' | 'ANALYZING' | 'FORM_ACTIVE' | 'COMPILING';

// Generate Flow phases (PRD V4: Accordion Mode & Unified Loading)
export type GeneratePhase = 'IDLE' | 'OPTIMIZING' | 'GENERATING' | 'COMPLETE';

// Build Phase Loading Slots
export type BuildSlot = 'STARTUP' | 'PROCESSING' | 'FINALIZING';

// Optimize Phase Loading Slots (Prompt optimization)
export type OptimizeSlot = 'ANALYZING' | 'CRAFTING' | 'POLISHING';

// Generate Phase Loading Slots
export type GenerateSlot = 'INIT' | 'DREAMING' | 'CREATING' | 'REFINING' | 'FINISHING';

// Generated Image type
export interface GeneratedImage {
  id: string;
  url: string;
  aiTaskId?: string;
}

// Intent Suggestion type
export interface IntentSuggestion {
  value: string;
  label: string;
  icon: string;
}

// ============================================
// Prompt Highlight Types (PRD: Prompt 高亮交互系统)
// ============================================

/** 高亮类别 - 用于颜色区分 */
export type HighlightCategory =
  | 'subject'      // 主题 - 黄色 (primary)
  | 'style'        // 风格 - 紫色
  | 'lighting'     // 光照 - 蓝色
  | 'environment'  // 环境 - 绿色
  | 'mood'         // 氛围 - 粉色
  | 'technical';   // 技术参数 - 灰色

/** 单个高亮片段 */
export interface HighlightSpan {
  /** 在 prompt 字符串中的起始位置 (inclusive) */
  start: number;
  /** 在 prompt 字符串中的结束位置 (exclusive) */
  end: number;
  /** 对应的表单字段 ID */
  fieldId: string;
  /** 字段显示标签 */
  fieldLabel: string;
  /** 表单中的原始值 */
  originalValue: string;
  /** 高亮类别 - 决定颜色 */
  category: HighlightCategory;
  /** AI 如何改写了原始值 (可选) */
  transformedTo?: string;
}

/** 完整的高亮数据 (支持双语) */
export interface PromptHighlights {
  /** 用户语言 prompt 的高亮数据 */
  native: HighlightSpan[];
  /** 英文 prompt 的高亮数据 */
  english: HighlightSpan[];
}

/** DynamicField 暴露的 ref 方法 */
export interface DynamicFieldRef {
  /** 聚焦字段 */
  focus: () => void;
  /** 滚动到字段可见区域 */
  scrollIntoView: () => void;
  /** 触发高亮闪烁动画 */
  highlight: () => void;
  /** 清除高亮闪烁动画 */
  clearHighlight: () => void;
}
