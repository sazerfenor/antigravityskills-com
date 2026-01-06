import { z } from 'zod';

/**
 * Prompt Logic Object (PLO) Schema
 * Core data structure for the VisionLogic Middleware system.
 * 
 * @see DOC/Artifacts/PRD_Handoff.md
 */

// Narrative Parameter (with strength for intensity control)
const NarrativeParamSchema = z.object({
  value: z.string(),
  strength: z.number().min(0).max(1).default(0.5),
});

// Core Subject/Action pair
const CoreSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  action: z.string().optional().default(''),
});

// Layout Constraints
const LayoutConstraintsSchema = z.object({
  ar: z.string().optional().default('1:1'), // Aspect Ratio
  text_render: z.boolean().optional().default(false),
});

// Reference Intent for Image-to-Image generation
// Controls how the AI should use reference images
export const ReferenceIntentSchema = z.enum([
  // V1 Core intents
  'malleable',    // 完全重绘 - Redraw entirely in new style
  'structure',    // 保持构图 - Keep layout/composition, change content
  'subject',      // 保持主体 - Keep main subject, change background/style
  'style_ref',    // 仅提取风格 - Use only as style reference
  // V2 Extended intents
  'face_swap',    // 换脸 - Swap face onto different body/scene
  'pose_transfer', // 姿势迁移 - Apply pose to new character
  'inpaint',      // 局部重绘 - Redraw specific area described in prompt
  'outpaint',     // 画面扩展 - Extend image in specified direction
]);

// V3.0: Internal Signals Schema - Hidden metadata for intent preservation
// These signals are auto-detected by Intent Analyzer and passed through to Compiler
export const InternalSignalsSchema = z.object({
  /** Reference intent inferred from image analysis (face_swap, style_ref, etc.) */
  referenceIntent: ReferenceIntentSchema.optional(),
  /** Primary mood detected from text/image (melancholic, energetic, peaceful, etc.) */
  primaryMood: z.string().optional(),
  /** Visual complexity level */
  visualComplexity: z.enum(['focused', 'balanced', 'complex']).optional(),
  /** Detected subject type from image analysis */
  detectedSubjectType: z.enum(['person', 'product', 'scene', 'abstract', 'other']).optional(),
});

// V3.2: Image Processing Instruction Schema - How to use each image in generation
export const ImageProcessingInstructionSchema = z.object({
  /** Index of the image in the uploaded images array */
  image_index: z.number(),
  /** Role of this image in generation */
  role: z.enum(['face_source', 'style_reference', 'composition_reference', 'redraw_target', 'product_reference']),
  /** Natural language instruction for downstream API */
  instruction: z.string(),
});

// V3.5: Primary Intent Schema - Core creative intent for anchoring
// This ensures the user's primary style/technique/format is prominently featured in the final prompt
export const PrimaryIntentCategorySchema = z.enum([
  'style',      // Art movements, named styles (Ghibli, Pixar, Van Gogh)
  'technique',  // Rendering methods (Oil painting, Watercolor, 3D render)
  'aesthetic',  // Visual philosophies (Minimalist, Cyberpunk, Cottagecore)
  'theme',      // Conceptual frameworks (Horror, Fantasy, Sci-fi)
  'format',     // Output carriers (PPT, Poster, Banner, UI, Logo)
]);

export const PrimaryIntentSchema = z.object({
  /** 核心创作意图短语 (e.g., "3D Clay Style Portrait", "Corporate PPT Slide Design") */
  phrase: z.string().min(1, 'Primary intent phrase is required'),
  /** 意图类别 */
  category: PrimaryIntentCategorySchema,
  /** 信心度 0-1 (1.0=Explicit, 0.8=Implicit but clear, <0.8=null) */
  confidence: z.number().min(0).max(1),
});

// ============================================
// Prompt Highlight Schemas (PRD: Prompt 高亮交互系统)
// ============================================

