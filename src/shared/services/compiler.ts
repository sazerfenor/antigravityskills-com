import { generateText } from './gemini-text';
import type { PLO, NarrativeParam, PromptHighlights, HighlightSpan } from '@/shared/schemas/plo-schema';

// Highlight category type (matches HighlightCategorySchema)
type HighlightCategory = 'subject' | 'style' | 'lighting' | 'environment' | 'mood' | 'technical';

// Content category type for scene-aware compilation
type ContentCategory = 'photography' | 'graphic_design' | 'infographic' | 'illustration' | 'other';

/**
 * Visual Director Compiler Service
 * Converts a PLO (Prompt Logic Object) into a keyword-based prompt.
 *
 * V2.1: Scene-aware compilation with high-level intent support.
 * V2: Outputs English keyword prompts (best for image generation models).
 *
 * @see DOC/Artifacts/PRD_Handoff.md
 */

// ============================================
// Scene-Aware Prompt Addons (Phase 3) - V3.0 Natural Language
// ============================================

/**
 * Scene-specific prompt addons that enhance output quality
 * based on content category.
 *
 * V3.0: Updated to use natural language narrative style
 * instead of keyword lists.
 */
const GRAPHIC_DESIGN_PROMPT_ADDON = `
# GRAPHIC DESIGN MODE (HYBRID INTENT)
You are generating a prompt for a design output (Poster, Banner, etc.), BUT the content *inside* the design (the photography/scene) is equally important.

## CRITICAL INSTRUCTIONS
1. **Design Structure**: Weave layout, typography, and hierarchy naturally into your narrative.
2. **Visual Content Fidelity (MANDATORY)**: If the input parameters describe a SCENE (lighting, mood, texture, environment), you **MUST** include them as vivid descriptions.
   - Do NOT simplify a "Cozy Bedroom Scene" into just "bedroom photo".
   - Do NOT drop "Golden Hour Lighting" just because it's a poster.
   - **RULE**: If a parameter exists in the Input style params, it MUST appear in the Output with a [[marker]] woven into narrative.

## Example - Hybrid Intent (Product Poster)
Input:
Subject: luxury bedding advertisement
Style Parameters: primary_subject: White linen (intensely), lighting: Warm sunlight (moderately), mood: Cozy (intensely), layout: Minimalist (intensely), typography: Serif (moderately)

Output:
An advertisement composition where [[primary_subject:pristine white linen]] takes center stage, bathed in [[lighting:warm golden sunlight]] streaming through unseen windows. The [[mood:cozy]] atmosphere invites the viewer in, while the [[layout:minimalist]] arrangement allows the fabric's texture to breathe. Elegant [[typography:serif]] headlines anchor the design with timeless sophistication.
`;

const PHOTOGRAPHY_PROMPT_ADDON = `
# PHOTOGRAPHY MODE
For portraits, products, and scenes, describe the image as a photographer would explain the shot to their assistant.

## NARRATIVE TECHNIQUES
- Describe how light falls and shapes the subject
- Explain the relationship between foreground and background
- Use sensory language for textures and materials
- Paint the atmosphere with environmental details

## Example - Portrait
Input:
Subject: professional headshot
Style Parameters: lighting: Rembrandt (intensely), skin_texture: Natural (moderately), background: Neutral gray (moderately)

Output:
A professional headshot where [[lighting:Rembrandt lighting]] sculpts the subject's face, the characteristic triangle of light beneath one eye lending depth and dimension. The [[skin_texture:natural]] complexion is rendered with honest detail, neither over-smoothed nor harsh. Behind, a [[background:neutral gray]] backdrop recedes into soft focus, ensuring nothing distracts from the confident gaze and the subtle catchlights dancing in the eyes.
`;

const ILLUSTRATION_PROMPT_ADDON = `
# ILLUSTRATION MODE
For children's books, comics, and artistic illustrations, describe the scene as an art director briefing an illustrator.

## NARRATIVE TECHNIQUES
- Describe the emotional quality of line and shape
- Explain color relationships and their emotional impact
- Characterize figures through posture and expression
- Set the artistic tone through technique description

## Example - Children's Book
Input:
Subject: friendly dragon character
Style Parameters: art_style: Watercolor storybook (intensely), color_palette: Warm pastel (moderately), character_expression: Friendly smile (intensely)

Output:
A [[art_style:watercolor storybook]] illustration of a friendly dragon, its scales rendered in soft washes that bleed gently into the paper. The creature's [[character_expression:warm, welcoming smile]] reveals tiny rounded teeth, more endearing than threatening. [[color_palette:Warm pastel]] hues of peach, lavender, and mint green suffuse the scene, creating a world that feels safe and inviting for young readers.
`;

