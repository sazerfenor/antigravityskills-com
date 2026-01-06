/**
 * 重新生成低质量 SEO 内容脚本
 *
 * 识别特征（之前用简化 Prompt 生成的帖子）：
 * 1. contentSections 数组只有 1-2 个 block
 * 2. 缺少多样化的 block 类型（只有 rich-text）
 * 3. 没有 snippetSummary 字段
 *
 * 使用方法：
 * pnpm tsx scripts/regenerate-low-quality-seo.ts --dry-run       # 预览模式（只统计）
 * pnpm tsx scripts/regenerate-low-quality-seo.ts                 # 执行重新生成
 * pnpm tsx scripts/regenerate-low-quality-seo.ts --limit 10      # 限制数量
 * pnpm tsx scripts/regenerate-low-quality-seo.ts --post-id <id>  # 处理单篇
 */

import { eq, and, isNotNull } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { getAIService } from '@/shared/services/ai';
import { updateCommunityPostById } from '@/shared/models/community_post';
import { getConfigsByKeys } from '@/shared/models/config';
import { contentSectionsSchema } from '@/shared/schemas/api-schemas';

// 命令行参数解析
const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_POST_ID = (() => {
  const idx = process.argv.indexOf('--post-id');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : null;
})();

// 延迟配置（避免 API 限流）
const DELAY_BETWEEN_POSTS = 3000; // 3秒

interface LowQualityPost {
  id: string;
  prompt: string | null;
  model: string | null;
  seoSlug: string | null;
  contentSections: any;
  snippetSummary: string | null;
  params: string | null;
}

/**
 * 判断是否为低质量 SEO 帖子
 */
function isLowQualitySEO(post: LowQualityPost): { isLow: boolean; reason: string } {
  // 解析 contentSections
  let sections: any[] = [];
  if (post.contentSections) {
    try {
      sections = typeof post.contentSections === 'string'
        ? JSON.parse(post.contentSections)
        : post.contentSections;
    } catch {
      return { isLow: true, reason: 'contentSections 解析失败' };
    }
  }

  // 检查 1: contentSections 为空或太少
  if (!sections || sections.length === 0) {
    return { isLow: true, reason: 'contentSections 为空' };
  }

  if (sections.length <= 2) {
    return { isLow: true, reason: `contentSections 只有 ${sections.length} 个 block` };
  }

  // 检查 2: 只有单一类型的 block
  const blockTypes = new Set(sections.map((s: any) => s.type));
  if (blockTypes.size === 1 && blockTypes.has('rich-text')) {
    return { isLow: true, reason: '只有 rich-text 类型的 block' };
  }

  // 检查 3: 缺少 snippetSummary（V15.0 特征）
  if (!post.snippetSummary) {
    return { isLow: true, reason: '缺少 snippetSummary (V15.0 特征)' };
  }

  return { isLow: false, reason: '' };
}

/**
 * 查询已发布的帖子
 */
async function getPublishedPosts(): Promise<LowQualityPost[]> {
  const database = db();

  if (SINGLE_POST_ID) {
    const posts = await database
      .select({
        id: communityPost.id,
        prompt: communityPost.prompt,
        model: communityPost.model,
        seoSlug: communityPost.seoSlug,
        contentSections: communityPost.contentSections,
        snippetSummary: communityPost.snippetSummary,
        params: communityPost.params,
      })
      .from(communityPost)
      .where(eq(communityPost.id, SINGLE_POST_ID));

    return posts;
  }

  let query = database
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      model: communityPost.model,
      seoSlug: communityPost.seoSlug,
      contentSections: communityPost.contentSections,
      snippetSummary: communityPost.snippetSummary,
      params: communityPost.params,
    })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        isNotNull(communityPost.prompt)
      )
    );

  const posts = await query;
  return posts;
}

/**
 * 序列化 formValues 到 VISUAL CONTEXT
 */
