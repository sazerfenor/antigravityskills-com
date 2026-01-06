import { generateText, generateMultimodal, type MultimodalImage } from './gemini-text';
import { detect } from 'tinyld';

/**
 * Intent Analyzer Service V3 - Two-Stage Architecture with Multimodal Support
 * 
 * Stage 1: Intent Analyzer - Extracts intent, constraints, style hints, analyzes images
 * Stage 2: Field Generator - Generates adaptive parameters based on complexity
 * 
 * @see artifacts/vision-logic-prompts/New_Prompt.md
 */

// ============================================
// Type Definitions
// ============================================

export interface DynamicSchemaField {
  id: string;
  type: 'slider' | 'select' | 'text' | 'toggle';
  label: string;
  isAdvanced?: boolean;
  multiSelect?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  minLabel?: string;  // Semantic label for slider min value
  maxLabel?: string;  // Semantic label for slider max value
  defaultValue?: number | string | boolean;
  options?: string[];
  source?: 'user_constraint' | 'image_derived' | 'auto_style' | 'expanded' | 'default' | 'creative_param' | 'ambiguity_resolution';
}

// Content Category for scene-aware compilation (V3.1)
export type ContentCategory = 'photography' | 'graphic_design' | 'infographic' | 'illustration' | 'other';

// V3.0: Internal Signals - Hidden metadata for intent preservation
export interface InternalSignals {
  /** Reference intent inferred from image analysis */
  referenceIntent?: 'malleable' | 'structure' | 'subject' | 'style_ref' | 'face_swap' | 'pose_transfer' | 'inpaint' | 'outpaint';
  /** Primary mood detected from text/image */
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

export interface DynamicSchema {
  context: string;
  fields: DynamicSchemaField[];
  followUpQuestion?: string | null;
  preservedDetails?: string[];
  extractedRatio?: string | null; // Extracted aspect ratio from user input (e.g., "16:9")

  // V3.1: High-level intent from Intent Analyzer for scene-aware compilation
  contentCategory?: ContentCategory;  // What type of content is the user creating
  styleHints?: string[];              // Style keywords extracted from input ["Y2K", "minimalist"]
  imageDescriptions?: string[];       // Content descriptions of uploaded reference images

  // V3.0: Internal Signals - System-inferred hidden metadata for intent preservation
  internalSignals?: InternalSignals;

  // V3.2 NEW: Image Processing Instructions - How to use each uploaded image
  imageProcessingInstructions?: ImageProcessingInstruction[];

  // V3.5 NEW: Primary Intent - Core creative intent for first-sentence anchoring
  primaryIntent?: {
    phrase: string;
    category: 'style' | 'technique' | 'aesthetic' | 'theme' | 'format';
    confidence: number;
  };
}


// Internal types for two-stage pipeline
interface Constraint {
  key: string;
  value: any;
  unit?: string;
  original_format: 'boolean' | 'number' | 'string';
}

// V3.2: Image Role - How this image should be used in generation
type ImageRole = 'face_source' | 'style_reference' | 'composition_reference' | 'redraw_target' | 'product_reference';

interface ImageAnalysis {
  image_index: number;
  image_type: 'face_portrait' | 'product' | 'style_reference' | 'sketch' | 'scene' | 'other';
  detected_features: Record<string, any>;
  user_apparent_intent: string;
  content_description?: string;  // Natural language description for injection into final prompt
  // V3.2 NEW: Explicit image role and processing instruction
  image_role?: ImageRole;  // How this image should be used
  processing_instruction?: string;  // Natural language instruction for downstream API
}

// V3.2: Ambiguity - Conflicting information that needs user decision
interface Ambiguity {
  field_id: string;  // e.g., "subject_identity"
  question: string;  // Human-readable question
  options: Array<{
    value: string;
    source: 'user_photo' | 'reference_prompt' | 'user_text';
    is_default: boolean;
    reason?: string;
  }>;
}

interface IntentAnalysisResult {
  subject: string;
  action: string | null;
  input_format?: 'structured' | 'natural' | 'hybrid';
  technical_constraints: Constraint[];  // Renamed from 'constraints'
  creative_params?: Record<string, string>;  // NEW: Flattened creative parameters
  style_hints: string[];
  explicit_details: string[];
  image_analysis: ImageAnalysis[];
  input_complexity: 'minimal' | 'moderate' | 'rich' | 'structured';  // Added 'structured'
  context: string;
  // NEW: Text Integration support
  detected_text: string[];  // Extracted quoted text from user input (e.g., ["圣诞快乐", "限时促销"])
  // NEW: Content category for conditional field triggering
  content_category: 'photography' | 'graphic_design' | 'infographic' | 'other';
  // V3.0: Internal Signals - Aggregated signals for downstream intent handling
  internal_signals?: {
    reference_intent: string | null;  // Aggregated from image_analysis[].user_apparent_intent
    primary_mood: string | null;      // Inferred from style_hints or image analysis
    visual_complexity: 'focused' | 'balanced' | 'complex';
  };
  // V3.2 NEW: Ambiguities - Conflicting information sources that need user decision
  ambiguities?: Ambiguity[];
  // V3.5 NEW: Primary Intent - Core creative intent for first-sentence anchoring
  primary_intent?: {
    phrase: string;
    category: 'style' | 'technique' | 'aesthetic' | 'theme' | 'format';
    confidence: number;
  } | null;
}

// ============================================
// V3.0: Internal Signals Helper Functions
// ============================================

type ReferenceIntent = 'malleable' | 'structure' | 'subject' | 'style_ref' | 'face_swap' | 'pose_transfer' | 'inpaint' | 'outpaint';

/**
 * Parse user_apparent_intent string from Intent Analyzer to ReferenceIntent enum
 */
function parseReferenceIntentFromAnalyzer(intent: string | null | undefined): ReferenceIntent | undefined {
  if (!intent) return undefined;

  const intentLower = intent.toLowerCase();
  const mapping: Record<string, ReferenceIntent> = {
    'preserve_face': 'face_swap',
    'face_swap': 'face_swap',
    'preserve_product': 'subject',
    'reference_style': 'style_ref',
    'style_ref': 'style_ref',
    'mimic_composition': 'structure',
    'structure': 'structure',
    'color_reference': 'style_ref',
    'colorize_sketch': 'malleable',
    'malleable': 'malleable',
    'subject': 'subject',
    'pose_transfer': 'pose_transfer',
    'inpaint': 'inpaint',
    'outpaint': 'outpaint',
  };

  return mapping[intentLower] || undefined;
}

/**
 * Detect subject type from Intent Analyzer result
 */
function detectSubjectTypeFromIntent(intent: IntentAnalysisResult): 'person' | 'product' | 'scene' | 'abstract' | 'other' {
  if (!intent.image_analysis || intent.image_analysis.length === 0) {
    return 'other';
  }

  const imageTypeMapping: Record<string, 'person' | 'product' | 'scene' | 'abstract' | 'other'> = {
    'face_portrait': 'person',
    'product': 'product',
    'scene': 'scene',
    'style_reference': 'abstract',
    'sketch': 'abstract',
    'other': 'other',
  };

  const firstImageType = intent.image_analysis[0].image_type;
  return imageTypeMapping[firstImageType] || 'other';
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
  'ru': 'Russian',
  'pt': 'Portuguese',
  'it': 'Italian',
  'vi': 'Vietnamese',
  'th': 'Thai',
};

function detectUserLanguage(input: string): { language: string; method: string } {
  if (/[\u4e00-\u9fa5]/.test(input)) {
    return { language: 'Chinese', method: 'chinese-chars' };
  }
  if (/^[\x00-\x7F]*$/.test(input)) {
    return { language: 'English', method: 'ascii-english' };
  }
  const detectedLangCode = detect(input);
  if (detectedLangCode === 'en') {
    return { language: 'English', method: 'nlp-english' };
  }
  if (detectedLangCode && LANG_MAP[detectedLangCode]) {
    return { language: LANG_MAP[detectedLangCode], method: `nlp-detected(${detectedLangCode})` };
  }
  return { language: 'English', method: 'fallback' };
}

// ============================================
// Aspect Ratio Extraction & Mapping
// ============================================

// Supported aspect ratios (from ai-models.ts)
const SUPPORTED_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '4:5', '5:4', '21:9'];

// Chinese description to ratio mapping
const CHINESE_RATIO_MAP: Record<string, string> = {
  '横版': '16:9',
  '横图': '16:9',
  '横屏': '16:9',
  '竖版': '9:16',
  '竖图': '9:16',
  '竖屏': '9:16',
  '方图': '1:1',
  '正方形': '1:1',
  '方形': '1:1',
  '海报': '2:3',
  '手机壁纸': '9:16',
  '桌面壁纸': '16:9',
  '超宽屏': '21:9',
  'ins': '4:5',
  'instagram': '4:5',
};

interface RatioExtractionResult {
  extractedRatio: string | null;     // The ratio found in user input
  mappedRatio: string | null;        // The closest supported ratio
  wasRemapped: boolean;              // Whether a remapping occurred
}