const INFOGRAPHIC_PROMPT_ADDON = `
# INFOGRAPHIC MODE
For information graphics, tutorials, and charts, describe the visual as a design brief that balances clarity with aesthetic appeal.

## NARRATIVE TECHNIQUES
- Emphasize the logical flow of information
- Describe how visual hierarchy guides the eye
- Explain the functional role of color coding
- Balance data density with white space

## Example - Recipe Infographic
Input:
Subject: pasta cooking tutorial
Style Parameters: layout: Step-by-step vertical (intensely), color_scheme: Warm kitchen tones (moderately), icon_style: Hand-drawn (moderately)

Output:
A [[layout:step-by-step vertical]] tutorial flows down the page like a culinary journey, each stage clearly numbered and visually distinct. [[color_scheme:Warm kitchen tones]] of terracotta, olive, and cream evoke a rustic Italian kitchen. [[icon_style:Hand-drawn]] icons of pots, spoons, and herbs add a personal, approachable touch, inviting home cooks to follow along with confidence.
`;

/** Map content category to its specific prompt addon */
const PROMPT_ADDONS: Record<ContentCategory, string> = {
  photography: PHOTOGRAPHY_PROMPT_ADDON,
  graphic_design: GRAPHIC_DESIGN_PROMPT_ADDON,
  infographic: INFOGRAPHIC_PROMPT_ADDON,
  illustration: ILLUSTRATION_PROMPT_ADDON,
  other: '',
};

/** Reference Intent instructions for i2i generation */
const REFERENCE_INTENT_INSTRUCTIONS: Record<string, string> = {
  malleable: 'Redraw entirely in new style, use reference only for inspiration.',
  structure: 'Keep composition and layout from reference, transform content and style.',
  subject: 'Keep main subject from reference, change background and style.',
  style_ref: 'Extract and apply visual style from reference, ignore content.',
  face_swap: 'Replace face while maintaining scene context and lighting match.',
  pose_transfer: 'Apply pose from reference to new character.',
  inpaint: 'Redraw specific area described in prompt.',
  outpaint: 'Extend image in specified direction.',
};

// Text-related fields to filter when text_render is disabled
const TEXT_RELATED_FIELDS = ['text_content', 'text_position', 'text_style'];

/**
 * Check if a field should be filtered based on text_render setting
 */
const shouldFilterTextField = (fieldKey: string, textRenderEnabled: boolean): boolean => {
  if (textRenderEnabled) return false;
  return TEXT_RELATED_FIELDS.includes(fieldKey);
};

/**
 * Build a structured description from PLO for AI processing
 * V3.5: PRIMARY INTENT at the TOP for first-sentence anchoring
 * V3.2: Image processing instructions at the TOP, uses subject_identity
 * V3.1: Now includes high-level intent information
 */