/** 高亮类别枚举 */
export const HighlightCategorySchema = z.enum([
  'subject',      // 主题
  'style',        // 风格
  'lighting',     // 光照
  'environment',  // 环境
  'mood',         // 氛围
  'technical',    // 技术参数
]);

/** 单个高亮片段 Schema */
export const HighlightSpanSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  fieldId: z.string(),
  fieldLabel: z.string(),
  originalValue: z.string(),
  category: HighlightCategorySchema,
  transformedTo: z.string().optional(),
});

/** 双语高亮数据 Schema */
export const PromptHighlightsSchema = z.object({
  native: z.array(HighlightSpanSchema),
  english: z.array(HighlightSpanSchema),
});

// Main PLO Schema
export const PLOSchema = z.object({
  core: CoreSchema,
  narrative_params: z.record(z.string(), NarrativeParamSchema).optional().default({}),
  layout_constraints: LayoutConstraintsSchema.optional().default({ ar: '1:1', text_render: false }),
  sync_status: z.enum(['linked', 'paused', 'broken']).optional().default('linked'),
  custom_input: z.string().optional(), // User-provided details (brand name, specific text, etc.)

  // V2: Three-stage architecture support
  preserved_details: z.array(z.string()).optional(), // Details that couldn't be mapped to form fields
  technical_constraints: z.record(z.string(), z.any()).optional(), // Technical params to pass through (facelock, seed, etc.)

  // V3: Reference Image Intent (for i2i generation)
  reference_intent: ReferenceIntentSchema.optional(), // How to use reference images

  // V3.1: High-level Intent (from Intent Analyzer / DynamicSchema)
  content_category: z.enum([
    'photography',      // Portraits, landscapes, product shots
    'graphic_design',   // Posters, banners, logos, PPT
    'infographic',      // Information graphics, tutorials, charts
    'illustration',     // Illustrations, storybooks, comics
    'other'
  ]).optional(),

  style_hints: z.array(z.string()).optional(),  // Style keywords ["Y2K", "minimalist", "cyberpunk"]

  image_descriptions: z.array(z.string()).optional(),  // Reference image content descriptions

  // V3.0: Internal Signals - System-inferred hidden metadata for intent preservation
  internal_signals: InternalSignalsSchema.optional(),

  // V3.2 NEW: Image Processing Instructions - How to use each uploaded image
  image_processing_instructions: z.array(ImageProcessingInstructionSchema).optional(),

  // V3.5 NEW: Primary Intent - Core creative intent for first-sentence anchoring
  primary_intent: PrimaryIntentSchema.optional(),
});

// Request Schema for /api/logic/compile
export const CompileRequestSchema = z.object({
  plo: PLOSchema,
  // 方案 D: 当用户即将生成图片时，Compile 免费（费用已包含在图片生成中）
  skipCreditDeduction: z.boolean().optional().default(false),
});

// Response type (扩展支持 highlights)
export const CompileResponseSchema = z.object({
  native: z.string(),
  english: z.string(),
  detectedLang: z.string(),
  highlights: PromptHighlightsSchema.optional(),
});

// Type exports for TypeScript
export type NarrativeParam = z.infer<typeof NarrativeParamSchema>;
export type PLO = z.infer<typeof PLOSchema>;
export type CompileRequest = z.infer<typeof CompileRequestSchema>;
export type CompileResponse = z.infer<typeof CompileResponseSchema>;
export type HighlightSpan = z.infer<typeof HighlightSpanSchema>;
export type PromptHighlights = z.infer<typeof PromptHighlightsSchema>;
export type ReferenceIntent = z.infer<typeof ReferenceIntentSchema>;
export type InternalSignals = z.infer<typeof InternalSignalsSchema>;
export type ContentCategory = PLO['content_category'];
export type ImageProcessingInstruction = z.infer<typeof ImageProcessingInstructionSchema>;
// V3.5 NEW
export type PrimaryIntent = z.infer<typeof PrimaryIntentSchema>;
export type PrimaryIntentCategory = z.infer<typeof PrimaryIntentCategorySchema>;
