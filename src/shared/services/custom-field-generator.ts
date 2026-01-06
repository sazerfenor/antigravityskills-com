import { generateText } from './gemini-text';
import { detect } from 'tinyld';

/**
 * Custom Field Generator Service
 *
 * Generates dynamic form fields for user-defined dimensions in VisionLogic.
 * Users can add custom dimensions like "Hairstyle", "Hand Gesture", etc.
 * and the AI will generate appropriate options based on the current context.
 */

// ============================================
// Type Definitions
// ============================================

export interface GeneratedField {
  id: string;
  type: 'select' | 'slider' | 'text';
  label: string;
  description?: string;
  options?: string[];
  defaultValue?: string | number | boolean;
  multiSelect?: boolean;
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface FieldGenerationResult {
  success: boolean;
  field?: GeneratedField;
  warning?: string;
  error?: string;
}

interface ExistingField {
  id: string;
  label: string;
  type: string;
}

// ============================================
// Language Detection
// ============================================

const LANG_MAP: Record<string, string> = {
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'en': 'English',
};

function detectLanguage(input: string): string {
  if (/[\u4e00-\u9fa5]/.test(input)) {
    return 'Chinese';
  }
  if (/^[\x00-\x7F]*$/.test(input)) {
    return 'English';
  }
  const detectedLangCode = detect(input);
  if (detectedLangCode && LANG_MAP[detectedLangCode]) {
    return LANG_MAP[detectedLangCode];
  }
  return 'English';
}

// ============================================
// JSON Extraction Helper
// ============================================

function extractJSON(response: string): string {
  let content = response.trim();

  if (content.startsWith('```')) {
    const firstNewline = content.indexOf('\n');
    if (firstNewline !== -1) {
      const afterFirstLine = content.substring(firstNewline + 1);
      const closingFenceInRest = afterFirstLine.lastIndexOf('```');

      if (closingFenceInRest !== -1) {
        content = afterFirstLine.substring(0, closingFenceInRest).trim();
      } else {
        content = afterFirstLine.trim();
      }
    }
  }

  if (content.startsWith('{') || content.startsWith('[')) {
    return content;
  }

  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return response.slice(firstBrace, lastBrace + 1);
  }

  return response.trim();
}

// ============================================
// Custom Field Generator Prompt
// ============================================

const CUSTOM_FIELD_GENERATOR_PROMPT = `You are a Custom Field Generator AI for image/design generation forms.

# TASK
Generate a form field configuration based on the user's requested dimension name.

# CURRENT CONTEXT
- **User Language:** {{user_language}}
- **Dimension Name:** {{dimension}}
- **Field Type:** {{field_type}}
- **Scene Context:** {{context}}
- **Existing Fields:** {{existing_fields}}

# VALIDATION RULES (CHECK FIRST)

## Rule 1: Semantic Duplication Check
Compare the requested dimension with existing fields. If semantically similar, return a warning:
- "发型" vs existing "Hairstyle" → WARNING: Duplicate
- "背景颜色" vs existing "Background" → WARNING: Overlapping
- "服装风格" vs existing "outfit_style" → WARNING: Duplicate

## Rule 2: Relevance Check
The dimension MUST be relevant to visual image generation. Reject if:
- Economic/business concepts: 价格, 成本, ROI, price, cost
- Abstract non-visual concepts: 情绪, 心情 (unless translatable to visual expression)
- Technical metadata: 分辨率, DPI, 文件格式 (these are system-level, not creative)
- Post-processing only: 美白, 瘦脸, 祛痘 (require external tools)

If rejected, return:
{
  "success": false,
  "error": "该维度不适用于图片生成",
  "suggestion": "[Suggest a related visual dimension]"
}

# FIELD TYPE GENERATION RULES

## For type: "select"
Generate 8-12 options that are:
1. **Context-aware**: Options should fit the scene context
   - Portrait photography "背景" → Studio, Outdoor, Urban, Nature, Abstract, Gradient...
   - Product shot "背景" → Pure White, Light Gray, Marble, Wood Texture, Lifestyle...
2. **Ordered by popularity**: Most common choices first
3. **Mutually exclusive OR combinable**: Decide multiSelect based on whether options can coexist
   - "发型长度" (Short/Medium/Long) → multiSelect: false
   - "配饰" (Hat/Glasses/Earrings) → multiSelect: true
4. **No "Random/AI decides" option**: The AI handles defaults automatically

## For type: "slider"
Generate semantic endpoint labels:
- minLabel: What minimum value means (e.g., "Subtle", "Simple", "Soft")
- maxLabel: What maximum value means (e.g., "Dramatic", "Complex", "Strong")
- Appropriate min/max/step values based on the dimension's nature

## For type: "text"
Generate:
- A helpful placeholder/description
- No options array

# OUTPUT FORMAT (JSON only, no markdown)

For successful generation:
{
  "success": true,
  "field": {
    "id": "custom_{{sanitized_dimension_name}}",
    "type": "{{field_type}}",
    "label": "{{dimension in user_language}}",
    "description": "[Brief description of what this controls]",
    "options": ["Option1", "Option2", ...],  // 8-12 options for select
    "defaultValue": "[Most common/neutral choice]",
    "multiSelect": true/false,  // Only for select
    "min": 0,           // Only for slider
    "max": 100,         // Only for slider
    "step": 1,          // Only for slider
    "minLabel": "...",  // Only for slider
    "maxLabel": "..."   // Only for slider
  }
}

For warnings (duplicate/overlap):
{
  "success": true,
  "field": { ... },
  "warning": "[Explain the overlap and suggest if user should proceed]"
}

For rejection:
{
  "success": false,
  "error": "[Why this dimension is not suitable]",
  "suggestion": "[Alternative visual dimension to consider]"
}

# EXAMPLES

## Example 1: Valid select field (Chinese, Portrait context)
Input: dimension="发型", field_type="select", context="portrait photography"
Output:
{
  "success": true,
  "field": {
    "id": "custom_hairstyle",
    "type": "select",
    "label": "发型",
    "description": "选择人物的发型样式",
    "options": ["长直发", "波浪卷发", "短发", "丸子头", "马尾辫", "编发", "蓬松卷发", "齐刘海", "侧分", "自然蓬松"],
    "defaultValue": "自然蓬松",
    "multiSelect": false
  }
}

## Example 2: Valid slider field
Input: dimension="Makeup Intensity", field_type="slider", context="beauty portrait"
Output:
{
  "success": true,
  "field": {
    "id": "custom_makeup_intensity",
    "type": "slider",
    "label": "Makeup Intensity",
    "description": "Control how prominent the makeup appears",
    "min": 0,
    "max": 100,
    "step": 10,
    "defaultValue": 50,
    "minLabel": "Natural/No Makeup",
    "maxLabel": "Glamorous/Heavy"
  }
}

## Example 3: Duplicate warning
Input: dimension="背景", existing_fields=[{id: "background_style", label: "Background"}]
Output:
{
  "success": true,
  "field": { ... },
  "warning": "已存在类似维度「Background」。添加此维度可能导致设置冲突，建议直接使用现有维度。"
}

## Example 4: Rejected dimension
Input: dimension="价格"
Output:
{
  "success": false,
  "error": "「价格」不是图片生成可控制的视觉维度",
  "suggestion": "如需表达价值感，可考虑添加「材质质感」或「奢华程度」维度"
}

# CRITICAL RULES
1. ALL labels and options MUST be in {{user_language}}
2. For select fields: EXACTLY 8-12 options, ordered by popularity
3. For slider fields: MUST have minLabel and maxLabel
4. ID format: "custom_" + lowercase_snake_case dimension name
5. Output ONLY valid JSON, no markdown code blocks
6. Check for duplicates BEFORE generating options`;