function serializeFormValuesToContext(
  formValues: Record<string, any> | null | undefined,
  schema?: { fields: Array<{ id: string; label: string; type?: string }> } | null
): string {
  if (!formValues || Object.keys(formValues).length === 0) {
    return '';
  }

  const getLabel = (key: string): string => {
    const field = schema?.fields?.find(f => f.id === key);
    if (field?.label) return field.label;
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      if (value >= 0 && value <= 1) return `${(value * 100).toFixed(0)}%`;
      return String(value);
    }
    if (Array.isArray(value)) return value.filter(Boolean).join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const lines = Object.entries(formValues)
    .filter(([_, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
    .map(([key, value]) => `- ${getLabel(key)}: ${formatValue(value)}`);

  if (lines.length === 0) return '';

  return `## VISUAL CONTEXT (GROUND TRUTH)
The user explicitly configured the following parameters in Vision Logic Playground.
These are FACTS, not inferences.

${lines.join('\n')}`;
}

/**
 * 安全解析 JSON
 */
function safeParseJSON(text: string): any {
  text = text.trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[1] || match[0]);
      } catch (inner: unknown) {
        throw new Error('Found JSON-like block but failed to parse: ' + (inner instanceof Error ? inner.message : String(inner)));
      }
    }
    throw new Error('No valid JSON object found in response');
  }
}

/**
 * 生成 SEO 内容（使用 V15.0 Master Edition Prompt）
 */
async function generateSEOContent(
  prompt: string,
  formValues: Record<string, any>,
  schema: any
): Promise<any> {
  const modelName = 'Nano Banana Pro';

  const configs = await getConfigsByKeys([
    'seo_prompt_stage1',
    'seo_prompt_stage2',
    'seo_generation_model',
    'seo_generation_temperature',
    'seo_generation_max_tokens',
  ]);

  const stage1Prompt = configs.seo_prompt_stage1 || getDefaultStage1Prompt();
  const stage2Prompt = configs.seo_prompt_stage2 || getDefaultStage2Prompt();
  const aiModel = configs.seo_generation_model || 'gemini-3.0-flash-preview';
  const temperature = parseFloat(configs.seo_generation_temperature || '0.7');
  const maxTokens = parseInt(configs.seo_generation_max_tokens || '2048');

  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini');

  if (!geminiProvider || !geminiProvider.chat) {
    throw new Error('Gemini provider not configured');
  }

  // 构建 effectivePrompt
  let effectivePrompt = prompt;
  const visualContext = serializeFormValuesToContext(formValues, schema);
  if (visualContext) {
    effectivePrompt = `${visualContext}\n\n---\n\n## USER PROMPT\n${effectivePrompt}`;
  }

  // Stage 1: Strategist
  const stage1PromptFinal = stage1Prompt
    .replace(/\{\{prompt\}\}/g, effectivePrompt)
    .replace(/\{\{model\}\}/g, modelName);

  const stage1Text = await geminiProvider.chat({
    model: aiModel,
    prompt: stage1PromptFinal,
    temperature: temperature,
    maxTokens: 1024,
    jsonMode: true,
  });

  if (!stage1Text) throw new Error('Stage 1: No response from AI');
  const stage1Result = safeParseJSON(stage1Text);

  // Stage 2: Writer
  const blueprintJson = JSON.stringify(stage1Result, null, 2);
  const stage2PromptFinal = stage2Prompt
    .replace(/\{\{prompt\}\}/g, effectivePrompt)
    .replace(/\{\{blueprint\}\}/g, blueprintJson);

  const stage2Text = await geminiProvider.chat({
    model: aiModel,
    prompt: stage2PromptFinal,
    temperature: temperature,
    maxTokens: maxTokens,
    jsonMode: true,
  });

  if (!stage2Text) throw new Error('Stage 2: No response from AI');
  const stage2Result = safeParseJSON(stage2Text);

  // Zod 校验
  let validatedSections = stage2Result.contentSections || [];
  if (stage2Result.contentSections && Array.isArray(stage2Result.contentSections)) {
    const validationResult = contentSectionsSchema.safeParse(stage2Result.contentSections);
    if (validationResult.success) {
      validatedSections = validationResult.data;
    }
  }

  // 提取 FAQ 和 Tags
  let faqItemsForLegacy: any[] = [];
  const faqSection = validatedSections.find((s: any) => s.type === 'faq-accordion');
  if (faqSection?.data?.items) {
    faqItemsForLegacy = faqSection.data.items.map((item: any) => ({
      question: item.q,
      answer: item.a,
    }));
  }

  let visualTagsForLegacy: string[] = [];
  const tagsSection = validatedSections.find((s: any) => s.type === 'tags');
  if (tagsSection?.data?.items) {
    visualTagsForLegacy = tagsSection.data.items;
  }

  return {
    seoTitle: stage2Result.seoTitle,
    h1Title: stage2Result.h1Title || stage2Result.seoTitle?.replace(' | Banana Prompts', ''),
    seoDescription: stage2Result.seoDescription,
    seoKeywords: stage2Result.seoKeywords,
    imageAlt: stage2Result.imageAlt,
    contentSections: validatedSections,
    snippetSummary: stage2Result.snippetSummary || null,
    faqItems: JSON.stringify(faqItemsForLegacy),
    visualTags: JSON.stringify(visualTagsForLegacy),
    anchor: stage1Result.anchor,
    microFocus: stage1Result.microFocus,
  };
}

