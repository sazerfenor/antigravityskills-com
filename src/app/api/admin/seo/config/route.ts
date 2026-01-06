import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getConfigsByKeys, setConfig } from '@/shared/models/config';

/**
 * GET /api/admin/seo/config
 * 获取 SEO 配置
 * ?defaults=true 返回代码默认值而不是数据库值
 */
export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      throw new Error('unauthorized');
    }

    // 检查是否请求默认模板
    const url = new URL(request.url);
    const useDefaults = url.searchParams.get('defaults') === 'true';

    // 默认值 (V14.0 Two-Stage)
    const defaults = {
      seo_prompt_stage1: getDefaultStage1Prompt(),
      seo_prompt_stage2: getDefaultStage2Prompt(),
      seo_generation_model: 'gemini-3.0-flash-preview',
      seo_generation_temperature: '0.7',
      seo_generation_max_tokens: '2048',
    };

    // 如果请求默认值，直接返回代码中的默认模板
    if (useDefaults) {
      return respData({
        promptStage1: defaults.seo_prompt_stage1,
        promptStage2: defaults.seo_prompt_stage2,
        model: defaults.seo_generation_model,
        temperature: parseFloat(defaults.seo_generation_temperature),
        maxTokens: parseInt(defaults.seo_generation_max_tokens),
      });
    }

    // 否则从数据库读取
    const configs = await getConfigsByKeys([
      'seo_prompt_stage1', 
      'seo_prompt_stage2',
      'seo_generation_model',
      'seo_generation_temperature',
      'seo_generation_max_tokens',
    ]);

    const result = {
      promptStage1: configs.seo_prompt_stage1 || defaults.seo_prompt_stage1,
      promptStage2: configs.seo_prompt_stage2 || defaults.seo_prompt_stage2,
      model: configs.seo_generation_model || defaults.seo_generation_model,
      temperature: parseFloat(configs.seo_generation_temperature || defaults.seo_generation_temperature),
      maxTokens: parseInt(configs.seo_generation_max_tokens || defaults.seo_generation_max_tokens),
    };

    return respData(result);
  } catch (error: any) {
    console.error('[GET SEO Config] Error:', error);
    return respErr(error.message);
  }
}

/**
 * POST /api/admin/seo/config
 * 保存 SEO 配置
 */
export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      throw new Error('unauthorized');
    }

    const body = await request.json() as {
      promptStage1: string;
      promptStage2: string;
      model: string;
      temperature: number;
      maxTokens: number;
    };
    const { promptStage1, promptStage2, model, temperature, maxTokens } = body;

    await setConfig('seo_prompt_stage1', promptStage1);
    await setConfig('seo_prompt_stage2', promptStage2);
    await setConfig('seo_generation_model', model);
    await setConfig('seo_generation_temperature', temperature.toString());
    await setConfig('seo_generation_max_tokens', maxTokens.toString());

    return respData({ success: true });
  } catch (error: any) {
    console.error('[POST SEO Config] Error:', error);
    return respErr(error.message);
  }
}

// ===== Default Prompts (V14.0 Two-Stage) =====

function getDefaultStage1Prompt() {
  return `# V14.0 STAGE 1: THE STRATEGIST (BLUEPRINT)

## OBJECTIVE
You are an Elite SEO Strategist. Your goal is to analyze the user's image prompt and create a "Content Blueprint" for a high-ranking Guide Page.
You do NOT write the content. You only decide WHAT should be written.

## INPUT
- User Image Prompt: {{prompt}}
- Model: {{model}}

## CRITICAL TASKS

1. **Extract ANCHOR**
   - Identify the single most specific SUBJECT (2-5 words).
   - "Neon Cyberpunk City" (Good) vs "Digital Art" (Bad).

2. **Identify MICRO-FOCUS**
   - Find a unique angle to differentiate this page from 1000s of others.
   - Example: "Vertical Perspective" or "Color Grading Technique".

3. **Determine INTENT**
   - Artistic / Functional / Commercial.

4. **Plan BLOCKS (The Meat)**
   - Decide which content blocks are needed to satisfy the user's intent.
   - ALWAYS include: 'rich-text' (Intro), 'tags' (Keywords).
   - CONDITIONALLY include:
     - 'faq-accordion': If the concept is technical or ambiguous.
     - 'checklist': If it's a "How-to" or "Use Case" scenario.
     - 'comparison-table': If there are clear alternatives (e.g. "Neon vs Pastel").

## OUTPUT FORMAT (Strict JSON)
{
  "anchor": "string",
  "microFocus": "string",
  "intent": "Artistic",
  "plannedBlocks": [
    { 
      "id": "block_1", 
      "type": "rich-text", 
      "intent": "Explain the core concept and visual appeal" 
    },
    { 
      "id": "block_2", 
      "type": "tags", 
      "intent": "List 10-15 LSI keywords for SEO" 
    }
  ]
}`;
}