// ============================================
// Main Generation Function
// ============================================

export async function generateCustomField(
  dimension: string,
  fieldType: 'select' | 'slider' | 'text',
  context: string,
  existingFields: ExistingField[]
): Promise<FieldGenerationResult> {
  if (!dimension || dimension.trim().length < 1) {
    return { success: false, error: '维度名称不能为空' };
  }

  try {
    const language = detectLanguage(dimension);
    console.log(`[CustomFieldGenerator] Language: ${language}, Dimension: ${dimension}`);

    const prompt = CUSTOM_FIELD_GENERATOR_PROMPT
      .replace(/\{\{user_language\}\}/g, language)
      .replace(/\{\{dimension\}\}/g, dimension)
      .replace(/\{\{field_type\}\}/g, fieldType)
      .replace(/\{\{context\}\}/g, context || 'general image generation')
      .replace(/\{\{existing_fields\}\}/g, JSON.stringify(existingFields));

    const result = await generateText(prompt, {
      temperature: 0.5,
      maxOutputTokens: 2048,
      model: 'gemini-3-flash-preview',
    });

    const jsonStr = extractJSON(result);
    console.log('[CustomFieldGenerator] Extracted JSON:', jsonStr.substring(0, 300));

    const parsed = JSON.parse(jsonStr) as FieldGenerationResult;

    // Normalize the field if successful
    if (parsed.success && parsed.field) {
      parsed.field = normalizeField(parsed.field, fieldType);
    }

    return parsed;
  } catch (error) {
    console.error('[CustomFieldGenerator] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成失败，请重试'
    };
  }
}

// ============================================
// Field Normalization
// ============================================

function normalizeField(field: GeneratedField, requestedType: string): GeneratedField {
  return {
    id: field.id || `custom_field_${Date.now()}`,
    type: (field.type || requestedType) as 'select' | 'slider' | 'text',
    label: field.label || 'Custom Dimension',
    description: field.description,
    options: field.type === 'select' ? (field.options || ['Default']) : undefined,
    defaultValue: field.defaultValue ?? (
      field.type === 'slider' ? 50 :
      field.type === 'select' ? field.options?.[0] :
      ''
    ),
    multiSelect: field.type === 'select' ? (field.multiSelect ?? true) : undefined,
    min: field.type === 'slider' ? (field.min ?? 0) : undefined,
    max: field.type === 'slider' ? (field.max ?? 100) : undefined,
    step: field.type === 'slider' ? (field.step ?? 1) : undefined,
    minLabel: field.type === 'slider' ? field.minLabel : undefined,
    maxLabel: field.type === 'slider' ? field.maxLabel : undefined,
  };
}

