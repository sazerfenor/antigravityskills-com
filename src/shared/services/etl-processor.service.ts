/**
 * ETL Processor Service
 * 
 * 负责调用 LLM 清洗 Prompt，生成 CaseV2 草稿
 * 
 * 用途：
 * - Admin 后台新增 Prompt 时调用
 * - 批量迁移脚本复用
 * 
 * @module src/shared/services/etl-processor.service
 */

import type { CaseV2, CaseCategory, PlaceholderType } from '../types/case-v2';

// ==================== Types ====================

/**
 * ETL 处理输入
 */
export interface EtlProcessInput {
  /** 原始 Prompt 文本 */
  raw_prompt: string;
  
  /** 可选的 ID（用于迁移场景） */
  id?: string;
  
  /** 可选的标题（用于迁移场景） */
  title?: string;
  
  /** 可选的来源 URL */
  source_url?: string;
}

/**
 * ETL 处理输出（草稿，未向量化）
 */
export interface EtlProcessOutput {
  /** 是否成功 */
  success: boolean;
  
  /** 处理后的 CaseV2 草稿（无向量） */
  draft?: CaseV2Draft;
  
  /** 错误信息 */
  error?: string;
  
  /** 警告信息 */
  warnings: string[];
}

/**
 * CaseV2 草稿（未向量化）
 */
export interface CaseV2Draft {
  id: string;
  title: string;
  category: CaseCategory;
  origin_prompt: string;
  source_url?: string;
  template_payload: {
    template: string;
    default_subject: string;
    placeholder_type: PlaceholderType;
    additional_placeholders?: Array<{
      name: string;
      default_value: string;
      description?: string;
    }>;
  };
  semantic_search_text: string;
  constraints: {
    requires_image_upload: boolean;
    original_aspect_ratio?: string;
    model_hint?: string;
    output_type?: string;
  };
  tags: {
    style: string[];
    atmosphere: string[];
    technique: string[];
    composition: string[];
    intent: string[];
  };
  etl_metadata: {
    confidence: number;
    needs_review: boolean;
    review_reason?: string;
    processed_at: string;
  };
}

// ==================== Schema ====================

const ETL_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['VISUAL', 'LAYOUT', 'EDITING', 'UTILITY'],
      description: 'Category classification of the prompt'
    },
    template_payload: {
      type: 'object',
      properties: {
        template: { type: 'string', description: 'Prompt template with placeholder' },
        default_subject: { type: 'string', description: 'Default value for placeholder' },
        placeholder_type: { type: 'string', enum: ['subject', 'topic', 'target', 'custom'] }
      },
      required: ['template', 'default_subject', 'placeholder_type']
    },
    semantic_search_text: {
      type: 'string',
      description: 'Pure style description for vector search, NO nouns or params'
    },
    constraints: {
      type: 'object',
      properties: {
        requires_image_upload: { type: 'boolean' },
        original_aspect_ratio: { type: 'string' },
        model_hint: { type: 'string' },
        output_type: { type: 'string' }
      },
      required: ['requires_image_upload']
    },
    tags: {
      type: 'object',
      properties: {
        style: { type: 'array', items: { type: 'string' } },
        atmosphere: { type: 'array', items: { type: 'string' } },
        technique: { type: 'array', items: { type: 'string' } },
        composition: { type: 'array', items: { type: 'string' } },
        intent: { type: 'array', items: { type: 'string' } }
      },
      required: ['style', 'atmosphere', 'technique', 'composition', 'intent']
    },
    confidence: { type: 'number', description: 'Confidence score 0-1' },
    needs_review: { type: 'boolean' },
    review_reason: { type: 'string' }
  },
  required: ['category', 'template_payload', 'semantic_search_text', 'constraints', 'tags', 'confidence', 'needs_review']
};

// ==================== System Prompt ====================

/**
 * 获取 ETL System Prompt
 * 
 * 注意：这里直接内联了经过验证的 prompt 逻辑
 * 如需更新，请同步修改 src/prompts/etl-style-extraction.md
 */