/**
 * Extract aspect ratio from user input text
 * Supports: "16:9", "4:3", Chinese descriptions like "横版", etc.
 */
export function extractRatio(input: string): RatioExtractionResult {
  // 1. Try to match standard ratio format (e.g., 16:9, 4:3)
  const ratioMatch = input.match(/\b(\d{1,2}):(\d{1,2})\b/);
  if (ratioMatch) {
    const extracted = `${ratioMatch[1]}:${ratioMatch[2]}`;
    
    // Check if directly supported
    if (SUPPORTED_RATIOS.includes(extracted)) {
      return { extractedRatio: extracted, mappedRatio: extracted, wasRemapped: false };
    }
    
    // Need to find closest match
    const mapped = findClosestRatio(extracted);
    return { extractedRatio: extracted, mappedRatio: mapped, wasRemapped: true };
  }
  
  // 2. Try Chinese description matches
  for (const [keyword, ratio] of Object.entries(CHINESE_RATIO_MAP)) {
    if (input.includes(keyword)) {
      return { extractedRatio: ratio, mappedRatio: ratio, wasRemapped: false };
    }
  }
  
  return { extractedRatio: null, mappedRatio: null, wasRemapped: false };
}

/**
 * Find the closest supported aspect ratio
 */
function findClosestRatio(input: string): string {
  const [w, h] = input.split(':').map(Number);
  if (!w || !h) return '1:1';
  
  const inputAspect = w / h;
  let closestRatio = '1:1';
  let closestDiff = Infinity;
  
  for (const ratio of SUPPORTED_RATIOS) {
    const [rw, rh] = ratio.split(':').map(Number);
    const aspect = rw / rh;
    const diff = Math.abs(aspect - inputAspect);
    
    if (diff < closestDiff) {
      closestDiff = diff;
      closestRatio = ratio;
    }
  }
  
  return closestRatio;
}


// ============================================
// JSON Extraction Helper
// ============================================

/**
 * Robustly extract JSON from LLM response that may contain markdown code blocks
 * Handles various formats: ```json...```, ```...```, or raw JSON
 */