// ============================================
// Batch Generation Prompt
// ============================================

const BATCH_FIELD_GENERATOR_PROMPT = `You are a Custom Field Generator AI for image/design generation forms.

# TASK
Generate form field configurations for MULTIPLE dimensions at once.

# CURRENT CONTEXT
- **User Language:** {{user_language}}
- **Dimensions:** {{dimensions}}
- **Scene Context:** {{context}}
- **Existing Fields:** {{existing_fields}}

# RULES FOR EACH DIMENSION

1. **Semantic Duplication Check**: If dimension overlaps with existing fields, include a warning
2. **Relevance Check**: Reject non-visual dimensions (price, cost, DPI, file format, etc.)
3. **Context-aware Options**: Generate 8-12 options that fit the scene context
4. **Language Consistency**: ALL labels and options MUST be in {{user_language}}

# OUTPUT FORMAT (JSON array, no markdown)

Return an array of results, one for each dimension:

[
  {
    "dimension": "Background",
    "success": true,
    "field": {
      "id": "custom_background",
      "type": "select",
      "label": "Background",
      "description": "Choose the background setting",
      "options": ["Studio", "Outdoor", "Urban", "Nature", "Abstract", "Gradient", "Bokeh", "Minimalist", "Indoor", "Beach"],
      "defaultValue": "Studio",
      "multiSelect": false
    }
  },
  {
    "dimension": "Lighting",
    "success": true,
    "field": {
      "id": "custom_lighting",
      "type": "select",
      "label": "Lighting",
      "description": "Select the lighting style",
      "options": ["Natural", "Studio", "Golden Hour", "Blue Hour", "Dramatic", "Soft", "Backlit", "Rim Light", "Neon", "Candlelight"],
      "defaultValue": "Natural",
      "multiSelect": false
    },
    "warning": "Similar to existing 'light_style' field"
  },
  {
    "dimension": "Price",
    "success": false,
    "error": "Price is not a visual dimension controllable by image generation",
    "suggestion": "Consider using 'Material Quality' or 'Luxury Level' instead"
  }
]

# CRITICAL RULES
1. Return a JSON array with one object per dimension
2. Each object must have "dimension" and "success" fields
3. For successful: include "field" object with id, type, label, options (8-12), defaultValue
4. For rejected: include "error" and "suggestion"
5. For warnings: include both "field" and "warning"
6. Output ONLY valid JSON, no markdown code blocks`;

// ============================================
// Batch Generation Function
// ============================================

export interface BatchFieldResult {
  dimension: string;
  success: boolean;
  field?: GeneratedField;
  warning?: string;
  error?: string;
  suggestion?: string;
}

export interface BatchGenerationResult {
  results: BatchFieldResult[];
  totalSuccess: number;
  totalFailed: number;
}

export async function generateCustomFieldsBatch(
  dimensions: string[],
  context: string,
  existingFields: ExistingField[]
): Promise<BatchGenerationResult> {
  if (!dimensions || dimensions.length === 0) {
    return { results: [], totalSuccess: 0, totalFailed: 0 };
  }

  try {
    // Detect language from first dimension
    const language = detectLanguage(dimensions[0]);
    console.log(`[CustomFieldGenerator Batch] Language: ${language}, Dimensions: ${dimensions.join(', ')}`);

    const prompt = BATCH_FIELD_GENERATOR_PROMPT
      .replace(/\{\{user_language\}\}/g, language)
      .replace(/\{\{dimensions\}\}/g, JSON.stringify(dimensions))
      .replace(/\{\{context\}\}/g, context || 'general image generation')
      .replace(/\{\{existing_fields\}\}/g, JSON.stringify(existingFields));

    const result = await generateText(prompt, {
      temperature: 0.5,
      maxOutputTokens: 4096, // Larger for batch
      model: 'gemini-3-flash-preview',
    });

    const jsonStr = extractJSON(result);
    console.log('[CustomFieldGenerator Batch] Extracted JSON:', jsonStr.substring(0, 500));

    // Handle both array and object responses
    let parsed: BatchFieldResult[];
    const rawParsed = JSON.parse(jsonStr);

    if (Array.isArray(rawParsed)) {
      parsed = rawParsed;
    } else if (rawParsed.results && Array.isArray(rawParsed.results)) {
      parsed = rawParsed.results;
    } else {
      // Single result wrapped
      parsed = [rawParsed];
    }

    // Normalize fields
    const results: BatchFieldResult[] = parsed.map(item => {
      if (item.success && item.field) {
        return {
          ...item,
          field: normalizeField(item.field, 'select'),
        };
      }
      return item;
    });

    const totalSuccess = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    return { results, totalSuccess, totalFailed };
  } catch (error) {
    console.error('[CustomFieldGenerator Batch] Failed:', error);
    // Return error for all dimensions
    return {
      results: dimensions.map(d => ({
        dimension: d,
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      })),
      totalSuccess: 0,
      totalFailed: dimensions.length,
    };
  }
}