/**
 * 处理单个帖子
 */
async function processPost(post: LowQualityPost): Promise<{ success: boolean; message: string }> {
  if (!post.prompt) {
    return { success: false, message: '没有 prompt' };
  }

  // 解析 params 获取 formValues 和 schema
  let formValues: Record<string, any> = {};
  let schema: any = null;

  if (post.params) {
    try {
      const params = JSON.parse(post.params);
      formValues = params.formValues || {};
      schema = params.schema || null;
    } catch {
      // 忽略解析错误
    }
  }

  // 生成新的 SEO 内容
  const seoContent = await generateSEOContent(post.prompt, formValues, schema);

  // 更新数据库
  await updateCommunityPostById(post.id, {
    seoTitle: seoContent.seoTitle,
    h1Title: seoContent.h1Title,
    seoDescription: seoContent.seoDescription,
    seoKeywords: Array.isArray(seoContent.seoKeywords)
      ? seoContent.seoKeywords.join(', ')
      : seoContent.seoKeywords,
    imageAlt: seoContent.imageAlt,
    contentSections: seoContent.contentSections,
    snippetSummary: seoContent.snippetSummary,
    faqItems: seoContent.faqItems,
    visualTags: seoContent.visualTags,
  });

  return {
    success: true,
    message: `已更新 SEO (${seoContent.contentSections?.length || 0} blocks)`,
  };
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🔍 识别低质量 SEO 帖子脚本');
  console.log('='.repeat(60));
  console.log(`模式: ${DRY_RUN ? '预览 (--dry-run)' : '执行'}`);
  if (SINGLE_POST_ID) console.log(`单篇处理: ${SINGLE_POST_ID}`);
  if (LIMIT) console.log(`限制数量: ${LIMIT}`);
  console.log();

  // 1. 查询所有已发布帖子
  console.log('📊 查询已发布帖子...');
  const allPosts = await getPublishedPosts();
  console.log(`  找到 ${allPosts.length} 个已发布帖子`);

  // 2. 过滤低质量 SEO 帖子
  const lowQualityPosts: Array<LowQualityPost & { reason: string }> = [];

  for (const post of allPosts) {
    const { isLow, reason } = isLowQualitySEO(post);
    if (isLow) {
      lowQualityPosts.push({ ...post, reason });
    }
  }

  console.log(`  识别到 ${lowQualityPosts.length} 个低质量 SEO 帖子`);
  console.log();

  // 3. 显示统计
  const reasonCounts: Record<string, number> = {};
  for (const post of lowQualityPosts) {
    reasonCounts[post.reason] = (reasonCounts[post.reason] || 0) + 1;
  }

  console.log('📈 问题分布:');
  for (const [reason, count] of Object.entries(reasonCounts)) {
    console.log(`  - ${reason}: ${count} 个`);
  }
  console.log();

  // 4. 如果是 dry-run 模式，只显示列表
  if (DRY_RUN) {
    console.log('📋 低质量 SEO 帖子列表 (前 20 个):');
    for (const post of lowQualityPosts.slice(0, 20)) {
      console.log(`  - ${post.seoSlug || post.id}: ${post.reason}`);
    }
    console.log();
    console.log('✅ 预览完成。使用不带 --dry-run 的命令来执行重新生成。');
    await closeDb();
    return;
  }

  // 5. 执行重新生成
  const postsToProcess = LIMIT ? lowQualityPosts.slice(0, LIMIT) : lowQualityPosts;
  console.log(`🚀 开始重新生成 ${postsToProcess.length} 个帖子的 SEO...`);
  console.log();

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < postsToProcess.length; i++) {
    const post = postsToProcess[i];
    const progress = `[${i + 1}/${postsToProcess.length}]`;

    try {
      console.log(`${progress} 处理: ${post.seoSlug || post.id}`);
      const result = await processPost(post);

      if (result.success) {
        console.log(`  ✅ ${result.message}`);
        successCount++;
      } else {
        console.log(`  ⚠️ 跳过: ${result.message}`);
      }
    } catch (error: any) {
      console.log(`  ❌ 错误: ${error.message}`);
      errorCount++;
    }

    // 延迟避免限流
    if (i < postsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_POSTS));
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('📊 处理完成');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${errorCount}`);
  console.log('='.repeat(60));

  await closeDb();
}

// ===== Default Prompts (V15.0 Master Edition) =====

function getDefaultStage1Prompt(): string {
  return `# V15.0 STAGE 1: THE STRATEGIST (MASTER EDITION)

