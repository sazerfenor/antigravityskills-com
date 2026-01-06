/**
 * 老帖子完整重建脚本 V2.2
 *
 * 功能：
 * 1. Gemini 同步返回图片，直接获取 imageUrl
 * 2. 更新帖子的 params（V2 格式）
 * 3. 清理所有老的 SEO 字段（SEO 由后台手动触发 AI Auto-Fill）
 * 4. 只保留 seoSlug 不变（保护 SEO 链接）
 *
 * 使用方法：
 * pnpm tsx scripts/rebuild-legacy-posts-v2.ts --dry-run       # 预览模式
 * pnpm tsx scripts/rebuild-legacy-posts-v2.ts                 # 执行重建
 * pnpm tsx scripts/rebuild-legacy-posts-v2.ts --post-id <id>  # 重建单篇
 * pnpm tsx scripts/rebuild-legacy-posts-v2.ts --limit 3       # 限制数量
 *
 * 注意：SEO 内容需要在后台手动触发 AI Auto-Fill 生成
 */

import { and, eq, sql } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { analyzeIntent } from '@/shared/services/intent-analyzer';
import { compilePLO } from '@/shared/services/compiler';
import { getAIService } from '@/shared/services/ai';
import { AIMediaType } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { updateCommunityPostById } from '@/shared/models/community_post';

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

interface LegacyPost {
  id: string;
  prompt: string | null;
  model: string | null;
  seoSlug: string | null;
  userId: string;
  createdAt: Date | null;
}

interface RebuildResult {
  postId: string;
  slug: string | null;
  status: 'success' | 'error' | 'skipped';
  message: string;
  newImageUrl?: string;
}

/**
 * 查询需要重建的老帖子
 */