function buildPLODescription(plo: PLO): string {
  const parts: string[] = [];
  const textRenderEnabled = plo.layout_constraints?.text_render ?? false;

  // Debug: Log incoming PLO structure
  console.log('[Compiler] buildPLODescription - PLO received:', {
    subject: plo.core.subject,
    narrativeParamsCount: Object.keys(plo.narrative_params || {}).length,
    narrativeParams: plo.narrative_params,
    textRenderEnabled,
    contentCategory: plo.content_category,
    referenceIntent: plo.reference_intent,
    imageProcessingInstructions: plo.image_processing_instructions,
    primaryIntent: plo.primary_intent,
  });

  // V3.5 NEW: PRIMARY CREATIVE INTENT - MUST BE FIRST (HIGHEST PRIORITY)
  // This ensures the core style/technique appears in the first sentence of the output
  if (plo.primary_intent) {
    parts.push(`PRIMARY CREATIVE INTENT: "${plo.primary_intent.phrase}" [CATEGORY: ${plo.primary_intent.category}, CONFIDENCE: ${plo.primary_intent.confidence}]`);
  }

  // V3.6 RESTORED: IMAGE PROCESSING INSTRUCTIONS - SECOND PRIORITY (Hybrid Anchoring)
  // Re-enabled because: Modern Gemini API fully supports text-based image references.
  // The Compiler LLM needs this context to generate proper "Hybrid Anchor" first sentences
  // that fuse Primary Intent + Image Reference (e.g., "A [[Ghibli Style]] re-imagining of [[the provided photo]]...")
  if (plo.image_processing_instructions && plo.image_processing_instructions.length > 0) {
    const instructions = plo.image_processing_instructions
      .map((inst, idx) => `  Image ${idx + 1} [${inst.role}]: ${inst.instruction}`)
      .join('\n');
    parts.push(`IMAGE USAGE INSTRUCTIONS (MUST be woven into the narrative):\n${instructions}`);
  }

  // FIX: User-provided custom input moved up - THIRD PRIORITY (HIGHEST USER INPUT)
  // User's explicit instructions should override system-inferred subject/style
  if (plo.custom_input && plo.custom_input.trim()) {
    parts.push(`User Specified Details (HIGH PRIORITY - respect user intent): ${plo.custom_input}`);
  }

  // ========== V3.2: Subject Identity Priority ==========
  // If user selected subject_identity from ambiguity resolution, use that as primary subject
  const subjectIdentity = plo.narrative_params?.subject_identity;
  if (subjectIdentity) {
    // Use subject_identity as the authoritative subject description
    parts.push(`Subject Identity (USER SELECTED): ${subjectIdentity.value}`);
    // Core subject becomes secondary context
    if (plo.core.subject) {
      parts.push(`Original Request: ${plo.core.subject}`);
    }
  } else {
    // No subject_identity, use core subject as usual
    if (plo.core.subject) {
      parts.push(`Subject: ${plo.core.subject}`);
    }
  }

  // V3.5: Reference intent moved after subject for Hybrid Anchoring
  // This allows the Compiler to fuse primary intent + image reference in the first sentence
  if (plo.reference_intent) {
    const instruction = REFERENCE_INTENT_INSTRUCTIONS[plo.reference_intent];
    if (instruction) {
      parts.push(`Reference Intent: ${instruction}`);
    }
  }

  if (plo.core.action) {
    parts.push(`Action: ${plo.core.action}`);
  }

  // V2: Preserved details (things that couldn't be mapped to form fields)
  if (plo.preserved_details && plo.preserved_details.length > 0) {
    parts.push(`Must Include Details: ${plo.preserved_details.join(', ')}`);
  }

  // Narrative parameters with strength (with text field filtering)
  // V3.2: Skip subject_identity since it's already handled above
  // V3.5: Sort by strength descending for better priority
  if (plo.narrative_params && Object.keys(plo.narrative_params).length > 0) {
    const sortedParams = Object.entries(plo.narrative_params)
      .filter(([key, param]) => {
        // Skip text-related fields when text_render is disabled
        if (shouldFilterTextField(key, textRenderEnabled)) return false;
        // Skip subject_identity as it's already the primary subject
        if (key === 'subject_identity') return false;
        // Skip low-strength params
        const p = param as NarrativeParam;
        return p.strength > 0.3;
      })
      .sort((a, b) => (b[1] as NarrativeParam).strength - (a[1] as NarrativeParam).strength);

    const paramParts = sortedParams.map(([key, param]) => {
      const p = param as NarrativeParam;
      const intensityWord = p.strength >= 0.8 ? 'intensely' : p.strength >= 0.5 ? 'moderately' : 'subtly';
      return `${key}: ${p.value} (${intensityWord})`;
    });

    if (paramParts.length > 0) {
      parts.push(`Style Parameters: ${paramParts.join(', ')}`);
    }
  }

  // V3.1: Style hints from Intent Analyzer (moved lower - supporting context)
  if (plo.style_hints && plo.style_hints.length > 0) {
    parts.push(`Style Keywords: ${plo.style_hints.join(', ')}`);
  }

  // V3.1: Image descriptions for reference images
  if (plo.image_descriptions && plo.image_descriptions.length > 0) {
    parts.push(`Reference Image Content: ${plo.image_descriptions.join('; ')}`);
  }

  // V3.1: Content category (moved to end - metadata)
  if (plo.content_category) {
    parts.push(`Content Type: ${plo.content_category}`);
  }

  // Layout constraints
  if (plo.layout_constraints) {
    const constraints: string[] = [];
    if (plo.layout_constraints.ar && plo.layout_constraints.ar !== '1:1') {
      constraints.push(`aspect ratio ${plo.layout_constraints.ar}`);
    }
    if (plo.layout_constraints.text_render) {
      constraints.push('include text rendering');
    }
    if (constraints.length > 0) {
      parts.push(`Layout: ${constraints.join(', ')}`);
    }
  }

  // V2: Technical constraints (pass-through params like facelock, seed, weights)
  if (plo.technical_constraints && Object.keys(plo.technical_constraints).length > 0) {
    const techParts: string[] = [];
    for (const [key, value] of Object.entries(plo.technical_constraints)) {
      techParts.push(`${key}: ${value}`);
    }
    parts.push(`Technical Parameters: ${techParts.join(', ')}`);
  }

  const description = parts.join('\n');

  // Debug: Log final description
  console.log('[Compiler] buildPLODescription - Final description:', description);

  return description;
}

