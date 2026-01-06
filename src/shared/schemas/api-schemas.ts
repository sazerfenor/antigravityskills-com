/**
 * API 请求参数 Zod Schemas
 * 
 * @description
 * 集中定义所有 API 接口的参数校验规则，防止恶意数据注入。
 * 使用方法：配合 validateRequest() 函数使用。
 * 
 * @note Zod v4 语法，不使用 errorMap
 * @see src/shared/lib/zod.ts
 */

import { z } from 'zod';

// ============================================================
// AI 相关接口
// ============================================================

/**
 * POST /api/ai/generate - AI 内容生成
 * 
 * @security
 * - provider 枚举限制，防止注入未知提供商
 * - prompt 长度限制 10K，防止资源耗尽攻击
 * - model 长度限制，防止字段溢出
 */
export const aiGenerateSchema = z.object({
  provider: z.enum(['gemini', 'replicate', 'kie']),
  mediaType: z.enum(['image', 'music']),
  model: z.string().min(1, 'Model is required').max(100, 'Model name too long'),
  prompt: z.string().min(1, 'Prompt is required').max(10000, 'Prompt too long (max 10000 chars)'),
  scene: z.enum(['text-to-image', 'image-to-image', 'text-to-music']),
  options: z.record(z.string(), z.any()).optional(),
  optimizationData: z
    .object({
      referenceCaseUsed: z
        .object({
          id: z.string(),
          title: z.string(),
          relevanceReason: z.string(),
        })
        .optional(),
      enhancementLogic: z.string().optional(),
      modelAdvantage: z.string().optional(),
      suggestedModifiers: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
  // 🌟 SEO Image Naming: AI-extracted keywords from optimization
  seoHints: z.string().max(200, 'SEO hints too long').optional().nullable(),
});

export type AIGenerateInput = z.infer<typeof aiGenerateSchema>;

// ============================================================
// 社区相关接口
// ============================================================

/**
 * POST /api/community/posts - 社区发布
 * 
 * @note
 * aiTaskId 使用 min(1) 而非 uuid()，因为项目中同时存在：
 * - 真实用户 ID: UUID 格式 (e.g., "2a7e55d7-e3cc-4eec-a8cb-dab2cde60af8")
 * - 虚拟用户 ID: NanoID 格式 (e.g., "R9XbwJbSW1YmEdDYzo7MN")
 * 
 * visionLogicData (可选): 保存 VisionLogic 表单状态，用于 Remix 时完整还原用户选择
 */
export const communityPostSchema = z.object({
  aiTaskId: z.string().min(1, 'aiTaskId is required'),
  shareToPublic: z.boolean().optional().default(false),
  visionLogicData: z.object({
    version: z.number(),
    schema: z.any(), // DynamicSchema
    formValues: z.record(z.string(), z.any()),
    promptNative: z.string(),
    promptEnglish: z.string(),
    detectedLang: z.string().optional(),
    uploadedImageUrls: z.array(z.string()).optional(),
    // V3 新增字段 - 用于 Remix 时完整状态还原
    originalInput: z.string().optional(),           // 用户原始输入
    model: z.string().optional(),                   // 使用的模型
    aspectRatio: z.string().optional(),             // 宽高比
    promptHighlights: z.any().optional(),           // Prompt 高亮数据
  }).optional(),
});

export type CommunityPostInput = z.infer<typeof communityPostSchema>;

// ============================================================
// 支付相关接口
// ============================================================

/**
 * POST /api/payment/checkout - 支付结算
 * 
 * @security
 * - product_id 必填，防止空订单
 * - currency 限制长度，防止注入
 * - payment_provider 限制长度
 * - metadata 允许任意键值对但受整体请求大小限制
 */
export const checkoutSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required').max(100, 'Product ID too long'),
  currency: z.string().min(3, 'Invalid currency').max(10, 'Currency code too long').optional(),
  locale: z.string().min(2, 'Invalid locale').max(10, 'Locale too long').optional(),
  payment_provider: z.string().max(50, 'Payment provider name too long').optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ============================================================
// 评论相关接口
// ============================================================

/**
 * POST /api/community/posts/[id]/comments - 创建评论
 * 
 * @security
 * - content 长度限制 2000，防止 DoS
 * - parentId 可选，用于回复
 */
export const commentCreateSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment is too long (max 2000 chars)'),
  parentId: z.string().optional(),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

// ============================================================
// SEO / Content Sections (V14.0)
// ============================================================

/**
 * Content Section Schemas for AI-generated dynamic content
 * 
 * @description
 * These schemas validate AI output for the contentSections field.
 * Using Discriminated Union pattern for type-safe polymorphism.
 * 
 * @usage
 * ```typescript
 * import { contentSectionsSchema } from '@/shared/schemas/api-schemas';
 * const validated = contentSectionsSchema.safeParse(aiOutput.contentSections);
 * ```
 */

// Base schema for all section types
const baseSectionSchema = z.object({
  id: z.string().min(1, 'Section ID is required'),
  title: z.string().min(1, 'Section title is required').max(200, 'Title too long'),
  headingLevel: z.enum(['h2', 'h3']),
});

// Rich Text Section
const richTextSectionSchema = baseSectionSchema.extend({
  type: z.literal('rich-text'),
  data: z.object({
    text: z.string().min(1, 'Text content is required'),
  }),
});

// FAQ Accordion Section
const faqSectionSchema = baseSectionSchema.extend({
  type: z.literal('faq-accordion'),
  data: z.object({
    items: z.array(z.object({
      q: z.string().min(1, 'Question is required'),
      a: z.string().min(1, 'Answer is required'),
    })).min(1, 'At least one FAQ item is required'),
  }),
});

// Checklist Section
const checklistSectionSchema = baseSectionSchema.extend({
  type: z.literal('checklist'),
  data: z.object({
    items: z.array(z.string().min(1)).min(1, 'At least one checklist item is required'),
  }),
});

// Comparison Table Section
const comparisonTableSectionSchema = baseSectionSchema.extend({
  type: z.literal('comparison-table'),
  data: z.object({
    left: z.string().min(1, 'Left column header is required'),
    right: z.string().min(1, 'Right column header is required'),
    rows: z.array(z.object({
      pro: z.string(),
      con: z.string(),
    })).min(1, 'At least one comparison row is required'),
  }),
});

// Tags Section (for SEO keywords / visual elements)
const tagsSectionSchema = baseSectionSchema.extend({
  type: z.literal('tags'),
  data: z.object({
    items: z.array(z.string().min(1)).min(1, 'At least one tag is required'),
  }),
});

// Discriminated Union of all section types
export const contentSectionSchema = z.discriminatedUnion('type', [
  richTextSectionSchema,
  faqSectionSchema,
  checklistSectionSchema,
  comparisonTableSectionSchema,
  tagsSectionSchema,
]);

// Array of content sections
export const contentSectionsSchema = z.array(contentSectionSchema);

export type ContentSection = z.infer<typeof contentSectionSchema>;
export type ContentSections = z.infer<typeof contentSectionsSchema>;

// ============================================================
// V15.0 SEO Generation - Stage 1 / Stage 2 Schemas
// ============================================================

/**
 * POST /api/admin/seo/generate-all - SEO 内容生成请求
 *
 * @security
 * - prompt 长度限制 10K，防止资源耗尽攻击
 * - imageUrl 必须为有效 URL
 */
export const seoGenerateAllSchema = z.object({
  postId: z.string().min(1, 'postId is required'),
  prompt: z.string().min(1, 'prompt is required').max(10000, 'prompt too long'),
  model: z.string().min(1, 'model is required').max(100, 'model name too long'),
  imageUrl: z.string().url('Invalid image URL'),
  subject: z.string().max(100, 'subject too long').optional(),
});

export type SEOGenerateAllInput = z.infer<typeof seoGenerateAllSchema>;

/**
 * Stage 1 Output Schema - Strategist Blueprint
 *
 * @description
 * Validates the AI output from Stage 1 (Strategy extraction).
 * Ensures anchor, microFocus, and planned blocks are properly structured.
 */
export const stage1OutputSchema = z.object({
  // V15.0 新增: Chain-of-Thought 推理过程 (可选，用于调试)
  _reasoning: z.object({
    contextAnalysis: z.string(),
    conflictResolution: z.string(),
    microFocusSelection: z.string(),
    voiceSelection: z.string(),
  }).optional(),

  // 核心输出
  anchor: z.string().min(1, 'anchor is required').max(100, 'anchor too long'),
  microFocus: z.string().max(200, 'microFocus too long').optional().default(''),
  intent: z.enum(['Artistic', 'Functional', 'Commercial']),
  language: z.string().min(2).max(10).optional().default('en'),

  // V15.0 新增: Voice Persona 建议
  suggestedVoice: z.enum(['Curator', 'Engineer', 'Director']).optional(),

  // 内容规划
  plannedBlocks: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(['rich-text', 'checklist', 'comparison-table', 'faq-accordion', 'tags']),
    intent: z.string().min(1),
  })).min(3, 'At least 3 blocks required').max(7, 'At most 7 blocks allowed'),

  // Anti-Templating 承诺 (可选)
  antiTemplatingCommitment: z.object({
    blocksStartWith: z.string(),
    blocksEndWith: z.string(),
    noConsecutiveRichText: z.boolean(),
  }).optional(),
});