function getDefaultStage2Prompt() {
  return `# V14.0 STAGE 2: THE WRITER (EXECUTION)

## OBJECTIVE
You are an Expert Technical Writer. Execute the Strategy Blueprint provided below to generate the final page content.

## INPUTS
- Strategy Blueprint: {{blueprint}}
- User Prompt: {{prompt}}

## TASKS

1. **Generate METADATA**
   - SEO Title (Click-worthy, includes Anchor).
   - H1 Title (Engaging).
   - Slug Keywords (Clean, URL-friendly).

2. **Execute BLOCKS**
   - For each block in 'plannedBlocks', generate the actual content.
   - **Type 'tags'**: Return an array of strings.
   - **Type 'checklist'**: Return title + array of items.
   - **Type 'faq-accordion'**: Return title + array of {q, a}.
   - **Type 'rich-text'**: Return title + markdown text.

## OUTPUT FORMAT (Strict JSON)
{
  "seoTitle": "string",
  "h1Title": "string",
  "seoDescription": "string",
  "seoKeywords": ["string"],
  "imageAlt": "string",
  "slugKeywords": "string",
  "contentSections": [
    {
      "id": "block_1",
      "type": "rich-text",
      "title": "The Art of [Anchor]",
      "headingLevel": "h2",
      "data": { "text": "Markdown content..." }
    },
    {
      "id": "block_2",
      "type": "tags",
      "title": "Visual Elements",
      "headingLevel": "h3",
      "data": { "items": ["Tag1", "Tag2"] }
    }
  ]
}`;
}

/**
 * 获取默认的 SEO 生成 Prompt 模板
 * V14.0 - Micro-Focus & ContentSections
 */