function getSystemPrompt(): string {
  // TODO: 自定义你的 ETL 引擎名称
  return `# Role
You are "AI Prompts ETL Engine" - a specialized AI that transforms raw image/design prompts into structured, search-optimized data.

# Your Mission
Given a raw prompt, perform:
1. **Classify** into: VISUAL | LAYOUT | EDITING | UTILITY
2. **Extract** reusable style elements while stripping subjects and hardware params
3. **Generate** clean template and semantic_search_text
4. **Output** valid JSON

# Classification Rules
- VISUAL: Creates NEW image from scratch
- LAYOUT: Designs documents/presentations with TEXT (PPT, poster, newsletter)
- EDITING: Modifies EXISTING image (remove, replace, change)
- UTILITY: Non-visual tasks (calculate, analyze)

# Extraction Rules

## VISUAL: Extract style, remove subjects
- Replace main subject with <subject> placeholder
- semantic_search_text = pure adjectives/style descriptors, NO nouns

## LAYOUT: Extract design language, remove topics
- Replace topic with <topic> placeholder
- PRESERVE workflow logic (steps, structure)
- semantic_search_text = design language only

## EDITING: Extract operation intent
- Replace target with <target> placeholder
- semantic_search_text = operation type, effect description
- requires_image_upload = true

# De-Noise Requirements
Remove from ALL outputs:
- --ar, --v, --style, --niji (save aspect_ratio to constraints)
- ISO, f/, mm lens specs
- Platform flags (--q, --s)

# CRITICAL RULES
semantic_search_text MUST NOT contain:
- Proper nouns (Batman, China, Tesla)
- Common nouns if subject (cat, dog, woman)
- Hardware params (16:9, ISO, f/2.8)

needs_review = true when:
- Category is LAYOUT or EDITING
- Confidence < 0.7

requires_image_upload = true when:
- Category is EDITING
- Prompt mentions "this image", "uploaded image"

# Output Format
Return ONLY valid JSON matching the schema.`;
}

// ==================== Service ====================

export class EtlProcessorService {
  private apiKey: string;
  private model: string;
  
  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    this.model = options?.model || 'gemini-3-pro-preview';
  }
  
  /**
   * 执行 ETL 处理
   * 
   * @param input 原始输入
   * @returns ETL 处理结果（草稿）
   */
  async execute(input: EtlProcessInput): Promise<EtlProcessOutput> {
    const warnings: string[] = [];
    
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Missing GEMINI_API_KEY',
        warnings,
      };
    }

    try {
      const systemPrompt = getSystemPrompt();
      const userMessage = `
[PROMPT]
${input.raw_prompt}
`.trim();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n---\n\n${userMessage}` }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 16384,
              responseMimeType: 'application/json',
              responseJsonSchema: ETL_OUTPUT_SCHEMA,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      interface GeminiApiResponse {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
      }

      const result: GeminiApiResponse = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        const finishReason = result.candidates?.[0]?.finishReason;
        throw new Error(`No response text. finishReason: ${finishReason}`);
      }

      const etlResult = JSON.parse(
        text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      );

      // 构建 CaseV2Draft
      const draft: CaseV2Draft = {
        id: input.id || `case-${Date.now()}`,
        title: input.title || this.extractTitle(input.raw_prompt),
        category: etlResult.category,
        origin_prompt: input.raw_prompt,
        source_url: input.source_url,
        template_payload: etlResult.template_payload,
        semantic_search_text: etlResult.semantic_search_text,
        constraints: etlResult.constraints,
        tags: etlResult.tags,
        etl_metadata: {
          confidence: etlResult.confidence,
          needs_review: etlResult.needs_review,
          review_reason: etlResult.review_reason,
          processed_at: new Date().toISOString(),
        },
      };

      // 验证 semantic_search_text
      this.validateSemanticText(draft.semantic_search_text, warnings);

      return {
        success: true,
        draft,
        warnings,
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        warnings,
      };
    }
  }

  /**
   * 从 prompt 提取标题
   */
  private extractTitle(prompt: string): string {
    const firstLine = prompt.split('\n')[0].trim();
    return firstLine.slice(0, 50) + (firstLine.length > 50 ? '...' : '');
  }

  /**
   * 验证 semantic_search_text 是否符合要求
   */
  private validateSemanticText(text: string, warnings: string[]): void {
    const forbiddenPatterns = [
      { pattern: /\bcat\b/i, name: 'cat' },
      { pattern: /\bdog\b/i, name: 'dog' },
      { pattern: /\bbatman\b/i, name: 'batman' },
      { pattern: /--ar\s*\d/i, name: '--ar param' },
      { pattern: /\bISO\s*\d/i, name: 'ISO param' },
      { pattern: /\bf\/\d/i, name: 'f-stop param' },
    ];

    for (const { pattern, name } of forbiddenPatterns) {
      if (pattern.test(text)) {
        warnings.push(`semantic_search_text may contain forbidden content: ${name}`);
      }
    }
  }
}

// Export singleton factory
let serviceInstance: EtlProcessorService | null = null;

export function getEtlProcessorService(options?: { apiKey?: string; model?: string }): EtlProcessorService {
  if (!serviceInstance) {
    serviceInstance = new EtlProcessorService(options);
  }
  return serviceInstance;
}