/**
 * System prompt template for the Visual Director Compiler
 *
 * V3.5: PRIMARY INTENT ANCHOR - First sentence MUST contain the primary intent
 * V3.0: Visual Narrative mode - fluent natural language instead of keyword soup
 * HIGHLIGHTS MARKING: AI wraps parameter-derived text with [[field_id:text]] markers
 * for later parsing and UI highlighting.
 *
 * Key changes in V3.5:
 * - Added PRIMARY INTENT ANCHOR rule for first-sentence anchoring
 * - Added Hybrid Anchoring for image references
 * - Added V3.5 Examples for different intent types
 *
 * Key changes in V3.0:
 * - Replaced keyword lists with fluent sentences
 * - Uses prepositions and verbs to describe relationships
 * - Descriptive density packed into narrative naturally
 * - Still maintains [[field_id:value]] markers for UI highlighting
 */
const COMPILER_PROMPT_TEMPLATE = `You are a world-class Visual Director.
Your task is to write a **Visual Narrative** for a modern AI image generator (Flux/Midjourney v6).

# PRIMARY INTENT ANCHOR (V3.5 - HIGHEST PRIORITY RULE)

When the input contains \`PRIMARY CREATIVE INTENT: "..."\`, you MUST follow these rules:

## Rule 1: FIRST SENTENCE RULE (CRITICAL)
The output prompt MUST begin with the primary intent phrase.
- Input: \`PRIMARY CREATIVE INTENT: "3D Clay Style"\`
- Output MUST start with: "A [[primary_intent:3D clay style]] rendering of..." or "[[primary_intent:3D clay style]] portrait of..."

## Rule 2: PHRASE INTEGRITY (Semantic, not Verbatim)
Use the COMPLETE phrase, but you MAY adjust for grammar.
- GOOD: "A 3D clay style portrait..."
- BAD: "A portrait with 3D elements and clay-like texture..." (fragmented - NEVER DO THIS)

## Rule 3: HYBRID ANCHORING (When Reference Images Exist)
When BOTH primary intent AND reference intent exist, fuse them in the first sentence:
Structure: [Primary Intent] + [Source Reference] + [Content Description]

Example:
- Input has PRIMARY CREATIVE INTENT + Reference Intent
- Output: "A [[primary_intent:Studio Ghibli style]] re-imagining of [[reference:the provided image]], featuring..."

This ensures:
- Model sees style/technique first → sets rendering mode
- Model sees reference mention → activates visual reference
- Neither is diluted

## Rule 3.5: IMAGE USAGE INSTRUCTIONS (V3.6 - CRITICAL FOR I2I)
When the input contains \`IMAGE USAGE INSTRUCTIONS\`, you MUST:

1. **WEAVE, NOT PREPEND**: Integrate the image usage naturally into the narrative, not as a separate block
2. **ROLE-AWARE PHRASING**: Use the image role to determine phrasing:
   - \`face_source\`: "...preserving the facial features from the reference photo..."
   - \`style_reference\`: "...inspired by the visual style of the provided image..."
   - \`composition_reference\`: "...following the composition and layout of the reference..."
   - \`redraw_target\`: "...a complete re-imagination of the provided image..."
   - \`product_reference\`: "...featuring the exact product shown in the reference..."

3. **FIRST SENTENCE FUSION**: When both PRIMARY INTENT and IMAGE INSTRUCTIONS exist, fuse them:
   - Input: PRIMARY INTENT "Ceramic Figure" + IMAGE [face_source]: "Use facial features as identity reference"
   - Output: "A [[primary_intent:Ceramic Figure]] sculpture preserving the facial identity from [[reference:the provided photo]], sculpted in..."

4. **NEVER DROP IMAGE CONTEXT**: Every image instruction MUST appear somewhere in the output narrative

## Rule 4: REPEAT FOR EMPHASIS (High Confidence)
If confidence = 1.0, reinforce the intent at the end:
"...rendered in authentic [[primary_intent:3D clay style]]."

## Rule 5: SUPPORTING DETAILS SECOND
All other parameters (lighting, mood, etc.) come AFTER establishing the primary intent in the first sentence.

# FORBIDDEN (Legacy Patterns)
- **NO Keyword Lists**: Do not write "sunlight, trees, grass".
- **NO Broken Grammar**: Do not write "girl, sitting, white dress".
- **NO "Quality Boosters"**: Do not use "masterpiece, best quality, 4k, 8k, trending on artstation".
- **NO INTENT FRAGMENTATION**: Do not break "3D Clay Style" into separate mentions like "3D elements" and "clay texture".

# REQUIRED (Modern Patterns)
- **Fluent Sentences**: Use prepositions and verbs to describe relationships.
  - "The sunlight filters *through* the trees, casting dappled shadows *on* the grass."
- **Descriptive Density**: Pack info into the narrative naturally.
  - Bad: "Dress is red."
  - Good: "...wearing a flowing crimson gown that billows in the wind."
- **Strict Parameter Marking**: You MUST still wrap user-controlled params in [[field_id:value]].
  - "A portrait of a [[subject:young woman]] with [[hair_style:braided hair]], illuminated by [[lighting:soft cinematic light]]."

# STRUCTURE
1. **Primary Intent (V3.5)**: If present, this MUST appear in the first sentence
2. **Subject Core**: Who/What is it? What are they doing?
3. **Environment & Atmosphere**: Where are they? What is the mood?
4. **Technical/Style**: Camera angle, film stock, rendering style.

# ERROR HANDLING
- If a specific user parameter (e.g. "Cyberpunk") doesn't fit the sentence flow, add it as a stylistic modifier at the end: "... . Style: [[style:Cyberpunk]]."
- NEVER skip a parameter - every input parameter MUST have a [[field_id:value]] marker somewhere in the output.

# V3.5 EXAMPLES (PRIMARY INTENT)

## Example A - Technique-First (3D Clay Style)
Input:
PRIMARY CREATIVE INTENT: "3D Clay Style" [CATEGORY: technique, CONFIDENCE: 1.0]
Subject: portrait of a young woman
Style Parameters: skin_texture: Smooth matte (moderately), clay_color: Terracotta (intensely)

Output:
[[primary_intent:3D clay style]] rendering of a young woman's portrait, her features sculpted with [[skin_texture:smooth matte]] finish in rich [[clay_color:terracotta]] tones. The handcrafted imperfections and fingerprint textures characteristic of clay sculpture bring warmth to her expression.

## Example B - Style with Reference Image (Hybrid Anchoring)
Input:
PRIMARY CREATIVE INTENT: "Studio Ghibli Style" [CATEGORY: style, CONFIDENCE: 1.0]
Reference Intent: Apply visual style from reference while keeping subject from user photo
Subject: landscape with cherry blossoms

Output:
A [[primary_intent:Studio Ghibli style]] landscape unfolds, inspired by [[reference:the provided composition]], with cherry blossoms dancing on a gentle breeze. The golden hour sun paints everything in warm hues as petals drift lazily through the air, evoking that nostalgic feeling of a Miyazaki film.

## Example C - Format-First (PPT Design)
Input:
PRIMARY CREATIVE INTENT: "Corporate PowerPoint Slide Design" [CATEGORY: format, CONFIDENCE: 1.0]
Subject: quarterly sales report
Style Parameters: color_scheme: Blue professional (intensely)

Output:
A [[primary_intent:Corporate PowerPoint Slide Design]] presenting quarterly sales report data, featuring [[color_scheme:blue professional]] accents and clean data visualization. The layout follows modern business presentation standards with ample whitespace and clear hierarchy.

## Example D - Long Primary Intent (Realistic 3D Figurine)
Input:
PRIMARY CREATIVE INTENT: "Realistic 3D Figurine Product Shot" [CATEGORY: technique, CONFIDENCE: 0.92]
Subject: East Asian man
Scene Elements: computer desk, monitor with design, packaging box

Output:
A [[primary_intent:Realistic 3D Figurine Product Shot]] showcasing an East Asian man in miniature form, standing in a neutral pose on a cluttered computer desk. The monitor displays the design while a branded packaging box sits nearby, completing this collectible toy photography composition.

## Example E - Face Source with Primary Intent (V3.6 - Full Hybrid)
Input:
PRIMARY CREATIVE INTENT: "Ceramic Figure" [CATEGORY: technique, CONFIDENCE: 1.0]
IMAGE USAGE INSTRUCTIONS (MUST be woven into the narrative):
  Image 1 [face_source]: Use the facial features, hair texture, and expression from this image as the primary identity reference. Translate these features into a ceramic material while maintaining the likeness.
Subject: The image of the person is to be transformed into a ceramic figure
Style Parameters: material: Fine White Porcelain (intensely), finish: Smooth Glazed Finish (intensely), pose_selection: Natural standing pose (intensely)

Output:
A [[primary_intent:Ceramic Figure]] sculpture preserving the facial identity from [[reference:the provided photo]], rendered in [[material:fine white porcelain]] with a [[finish:smooth glazed finish]]. The subject stands in a [[pose_selection:natural standing pose]], their features faithfully translated into ceramic while the characteristic translucency of porcelain catches soft museum lighting. Every detail from the original photograph—the hair texture, the subtle expression—is preserved in this handcrafted tribute.

# LEGACY EXAMPLES (Without Primary Intent)

## Example 1 - Simple (2 parameters)
Input:
Subject: cat portrait
Style Parameters: art_style: Watercolor (intensely), mood: Playful (moderately)

Output:
A [[art_style:watercolor]] portrait of a playful cat, its eyes sparkling with [[mood:playful]] mischief as soft brushstrokes dissolve into the paper texture.

## Example 2 - Medium (4 parameters)
Input:
Subject: woman portrait
Style Parameters: art_style: Photorealistic (intensely), lighting: Golden Hour (moderately), mood: Serene (moderately), depth_of_field: Shallow (intensely)

Output:
A [[art_style:photorealistic]] portrait of a woman with a [[mood:serene]] expression, her features softened by the warm embrace of [[lighting:golden hour]]. The background melts into a creamy blur, the [[depth_of_field:shallow]] focus drawing the eye to the gentle curve of her smile.

## Example 3 - Complex (10 parameters)
Input:
Subject: luxury bedding advertisement
Style Parameters: primary_subject: Luxurious white linen (intensely), material_texture: Ultra plush duvet (intensely), lighting_style: Soft diffused natural light (moderately), color_palette: Warm cream tones (moderately), composition: Hero product centered (intensely), background_style: Minimalist bedroom (moderately), mood_atmosphere: Serene comfort (intensely), depth_of_field: Shallow focus (moderately), rendering_style: Lifestyle editorial (intensely), detail_level: High thread count visible (moderately)

Output:
[[primary_subject:Luxurious white linen]] cascades across the frame in [[composition:hero centered]] glory, the [[material_texture:ultra plush duvet]] catching [[lighting_style:soft diffused natural light]] that reveals every fold and crease. The [[color_palette:warm cream tones]] harmonize with the [[background_style:minimalist bedroom]] setting, while [[depth_of_field:shallow focus]] isolates the [[detail_level:visible thread count]] texture. A [[mood_atmosphere:serene comfort]] pervades this [[rendering_style:lifestyle editorial]] composition.

# REMEMBER
- Write like a cinematographer describing a scene to their team.
- Every sentence should paint a clear visual.
- Parameters are woven INTO the narrative, not listed after it.
- **V3.5: If PRIMARY CREATIVE INTENT exists, it MUST appear in the FIRST sentence.**
- Output ONLY the visual narrative with markers. No explanations.`;

