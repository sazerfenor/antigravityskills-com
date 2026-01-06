/**
 * 自动 SEO 生成并发布脚本
 *
 * 功能：
 * 1. 查询需要生成 SEO 的帖子（12月28日之前创建，contentSections 为空）
 * 2. 调用 AI 生成 SEO 内容（Two-Stage: Strategist + Writer）
 * 3. 保存 SEO 数据到数据库
 * 4. 确保帖子状态为 published
 *
 * 使用方法：
 * pnpm tsx scripts/auto-seo-and-publish.ts --dry-run       # 预览模式
 * pnpm tsx scripts/auto-seo-and-publish.ts                 # 执行生成
 * pnpm tsx scripts/auto-seo-and-publish.ts --post-id <id>  # 生成单篇
 * pnpm tsx scripts/auto-seo-and-publish.ts --limit 3       # 限制数量
 */

import { and, eq, sql, isNull } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { updateCommunityPostById } from '@/shared/models/community_post';
import { getAIService } from '@/shared/services/ai';
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

interface LegacyPost {
  id: string;
  prompt: string | null;
  model: string | null;
  seoSlug: string | null;
  imageUrl: string | null;
  params: string | null;
  userId: string;
  createdAt: Date | null;
}

interface SEOResult {
  postId: string;
  slug: string | null;
  status: 'success' | 'error' | 'skipped';
  message: string;
}

/**
 * 查询需要生成 SEO 的帖子
 */
async function getPostsNeedingSEO(): Promise<LegacyPost[]> {
  const database = db();

  // 如果指定了单个帖子 ID
  if (SINGLE_POST_ID) {
    const posts = await database
      .select({
        id: communityPost.id,
        prompt: communityPost.prompt,
        model: communityPost.model,
        seoSlug: communityPost.seoSlug,
        imageUrl: communityPost.imageUrl,
        params: communityPost.params,
        userId: communityPost.userId,
        createdAt: communityPost.createdAt,
      })
      .from(communityPost)
      .where(eq(communityPost.id, SINGLE_POST_ID));

    return posts;
  }

  // 查找 12 月 28 日之前创建的、contentSections 为空的帖子
  const posts = await database
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      model: communityPost.model,
      seoSlug: communityPost.seoSlug,
      imageUrl: communityPost.imageUrl,
      params: communityPost.params,
      userId: communityPost.userId,
      createdAt: communityPost.createdAt,
    })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        sql`${communityPost.createdAt} < '2025-12-28'`,
        isNull(communityPost.contentSections)
      )
    )
    .orderBy(communityPost.createdAt);

  return LIMIT ? posts.slice(0, LIMIT) : posts;
}

/**
 * 从 params 提取 formValues 和 schema
 */