function extractJSON(response: string): string {
  let content = response.trim();
  
  // If starts with code fence, extract content between fences
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
// Stage 1: Intent Analyzer (Multimodal)
// ============================================

const INTENT_ANALYZER_PROMPT = `You are an Intent Analyzer AI for image/design generation. Your job is to UNDERSTAND user intent from text AND images.

# CURRENT USER CONTEXT
- **Detected Language:** **{{user_language}}**
- **Input Type:** {{input_type}}
- **Image Count:** {{image_count}}

# YOUR TASK

## Step 0: Input Format Detection (CRITICAL - DO THIS FIRST)
Detect if the user's input is:
- **structured**: Contains JSON-like key-value pairs (e.g., \`"outfit": {...}\`, \`"hairstyle": {...}\`)
- **natural**: Plain natural language description
- **hybrid**: Mix of natural language with some structured parameters

If **structured** or **hybrid**, you MUST:
1. Parse ALL key-value pairs into \`creative_params\`
2. Preserve the full structure (nested objects → dot notation keys)
3. Set \`input_complexity\` to "structured"

## Part A: Text Analysis
Extract from the user's text:

1. **subject**: The core subject/theme (keep in {{user_language}})
2. **action**: Any action, pose, or state described (or null)

3. **technical_constraints**: ONLY hardware/API-level parameters
   - aspect_ratio, facelock_identity, seed, weights, accuracy, style_weight, num_inference_steps
   - These are passed directly to the AI model

4. **creative_params**: Creative/visual parameters that can become form fields
   - outfit, hairstyle, pose, expression, background, lighting, color_palette
   - scene, main_subject, additional_visuals, photography_rendering
   - ANY nested object should be flattened with dot notation:
     - \`outfit.top\` → "Cropped oversized sweater"
     - \`main_subject.style_pose\` → "Playful Y2K pose"
     - \`photography_rendering.color_grading\` → "Cinematic neon Y2K"

5. **style_hints**: Style keywords (e.g., "cyberpunk", "Y2K", "minimalist")

6. **explicit_details**: Details that can't be parameterized (e.g., "6 poses", "holding a coffee")

   ⚠️ CRITICAL EXCLUSION RULE (V3.3):
   When you detect a conflict and create an \`ambiguities\` entry, you MUST NOT include any content from the ambiguity options in \`explicit_details\`.

   **Reason**: explicit_details are passed directly to the final prompt as "Must Include Details".
   If ambiguity content is included here, user's choice will be ignored.

   **Rule**: If a piece of information is part of an ambiguity, it belongs ONLY in the ambiguity options, NOT in explicit_details.

   **Example**:
   - Detected conflict: User photo shows "clean-shaven", reference says "thick beard"
   - Created ambiguity: subject_identity with options ["clean-shaven", "thick beard"]
   - explicit_details MUST NOT contain: "thick beard", "clean-shaven", or any beard/facial hair descriptions
   - explicit_details CAN contain: non-conflicting details like "urban night street", "neon lighting", "film grain"

   **What belongs in explicit_details**: Scene details, composition notes, technical qualities, and any details that are NOT part of an ambiguity decision

7. **detected_text**: Extract ANY quoted text from user input that should be rendered in the image
   - Look for single quotes ('圣诞快乐'), double quotes ("限时促销"), or explicit text mentions (标题是xxx, headline xxx)
   - Return as array: ["圣诞快乐", "限时促销"]
   - If no text to render, return empty array: []

8. **content_category**: Classify as "photography" (portrait/photo/人像), "graphic_design" (poster/banner/海报), "infographic" (diagram/chart/教程), or "other"

## Part A.5: Primary Intent Extraction (V3.5 - CRITICAL)

Your MOST IMPORTANT task is to identify the user's **Primary Creative Intent**.

### What is Primary Intent?
The dominant style, technique, aesthetic, or format that should be IMMEDIATELY OBVIOUS in the final output.
It is NOT the subject itself - it's the visual transformation applied to the subject.

| User Input | Subject | Primary Intent |
|------------|---------|----------------|
| "3D clay style portrait of a woman" | portrait of a woman | 3D Clay Style |
| "Studio Ghibli landscape with cherry blossoms" | landscape with cherry blossoms | Studio Ghibli Style |
| "Cyberpunk neon portrait" | portrait | Cyberpunk Neon Aesthetic |
| "Oil painting of a sunset" | sunset | Oil Painting Technique |
| "将这段文字做成 PPT" | text content | Corporate PPT Slide Design |
| "转化为广告海报" | content | Minimalist Event Poster |
| "Convert to 3D figurine" | the subject | Realistic 3D Figurine |

### Rules for Primary Intent Extraction

1. **FORMAT IS HIGHEST PRIORITY**: If user mentions output format (PPT, Poster, Banner, UI, Logo), that becomes primary intent with category "format"
2. **STYLE MODIFIERS FIRST**: If user says "[STYLE] [SUBJECT]", the style is primary intent
3. **TECHNIQUE > SUBJECT**: If user mentions a specific technique (3D render, watercolor, oil painting), that's the intent
4. **NULL IS OK**: If user only describes subject without style/technique/format, set primary_intent = null

### Category Classification

- **format**: Output carriers (PPT, Poster, Banner, UI, Logo) - HIGHEST PRIORITY when detected
- **style**: Art movements, named styles (Ghibli, Pixar, Van Gogh, Baroque)
- **technique**: Rendering methods (Oil painting, Watercolor, 3D render, Pencil sketch, Clay style)
- **aesthetic**: Visual philosophies (Minimalist, Cyberpunk, Cottagecore, Vaporwave)
- **theme**: Conceptual frameworks (Horror, Fantasy, Sci-fi, Documentary)

### Confidence Guidelines (Semantic Anchors - CRITICAL)

Use these semantic anchors instead of guessing numbers:

- **1.0 (Explicit)**: User explicitly states style/technique/format
  - "In the style of Ghibli" → 1.0
  - "3D clay style" → 1.0
  - "Convert to PPT format" → 1.0
  - "Oil painting of..." → 1.0

- **0.8 (Implicit but clear)**: Strong visual keywords that clearly define aesthetic
  - "Clay texture, cute proportions, handcrafted look" → 0.8 (implies 3D Clay Style)
  - "Neon lights, rain-slicked streets, holographic ads" → 0.8 (implies Cyberpunk)
  - "Soft brushstrokes, dreamy atmosphere, Miyazaki vibes" → 0.8 (implies Ghibli)

- **<0.8 (Vague)**: Ambiguous hints - SET primary_intent = null
  - "Maybe something artistic?" → null
  - "Make it look cool" → null
  - "A beautiful woman" → null (no style specified)

**CRITICAL RULE**: If confidence would be < 0.8, set primary_intent = null. Don't force an uncertain intent.

### Long Input Decomposition (>50 words)

When user input is a paragraph, decompose:

1. **Identify CORE TRANSFORMATION**:
   - "Convert to [X]" → X is likely primary intent
   - "Make it look like [X]" → X is likely primary intent
   - "In the style of [X]" → X is likely primary intent
   - "[X] version of" → X is likely primary intent

2. **Combine with Quality Modifiers**:
   - "3D figurine" + "very realistic" → "Realistic 3D Figurine"
   - "Poster" + "minimalist" → "Minimalist Poster Design"
   - "Clay style" + "cute" → "Cute 3D Clay Style"

### Output Format

When primary intent is detected:
\`\`\`json
"primary_intent": {
  "phrase": "3D Clay Style",
  "category": "technique",
  "confidence": 1.0
}
\`\`\`

When no clear intent detected (MUST use null):
\`\`\`json
"primary_intent": null
\`\`\`

## Part B: Image Analysis (CRITICAL - V3.2 Enhanced)

**MANDATORY**: When {{image_count}} > 0, you MUST analyze each image in detail.

For EACH image, provide comprehensive analysis:

1. **image_type**: One of ["face_portrait", "product", "style_reference", "sketch", "scene", "other"]

2. **detected_features** (REQUIRED - extract at least 3):
   Categories: composition, colors, subjects, background, style, lighting, texture, mood
   Extract what you see for each applicable category.

3. **user_apparent_intent**: Why uploaded? One of: "preserve_face", "preserve_product", "reference_style", "mimic_composition", "color_reference", "colorize_sketch"

4. **content_description**: A 2-3 sentence natural language description of the image content that can be injected into the final prompt.

### V3.2 NEW: Image Role and Processing Instruction (CRITICAL)

5. **image_role**: How to use this image:
   "face_source" (user photo for style transfer), "style_reference" (copy style), "composition_reference" (copy layout), "redraw_target" (completely redraw), "product_reference" (keep product accurate)

6. **processing_instruction**: Natural language instruction for downstream API (e.g., "Use face from this image as identity reference. Preserve facial features exactly.")

## Part B.5: Ambiguity Detection (V3.3 - AI-Driven)

When you detect genuinely ambiguous creative decisions where the user's intent is unclear, create ambiguity entries to let the user decide.

### Core Principle
Only create an ambiguity when:
1. There are 2+ equally valid interpretations
2. The decision would SIGNIFICANTLY change the final output
3. The user did NOT explicitly state their preference

### How to Decide
Ask yourself:
- "Is it truly unclear what the user wants?"
- "Would a reasonable person need clarification here?"
- "Are both options genuinely valid for this request?"

If the answer to all three is YES → create an ambiguity.
If NO → just pick the most likely option and proceed.

### Rules
- Maximum 3 ambiguities per request (focus on the most impactful ones)
- Write the \`question\` field in **{{user_language}}**
- Each ambiguity should represent a meaningful creative fork, not minor details
- **CONCISE OPTIONS (MAX 6 WORDS)**: Options must be short feature descriptions, NOT full sentences
  - ✅ Good: "East Asian, clean-shaven", "Thick beard, wavy hair"
  - ❌ Bad: "Preserve your East Asian features and clean-shaven look from the photo"
  - The \`source\` field already indicates origin, don't repeat it in \`value\`

### Output Format
For each ambiguity:
\`\`\`json
{
  "field_id": "[semantic_id]",
  "question": "[Question in {{user_language}}]",
  "options": [
    { "value": "[Option A]", "source": "user_photo" | "reference_prompt" | "user_text", "is_default": true },
    { "value": "[Option B]", "source": "...", "is_default": false }
  ]
}
\`\`\`

### When NOT to Create Ambiguities
- Style parameters (lighting, colors, mood) → usually from reference
- Technical parameters → not creative decisions
- When user explicitly stated preference
- Minor details that don't significantly change the output
- When one option is obviously more appropriate

## Part C: Complexity Assessment
- **minimal**: Short text (< 5 words), no images, vague intent
- **moderate**: Medium text, some style hints, 0-1 images
- **rich**: Detailed natural language OR 2+ images
- **structured**: User provided JSON-like structured parameters (HIGHEST DETAIL LEVEL)

## Part D: Context Label
- **context**: 2-3 word label (in {{user_language}})

# OUTPUT FORMAT (JSON only, no markdown)
{
  "subject": "...", "action": "..." | null, "input_format": "structured" | "natural" | "hybrid",
  "primary_intent": { "phrase": "3D Clay Style", "category": "technique" | "style" | "aesthetic" | "theme" | "format", "confidence": 1.0 } | null,
  "technical_constraints": [{ "key": "...", "value": ..., "original_format": "boolean" | "number" | "string" }],
  "creative_params": { "scene": "...", "outfit.top": "..." },
  "style_hints": ["Y2K", "minimalist", ...],
  "explicit_details": ["non-conflicting details only - NO ambiguity options here"],
  "image_analysis": [{
    "image_index": 0, "image_type": "face_portrait" | "product" | "style_reference" | "sketch" | "scene" | "other",
    "detected_features": { "subjects": "...", "colors": "...", "lighting": "...", "mood": "..." },
    "user_apparent_intent": "preserve_face" | "reference_style" | "mimic_composition" | ...,
    "content_description": "2-3 sentence description...",
    "image_role": "face_source" | "style_reference" | "composition_reference" | "redraw_target" | "product_reference",
    "processing_instruction": "Natural language instruction for downstream API..."
  }],
  "ambiguities": [{
    "field_id": "subject_identity", "question": "{{user_language}} question",
    "options": [{ "value": "East Asian, clean-shaven", "source": "user_photo", "is_default": true }, { "value": "Thick beard, wavy hair", "source": "reference_prompt", "is_default": false }]
  }],
  "input_complexity": "minimal" | "moderate" | "rich" | "structured",
  "context": "2-3 word label", "detected_text": [], "content_category": "photography" | "graphic_design" | "infographic" | "other",
  "internal_signals": { "reference_intent": "face_swap" | "style_ref" | "structure" | null, "primary_mood": "...", "visual_complexity": "focused" | "balanced" | "complex" }
}

# CRITICAL RULES (MUST FOLLOW)

## Image Analysis Rules (HIGHEST PRIORITY)
6. **MANDATORY IMAGE ANALYSIS**: When images are provided ({{image_count}} > 0):
   - You MUST populate \`image_analysis\` array with one entry per image
   - You MUST extract \`detected_features\` with at least 3 categories filled
   - You MUST provide \`content_description\` for each image
   - You MUST provide \`image_role\` and \`processing_instruction\` for each image (V3.2)
   - NEVER return empty \`image_analysis: []\` when images exist
   - If image content is unclear, describe what you CAN see

## V3.2 Ambiguity Detection Rules
7. **MANDATORY AMBIGUITY DETECTION** for Style Transfer / Face Swap scenarios:
   - When user uploads their photo AND provides a reference prompt with different subject features
   - You MUST create at least one ambiguity for "subject_identity"
   - Check for conflicts in: ethnicity, facial features, hair, beard, outfit, age, gender
   - The option with \`is_default: true\` should reflect the most likely user intent based on their text

## Existing Rules
1. For STRUCTURED input: Parse ALL nested keys into creative_params
2. Do NOT lose user parameters - if they specified it, capture it
3. technical_constraints are MODEL parameters; creative_params are VISUAL parameters
4. Flatten nested objects using dot notation (e.g., outfit.top, hairstyle.type)
5. Output ONLY valid JSON, no markdown code blocks

## Cross-Modal Fusion
8. **Merge image + text**: If user text describes "a cat" but image shows a specific breed, use the image's breed in \`subject\`
9. **Image > Text for visuals**: When image provides visual details, prioritize image-detected features over generic text assumptions

## V3.0 Internal Signals (MANDATORY - NEVER SKIP)
10. **ALWAYS populate internal_signals**:
   - **reference_intent**: Map from user_apparent_intent: preserve_face→face_swap, preserve_product→subject, reference_style→style_ref, mimic_composition→structure, color_reference→style_ref, colorize_sketch→malleable, (no images)→null
   - **primary_mood**: Infer from style_hints/image (e.g., "playful", "dramatic", "peaceful")
   - **visual_complexity**: "focused" (single subject), "balanced" (subject + elements), "complex" (busy scene)
11. **NEVER return null internal_signals when images exist** - if user_apparent_intent is detected, reference_intent MUST be set`;

// ============================================
// Stage 2: Field Generator (Adaptive)
// ============================================

const FIELD_GENERATOR_PROMPT = `You are a Field Generator AI. Create a complete Dynamic Form Schema based on the analyzed intent.

# CURRENT USER CONTEXT
- **Detected Language:** **{{user_language}}**
- **Input Complexity:** **{{input_complexity}}**

# INPUT (from Intent Analyzer)
{{intent_json}}

# YOUR TASK

## Step -1: Primary Intent Passthrough (MANDATORY - V3.5)

If the input contains a \`primary_intent\` object, you MUST:

1. **COPY EXACTLY**: Pass it through to the output schema unchanged as \`primaryIntent\`
2. **DO NOT FRAGMENT**: Never generate fields that would override the primary intent
3. **REFINE, NOT REPLACE**: Generate fields that COMPLEMENT the primary intent

### Field Generation Rules Based on Primary Intent

When \`primary_intent\` exists, check before generating each field:

| Primary Intent | Good Fields to Generate | Bad Fields to Generate (DELETE if present) |
|----------------|-------------------------|---------------------------------------------|
| 3D Clay Style | clay_color, texture_detail, gloss_level, surface_quality | rendering_style, art_style (would override) |
| Studio Ghibli | scene_time_of_day, weather, landscape_type | art_style, animation_style (would override) |
| Cyberpunk Aesthetic | neon_color, tech_elements, rain_intensity | overall_aesthetic, theme (would override) |
| Corporate PPT | slide_layout, color_scheme, font_style | document_format, presentation_type (already defined) |
| Minimalist Poster | color_count, layout_style, whitespace | complexity_level, design_approach (contradicts) |

### Anti-Conflict Check (CRITICAL)

After generating all fields, verify none conflict with primary_intent:
- If you generated \`rendering_style\` and primary_intent is about rendering → DELETE \`rendering_style\`
- If you generated \`art_style\` and primary_intent is an art style → DELETE \`art_style\`
- If you generated \`technique\` and primary_intent is a technique → DELETE \`technique\`

### Output Format

Copy primary_intent to output as:
\`\`\`json
"primaryIntent": {
  "phrase": "[Copy from primary_intent.phrase]",
  "category": "[Copy from primary_intent.category]",
  "confidence": [Copy from primary_intent.confidence]
}
\`\`\`

## Step 0: Process creative_params (HIGHEST PRIORITY - NEW!)
If the input contains \`creative_params\`, convert EACH key-value pair into a form field:

| Key Pattern | Field Type | Configuration |
|-------------|------------|---------------|
| \`*.description\` or \`*.details\` | text | Pre-fill with the value, make editable |
| \`*.type\` or \`*.style\` | select | Use value as defaultValue, generate 8-12 related options |
| \`outfit.*\`, \`hairstyle.*\` | select | Clothing/style options, defaultValue from user input |
| \`photography_rendering.*\` | select | Technical photography options |
| Simple string value | text or select | Detect if enumerable, else text |

Example transformation:
- \`"outfit.top": "Cropped oversized sweater"\` → { id: "outfit_top", type: "select", defaultValue: "Cropped oversized sweater", options: [...8-12 similar options...] }

Mark these fields with source: "creative_param".

## Step 0.25: Process Ambiguities (V3.4 - EXPAND OPTIONS)

**PURPOSE**: Convert ambiguities from Intent Analyzer into SELECT fields with expanded options.

When the input contains an \`ambiguities\` array, you MUST:

### For EACH ambiguity entry:
1. Create a SELECT field with:
   - \`id\`: Use the \`field_id\` from the ambiguity
   - \`type\`: "select"
   - \`multiSelect\`: false (ambiguities are mutually exclusive choices)
   - \`label\`: Use the \`question\` as the label (in {{user_language}})
   - \`options\`: **CRITICAL: Expand to 8-12 options** (see expansion rules below)
   - \`defaultValue\`: Use the value where \`is_default: true\`
   - \`source\`: "ambiguity_resolution"
   - \`isAdvanced\`: false (these are CRITICAL user decisions, always show)

### Option Expansion Rules (V3.4 NEW - MANDATORY):
The original ambiguity has only 2 options (the conflict points). You MUST expand to 8-12 options:

1. **First 2 options**: Keep the original conflict options EXACTLY as provided (these are the "anchor" choices)
2. **Options 3-12**: Generate 6-10 variations that:
   - Blend elements from both original options
   - Offer intermediate/hybrid choices
   - Provide creative alternatives within the same category

**Expansion Examples by field_id**:
- **subject_identity**: Variations of facial features, hair styles, beard styles, expressions
- **outfit_choice**: Variations of clothing styles, colors, layers, accessories
- **background_scene**: Variations of environments, lighting conditions, atmospheres

### Example Transformation:

**Input ambiguity** (2 concise options from Stage 1):
\`\`\`json
{
  "field_id": "subject_identity",
  "question": "您希望保留哪个人物外貌？",
  "options": [
    { "value": "East Asian, clean-shaven", "source": "user_photo", "is_default": true },
    { "value": "Thick beard, wavy hair", "source": "reference_prompt", "is_default": false }
  ]
}
\`\`\`

**Output field** (EXPANDED to 10 concise options):
\`\`\`json
{
  "id": "subject_identity",
  "type": "select",
  "multiSelect": false,
  "label": "您希望保留哪个人物外貌？",
  "options": [
    "East Asian, clean-shaven",
    "Thick beard, wavy hair",
    "East Asian, light stubble",
    "Slicked-back hair, clean-shaven",
    "Textured hair, designer stubble",
    "Short cropped, clean-shaven",
    "Wavy hair, trimmed goatee",
    "Side-part, clean-shaven",
    "Messy hair, light beard",
    "Undercut, clean-shaven"
  ],
  "defaultValue": "East Asian, clean-shaven",
  "source": "ambiguity_resolution",
  "isAdvanced": false
}
\`\`\`

### CRITICAL RULES for Ambiguity Processing:
- Ambiguity fields MUST be placed at the TOP of the fields array (most important decisions first)
- DO NOT skip any ambiguity - each one represents a user decision that must be made
- DO NOT create duplicate fields - if an ambiguity covers "subject_identity", do NOT also create a separate subject_features field from creative_params
- **MUST have 8-12 options** - never leave only the original 2 options

## Step 0.5: Style Transfer / Face Swap Override (CRITICAL - V3.1)

**DETECTION**: Check if this is a Style Transfer or Face Swap scenario:
- \`internal_signals.reference_intent\` is "style_ref", "face_swap", or "structure"
- OR user text contains keywords: ["style of", "用这个风格", "copy style", "像这样的风格", "换脸", "face swap", "change to style", "apply style"]
- OR \`image_analysis[].user_apparent_intent\` contains ["preserve_face", "reference_style", "face_swap"]

**IF DETECTED**, apply these MANDATORY overrides:

### Rule 1: Subject Features Override (HIGHEST PRIORITY)
When generating \`subject_features\`, \`ethnicity\`, \`facial_features\`, or similar subject-related fields:
- **IGNORE** creative_params values for subject characteristics:
  - ethnicity, race, nationality (e.g., "middle-eastern", "asian", "caucasian")
  - facial features (e.g., "thick beard", "bushy eyebrows", "sharp jawline")
  - hair description (e.g., "stylish hair", "long hair", "bald")
  - body type, age, gender (unless user EXPLICITLY specified in their text input)
- **USE** \`detected_features.subjects\` from the user's uploaded image as defaultValue
- **LABEL** the field with source: "image_derived" (NOT "creative_param")

### Rule 2: Creative Params Filtering
For other creative_params fields from reference prompt:
- **KEEP** style-related parameters (source: "creative_param"):
  - lighting (e.g., "dramatic cinematic lighting", "rim lighting")
  - mood/atmosphere (e.g., "melancholic", "energetic", "dramatic")
  - color palette/grading (e.g., "high contrast", "film grain", "monochrome")
  - composition style (e.g., "close-up", "portrait", "full body")
  - rendering style (e.g., "photorealistic", "oil painting", "8k")
- **FILTER OUT** subject-related parameters (do NOT create fields for these):
  - ethnicity, race, facial features, hair, beard, body type
  - clothing/outfit (unless user explicitly wants to copy outfit style)

### Example Transformation:

**Input creative_params** (from reference prompt):
\`\`\`json
{
  "subject_features": "middle-eastern male, thick beard, stylish hair",
  "lighting": "dramatic cinematic rim lighting",
  "mood": "intense, powerful",
  "outfit": "black trench coat"
}
\`\`\`

**Input detected_features.subjects** (from user's uploaded photo):
"Young man with wavy black hair, clean-shaven, oval face"

**Output Fields** (after Style Transfer Override):
- subject_features: { defaultValue: "Young man with wavy black hair, clean-shaven", source: "image_derived" }
- lighting: { defaultValue: "Dramatic Cinematic Rim Lighting", source: "creative_param" }
- mood: { defaultValue: "Intense, Powerful", source: "creative_param" }
// Note: outfit field NOT generated (subject-related, filtered out in Style Transfer mode)

## Step 1: Convert Technical Constraints to Fields
For each item in \`technical_constraints\`, create a form field:
| Constraint Type | Field Type | Configuration |
|-----------------|------------|---------------|
| Boolean (e.g., facelock_identity: true) | toggle | defaultValue: true/false |
| Percentage (e.g., accuracy: 100%) | slider | min: 0, max: 100, unit: "%" |
| Decimal 0-1 (e.g., weight: 0.8) | slider | min: 0, max: 1, step: 0.1 |
| Enum (e.g., style: "anime") | select | options from context |
| String (e.g., seed: "abc123") | text | defaultValue: the value |

Mark these fields with source: "user_constraint".

## Step 2: Inject Image Analysis into Form (CRITICAL)

When \`image_analysis\` array is NOT empty, you MUST:

### Step 2.1: Inject detected_features as Form Fields

For EACH image's \`detected_features\`, create corresponding fields:

| Feature Key | Field Type | Configuration |
|-------------|------------|---------------|
| **subjects** | text (read-only display) or select (if enumerable variants) | Show detected subject as default, offer variations |
| **colors** | select | Extract palette names, offer similar palettes |
| **style** | select | Use detected style as default, add related styles |
| **composition** | select | Detected composition as default + alternatives |
| **lighting** | select | Detected lighting + alternatives |
| **mood** | select | Detected mood + alternatives |

Example: If \`detected_features.colors = "warm autumn palette"\`, create:
{ "id": "color_palette", "type": "select", "label": "Color Palette", "defaultValue": "Warm Autumn", "options": ["Warm Autumn", "Cool Winter", "Vibrant Summer", "Earth Tones", "Monochrome", "Pastel", "Neon", "Vintage Sepia"], "source": "image_derived" }

### Step 2.2: Preserve content_description

Copy each image's \`content_description\` into \`preservedDetails\` array. This ensures the image content is included in the final prompt.

### Step 2.3: Add Technical Control Fields

Based on \`image_type\`, add control fields:

| Image Type | Auto-Add Fields |
|------------|-----------------|  
| **face_portrait** | facelock_identity (toggle), face_similarity (slider 0.5-1.0) |
| **product** | product_preservation (toggle), background_removal (toggle) |
| **style_reference** | style_influence (slider 0-1, default: 0.5) |
| **sketch** | line_preservation (slider), colorization_style (select) |
| **scene** | scene_matching (slider 0-1), environment_variation (select) |

Mark ALL image-related fields with source: "image_derived".

## Step 2.5: Determine Field Behavior (THINK DEEPLY)

For each select field, ask yourself these questions:

### Question 1: Can multiple values coexist in the final output?
Think about the FINAL IMAGE/CONTENT:
- "Can a character wear BOTH a hat AND sunglasses?" → YES → multiSelect: true
- "Can an image be BOTH warm tone AND cool tone at the same time?" → NO, contradiction → multiSelect: false
- "Can a scene have BOTH daytime AND nighttime lighting?" → NO, contradiction → multiSelect: false
- "Can a design include BOTH red elements AND blue elements?" → YES → multiSelect: true

### Question 2: Does selecting N items mean generating N instances?
- "Selecting 3 character types means 3 characters in the scene" → multiSelect: true
- "Selecting 3 color schemes means a gradient/blend of colors" → multiSelect: true

**DEFAULT: multiSelect: true** (trust user's creative intent - if they select multiple, let Compiler fuse them)

### Question 3: Is this field essential for the average user?
Think about who will use this:
- "Would a non-designer first-time user care about this?" → If NO → isAdvanced: true
- "Is this a core creative decision that defines the output?" → YES → isAdvanced: false
- "Is this fine-tuning or technical detail?" → YES → isAdvanced: true

**isAdvanced: true examples** (hide by default):
- Technical rendering parameters (anti-aliasing, noise reduction)
- Fine-tuning controls (edge sharpness, color grading curves)
- Professional terminology (bokeh intensity, chromatic aberration)
- Niche style variations that require domain knowledge

**isAdvanced: false examples** (show by default):
- Core subject attributes (what/who is in the output)
- Overall style/mood (realistic vs cartoon, dark vs bright)
- Composition choices (close-up vs wide shot)
- Primary creative decisions that define the end result

## Step 3: Generate Contextual Parameters

Think about what parameters would help the user refine their vision:

### Think Process (Chain-of-Thought):
1. What is the user trying to create? (type of content: image, PPT, poster, 3D model, etc.)
2. What are the key creative decisions for THIS SPECIFIC type of content?
3. What parameters would a professional in this domain consider important?
4. Which of these are "core" decisions (show first) vs "fine-tuning" (isAdvanced)?

### Field Ordering Principle:
Order fields by IMPACT on final output, not by arbitrary category:
1. **High-impact core decisions** (isAdvanced: false) - first 4-5 fields
   - These should be the fields that MOST CHANGE the final output
2. **Style refinements** (isAdvanced: false if commonly adjusted)
3. **Technical fine-tuning** (isAdvanced: true) - shown when user wants more control

### Important Guidelines:
- Do NOT force a "rendering_style" field for every visual content - add it only if relevant
- Do NOT assume the user is creating a photo/portrait - they might create PPT, poster, 3D model
- Do NOT add fields that duplicate user's explicit input
- CONSIDER the specific domain: PPT needs different fields than portrait photography

### Complexity-Based Field Count:
Based on input_complexity AND presence of images, generate ADDITIONAL parameters:

| Complexity | Has Images? | Additional Parameters | Rationale |
|------------|-------------|----------------------|-----------| 
| **minimal** | No | 5-7 fields | User needs options to explore |
| **minimal** | Yes | 2-4 fields | Image provides context, reduce generic fields |
| **moderate** | No | 4-6 fields | Balanced expansion |
| **moderate** | Yes | 2-3 fields | Image + text = rich context |
| **rich** | No | 1-3 fields | User already specified a lot |
| **rich** | Yes | 0-2 fields | Image + detailed text = very rich |
| **structured** | Any | 0-2 fields | User provided detailed params |

Mark these fields with source: "expanded".

### EXCLUDED PARAMETERS (NEVER generate these)

**Category 1: Model/System-Level Parameters** (set by image generation infrastructure)
- aspect_ratio / 画布比例 / canvas size
- image_size / resolution / dimensions
- seed / random_seed
- num_inference_steps / sampling_steps
- cfg_scale / guidance_scale

**Category 2: Post-Processing Parameters** (require external tools, NOT controllable by AI generation)
- dpi / 打印分辨率 / print resolution - AI generates pixels, not print specs
- file_format / 输出格式 / output format (JPG/PNG/PDF) - handled by storage layer
- compression_quality - not controllable in generation
- shoulder_leveling / 肩膀矫正 - requires Photoshop-like tools
- blemish_removal / 祛痘祛斑 - post-processing, not generation
- teeth_whitening / 牙齿美白 - post-processing
- body_slimming / 瘦脸瘦身 - post-processing
- background_removal / 抠图 - separate tool, not part of generation

**Category 3: Photo Size Specifications** (real-world print dimensions, not AI relevant)
- photo_size / 照片尺寸 (一寸/二寸) - physical print size, AI generates digital images
- specific visa/passport dimensions - handled by cropping tools

CRITICAL: If LLM is generating "打印分辨率", "输出格式", "肩膀矫正" etc., it means LLM is confusing PHOTO EDITING APP features with AI GENERATION capabilities. These fields are FORBIDDEN.

### Option Count Rules (MANDATORY)
For EVERY select field:
- Minimum: 8 options
- Maximum: 12 options
- Order options by popularity/likelihood
- DO NOT add "Random/AI decides" - the AI will make sensible defaults automatically

### Slider Semantic Labels (MANDATORY)
For EVERY slider field, provide semantic endpoint labels:
- minLabel: What does the minimum value mean? (e.g., "Soft", "Simple", "Subtle")
- maxLabel: What does the maximum value mean? (e.g., "Strong", "Complex", "Dramatic")

Rules:
- MUST be relevant to the subject
- DO NOT duplicate style_hints or constraints
- Max 5 non-advanced fields; rest should be isAdvanced: true

Mark these fields with source: "expanded".

## Step 3.5: Photography Controls (Conditional)

IF the following conditions are ALL met:
1. \`style_hints\` contains ANY of: ["photorealistic", "cinematic", "realistic", "photography", "film", "portrait", "landscape", "editorial"]
2. \`subject\` does NOT indicate non-photographic content: ["PPT", "UI", "wireframe", "diagram", "infographic", "logo", "icon", "template", "chart", "模板", "图标"]
3. \`content_category\` is "photography" OR is not "graphic_design"

THEN add these fields (all with isAdvanced: true, source: "expanded"):
- camera_angle (select): [Eye Level, Low Angle, High Angle, Dutch Angle, Bird's Eye, Worm's Eye, Over-the-shoulder, Close-up, Wide Shot, Profile]
- depth_of_field (slider): min=1, max=10, step=1, minLabel="Shallow (Bokeh)", maxLabel="Deep (Sharp)", defaultValue=3
- lighting_style (select): [Natural Daylight, Golden Hour, Blue Hour, Studio Softbox, Dramatic Rim Light, Neon/Cyberpunk, Overcast Diffused, Candlelight, Moonlight, Spotlight]

## Step 3.6: Text Integration (Conditional)

IF ANY of the following conditions are met:
1. \`detected_text\` array is non-empty (user provided quoted text to render)
2. \`content_category\` is "graphic_design"
3. \`style_hints\` contains ["typography", "lettering", "text-heavy"]

THEN add these fields:
- text_content (text): defaultValue = first item of detected_text (or empty), label = "渲染文字内容", source: "user_constraint" if detected_text exists, otherwise "expanded"
- text_position (select): [Top Center, Bottom Center, Center Overlay, Top Left, Top Right, Bottom Left, Bottom Right, Watermark, Diagonal, Arc]
- text_style (select): [Bold Sans-serif, Elegant Serif, Handwritten Script, Retro Display, Minimalist, Neon Glow, 3D Extruded, Graffiti, Brush Stroke, Gradient Fill]

## Step 3.7: Knowledge Enhancement (Conditional)

IF the following conditions are ALL met:
1. \`content_category\` is "infographic" OR \`subject\` contains ["diagram", "recipe", "anatomy", "flowchart", "cross-section", "tutorial", "how-to"]
2. \`style_hints\` contains ANY of: ["scientific", "educational", "technical", "accurate", "factual", "step-by-step"]

THEN add these fields (all with isAdvanced: true, source: "expanded"):
- factual_accuracy (toggle): default=true, label="确保事实准确性"
- knowledge_enhancement (toggle): default=false, label="AI 自动补充专业知识"

## Step 3.8: Multi-Character Support (Conditional)

IF \`image_analysis\` contains >= 2 entries with image_type = "face_portrait":
THEN:
1. Auto-inject into \`preservedDetails\`:
   - "Primary character: use face from image 1"
   - "Secondary character: use face from image 2"
   (continue pattern for additional face images)

2. Add these fields:
- character_mapper (custom): type: "character_mapper", images: [extracted from image_analysis], source: "image_derived"
- character_relationship (select): [Colleagues, Friends, Family, Couple, Rivals, Strangers, Teacher-Student, Band Members, Business Partners, Romantic Interest], label="角色关系"

## Step 4: Preserve Explicit Details (WITH CONFLICT FILTERING - V3.3)

⚠️ CRITICAL: This step must filter out ambiguity-related content to prevent user decisions from being ignored.

**Process**:
1. Start with the \`explicit_details\` array from Stage 1 input
2. **FILTER OUT** any item that:
   - Appears as a \`value\` in any \`ambiguities[].options[].value\`
   - Semantically relates to an ambiguity (e.g., "beard" or "facial hair" when subject_identity ambiguity exists)
   - Describes subject features when a subject_identity ambiguity exists
3. Copy the FILTERED result to \`preservedDetails\`

**Example**:
- Input explicit_details: ["thick beard", "urban night street", "dramatic neon lighting", "film grain texture"]
- Ambiguities contain subject_identity with options including "thick beard" and "clean-shaven"
- Filtered preservedDetails: ["urban night street", "dramatic neon lighting", "film grain texture"]
- Reason: "thick beard" is an ambiguity option, user must choose, so it's excluded from preservedDetails

**RULE**: If the user is choosing between option A and option B via ambiguity, NEITHER A nor B should appear in preservedDetails.

## Step 5: Generate Follow-Up Question (THE "FIELD vs QUESTION" RULE)

### The Golden Rule
You have TWO ways to get information from the user:
1. **Form Fields** - User selects an option (slider/select/text)
2. **Follow-Up Question** - User types a chat reply

**THE RULE**: If a Field ALREADY EXISTS for a topic, set followUpQuestion = null for that topic.

### Step 5.1: Deduplication Check (MANDATORY)
Before outputting followUpQuestion, scan your \`fields\` array:
- If ANY field covers the same concept → followUpQuestion = null

### Step 5.2: When to Generate
| Complexity | followUpQuestion | Condition |
|------------|------------------|-----------|
| **minimal** | Generate ONLY IF no field covers the missing info | User input is vague |
| **moderate** | null (fields already cover it) | Fields handle refinement |
| **rich/structured** | null | User provided detailed input |

### Anti-Patterns (NEVER DO THIS)
❌ Field: \`ghibli_movie_inspiration\` with options ["Totoro", "Howl's Moving Castle"]
   AND followUpQuestion: "Which Ghibli film would you like?"
   → REDUNDANT! The field already asks this. Set followUpQuestion = null

❌ Field: \`lighting_style\` with options ["Golden Hour", "Studio", "Neon"]
   AND followUpQuestion: "What lighting do you prefer?"
   → REDUNDANT! Set followUpQuestion = null

### Valid Use Cases
✅ No field for "brand philosophy" (too complex for a dropdown)
   → followUpQuestion: "Tell me about your brand's core philosophy"

✅ No field for "specific memory to recreate" (too personal)
   → followUpQuestion: "What memory or moment should this image capture?"

### Output Rule
Use conversational language in {{user_language}}. Focus on ONE missing dimension that CANNOT be captured by any existing field.

# OUTPUT FORMAT (JSON only, no markdown)
{
  "context": "[Contextual name derived from user intent, in {{user_language}}]",
  "followUpQuestion": null,
  "fields": [
    { "id": "subject_identity", "type": "select", "label": "您希望保留哪个人物外貌？", "options": ["Option from user photo", "Option from reference"], "defaultValue": "Option from user photo", "isAdvanced": false, "multiSelect": false, "source": "ambiguity_resolution" },
    { "id": "[semantic_id]", "type": "select", "label": "[Domain-appropriate label in {{user_language}}]", "options": ["[8-12 contextually relevant options]"], "defaultValue": "[Most likely user preference]", "isAdvanced": false, "multiSelect": true, "source": "expanded" },
    { "id": "[another_id]", "type": "slider", "label": "[Label in {{user_language}}]", "min": 0, "max": 1, "step": 0.1, "defaultValue": 0.7, "minLabel": "[Low meaning]", "maxLabel": "[High meaning]", "isAdvanced": true, "source": "expanded" }
  ],
  "preservedDetails": [],
  "imageProcessingInstructions": [
    {
      "imageIndex": 0,
      "role": "face_source",
      "instruction": "Use the face from this image as identity reference. Preserve facial features exactly."
    }
  ],
  "internalSignals": {
    "referenceIntent": "[Copy from input internal_signals.reference_intent, e.g., face_swap, style_ref, or null]",
    "primaryMood": "[Copy from input internal_signals.primary_mood, e.g., playful, dramatic]",
    "visualComplexity": "[Copy from input internal_signals.visual_complexity: focused|balanced|complex]",
    "detectedSubjectType": "[Infer from image_analysis[0].image_type: person|product|scene|abstract|other]"
  },
  "primaryIntent": {
    "phrase": "[Copy from input primary_intent.phrase, e.g., '3D Clay Style']",
    "category": "[Copy from input primary_intent.category: style|technique|aesthetic|theme|format]",
    "confidence": "[Copy from input primary_intent.confidence, e.g., 1.0]"
  }
}

# FIELD ORDERING RULES (V3.2 Updated)
1. **Ambiguity resolution FIRST** (source: "ambiguity_resolution") - MOST IMPORTANT user decisions
2. Technical constraints SECOND (source: "user_constraint")
3. Creative params THIRD (source: "creative_param")
4. Image-derived FOURTH (source: "image_derived")
5. Auto-style FIFTH (source: "auto_style")
6. Non-advanced expanded SIXTH (source: "expanded", isAdvanced: false)
7. Advanced expanded LAST (source: "expanded", isAdvanced: true)

## V3.2 NEW: Image Processing Instructions Passthrough
15. You MUST copy \`image_role\` and \`processing_instruction\` from each \`image_analysis\` entry into \`imageProcessingInstructions\`:
    - \`imageIndex\`: Copy from \`image_analysis[].image_index\`
    - \`role\`: Copy from \`image_analysis[].image_role\`
    - \`instruction\`: Copy from \`image_analysis[].processing_instruction\`
    - This tells the Compiler how to instruct the downstream API to use each image

# CRITICAL RULES
⚠️ HIGHEST PRIORITY - NEVER GENERATE THESE FIELDS:
- aspect_ratio, canvas, image_size, resolution, dimensions
- composition_ratio, 构图比例, 画幅比例, 画面比例 (UI has dedicated RATIO selector)
- seed, random_seed, num_inference_steps, sampling_steps, cfg_scale
These are model-level parameters, NOT user-facing fields!

1. NEVER omit creative_params - they are user-specified visual details
2. For face_portrait images, ALWAYS add facelock_identity
3. Do NOT generate more than 15 total fields
4. ALL labels, context, and option display text MUST be in {{user_language}}
5. multiSelect Decision: DEFAULT true; set false when Single-Subject Attribute Test indicates conflict
6. isAdvanced Decision: Ask \"Would a first-time user need this?\" - If NO, set isAdvanced: true
7. Every select field MUST have 8-12 options
8. Every slider field MUST have minLabel and maxLabel
10. **followUpQuestion Deduplication**: If ANY field already covers a topic, DO NOT ask about it. Scan fields before generating followUpQuestion.
11. Output ONLY valid JSON, no markdown code blocks

## Image-First Generation Rule
12. When \`image_analysis\` exists and is non-empty:
    - At least 50% of generated fields should derive from image content
    - \`preservedDetails\` MUST include all \`content_description\` values
    - Do NOT generate generic fields that contradict detected image features

## V3.0 Internal Signals Passthrough (MANDATORY - NEVER DROP)
13. You MUST copy internal_signals from input to output.internalSignals:
    - If input has internal_signals.reference_intent = "face_swap", output MUST have internalSignals.referenceIntent = "face_swap"
    - If input has internal_signals.primary_mood = "playful", output MUST have internalSignals.primaryMood = "playful"
    - This is the MOST CRITICAL rule - dropping signals breaks downstream intent handling
14. For detectedSubjectType, map from image_analysis[0].image_type:
    | image_type | detectedSubjectType |
    |------------|---------------------|
    | face_portrait | person |
    | product | product |
    | scene | scene |
    | style_reference | abstract |
    | sketch | abstract |
    | other | other |

## V3.5 NEW: Primary Intent Passthrough (MANDATORY - NEVER DROP)
15. If input has \`primary_intent\`, you MUST copy it to output as \`primaryIntent\`:
    - Copy phrase, category, and confidence EXACTLY as provided
    - DO NOT generate fields that conflict with the primary intent (see Step -1)
    - This is CRITICAL for first-sentence anchoring in the Compiler`;

// ============================================
// Stage 1 Caller
// ============================================

async function callIntentAnalyzer(
  userInput: string,
  language: string,
  images?: MultimodalImage[] // base64 encoded images with mime types
): Promise<IntentAnalysisResult | null> {
  try {
    const inputType = images && images.length > 0 ? 'text_with_images' : 'text_only';
    const imageCount = images?.length || 0;
    
    const prompt = INTENT_ANALYZER_PROMPT
      .replace(/\{\{user_language\}\}/g, language)
      .replace(/\{\{input_type\}\}/g, inputType)
      .replace(/\{\{image_count\}\}/g, String(imageCount));
    
    const fullPrompt = `${prompt}\n\nUser input: "${userInput}"`;
    const model = 'gemini-3-flash-preview'; // Unified model for both text and multimodal
    
    let result: string;
    
    if (images && images.length > 0) {
      // Use multimodal for image analysis
      console.log(`[IntentAnalyzer] Using multimodal with ${imageCount} images`);
      result = await generateMultimodal(fullPrompt, images, {
        temperature: 0.3,
        maxOutputTokens: 8192,  // V3.3: Increased to prevent JSON truncation
        model,
        jsonMode: true,  // 确保返回完整 JSON
      });
    } else {
      // Use text-only for efficiency
      result = await generateText(fullPrompt, {
        temperature: 0.3,
        maxOutputTokens: 8192,  // V3.3: Increased for consistency
        model,
        jsonMode: true,  // 确保返回完整 JSON
      });
    }

    // V3.3 DEBUG: Log raw result length to diagnose truncation
    console.log(`[IntentAnalyzer] Raw result length: ${result.length}`);

    const jsonStr = extractJSON(result);
    console.log('[IntentAnalyzer] Extracted JSON (first 200):', jsonStr.substring(0, 200));
    
    return JSON.parse(jsonStr) as IntentAnalysisResult;
  } catch (error) {
    console.error('[IntentAnalyzer] Failed:', error);
    return null;
  }
}

// ============================================
// Stage 2 Caller
// ============================================

async function callFieldGenerator(
  intent: IntentAnalysisResult,
  language: string
): Promise<DynamicSchema | null> {
  let result: string | undefined;
  try {
    const prompt = FIELD_GENERATOR_PROMPT
      .replace(/\{\{user_language\}\}/g, language)
      .replace(/\{\{input_complexity\}\}/g, intent.input_complexity)
      .replace(/\{\{intent_json\}\}/g, JSON.stringify(intent, null, 2));

    result = await generateText(
      prompt,
      {
        temperature: 0.7,
        maxOutputTokens: 8192,  // V3.1: Increased to prevent JSON truncation
        model: 'gemini-3-flash-preview',
        jsonMode: true,  // 确保返回完整 JSON
      }
    );

    const jsonStr = extractJSON(result);
    console.log('[FieldGenerator] Extracted JSON (first 200):', jsonStr.substring(0, 200));
    // V3.3 DEBUG: Print complete JSON to diagnose defaultValue issue
    console.log('[FieldGenerator] === COMPLETE JSON START ===');
    console.log(jsonStr);
    console.log('[FieldGenerator] === COMPLETE JSON END ===');

    return JSON.parse(jsonStr) as DynamicSchema;
  } catch (error) {
    // V3.1: Enhanced error logging for JSON truncation diagnosis
    if (error instanceof SyntaxError && result) {
      console.error('[FieldGenerator] JSON parsing failed:', {
        errorMessage: (error as Error).message,
        resultLength: result.length,
        resultTail: result.substring(Math.max(0, result.length - 200)),
      });
    }
    console.error('[FieldGenerator] Failed:', error);
    return null;
  }
}

// ============================================
// Main Entry Point - Two-Stage Pipeline
// ============================================

/**
 * Analyze user intent using two-stage pipeline
 * Stage 1: Intent Analyzer - Extract constraints, style hints, analyze images
 * Stage 2: Field Generator - Generate adaptive parameters
 * 
 * @param userInput - User's text input
 * @param images - Optional array of images with mimeType and base64 data
 */
export async function analyzeIntent(
  userInput: string,
  images?: MultimodalImage[]
): Promise<DynamicSchema | null> {
  if (!userInput || userInput.trim().length < 1) {
    return null;
  }

  try {
    // Detect language
    const { language, method } = detectUserLanguage(userInput);
    console.log(`[IntentAnalyzer V3] Language: ${language} (${method})`);
    console.log(`[IntentAnalyzer V3] Images: ${images?.length || 0}`);

    // Extract aspect ratio from user input
    const { extractedRatio, mappedRatio, wasRemapped } = extractRatio(userInput);
    if (extractedRatio) {
      console.log(`[IntentAnalyzer V3] Ratio extracted: ${extractedRatio}${wasRemapped ? ` → mapped to ${mappedRatio}` : ''}`);
    }

    // Stage 1: Analyze Intent (with V3.0 retry logic for internal_signals)
    console.log('[IntentAnalyzer V3] Stage 1: Analyzing intent...');
    let intent = await callIntentAnalyzer(userInput, language, images);

    // V3.0: Retry once if internal_signals is missing and images are present
    if (intent && images && images.length > 0 && !intent.internal_signals) {
      console.warn('[IntentAnalyzer V3] ⚠️ Missing internal_signals on first attempt, retrying...');
      const retryIntent = await callIntentAnalyzer(userInput, language, images);
      if (retryIntent && retryIntent.internal_signals) {
        intent = retryIntent;
        console.log('[IntentAnalyzer V3] ✅ Retry successful, internal_signals obtained');
      } else {
        console.warn('[IntentAnalyzer V3] ⚠️ internal_signals still unavailable after retry, proceeding without it');
      }
    }

    if (!intent || !intent.subject) {
      console.error('[IntentAnalyzer V3] Intent analysis failed, falling back to legacy');
      const legacySchema = await analyzeIntentLegacy(userInput, language);
      if (legacySchema) {
        legacySchema.extractedRatio = mappedRatio;
      }
      return legacySchema;
    }
    console.log('[IntentAnalyzer V3] Intent:', JSON.stringify(intent, null, 2));
    
    // Log image analysis results specifically
    if (intent.image_analysis && intent.image_analysis.length > 0) {
      console.log('[IntentAnalyzer V3] 🖼️ Image Analysis Results:', JSON.stringify(intent.image_analysis, null, 2));
    } else if (images && images.length > 0) {
      console.warn('[IntentAnalyzer V3] ⚠️ Images were provided but no image_analysis returned!');
    }

    // Stage 2: Generate Fields
    console.log('[IntentAnalyzer V3] Stage 2: Generating fields...');
    const schema = await callFieldGenerator(intent, language);
    
    if (!schema) {
      console.error('[IntentAnalyzer V3] Field generation failed, falling back to legacy');
      const legacySchema = await analyzeIntentLegacy(userInput, language);
      if (legacySchema) {
        legacySchema.extractedRatio = mappedRatio;

        // V3.1: Preserve image descriptions (existing logic)
        if (intent.image_analysis && intent.image_analysis.length > 0) {
          const imageDescriptions = intent.image_analysis
            .map(img => img.content_description)
            .filter((desc): desc is string => Boolean(desc));
          if (imageDescriptions.length > 0) {
            legacySchema.preservedDetails = [
              ...(legacySchema.preservedDetails || []),
              ...imageDescriptions
            ];
            // V3.1 NEW: Also set imageDescriptions for Compiler
            legacySchema.imageDescriptions = imageDescriptions;
            console.log('[IntentAnalyzer V3] Legacy: Preserved image descriptions:', imageDescriptions);
          }
        }

        // ========== V3.1 NEW: Inject signals from Stage 1 into Legacy schema ==========

        // 1. Inject contentCategory
        if (intent.content_category) {
          legacySchema.contentCategory = intent.content_category as ContentCategory;
          console.log(`[IntentAnalyzer V3] Legacy: Injected contentCategory: ${intent.content_category}`);
        }

        // 2. Inject styleHints
        if (intent.style_hints && intent.style_hints.length > 0) {
          legacySchema.styleHints = intent.style_hints;
          console.log(`[IntentAnalyzer V3] Legacy: Injected styleHints: ${intent.style_hints.join(', ')}`);
        }

        // 3. Inject internalSignals (CRITICAL for reference_intent)
        if (intent.internal_signals) {
          legacySchema.internalSignals = {
            referenceIntent: parseReferenceIntentFromAnalyzer(intent.internal_signals.reference_intent),
            primaryMood: intent.internal_signals.primary_mood || undefined,
            visualComplexity: intent.internal_signals.visual_complexity || undefined,
            detectedSubjectType: detectSubjectTypeFromIntent(intent),
          };
          console.log(`[IntentAnalyzer V3] Legacy: Injected internalSignals:`, legacySchema.internalSignals);
        } else if (intent.image_analysis && intent.image_analysis.length > 0) {
          // Fallback: Infer from image_analysis if internal_signals missing
          const firstImage = intent.image_analysis[0];
          legacySchema.internalSignals = {
            referenceIntent: parseReferenceIntentFromAnalyzer(firstImage.user_apparent_intent),
            primaryMood: (firstImage.detected_features as any)?.mood || undefined,
            visualComplexity: 'balanced',
            detectedSubjectType: detectSubjectTypeFromIntent(intent),
          };
          console.log(`[IntentAnalyzer V3] Legacy: Inferred internalSignals from image_analysis:`, legacySchema.internalSignals);
        }
        // ========== END V3.1 NEW ==========
      }
      return legacySchema;
    }

    // Add extracted ratio to schema
    schema.extractedRatio = mappedRatio;

    // V3.1: Pass high-level intent from Stage 1 to DynamicSchema
    // This enables scene-aware compilation in the Compiler
    const normalizedSchema = normalizeSchema(schema);

    // Inject content category for scene-aware prompting
    if (intent.content_category) {
      normalizedSchema.contentCategory = intent.content_category as ContentCategory;
      console.log(`[IntentAnalyzer V3] ✅ Injected contentCategory: ${intent.content_category}`);
    }

    // Inject style hints for style-aware compilation
    if (intent.style_hints && intent.style_hints.length > 0) {
      normalizedSchema.styleHints = intent.style_hints;
      console.log(`[IntentAnalyzer V3] ✅ Injected styleHints: ${intent.style_hints.join(', ')}`);
    }

    // Inject image descriptions for reference image context
    if (intent.image_analysis && intent.image_analysis.length > 0) {
      const imageDescriptions = intent.image_analysis
        .map(img => img.content_description)
        .filter((desc): desc is string => Boolean(desc));
      if (imageDescriptions.length > 0) {
        normalizedSchema.imageDescriptions = imageDescriptions;
        console.log(`[IntentAnalyzer V3] ✅ Injected imageDescriptions: ${imageDescriptions.length} items`);
      }
    }

    // V3.0: Inject internal signals for intent preservation
    // Priority 1: Use Field Generator's internalSignals if available (passthrough from Stage 2)
    // Priority 2: Fallback to Intent Analyzer's internal_signals (Stage 1)
    // Priority 3: Infer from image_analysis if available
    const fieldGenSignals = (schema as any).internalSignals;
    if (fieldGenSignals) {
      // Field Generator passed through the signals
      normalizedSchema.internalSignals = {
        referenceIntent: parseReferenceIntentFromAnalyzer(fieldGenSignals.referenceIntent),
        primaryMood: fieldGenSignals.primaryMood || undefined,
        visualComplexity: fieldGenSignals.visualComplexity || undefined,
        detectedSubjectType: fieldGenSignals.detectedSubjectType || undefined,
      };
      console.log(`[IntentAnalyzer V3] ✅ Injected internalSignals from Field Generator:`, normalizedSchema.internalSignals);
    } else if (intent.internal_signals) {
      // Fallback to Stage 1 signals
      normalizedSchema.internalSignals = {
        referenceIntent: parseReferenceIntentFromAnalyzer(intent.internal_signals.reference_intent),
        primaryMood: intent.internal_signals.primary_mood || undefined,
        visualComplexity: intent.internal_signals.visual_complexity || undefined,
        detectedSubjectType: detectSubjectTypeFromIntent(intent),
      };
      console.log(`[IntentAnalyzer V3] ✅ Injected internalSignals from Intent Analyzer:`, normalizedSchema.internalSignals);
    } else if (intent.image_analysis && intent.image_analysis.length > 0) {
      // Fallback: Infer from image analysis
      const firstImage = intent.image_analysis[0];
      normalizedSchema.internalSignals = {
        referenceIntent: parseReferenceIntentFromAnalyzer(firstImage.user_apparent_intent),
        primaryMood: (firstImage.detected_features as any)?.mood || undefined,
        visualComplexity: 'balanced',
        detectedSubjectType: detectSubjectTypeFromIntent(intent),
      };
      console.log(`[IntentAnalyzer V3] ⚠️ Inferred internalSignals from image_analysis:`, normalizedSchema.internalSignals);
    }

    // V3.5 NEW: Inject primary intent for first-sentence anchoring
    if (intent.primary_intent && intent.primary_intent.phrase && intent.primary_intent.confidence >= 0.8) {
      normalizedSchema.primaryIntent = {
        phrase: intent.primary_intent.phrase,
        category: intent.primary_intent.category,
        confidence: intent.primary_intent.confidence,
      };
      console.log(`[IntentAnalyzer V3] ✅ Injected primaryIntent: "${intent.primary_intent.phrase}" [${intent.primary_intent.category}, ${intent.primary_intent.confidence}]`);
    } else if (intent.primary_intent) {
      console.log(`[IntentAnalyzer V3] ⚠️ primaryIntent skipped due to low confidence: ${intent.primary_intent.confidence}`);
    }

    // Validate and normalize
    return normalizedSchema;
  } catch (error) {
    console.error('[IntentAnalyzer V3] Pipeline failed:', error);
    return null;
  }
}


// ============================================
// Legacy Fallback (Single Agent)
// ============================================

const LEGACY_PROMPT = `You are an AI that analyzes user intent for image/design generation and creates a dynamic form schema.

# CURRENT USER CONTEXT
- **Detected Language:** **{{user_language}}**

Given the user's input, determine:
1. What type of creative content they want to create
2. Generate 8-15 tunable parameters
3. DECONSTRUCT user's detailed descriptions into pre-filled form values

Return JSON:
{
  "context": "Brief name (e.g., 'Portrait', 'Logo')",
  "color": "Tailwind CSS text color class",
  "followUpQuestion": "Question if critical info missing, else null",
  "fields": [
    { "id": "unique_id", "type": "slider"|"select"|"text", "label": "Label", "isAdvanced": false, "defaultValue": 0.5, "options": [...] }
  ]
}

# RULES
- ALL output MUST be in **{{user_language}}**
- Generate 8-12 options per select field
- **OPTION FORMAT (IMPORTANT)**: Use natural language with spaces and proper capitalization, NOT underscores or snake_case
  - ✅ Good examples: ["Eye Level", "Low Angle", "High Angle", "Dutch Angle", "Bird's Eye View"]
  - ✅ Good examples: ["Warm Autumn", "Cool Winter", "Vibrant Summer", "Earth Tones"]
  - ❌ Bad examples: ["eye_level", "low_angle", "high_angle"] - NEVER use underscores
  - ❌ Bad examples: ["warm_autumn", "cool_winter"] - NEVER use snake_case
- Return ONLY valid JSON`;

async function analyzeIntentLegacy(userInput: string, language: string): Promise<DynamicSchema | null> {
  try {
    const prompt = LEGACY_PROMPT.replace(/\{\{user_language\}\}/g, language);

    const result = await generateText(
      `${prompt}\n\nUser input: "${userInput}"`,
      {
        temperature: 0.6,
        maxOutputTokens: 4096,
        model: 'gemini-3-flash-preview',
        jsonMode: true,  // 确保返回完整 JSON
      }
    );
    
    const jsonStr = extractJSON(result);
    console.log('[Legacy] Extracted JSON:', jsonStr.substring(0, 200));
    
    return normalizeSchema(JSON.parse(jsonStr) as DynamicSchema);
  } catch (error) {
    console.error('[IntentAnalyzer Legacy] Failed:', error);
    return null;
  }
}

// ============================================
// Schema Normalization
// ============================================

function normalizeSchema(schema: DynamicSchema): DynamicSchema {
  if (!schema.context || !schema.fields || !Array.isArray(schema.fields)) {
    throw new Error('Invalid schema structure');
  }

  schema.fields = schema.fields.map((field, index) => ({
    id: field.id || `field_${index}`,
    type: field.type || 'slider',
    label: field.label || `Parameter ${index + 1}`,
    isAdvanced: field.isAdvanced ?? true,
    multiSelect: field.multiSelect ?? (field.type === 'select'),
    defaultValue: field.defaultValue ?? (field.type === 'slider' ? 0.5 : field.type === 'toggle' ? false : ''),
    min: field.type === 'slider' ? (field.min ?? 0) : undefined,
    max: field.type === 'slider' ? (field.max ?? 1) : undefined,
    step: field.type === 'slider' ? (field.step ?? 0.1) : undefined,
    unit: field.unit,
    minLabel: field.type === 'slider' ? field.minLabel : undefined,
    maxLabel: field.type === 'slider' ? field.maxLabel : undefined,
    options: field.type === 'select' ? (field.options || ['Default']) : undefined,
    source: field.source || 'default',
  }));

  return schema;
}