/**
 * Bilingual prompt result
 */
export interface BilingualPrompt {
  native: string;      // Prompt in user's language (for display)
  english: string;     // Prompt in English (for generation - best model performance)
  detectedLang: string; // Detected input language
  highlights?: PromptHighlights; // Highlight spans for field-to-prompt mapping
}

/**
 * Get the scene-aware compiler prompt based on content category
 * V3.1: Appends category-specific addon to base template
 */
const getSceneAwarePrompt = (contentCategory?: ContentCategory): string => {
  if (!contentCategory || contentCategory === 'other') {
    return COMPILER_PROMPT_TEMPLATE;
  }

  const addon = PROMPT_ADDONS[contentCategory];
  if (!addon) {
    return COMPILER_PROMPT_TEMPLATE;
  }

  return `${COMPILER_PROMPT_TEMPLATE}\n\n${addon}`;
};

/**
 * Compile a PLO into prompts using AI
 *
 * V2.1: Scene-aware compilation with content category support
 * V2: Simplified - always returns English prompt (best for image generation)
 * Native and English fields are identical for consistency.
 * Returns highlights for field-to-prompt mapping.
 *
 * @param plo - The Prompt Logic Object to compile
 * @returns BilingualPrompt with English prompt + highlights
 */
export async function compilePLO(plo: PLO): Promise<BilingualPrompt> {
  const description = buildPLODescription(plo);

  // If no meaningful content, return minimal prompt
  if (!plo.core.subject) {
    return {
      native: 'A scene',
      english: 'A scene',
      detectedLang: 'English',
      highlights: { native: [], english: [] },
    };
  }

  try {
    // Generate English prompt with markers (skip translation for performance)
    console.log(`[Compiler] Generating English keyword prompt for: "${plo.core.subject}" (category: ${plo.content_category || 'other'})`);
    const markedEnglishPrompt = await compileWithLanguage(description, plo.content_category);

    // Parse markers to extract highlights
    const { cleanPrompt: englishPrompt, highlights: englishHighlights } =
      parseHighlightMarkers(markedEnglishPrompt, plo);

    // Use fallback if no markers were found
    const finalHighlights = englishHighlights.length > 0
      ? englishHighlights
      : buildHighlightsFallback(englishPrompt, plo);

    // V3.4: Removed IMAGE PROCESSING INSTRUCTIONS prepending
    // Reason: Downstream APIs (Gemini/Imagen) don't understand text-based image references.
    // These instructions are preserved in PLO for future i2i API integrations that support
    // structured image handling, but should NOT appear in the user-visible prompt.
    // This also fixes the highlight offset bug caused by prepending text.

    // Return English for both native and english (unified output)
    return {
      native: englishPrompt,
      english: englishPrompt,
      detectedLang: 'English',
      highlights: {
        native: finalHighlights,
        english: finalHighlights,
      },
    };
  } catch (error) {
    // Fallback to basic compilation if AI fails
    console.error('[Compiler] AI compilation failed, using fallback:', error);
    const fallback = buildFallbackPrompt(plo);
    return {
      native: fallback,
      english: fallback,
      detectedLang: 'English',
      highlights: { native: [], english: [] },
    };
  }
}