function extractFormValuesData(params: string | null): { formValues: Record<string, any> | null; schema?: any } | null {
  if (!params) return null;

  try {
    const parsed = typeof params === 'string' ? JSON.parse(params) : params;
    if (parsed?.formValues && Object.keys(parsed.formValues).length > 0) {
      return {
        formValues: parsed.formValues,
        schema: parsed.schema || null,
      };
    }
  } catch (e) {
    console.warn('     ⚠️ 解析 params 失败');
  }

  return null;
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
The user explicitly configured the following parameters in Vision Logic Playground.
These are FACTS, not inferences. Prioritize these over any interpretation from the prompt text.

${lines.join('\n')}`;
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
 * 生成 SEO 内容
 */
async function generateSEOContent(
  prompt: string,
  model: string,
  formValuesData: { formValues: Record<string, any> | null; schema?: any } | null
): Promise<any> {
  const modelName = model.includes('gemini-3') ? 'Nano Banana Pro' : 'Nano Banana';

  // 读取配置
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

  // 获取 AI Provider
  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini');

  if (!geminiProvider || !geminiProvider.chat) {
    throw new Error('Gemini provider not configured');
  }

  // 构建 effectivePrompt
  let effectivePrompt = prompt;
  if (formValuesData?.formValues) {
    const visualContext = serializeFormValuesToContext(
      formValuesData.formValues,
      formValuesData.schema
    );
    if (visualContext) {
      effectivePrompt = `${visualContext}\n\n---\n\n## USER PROMPT\n${effectivePrompt}`;
    }
  }

  // Stage 1: Strategist
  console.log('     [Stage 1] Strategist 分析...');
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
  console.log(`     ✅ Stage 1: anchor="${stage1Result.anchor}", microFocus="${stage1Result.microFocus}"`);

  // Stage 2: Writer
  console.log('     [Stage 2] Writer 生成...');
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
  console.log(`     ✅ Stage 2: seoTitle="${stage2Result.seoTitle?.slice(0, 40)}..."`);

  // Zod 校验 contentSections
  let validatedSections = stage2Result.contentSections || [];
  if (stage2Result.contentSections && Array.isArray(stage2Result.contentSections)) {
    const validationResult = contentSectionsSchema.safeParse(stage2Result.contentSections);
    if (validationResult.success) {
      validatedSections = validationResult.data;
    }
  }

  // 提取 FAQ 和 Tags（兼容老字段）
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
  const finalSubject = stage1Result.anchor || 'AI Image';

  return {
    seoTitle: stage2Result.seoTitle,
    h1Title: stage2Result.h1Title || stage2Result.seoTitle?.replace(' | Banana Prompts', ''),
    seoDescription: stage2Result.seoDescription,
    seoKeywords: stage2Result.seoKeywords,
    imageAlt: stage2Result.imageAlt,
    contentSections: validatedSections,
    anchor: stage1Result.anchor,
    microFocus: stage1Result.microFocus,
    subject: toTitleCase(finalSubject),
    faqItems: JSON.stringify(faqItemsForLegacy),
    visualTags: JSON.stringify(visualTagsForLegacy),
    snippetSummary: stage2Result.snippetSummary || null,
  };
}

/**
 * 处理单个帖子
 */
async function processPost(post: LegacyPost): Promise<SEOResult> {
  const { id, prompt, model, seoSlug, params } = post;

  if (!prompt) {
    return { postId: id, slug: seoSlug, status: 'skipped', message: 'No prompt found' };
  }

  console.log(`\n  🔄 处理: ${seoSlug || id.slice(0, 8)}`);
  console.log(`     Prompt: ${prompt.slice(0, 50)}...`);

  try {
    if (DRY_RUN) {
      console.log('     ⏭️ [Dry Run] 跳过 SEO 生成');
      return { postId: id, slug: seoSlug, status: 'success', message: 'Dry run - would generate SEO' };
    }

    // 提取 formValues
    const formValuesData = extractFormValuesData(params);
    console.log(`     FormValues: ${formValuesData ? Object.keys(formValuesData.formValues || {}).length : 0} 个字段`);

    // 生成 SEO 内容
    const seoContent = await generateSEOContent(
      prompt,
      model || 'gemini-3-pro-image-preview',
      formValuesData
    );

    console.log(`     ContentSections: ${seoContent.contentSections?.length || 0} 个区块`);

    // 更新数据库
    console.log('     [Save] 保存 SEO 数据...');
    await updateCommunityPostById(id, {
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
      // 确保状态为 published
      status: 'published',
      updatedAt: new Date(),
    });

    console.log('     ✅ SEO 生成并保存成功');

    return {
      postId: id,
      slug: seoSlug,
      status: 'success',
      message: `Generated ${seoContent.contentSections?.length || 0} sections`,
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
  console.log('🤖 自动 SEO 生成并发布脚本');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  预览模式 (--dry-run): 不会执行实际操作\n');
  } else {
    console.log('\n⚠️  执行模式: 将生成 SEO 内容并保存\n');
  }

  // 获取需要处理的帖子
  console.log('📊 查询需要生成 SEO 的帖子...');
  const posts = await getPostsNeedingSEO();

  if (posts.length === 0) {
    console.log('\n🎉 没有需要生成 SEO 的帖子！');
    await closeDb();
    return;
  }

  console.log(`\n📋 找到 ${posts.length} 篇需要生成 SEO 的帖子:\n`);

  posts.forEach((post, i) => {
    console.log(`  ${i + 1}. ${post.seoSlug || post.id.slice(0, 8)}`);
  });

  console.log('\n' + '─'.repeat(60));

  if (!DRY_RUN) {
    console.log('\n⚠️  即将开始生成，按 Ctrl+C 取消...');
    console.log('   等待 3 秒后开始...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 逐个处理
  const results: SEOResult[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] 处理: ${post.seoSlug || post.id}`);

    const result = await processPost(post);
    results.push(result);

    // 延迟（避免限流）
    if (i < posts.length - 1 && !DRY_RUN) {
      console.log(`\n⏳ 等待 ${DELAY_BETWEEN_POSTS / 1000} 秒...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_POSTS));
    }
  }

  // 输出统计
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEO 生成结果统计:\n');

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
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