function getDefaultPrompt(): string {
  return `# SEO Generation Prompt (V14.0 - Micro-Focus & Dynamic Sections)

## 🎯 CORE OBJECTIVE
Transform this AI image prompt into a high-ranking, differentiated Guide Page.
You MUST output strict JSON matching the schema below.

---

## PHASE 1: ANCHOR & MICRO-FOCUS EXTRACTION (CRITICAL!)

### Step 1.1: Extract ANCHOR (The Core Subject)
- Extract the single most specific SUBJECT from the User Prompt.
- MUST be 2-5 words describing the SPECIFIC SCENE, not a generic category.
- ⛔ BANNED: "Illustration", "Portrait", "Landscape", "3D Render", "Design", "Art"
- ✅ EXAMPLES: "Neon Rain Cyberpunk Warrior", "Inflatable Fluffy Logo", "Golden Hour Beach Portrait"

### Step 1.2: Extract MICRO-FOCUS (The Unique Angle) 
⚠️ THIS IS THE KEY TO AVOIDING SEO CANNIBALIZATION!
- Identify a unique "Micro-Angle" that differentiates THIS page from similar topics.
- The entire guide must lean into this Micro-Focus.
- EXAMPLES:
  * Anchor: "Cyberpunk Street" → Micro-Focus: "Neon Reflection Physics"
  * Anchor: "Noir Portrait" → Micro-Focus: "Shadow Gradient Mastery"
  * Anchor: "Watercolor Landscape" → Micro-Focus: "Wet-on-Wet Blending Technique"

### Step 1.3: Intent Classification
Classify the prompt's Visual Intent into ONE category:
- **ARTISTIC**: Photography, 3D Renders, Art, Character Design
- **FUNCTIONAL**: Slides, Posters, Infographics, UI Screens
- **COMMERCIAL**: Product shots, Marketing materials, Ads

---

## PHASE 2: CONTENT SECTION PLANNING

Based on Intent, select 3-5 Content Sections from these types:
- **rich-text**: Explanatory paragraph (use for intro/analysis)
- **faq-accordion**: Q&A format (use for common questions)
- **checklist**: Bullet points with checkmarks (use for requirements/elements)
- **comparison-table**: Pro/Con or A vs B format (use for technique comparisons)

⚠️ VISUAL VARIETY RULE:
- You MUST use at least 3 DIFFERENT types.
- NO "Wall of Text": Do NOT use 'rich-text' twice in a row.

---

## PHASE 3: CONTENT GENERATION RULES

### Negative Constraints (STRICTLY FORBIDDEN!)
⛔ NEVER use these generic words in titles:
- "Key Elements", "Use Cases", "Introduction", "Tips", "Conclusion", "Best Practices"

✅ USE semantic synonyms instead:
- Instead of "Key Elements" → "[Micro-Focus] Essentials", "Visual Components", "Core Anatomy"
- Instead of "Tips" → "Pro Techniques", "Mastery Notes", "[Subject] Secrets"
- Instead of "FAQ" → "Common Questions about [Micro-Focus]", "Troubleshooting [Subject]"

### Tone
Write like an expert art curator, not a robot. Be evocative and specific.

---

## PHASE 4: OUTPUT FORMAT (STRICT JSON)

Output a single valid JSON object with this structure:

\`\`\`json
{
  "detectedLanguage": "en",
  "category": "ARTISTIC | FUNCTIONAL | COMMERCIAL",
  "anchor": "2-5 word core subject",
  "microFocus": "unique angle for this page",
  
  "seoTitle": "[Anchor]: [Micro-Focus] Guide - {{model}} Prompt | Your Brand",
  "h1Title": "[Anchor]: Mastering [Micro-Focus]",
  "seoDescription": "Curator-like description mentioning {{model}} prompt and the Micro-Focus.",
  "seoKeywords": "comma-separated, 5-8 LSI keywords including Micro-Focus",
  "seoSlugKeywords": "kebab-case-slug-no-model-name",
  
  "contentIntro": "2-3 sentence intro that hooks the reader and mentions Micro-Focus.",
  "promptBreakdown": "One concise sentence listing core elements.",
  "imageAlt": "Natural description: [Anchor] + [Style].",
  
  "contentSections": [
    {
      "id": "sec_1",
      "type": "rich-text",
      "title": "[Evocative title mentioning Micro-Focus]",
      "headingLevel": "h2",
      "data": { "text": "Detailed explanatory content..." }
    },
    {
      "id": "sec_2", 
      "type": "checklist",
      "title": "[Micro-Focus] Essentials",
      "headingLevel": "h2",
      "data": { "items": ["Item 1", "Item 2", "Item 3"] }
    },
    {
      "id": "sec_3",
      "type": "faq-accordion",
      "title": "Mastering [Micro-Focus]: Common Questions",
      "headingLevel": "h2",
      "data": { 
        "items": [
          { "q": "Question about technique?", "a": "Detailed answer..." },
          { "q": "Question about settings?", "a": "Detailed answer..." },
          { "q": "Question about variations?", "a": "Detailed answer..." }
        ]
      }
    }
  ],
  
  "dynamicHeaders": {
    "about": "Narrative H2 (e.g., 'Capturing [Micro-Focus] Elegance')",
    "breakdown": "Technique-focused H2 (e.g., 'Deconstructing [Micro-Focus]')",
    "analysis": "Storytelling H2 (e.g., 'Reading the [Anchor] Narrative')",
    "faq": "Expertise-angle H2 (e.g., 'Expert Notes on [Micro-Focus]')"
  },
  
  "faqItems": [
    { "question": "Same as contentSections FAQ q", "answer": "Same as contentSections FAQ a" }
  ],
  
  "visualTags": ["Tag1", "Tag2", "Tag3"],
  "useCases": ["Use case 1", "Use case 2"],
  
  "expertCommentary": {
    "whyItWorks": "Technical analysis (2-3 sentences)",
    "optimizationTips": "Practical advice (2-3 sentences)",
    "modelAdvantage": "Why {{model}} excels (1-2 sentences)"
  },
  
  "remixIdeas": ["Change X to Y for Z effect", "..."],
  "relatedConcepts": ["Broad Concept 1", "Broad Concept 2"],
  
  "subject": "Same as anchor (for backward compatibility)"
}
\`\`\`

{{optimizationContext}}

# User Input:
Prompt: {{prompt}}
Model: {{model}}
Core Subject: {{subject}}`;
}