/**
 * Compile description into English keyword prompt
 * V3.1: Now accepts content category for scene-aware prompting
 */
async function compileWithLanguage(
  description: string,
  contentCategory?: ContentCategory
): Promise<string> {
  const systemPrompt = getSceneAwarePrompt(contentCategory);

  const result = await generateText(
    `${systemPrompt}\n\nNow convert this:\n${description}`,
    {
      temperature: 0.7,
      maxOutputTokens: 4096,  // V3.1: Increased to prevent prompt truncation
      model: 'gemini-3-flash-preview',
    }
  );

  // Clean up the result (remove any quotes or extra whitespace)
  // Clean up the result
  return result.trim()
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/[,\.]$/, '');      // Remove trailing comma or period
}

// ============================================
// Highlights System
// ============================================

/**
 * Map field ID to highlight category
 */
function mapFieldToCategory(fieldId: string): HighlightCategory {
  const categoryMap: Record<string, HighlightCategory> = {
    // subject 类
    subject: 'subject',
    scene_description: 'subject',
    subject_features: 'subject',
    character: 'subject',
    // style 类
    art_style: 'style',
    stylization: 'style',
    visual_style: 'style',
    aesthetic: 'style',
    // lighting 类
    lighting: 'lighting',
    lighting_setup: 'lighting',
    light_direction: 'lighting',
    shadows: 'lighting',
    // environment 类
    background: 'environment',
    environment: 'environment',
    setting: 'environment',
    weather: 'environment',
    time_of_day: 'environment',
    // mood 类
    mood: 'mood',
    atmosphere: 'mood',
    emotion: 'mood',
    vibe: 'mood',
  };

  // Try exact match first
  if (categoryMap[fieldId]) {
    return categoryMap[fieldId];
  }

  // Try partial match
  const lowerFieldId = fieldId.toLowerCase();
  for (const [key, category] of Object.entries(categoryMap)) {
    if (lowerFieldId.includes(key) || key.includes(lowerFieldId)) {
      return category;
    }
  }

  return 'technical';
}