// ===== Default Prompts (V15.0) =====

function getDefaultStage1Prompt(): string {
  return `# V15.0 STAGE 1: THE STRATEGIST

## OBJECTIVE
Analyze the user's image prompt and create a "Content Blueprint" for SEO.

## PRIORITY RULE
If a "## VISUAL CONTEXT (GROUND TRUTH)" section exists:
1. These parameters are FACTS
2. ANCHOR and MICRO-FOCUS MUST reflect these parameters

## INPUT
{{prompt}}
- Model: {{model}}

## TASKS
1. Extract ANCHOR (2-5 words) - the core subject
2. Identify MICRO-FOCUS - unique angle for SEO differentiation
3. Determine INTENT: Artistic | Functional | Commercial
4. Plan 4-6 BLOCKS with variety

## OUTPUT (JSON)
{
  "anchor": "string (2-5 words)",
  "microFocus": "string (unique angle)",
  "intent": "Artistic | Functional | Commercial",
  "plannedBlocks": [
    { "id": "block_1", "type": "rich-text", "intent": "..." },
    { "id": "block_2", "type": "checklist", "intent": "..." },
    { "id": "block_3", "type": "tags", "intent": "..." },
    { "id": "block_4", "type": "faq-accordion", "intent": "..." }
  ]
}`;
}

function getDefaultStage2Prompt(): string {
  return `# V15.0 STAGE 2: THE WRITER

## OBJECTIVE
Execute the Strategy Blueprint to generate final SEO content.

## INPUTS
- Strategy Blueprint: {{blueprint}}
- User Prompt: {{prompt}}

## SEO CONSTRAINTS
1. Title Tag: 50-60 characters MAX
2. Meta Description: 140-160 characters
3. Keywords: EXACTLY 5-8 items (visible elements only)

## OUTPUT (JSON)
{
  "seoTitle": "string (Max 60 chars)",
  "h1Title": "string (Unique & Engaging)",
  "seoDescription": "string (140-160 chars)",
  "seoKeywords": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
  "imageAlt": "string (Natural description)",
  "snippetSummary": "string (50-80 words)",
  "contentSections": [
    {
      "id": "block_1",
      "type": "rich-text",
      "title": "Descriptive H2 Title",
      "headingLevel": "h2",
      "data": { "text": "Markdown content here." }
    },
    {
      "id": "block_2",
      "type": "checklist",
      "title": "Key Elements",
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
      "type": "faq-accordion",
      "title": "Common Questions",
      "headingLevel": "h3",
      "data": {
        "items": [
          { "q": "Question 1?", "a": "Answer 1." },
          { "q": "Question 2?", "a": "Answer 2." }
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
