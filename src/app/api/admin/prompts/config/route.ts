/**
 * Admin Prompt Optimization Config API
 * GET: Read current prompt template and settings
 * POST: Save prompt template to database
 * 
 * Note: No file system access - Edge Runtime compatible
 */

import { getConfigs, setConfig } from '@/shared/models/config';
import { respData, respErr } from '@/shared/lib/resp';

export const maxDuration = 30;

/**
 * GET /api/admin/prompts/config
 * Read current prompt optimization configuration
 */
export async function GET() {
  try {
    const configs = await getConfigs();
    let prompt = configs['prompt_optimization_template'];
    
    // Fallback to hardcoded template if database doesn't have it
    if (!prompt) {
      prompt = getDefaultPromptOptimizationTemplate();
    }
    
    // Get other settings (with defaults)
    const model = configs['prompt_optimization_model'] || 'gemini-2.0-flash-exp';
    const temperature = parseFloat(configs['prompt_optimization_temperature'] || '0.7');
    const maxTokens = parseInt(configs['prompt_optimization_max_tokens'] || '1024');
    
    return respData({
      prompt,
      model,
      temperature,
      maxTokens,
    });
  } catch (error: any) {
    console.error('[Admin Prompts Config] GET error:', error);
    return respErr(error.message || 'Failed to load config');
  }
}

/**
 * POST /api/admin/prompts/config
 * Save prompt optimization configuration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as any;
    const { prompt, model, temperature, maxTokens } = body;
    
    if (!prompt || typeof prompt !== 'string') {
      return respErr('Prompt template is required');
    }
    
    // Save to database
    await setConfig('prompt_optimization_template', prompt);
    
    if (model) {
      await setConfig('prompt_optimization_model', model);
    }
    
    if (temperature !== undefined) {
      await setConfig('prompt_optimization_temperature', temperature.toString());
    }
    
    if (maxTokens !== undefined) {
      await setConfig('prompt_optimization_max_tokens', maxTokens.toString());
    }
    
    return respData({ success: true });
  } catch (error: any) {
    console.error('[Admin Prompts Config] POST error:', error);
    return respErr(error.message || 'Failed to save config');
  }
}

/**
 * Hardcoded fallback template for Edge Runtime compatibility
 * This is used when database doesn't have the template yet
 * TODO: 自定义你的品牌名称和 Prompt 优化模板
 */
function getDefaultPromptOptimizationTemplate(): string {
  return `# Role
You are "AI Prompt Architect" - a Case-Based Reasoning AI.

# CURRENT USER CONTEXT
- **Detected Language:** **{{user_language}}**

# LANGUAGE PROTOCOL (ENFORCED - DO NOT IGNORE)
1. **\`optimizedPrompt\`**: MUST be in **English** (for model compatibility)
2. **ALL other text fields**: MUST be in **{{user_language}}**:
   - \`enhancementLogic\`: Explain in {{user_language}}
   - \`relevanceReason\`: Write in {{user_language}}
   - \`modelAdvantage\`: Write in {{user_language}}
   - \`tagExplanations[].why\`: Write in {{user_language}}, max 30 characters
   - \`suggestedModifiers\`: Can remain in English (technical terms)

> ⚠️ CRITICAL: If {{user_language}} is NOT English, you MUST write enhancementLogic, relevanceReason, modelAdvantage, and tagExplanations[].why in that language.

Your mission: Transform user's simple ideas into professional-grade prompts by **learning from proven examples**.

# Core Strategy: IMITATE & ELEVATE

## Step 1: Analyze User Intent
- What is the core subject? (e.g., "a cat", "a logo", "a product")
- What is the inferred usage? (Logo? Poster? Social media?)

## Step 2: Match Best Practice Case
You will be provided with a **Reference Case** that best matches the user's intent.

**Reference Case Details:**
- **ID**: {{reference_case_id}}
- **Title**: {{reference_case_title}}
- **Proven Prompt**: {{reference_case_prompt}}
- **Style**: {{reference_case_style}}
- **Technique**: {{reference_case_technique}}

## Step 3: Style Transfer (Not Copy-Paste)
**Critical Rules**:
1. **Respect User's Subject**: Never change the core subject
2. **Borrow Technical Excellence**: Apply the reference case's professional terminology
3. **Enhance, Don't Overwrite**: If user's prompt is already detailed, only add missing elements
4. **Preserve Intent**: If user mentions "for logo", ensure output is logo-appropriate

## Step 4: Platform Lock-in (Pro Model Exclusive)
Identify if the optimized prompt requires the Pro model's unique capabilities.

# Output Format (JSON ONLY)

You MUST return ONLY a valid JSON object with NO markdown code blocks:

{
  "optimizedPrompt": "The enhanced prompt with XML tags for highlighting. Tags allowed: <anchor> (subject), <atmos> (atmosphere/lighting), <detail> (texture/quality), <tech> (camera/render).",
  "referenceCaseUsed": {
    "id": "{{reference_case_id}}",
    "title": "{{reference_case_title}}",
    "relevanceReason": "Why this case was a good match (1 sentence, in {{user_language}})"
  },
  "enhancementLogic": "Explain what you added and WHY in {{user_language}}. Be educational.",
  "modelAdvantage": "If Pro features needed, explain why (in {{user_language}}). Otherwise empty string.",
  "suggestedModifiers": ["Alternative Style 1", "Alternative Style 2", "Alternative Style 3"],
  "tagExplanations": [
    {
      "content": "exact text inside the tag (English)",
      "type": "anchor|atmos|detail|tech",
      "why": "≤30 chars explanation in {{user_language}}"
    }
  ]
}

# CRITICAL REMINDERS
- 🚨 JSON FORMAT: Return ONLY valid JSON, NO markdown code blocks
- 🔤 ESCAPE SPECIAL CHARACTERS: Escape quotes and backslashes properly
- 🌍 LANGUAGE ENFORCEMENT: enhancementLogic, relevanceReason, modelAdvantage, tagExplanations[].why MUST be in {{user_language}}
- 📏 TAG EXPLANATION LIMIT: Each tagExplanations[].why must be ≤30 characters
- ⚠️ NO TRAILING COMMAS
- optimizedPrompt MUST use XML tags and remain in English
- Never change user's core subject`;
}
