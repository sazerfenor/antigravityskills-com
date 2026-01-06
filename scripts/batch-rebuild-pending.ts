/**
 * 批量处理 Pending 帖子脚本
 *
 * 完整流程：
 * 1. 查询所有 pending 状态的帖子
 * 2. Intent 分析 → 生成 Schema 和 formValues
 * 3. Compile PLO → 生成 native/english prompt
 * 4. 生成图片（模型: gemini-3-pro-image-preview, 比例: 1:1）
 * 5. 生成 SEO 内容（Two-Stage: Strategist + Writer）
 * 6. 更新帖子并发布（status: published）
 *
 * 使用方法：
 * pnpm tsx scripts/batch-rebuild-pending.ts --dry-run       # 预览模式
 * pnpm tsx scripts/batch-rebuild-pending.ts                 # 执行处理
 * pnpm tsx scripts/batch-rebuild-pending.ts --limit 10      # 限制数量
 * pnpm tsx scripts/batch-rebuild-pending.ts --post-id <id>  # 处理单篇
 */

import { eq } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { analyzeIntent } from '@/shared/services/intent-analyzer';
import { compilePLO } from '@/shared/services/compiler';
import { getAIService } from '@/shared/services/ai';
import { AIMediaType } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
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

// 锁死配置
const FIXED_MODEL = 'gemini-3-pro-image-preview';
const FIXED_ASPECT_RATIO = '1:1';

// 延迟配置（避免 API 限流）
const DELAY_BETWEEN_POSTS = 5000; // 5秒

interface PendingPost {
  id: string;
  prompt: string | null;
  model: string | null;
  seoSlug: string | null;
  userId: string;
  createdAt: Date | null;
}

interface ProcessResult {
  postId: string;
  slug: string | null;
  status: 'success' | 'error' | 'skipped';
  message: string;
  newImageUrl?: string;
}

/**
 * 查询 pending 帖子
 */
async function getPendingPosts(): Promise<PendingPost[]> {
  const database = db();

  if (SINGLE_POST_ID) {
    const posts = await database
      .select({
        id: communityPost.id,
        prompt: communityPost.prompt,
        model: communityPost.model,
        seoSlug: communityPost.seoSlug,
        userId: communityPost.userId,
        createdAt: communityPost.createdAt,
      })
      .from(communityPost)
      .where(eq(communityPost.id, SINGLE_POST_ID));

    return posts;
  }

  const posts = await database
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      model: communityPost.model,
      seoSlug: communityPost.seoSlug,
      userId: communityPost.userId,
      createdAt: communityPost.createdAt,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'pending'))
    .orderBy(communityPost.createdAt);

  return LIMIT ? posts.slice(0, LIMIT) : posts;
}

/**
 * 从 Schema 提取 formValues
 */
function extractFormValues(schema: any): Record<string, any> {
  const formValues: Record<string, any> = {};

  if (!schema?.fields || !Array.isArray(schema.fields)) {
    return formValues;
  }

  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      formValues[field.id] = field.defaultValue;
    } else if (field.type === 'slider') {
      formValues[field.id] =
        field.min !== undefined && field.max !== undefined
          ? (field.min + field.max) / 2
          : 0.5;
    } else if (field.type === 'toggle') {
      formValues[field.id] = false;
    } else if (field.type === 'select' && field.options?.length > 0) {
      formValues[field.id] = field.options[0];
    }
  }

  return formValues;
}

/**
 * 构建 PLO 对象
 */
function buildPLO(schema: any, formValues: Record<string, any>, userPrompt: string) {
  const subject = formValues.subject || schema.context || userPrompt.slice(0, 50);

  const narrativeParams: Record<string, { value: string; strength: number }> = {};

  for (const [key, value] of Object.entries(formValues)) {
    if (key === 'subject' || key === 'action') continue;

    if (typeof value === 'number') {
      narrativeParams[key] = { value: String(value), strength: value };
    } else if (typeof value === 'string') {
      narrativeParams[key] = { value, strength: 0.7 };
    } else if (typeof value === 'boolean') {
      narrativeParams[key] = { value: value ? 'enabled' : 'disabled', strength: value ? 1 : 0 };
    }
  }

  return {
    core: {
      subject,
      action: formValues.action || '',
    },
    narrative_params: narrativeParams,
    layout_constraints: {
      ar: FIXED_ASPECT_RATIO,
      text_render: false,
    },
    sync_status: 'linked' as const,
    custom_input: userPrompt,
    preserved_details: schema.preservedDetails || [],
  };
}

/**
 * Safe JSON Parse
 */