## OBJECTIVE
You are an Elite SEO Strategist. Analyze the user's image prompt and create a "Content Blueprint" for a high-ranking Guide Page.
**GOAL**: Create a rich, comprehensive structure that satisfies User Intent and SEO Depth.

## PRIORITY RULE ⚠️
If a "## VISUAL CONTEXT (GROUND TRUTH)" section exists in the input:
1. These parameters are FACTS, not suggestions
2. ANCHOR and MICRO-FOCUS MUST reflect these parameters
3. Apply CONFLICT RESOLUTION PROTOCOL when Form conflicts with Prompt text

## CONFLICT RESOLUTION PROTOCOL
When VISUAL CONTEXT (Form) conflicts with User Prompt text:

| Attribute | Priority | Reason |
|-----------|----------|--------|
| Art Style, Lighting, Stylization | **Form wins** | User explicitly configured |
| Subject, Scene, Background | **Prompt wins** | Creative intent |
| Mood, Atmosphere | **Combine both** | Complementary |

## INPUT
{{prompt}}
- Model: {{model}}
- **LANGUAGE**: Auto-detect from the prompt. Output MUST be in the same language.

## CRITICAL TASKS

### 1. REASONING (Optional but Recommended)
Explain your analysis in \`_reasoning\`:
- \`contextAnalysis\`: What does VISUAL CONTEXT tell us?
- \`conflictResolution\`: Any conflicts between Form and Prompt? How resolved?
- \`microFocusSelection\`: Which parameter is most distinctive? Why?
- \`voiceSelection\`: Which Persona fits the Intent?

### 2. Extract ANCHOR (2-5 words)
- If VISUAL CONTEXT exists: Combine [Style from Form] + [Subject from Prompt]
- Rules:
  - ❌ Bad: "Digital Art", "Portrait" (Too Generic)
  - ✅ Good: "Anime Golden Dress Portrait", "Neon Cyberpunk City"
- **If prompt < 5 words**: Use full prompt as Anchor.

### 3. Identify MICRO-FOCUS
- Use the most distinctive parameter from VISUAL CONTEXT
- Examples: "Golden Hour Lighting", "Cel-Shading Technique", "Glassmorphism Effect"
- This is KEY to avoiding SEO cannibalization!

### 4. Determine INTENT & Suggest VOICE
- **ARTISTIC** → Curator Voice (Gallery curator tone, emphasize aesthetics)
- **FUNCTIONAL** → Engineer Voice (Technical documentation, precise specs)
- **COMMERCIAL** → Director Voice (Marketing narrative, use cases, brand mentions)

### 5. Plan BLOCKS (4-6 blocks, 3+ types)
- **CONSTRAINT**: Plan **4 to 6 blocks**.
- **VARIETY RULE**: Use at least **3 DIFFERENT** block types.
- **NO TEMPLATES**: Do not always use "Intro -> Tags -> FAQ". Mix it up!

**Available Block Types**:
- \`rich-text\`: Deep Analysis / Storytelling. (Max 2, NEVER consecutive).
- \`checklist\`: Elements (Artistic), Specs (Functional), Layout (Commercial).
- \`comparison-table\`: "Style A vs B" or "Do's and Don'ts".
- \`faq-accordion\`: Technical Q&A. (Max 1).
- \`tags\`: **5-8** strictly visual keywords. (Max 1).

## OUTPUT FORMAT (Strict JSON)
{
  "_reasoning": {
    "contextAnalysis": "VISUAL CONTEXT shows art_style=anime, lighting=golden_hour...",
    "conflictResolution": "No conflicts detected / Form specifies anime, using over prompt text...",
    "microFocusSelection": "Golden Hour is the most distinctive parameter because...",
    "voiceSelection": "Artistic intent detected, recommending Curator voice..."
  },
  "anchor": "string (2-5 words)",
  "microFocus": "string (unique angle)",
  "intent": "Artistic | Functional | Commercial",
  "suggestedVoice": "Curator | Engineer | Director",
  "language": "en | zh | ja | ...",
  "plannedBlocks": [
    { "id": "block_1", "type": "rich-text", "intent": "Explain the core concept..." },
    { "id": "block_2", "type": "checklist", "intent": "List 5 essential components..." },
    { "id": "block_3", "type": "comparison-table", "intent": "Compare attributes..." },
    { "id": "block_4", "type": "tags", "intent": "List 5-8 descriptive keywords..." }
  ],
  "antiTemplatingCommitment": {
    "blocksStartWith": "checklist",
    "blocksEndWith": "faq-accordion",
    "noConsecutiveRichText": true
  }
}

## ERROR FALLBACK
If unable to extract subject, return:
{ "error": true, "fallbackAnchor": "AI Image", "fallbackMicroFocus": "Creative Style" }`;
}