async function getLegacyPosts(): Promise<LegacyPost[]> {
  const database = db();

  // 如果指定了单个帖子 ID
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

  // 查找 12 月 28 日之前创建的老帖子
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
    .where(
      and(
        eq(communityPost.status, 'published'),
        sql`${communityPost.createdAt} < '2025-12-28'`
      )
    )
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
 * 重建单个帖子
 */
async function rebuildPost(post: LegacyPost): Promise<RebuildResult> {
  const { id, prompt, seoSlug, userId } = post;

  if (!prompt) {
    return { postId: id, slug: seoSlug, status: 'skipped', message: 'No prompt found' };
  }

  console.log(`\n  🔄 正在处理: ${seoSlug || id.slice(0, 8)}`);
  console.log(`     Prompt: ${prompt.slice(0, 50)}...`);

  try {
    // ========== Step 1: Intent Analysis ==========
    console.log('     [1/4] Intent 分析...');
    const schema = await analyzeIntent(prompt);

    if (!schema) {
      return { postId: id, slug: seoSlug, status: 'error', message: 'Intent analysis failed' };
    }

    console.log(`     ✅ Schema: ${schema.fields?.length || 0} 个字段`);

    const formValues = extractFormValues(schema);

    // ========== Step 2: Compile PLO ==========
    console.log('     [2/4] Compile Prompt...');
    const plo = buildPLO(schema, formValues, prompt);
    const { native, english, detectedLang, highlights } = await compilePLO(plo);

    console.log(`     ✅ 编译成功 (${detectedLang})`);

    if (DRY_RUN) {
      console.log('     ⏭️ [Dry Run] 跳过后续步骤');
      return { postId: id, slug: seoSlug, status: 'success', message: 'Dry run - would rebuild' };
    }

    // ========== Step 3: Generate Image (同步) ==========
    console.log(`     [3/4] 生成图片 (模型: ${FIXED_MODEL}, 比例: ${FIXED_ASPECT_RATIO})...`);

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

    // Gemini 同步返回图片！
    const result = await geminiProvider.generate({ params: generateParams });

    if (!result?.taskInfo?.images?.[0]?.imageUrl) {
      return { postId: id, slug: seoSlug, status: 'error', message: 'Image generation failed - no imageUrl' };
    }

    const newImageUrl = result.taskInfo.images[0].imageUrl;
    console.log(`     ✅ 图片生成成功: ${newImageUrl.slice(0, 60)}...`);

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

    // ========== Step 4: Update Post ==========
    console.log('     [4/4] 更新帖子...');

    // 构建新的 params（V2 格式）
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

    // 更新帖子：新数据 + 清理老 SEO 字段
    await updateCommunityPostById(id, {
      // 新数据
      params: JSON.stringify(newParams),
      prompt: english,
      imageUrl: newImageUrl,
      thumbnailUrl: newImageUrl, // 用主图作为缩略图
      aiTaskId: newAITaskId,

      // 清理老的 SEO 字段（后台手动生成）
      useCases: null,
      faqItems: null,
      visualTags: null,
      dynamicHeaders: null,
      expertCommentary: null,
      snippetSummary: null,
      contentSections: null,

      // 更新时间
      updatedAt: new Date(),
    });

    console.log('     ✅ 帖子更新成功');
    console.log('     📌 记得在后台点击 AI Auto-Fill 生成 SEO 内容');

    return {
      postId: id,
      slug: seoSlug,
      status: 'success',
      message: 'Rebuild completed (SEO 需后台生成)',
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
  console.log('🔧 老帖子完整重建脚本 V2.2');
  console.log('='.repeat(60));
  console.log(`   模型: ${FIXED_MODEL}`);
  console.log(`   比例: ${FIXED_ASPECT_RATIO}`);

  if (DRY_RUN) {
    console.log('\n⚠️  预览模式 (--dry-run): 不会执行实际操作\n');
  } else {
    console.log('\n⚠️  执行模式: 将完整重建帖子！\n');
    console.log('   保留: seoSlug（SEO 链接不变）');
    console.log('   重建: 图片、params');
    console.log('   清理: 所有 SEO 字段（需后台手动生成）');
  }

  // 获取需要重建的帖子
  console.log('\n📊 查询需要重建的帖子...');
  const posts = await getLegacyPosts();

  if (posts.length === 0) {
    console.log('\n🎉 没有需要重建的帖子！');
    await closeDb();
    return;
  }

  console.log(`\n📋 找到 ${posts.length} 篇需要重建的帖子:\n`);

  posts.forEach((post, i) => {
    console.log(`  ${i + 1}. ${post.seoSlug || post.id.slice(0, 8)}`);
    console.log(`     Prompt: ${post.prompt?.slice(0, 40) || '(无)'}...`);
  });

  console.log('\n' + '─'.repeat(60));

  if (!DRY_RUN) {
    console.log('\n⚠️  即将开始重建，按 Ctrl+C 取消...');
    console.log('   等待 5 秒后开始...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 逐个重建
  const results: RebuildResult[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] 处理: ${post.seoSlug || post.id}`);

    const result = await rebuildPost(post);
    results.push(result);

    // 延迟（避免限流）
    if (i < posts.length - 1 && !DRY_RUN) {
      console.log(`\n⏳ 等待 ${DELAY_BETWEEN_POSTS / 1000} 秒...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_POSTS));
    }
  }

  // 输出统计
  console.log('\n' + '='.repeat(60));
  console.log('📊 重建结果统计:\n');

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

  if (successCount > 0 && !DRY_RUN) {
    console.log('\n✅ 成功重建的帖子:');
    results
      .filter(r => r.status === 'success' && r.newImageUrl)
      .forEach(r => console.log(`  - ${r.slug}: ${r.newImageUrl?.slice(0, 50)}...`));
  }

  console.log('\n' + '='.repeat(60));

  // 后续步骤提示
  if (!DRY_RUN && successCount > 0) {
    console.log('\n📌 后续步骤:');
    console.log('  1. 在后台找到这些帖子');
    console.log('  2. 点击 "AI Auto-Fill" 生成 SEO 内容');
    console.log('  3. 点击 "Approve" 发布');
  }

  await closeDb();
}

main().catch(async (error) => {
  console.error('❌ 脚本执行失败:', error);
  await closeDb();
  process.exit(1);
});