function safeParseJSON(text: string): any {
  text = text.trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[1] || match[0]);
      } catch (inner: unknown) {
        throw new Error('Found JSON-like block but failed to parse');
      }
    }
    throw new Error('No valid JSON object found in response');
  }
}

/**
 * 序列化 formValues 为 VISUAL CONTEXT
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
The user explicitly configured the following parameters.
These are FACTS, not inferences.

${lines.join('\n')}`;
}

/**
 * 生成 SEO 内容
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

  const toTitleCase = (str: string) => str.replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    seoTitle: stage2Result.seoTitle,
    h1Title: stage2Result.h1Title || stage2Result.seoTitle?.replace(' | Banana Prompts', ''),
    seoDescription: stage2Result.seoDescription,
    seoKeywords: stage2Result.seoKeywords,
    imageAlt: stage2Result.imageAlt,
    contentSections: validatedSections,
    anchor: stage1Result.anchor,
    microFocus: stage1Result.microFocus,
    subject: toTitleCase(stage1Result.anchor || 'AI Image'),
    faqItems: JSON.stringify(faqItemsForLegacy),
    visualTags: JSON.stringify(visualTagsForLegacy),
    snippetSummary: stage2Result.snippetSummary || null,
    seoSlugKeywords: stage2Result.slugKeywords || stage2Result.seoSlugKeywords,
  };
}

/**
 * 生成 SEO Slug
 */
function generateSeoSlug(anchor: string, postId: string): string {
  const cleanSlug = anchor
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);

  const shortId = postId.replace(/-/g, '').slice(-8);
  return `${cleanSlug}-${shortId}`;
}

/**
 * 处理单个帖子
 */