function getDefaultStage2Prompt(): string {
  return `# V15.0 STAGE 2: THE WRITER (MASTER EDITION)

## OBJECTIVE
You are an Expert Technical Writer. Execute the Strategy Blueprint to generate final content.

## VOICE PERSONA SYSTEM
Adapt your writing style based on the \`suggestedVoice\` from the Blueprint:

### If Curator (Artistic Intent)
Write as an art gallery curator. Use evocative language, reference art movements, emphasize emotional impact.
- Opening: "The [Anchor] captures..."
- Analysis: "The interplay of [MicroFocus] creates..."
- Avoid: Technical jargon, bullet lists, imperative commands

### If Engineer (Functional Intent)
Write as a technical documentation author. Be precise, use numbered steps, include parameter references.
- Opening: "To achieve [Anchor], configure..."
- Analysis: "The [MicroFocus] setting controls..."
- Avoid: Subjective adjectives, emotional language

### If Director (Commercial Intent)
Write as a marketing creative director. Focus on use cases, brand mentions, call-to-action.
- Opening: "[Anchor] transforms your..."
- Analysis: "With [MicroFocus], you can..."
- Avoid: Technical details, lengthy explanations

**TONE by Model**:
- **Nano Banana Pro**: Professional, Technical, highlighting advanced features.
- **FLUX**: Photorealistic, focusing on lighting and texture.
- **Default**: Creative and balanced.

## INPUTS
- Strategy Blueprint: {{blueprint}}
- User Prompt: {{prompt}}

## VALIDATION & RECOVERY
- If \`plannedBlocks\` has < 4 items: Add 1 \`rich-text\` block about "Usage Tips".
- If \`plannedBlocks\` > 6 items: Merge similar blocks.

## SEO CONSTRAINTS (STRICT)

1. **Title Tag**: 50-60 characters MAX. Must include Anchor.
   - ✅ "[Anchor]: Master [MicroFocus] with Nano Banana"

2. **Meta Description**: 140-160 characters. Must include Anchor & CTA.

3. **Keywords**: EXACTLY 5-8 items.
   - MUST be **visible elements**. ⛔ NO abstract concepts ("Success", "Happiness").
   - Examples: Photo: "Bokeh", "85mm Lens"; UI: "Rounded Corners", "Dark Mode"; Anime: "Cel Shading".

4. **Brand Injection**:
   - Mention "Nano Banana" naturally in the \`rich-text\` intro or \`faq\` (once per section max).

5. **Anti-Templating (MANDATORY)**:
   ⛔ BANNED PATTERNS:
   - Generic titles: "Introduction", "Conclusion", "Keywords", "FAQ", "Key Elements"
   - Opening phrases: "This stunning image...", "In this guide...", "Let's explore..."
   - Two consecutive \`rich-text\` blocks

   ✅ REQUIRED PATTERNS:
   - Titles MUST include Anchor or MicroFocus: "Deconstructing [Anchor]'s Visual Language"
   - Opening MUST be specific: "The [Anchor] achieves its [Effect] through..."

6. **Slug**: 3-5 words, kebab-case, no model name.

7. **Snippet Summary (V15.0 GEO Formula)**:
   Generate a 50-80 word summary for AI search engines using this formula:
   "To generate [Anchor] in [Style], the [Model] utilizes [Key Param from VISUAL CONTEXT].
   This technique achieves [Visual Effect] by [Technical Method from MicroFocus]."

   **Constraints**:
   - 50-80 words ONLY
   - MUST include: Anchor, Model Name, at least 2 parameters from VISUAL CONTEXT
   - MUST mention MicroFocus technique
   - NO marketing fluff ("stunning", "amazing", "beautiful")
   - MUST be factual and actionable

## OUTPUT FORMAT (Strict JSON)

⚠️ CRITICAL: The "data" field format must EXACTLY match these examples:

{
  "_reasoning": "Optional: explain creative decisions based on Voice Persona",
  "seoTitle": "string (Max 60 chars)",
  "h1Title": "string (Unique & Engaging)",
  "seoDescription": "string (140-160 chars)",
  "seoKeywords": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
  "imageAlt": "string (Natural description)",
  "slugKeywords": "string (kebab-case, 3-5 words)",
  "snippetSummary": "string (50-80 words, GEO formula)",
  "contentSections": [
    {
      "id": "block_1",
      "type": "rich-text",
      "title": "Descriptive H2 Title (must include Anchor or MicroFocus)",
      "headingLevel": "h2",
      "data": { "text": "Markdown paragraph content here. Must be in 'text' field." }
    },
    {
      "id": "block_2",
      "type": "checklist",
      "title": "[MicroFocus] Essentials",
      "headingLevel": "h3",
      "data": { "items": ["Item 1", "Item 2", "Item 3"] }
    },
    {
      "id": "block_3",
      "type": "tags",
      "title": "Visual Keywords",
      "headingLevel": "h3",
      "data": { "items": ["Keyword1", "Keyword2", "Keyword3"] }
    },
    {
      "id": "block_4",
      "type": "comparison-table",
      "title": "[Anchor] Style Comparison",
      "headingLevel": "h3",
      "data": {
        "left": "Option A",
        "right": "Option B",
        "rows": [
          { "pro": "Warm tones", "con": "Cool tones" },
          { "pro": "Soft lighting", "con": "Hard lighting" }
        ]
      }
    },
    {
      "id": "block_5",
      "type": "faq-accordion",
      "title": "Mastering [MicroFocus]: Common Questions",
      "headingLevel": "h3",
      "data": {
        "items": [
          { "q": "How to achieve this effect?", "a": "Use Nano Banana with these settings..." },
          { "q": "What model works best?", "a": "For this style, we recommend..." }
        ]
      }
    }
  ]
}`;
}

main().catch(async (error) => {
  console.error('❌ 脚本执行失败:', error);
  await closeDb();
  process.exit(1);
});