/**
 * Parse AI-generated prompt with [[field_id:text]] markers
 * Returns clean prompt and extracted highlights
 */
function parseHighlightMarkers(
  markedPrompt: string,
  plo: PLO
): { cleanPrompt: string; highlights: HighlightSpan[] } {
  const highlights: HighlightSpan[] = [];

  // V3.1 DEBUG: Log input for diagnosis
  console.log('[Compiler] parseHighlightMarkers - input length:', markedPrompt.length);
  console.log('[Compiler] parseHighlightMarkers - raw prompt preview:', markedPrompt.substring(0, 500));

  // Pre-process: Remove trailing incomplete markers (AI sometimes gets truncated)
  // Pattern: [[ followed by content but no closing ]] at end of string
  const sanitizedPrompt = markedPrompt.replace(/\[\[[^\]]*$/g, '');

  // Regex to match [[field_id:text]] - allows whitespace tolerance
  const markerRegex = /\[\[\s*([^\]:]+?)\s*:\s*([^\]]+?)\s*\]\]/g;

  // V3.1 DEBUG: Count expected matches before processing
  const allMatches = Array.from(sanitizedPrompt.matchAll(markerRegex));
  console.log('[Compiler] parseHighlightMarkers - regex matches found:', allMatches.length);
  if (allMatches.length > 0) {
    console.log('[Compiler] parseHighlightMarkers - match details:', allMatches.slice(0, 5).map(m => ({
      full: m[0].substring(0, 50),
      fieldId: m[1],
      value: m[2]?.substring(0, 30)
    })));
  }

  // Reset regex state after matchAll
  markerRegex.lastIndex = 0;

  let cleanPrompt = '';
  let lastIndex = 0;
  let match;

  while ((match = markerRegex.exec(sanitizedPrompt)) !== null) {
    // Add text before this marker
    cleanPrompt += sanitizedPrompt.slice(lastIndex, match.index);

    const fieldId = match[1].trim();
    const transformedText = match[2].trim();
    const start = cleanPrompt.length;

    // Add the actual text (without markers)
    cleanPrompt += transformedText;
    const end = cleanPrompt.length;

    // Look up original value from PLO
    const narrativeParam = plo.narrative_params?.[fieldId];

    highlights.push({
      start,
      end,
      fieldId,
      fieldLabel: fieldId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      originalValue: narrativeParam?.value || fieldId,
      category: mapFieldToCategory(fieldId),
      transformedTo: transformedText,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last marker
  cleanPrompt += sanitizedPrompt.slice(lastIndex);

  console.log(`[Compiler] Parsed ${highlights.length} highlights from marked prompt`);

  return { cleanPrompt, highlights };
}

/**
 * Fallback: Build highlights using text matching when AI doesn't use markers
 */
function buildHighlightsFallback(
  prompt: string,
  plo: PLO
): HighlightSpan[] {
  const highlights: HighlightSpan[] = [];

  if (!plo.narrative_params) return highlights;

  const promptLower = prompt.toLowerCase();

  for (const [fieldId, param] of Object.entries(plo.narrative_params)) {
    const p = param as NarrativeParam;
    if (!p.value) continue;

    // Try to find the parameter value in the prompt
    const searchValue = p.value.toLowerCase();
    const index = promptLower.indexOf(searchValue);

    if (index !== -1) {
      highlights.push({
        start: index,
        end: index + p.value.length,
        fieldId,
        fieldLabel: fieldId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        originalValue: p.value,
        category: mapFieldToCategory(fieldId),
      });
    }
  }

  console.log(`[Compiler] Fallback: Found ${highlights.length} highlights via text matching`);

  return highlights;
}


/**
 * Fallback prompt builder (no AI, pure logic)
 */
function buildFallbackPrompt(plo: PLO): string {
  const parts: string[] = [];

  // Core
  if (plo.core.subject) {
    parts.push(plo.core.subject);
  }
  if (plo.core.action) {
    parts.push(plo.core.action);
  }

  // Params with high strength
  if (plo.narrative_params) {
    for (const [key, param] of Object.entries(plo.narrative_params)) {
      const p = param as NarrativeParam;
      if (p.strength >= 0.5) {
        parts.push(`with ${p.value} ${key}`);
      }
    }
  }

  return parts.join(', ') || 'A scene';
}