export type Stage1Output = z.infer<typeof stage1OutputSchema>;

/**
 * Stage 2 Output Schema - Writer Execution
 *
 * @description
 * Validates the AI output from Stage 2 (Content generation).
 * Includes SEO metadata, content sections, and V15.0 GEO snippet.
 */
export const stage2OutputSchema = z.object({
  // 可选: 创意决策说明
  _reasoning: z.string().optional(),

  // SEO 元数据
  seoTitle: z.string().min(1, 'seoTitle is required').max(70, 'seoTitle too long (max 70 chars)'),
  h1Title: z.string().min(1, 'h1Title is required').max(100, 'h1Title too long'),
  seoDescription: z.string().min(80, 'seoDescription too short (min 80 chars)').max(200, 'seoDescription too long (max 200 chars)'),
  seoKeywords: z.array(z.string().min(1)).min(3, 'At least 3 keywords required').max(10, 'At most 10 keywords allowed'),
  imageAlt: z.string().min(1, 'imageAlt is required').max(200, 'imageAlt too long'),
  slugKeywords: z.string().min(1, 'slugKeywords is required').max(60, 'slugKeywords too long'),

  // V15.0 新增: GEO Snippet
  snippetSummary: z.string().min(50, 'snippetSummary too short (min 50 chars)').max(200, 'snippetSummary too long (max 200 chars)').optional(),

  // 内容模块 (使用已定义的 contentSectionsSchema)
  contentSections: contentSectionsSchema,
});

export type Stage2Output = z.infer<typeof stage2OutputSchema>;