async function processPost(post: PendingPost): Promise<ProcessResult> {
  const { id, prompt, seoSlug, userId } = post;

  if (!prompt) {
    return { postId: id, slug: seoSlug, status: 'skipped', message: 'No prompt found' };
  }

  console.log(`\n  🔄 处理: ${seoSlug || id.slice(0, 8)}`);
  console.log(`     Prompt: ${prompt.slice(0, 50)}...`);

  try {
    // ========== Step 1: Intent Analysis ==========
    console.log('     [1/5] Intent 分析...');
    const schema = await analyzeIntent(prompt);

    if (!schema) {
      return { postId: id, slug: seoSlug, status: 'error', message: 'Intent analysis failed' };
    }

    console.log(`     ✅ Schema: ${schema.fields?.length || 0} 个字段`);

    const formValues = extractFormValues(schema);

    // ========== Step 2: Compile PLO ==========
    console.log('     [2/5] Compile Prompt...');
    const plo = buildPLO(schema, formValues, prompt);
    const { native, english, detectedLang, highlights } = await compilePLO(plo);

    console.log(`     ✅ 编译成功 (${detectedLang})`);

    if (DRY_RUN) {
      console.log('     ⏭️ [Dry Run] 跳过后续步骤');
      return { postId: id, slug: seoSlug, status: 'success', message: 'Dry run - would process' };
    }

    // ========== Step 3: Generate Image ==========
    console.log(`     [3/5] 生成图片 (${FIXED_MODEL}, ${FIXED_ASPECT_RATIO})...`);

    const aiService = await getAIService();
    const geminiProvider = aiService.getProvider('gemini');

    if (!geminiProvider) {
      return { postId: id, slug: seoSlug, status: 'error', message: 'Gemini provider not found' };
    }

    const generateParams = {
      mediaType: AIMediaType.IMAGE,
      model: FIXED_MODEL,
      prompt: english,
      options: {
        imageSize: '1K' as const,
        aspectRatio: FIXED_ASPECT_RATIO,
      },
    };

    const result = await geminiProvider.generate({ params: generateParams });

    if (!result?.taskInfo?.images?.[0]?.imageUrl) {
      return { postId: id, slug: seoSlug, status: 'error', message: 'Image generation failed' };
    }

    const newImageUrl = result.taskInfo.images[0].imageUrl;
    console.log(`     ✅ 图片: ${newImageUrl.slice(0, 50)}...`);

    // 创建 AI Task 记录
    const newAITaskId = getUuid();
    const newAITask: NewAITask = {
      id: newAITaskId,
      userId: userId,
      mediaType: AIMediaType.IMAGE,
      provider: 'gemini',
      model: FIXED_MODEL,
      prompt: english,
      scene: 'text-to-image',
      options: JSON.stringify(generateParams.options),
      status: 'completed',
      costCredits: 0,
      taskId: result.taskId,
      imageUrl: newImageUrl,
    };

    await createAITask(newAITask);

    // ========== Step 4: Generate SEO ==========
    console.log('     [4/5] 生成 SEO...');
    const seoContent = await generateSEOContent(english, formValues, schema);
    console.log(`     ✅ SEO: ${seoContent.contentSections?.length || 0} 个区块`);

    // 生成 SEO Slug
    const newSeoSlug = seoSlug || generateSeoSlug(seoContent.anchor || 'ai-image', id);

    // ========== Step 5: Update Post ==========
    console.log('     [5/5] 更新帖子并发布...');

    const newParams = {
      version: 2,
      formValues,
      schema: {
        context: schema.context,
        fields: schema.fields,
      },
      promptHighlights: highlights || { native: [], english: [] },
      originalInput: prompt,
      promptNative: native,
      promptEnglish: english,
      detectedLang: detectedLang,
      model: FIXED_MODEL,
      aspectRatio: FIXED_ASPECT_RATIO,
      scene: 'text-to-image',
    };

    await updateCommunityPostById(id, {
      // 图片数据
      params: JSON.stringify(newParams),
      prompt: english,
      imageUrl: newImageUrl,
      thumbnailUrl: newImageUrl,
      aiTaskId: newAITaskId,
      model: FIXED_MODEL,

      // SEO 数据
      seoSlug: newSeoSlug,
      seoTitle: seoContent.seoTitle,
      h1Title: seoContent.h1Title,
      seoDescription: seoContent.seoDescription,
      seoKeywords: seoContent.seoKeywords,
      imageAlt: seoContent.imageAlt,
      contentSections: seoContent.contentSections,
      anchor: seoContent.anchor,
      microFocus: seoContent.microFocus,
      faqItems: seoContent.faqItems,
      visualTags: seoContent.visualTags,
      snippetSummary: seoContent.snippetSummary,

      // 发布
      status: 'published',
      updatedAt: new Date(),
    });

    console.log('     ✅ 发布成功');

    return {
      postId: id,
      slug: newSeoSlug,
      status: 'success',
      message: 'Published',
      newImageUrl,
    };

  } catch (error: any) {
    console.error(`     ❌ 错误: ${error.message}`);
    return { postId: id, slug: seoSlug, status: 'error', message: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 批量处理 Pending 帖子脚本');
  console.log('='.repeat(60));
  console.log(`   模型: ${FIXED_MODEL}`);
  console.log(`   比例: ${FIXED_ASPECT_RATIO}`);

  if (DRY_RUN) {
    console.log('\n⚠️  预览模式 (--dry-run): 不会执行实际操作\n');
  } else {
    console.log('\n⚠️  执行模式: 将处理帖子并发布\n');
  }

  console.log('📊 查询 pending 帖子...');
  const posts = await getPendingPosts();

  if (posts.length === 0) {
    console.log('\n🎉 没有 pending 帖子！');
    await closeDb();
    return;
  }

  console.log(`\n📋 找到 ${posts.length} 篇 pending 帖子:\n`);

  posts.slice(0, 20).forEach((post, i) => {
    console.log(`  ${i + 1}. ${post.seoSlug || post.id.slice(0, 8)}`);
  });
  if (posts.length > 20) {
    console.log(`  ... 还有 ${posts.length - 20} 篇`);
  }

  console.log('\n' + '─'.repeat(60));

  if (!DRY_RUN) {
    console.log('\n⚠️  即将开始处理，按 Ctrl+C 取消...');
    console.log('   等待 5 秒后开始...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const results: ProcessResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] 处理: ${post.seoSlug || post.id}`);

    const result = await processPost(post);
    results.push(result);

    if (result.status === 'success') {
      successCount++;
    } else if (result.status === 'error') {
      errorCount++;
    }

    // 每10篇输出进度
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 进度: ${i + 1}/${posts.length} (成功: ${successCount}, 失败: ${errorCount})`);
    }

    // 延迟
    if (i < posts.length - 1 && !DRY_RUN) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_POSTS));
    }
  }

  // 输出统计
  console.log('\n' + '='.repeat(60));
  console.log('📊 处理结果统计:\n');

  const skippedCount = results.filter(r => r.status === 'skipped').length;

  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ❌ 失败: ${errorCount}`);
  console.log(`  ⏭️ 跳过: ${skippedCount}`);

  if (errorCount > 0) {
    console.log('\n❌ 失败的帖子:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`  - ${r.slug || r.postId}: ${r.message}`));
  }

  console.log('\n' + '='.repeat(60));

  await closeDb();
}

// ===== Default Prompts (V15.0 Master Edition - 与后台 API 保持一致) =====

/**
 * Stage 1: Strategist - 提取 Anchor, MicroFocus, 规划 Blocks (V15.0 Master Edition)
 */
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

/**
 * Stage 2: Writer - 根据 Stage 1 策略生成内容 (V15.0 Master Edition)
 */
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
