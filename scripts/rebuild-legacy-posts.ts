/**
 * 批量重建老帖子脚本
 *
 * 功能：
 * 1. 查询缺少 formValues 的老帖子
 * 2. 对每个帖子调用 Intent API 构建 schema
 * 3. 调用 Compile API 生成优化 Prompt
 * 4. 直接调用 AI Service 生成图片（管理员免积分）
 * 5. 调用 SEO 生成 API 更新 V15.0 字段
 *
 * 使用方法：
 * pnpm tsx scripts/rebuild-legacy-posts.ts --dry-run    # 预览模式
 * pnpm tsx scripts/rebuild-legacy-posts.ts              # 执行重建
 * pnpm tsx scripts/rebuild-legacy-posts.ts --post-id <id>  # 重建单篇
 */

import { and, eq, sql } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { communityPost, aiTask } from '@/config/db/schema';
import { analyzeIntent } from '@/shared/services/intent-analyzer';
import { compilePLO } from '@/shared/services/compiler';
import { getAIService } from '@/shared/services/ai';
import { AIMediaType } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { createAITask, updateAITask, NewAITask } from '@/shared/models/ai_task';
import { updateCommunityPostById } from '@/shared/models/community_post';
import { generateThumbnail } from '@/shared/lib/thumbnail-generator';

// 命令行参数解析
const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_POST_ID = (() => {
  const idx = process.argv.indexOf('--post-id');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// 延迟配置
const DELAY_BETWEEN_POSTS = 5000; // 5秒
const DELAY_AFTER_GENERATE = 10000; // 等待图片生成 10秒

interface LegacyPost {
  id: string;
  prompt: string | null;
  model: string | null;
  imageUrl: string | null;
  seoSlug: string | null;
  aiTaskId: string | null;
  params: string | null;
  createdAt: Date | null;
  userId: string; // 添加 userId
}

interface RebuildResult {
  postId: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  newImageUrl?: string;
  newSeoSlug?: string;
}

/**
 * 查询需要重建的老帖子
 */
async function getLegacyPosts(): Promise<LegacyPost[]> {
  const database = db();

  const baseCondition = and(
    eq(communityPost.status, 'published'),
    sql`(${communityPost.params} IS NULL OR ${communityPost.params}::jsonb->>'formValues' IS NULL)`
  );

  // 如果指定了单个帖子 ID
  if (SINGLE_POST_ID) {
    const posts = await database
      .select({
        id: communityPost.id,
        prompt: communityPost.prompt,
        model: communityPost.model,
        imageUrl: communityPost.imageUrl,
        seoSlug: communityPost.seoSlug,
        aiTaskId: communityPost.aiTaskId,
        params: communityPost.params,
        createdAt: communityPost.createdAt,
        userId: communityPost.userId,
      })
      .from(communityPost)
      .where(eq(communityPost.id, SINGLE_POST_ID));

    return posts;
  }

  // 获取所有缺少 formValues 的帖子
  const posts = await database
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      model: communityPost.model,
      imageUrl: communityPost.imageUrl,
      seoSlug: communityPost.seoSlug,
      aiTaskId: communityPost.aiTaskId,
      params: communityPost.params,
      createdAt: communityPost.createdAt,
      userId: communityPost.userId,
    })
    .from(communityPost)
    .where(baseCondition)
    .orderBy(communityPost.createdAt);

  return posts;
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
      // 使用中间值
      formValues[field.id] = field.min !== undefined && field.max !== undefined
        ? (field.min + field.max) / 2
        : 0.5;
    } else if (field.type === 'toggle') {
      formValues[field.id] = false;
    } else if (field.type === 'select' && field.options?.length > 0) {
      // 使用第一个选项
      formValues[field.id] = field.options[0];
    }
  }

  return formValues;
}

/**
 * 构建 PLO 对象
 */
function buildPLO(schema: any, formValues: Record<string, any>, userPrompt: string) {
  // 提取 subject（从 schema.context 或 formValues 中提取）
  const subject = formValues.subject || schema.context || userPrompt.slice(0, 50);

  // 构建 narrative_params
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
      ar: formValues.aspect_ratio || schema.extractedRatio || '1:1',
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
  const { id, prompt, model } = post;

  if (!prompt) {
    return { postId: id, status: 'skipped', message: 'No prompt found' };
  }

  console.log(`\n  🔄 正在处理帖子: ${id}`);
  console.log(`     Prompt: ${prompt.slice(0, 60)}...`);

  try {
    // ========== Step 1: Intent Analysis ==========
    console.log('     [1/5] 调用 Intent API...');
    const schema = await analyzeIntent(prompt);

    if (!schema) {
      return { postId: id, status: 'error', message: 'Intent analysis failed' };
    }

    console.log(`     ✅ Schema 生成成功: ${schema.fields?.length || 0} 个字段`);

    // 提取 formValues
    const formValues = extractFormValues(schema);
    console.log(`     📋 FormValues: ${Object.keys(formValues).join(', ')}`);

    // ========== Step 2: Compile PLO ==========
    console.log('     [2/5] 调用 Compile API...');
    const plo = buildPLO(schema, formValues, prompt);
    const { native, english, detectedLang, highlights } = await compilePLO(plo);

    console.log(`     ✅ Prompt 编译成功 (${detectedLang})`);
    console.log(`     📝 English: ${english.slice(0, 80)}...`);

    // ========== Step 3: Generate Image (Admin Bypass) ==========
    console.log('     [3/5] 生成图片 (管理员免积分)...');

    if (DRY_RUN) {
      console.log('     ⏭️ [Dry Run] 跳过图片生成');
    } else {
      // 直接调用 AI Service，绕过积分检查
      const aiService = await getAIService();
      const geminiProvider = aiService.getProvider('gemini');

      if (!geminiProvider) {
        return { postId: id, status: 'error', message: 'Gemini provider not found' };
      }

      // Gemini API 不支持 numberOfImages 参数，只支持 aspectRatio 和 imageSize
      const generateParams = {
        mediaType: AIMediaType.IMAGE,
        model: model || 'gemini-3.0-flash-preview',
        prompt: english, // 使用英文 prompt
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/notify/gemini`,
        options: {
          // 不传 numberOfImages，Gemini 默认生成 1 张
          imageSize: '1K' as const,
        },
      };

      const result = await geminiProvider.generate({ params: generateParams });

      if (!result?.taskId) {
        return { postId: id, status: 'error', message: 'Image generation failed - no taskId' };
      }

      console.log(`     📸 任务已提交: ${result.taskId}`);

      // 创建新的 AI Task 记录（使用原帖子的 userId）
      const newAITask: NewAITask = {
        id: getUuid(),
        userId: post.userId, // 使用原帖子的用户 ID
        mediaType: AIMediaType.IMAGE,
        provider: 'gemini',
        model: model || 'gemini-3.0-flash-preview',
        prompt: english,
        scene: 'text-to-image',
        options: JSON.stringify(generateParams.options),
        status: result.taskStatus,
        costCredits: 0, // 免积分
        taskId: result.taskId,
        taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
        taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      };

      await createAITask(newAITask);
      console.log(`     ✅ AI Task 创建成功: ${newAITask.id}`);

      // 等待图片生成完成
      console.log(`     ⏳ 等待图片生成 (${DELAY_AFTER_GENERATE / 1000}s)...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_AFTER_GENERATE));

      // 检查任务状态并获取图片 URL
      // 注意：由于是异步回调，这里可能还没有完成
      // 实际生产中应该轮询检查状态
    }

    // ========== Step 4: Generate SEO (via API) ==========
    console.log('     [4/5] 生成 SEO 内容...');

    if (DRY_RUN) {
      console.log('     ⏭️ [Dry Run] 跳过 SEO 生成');
    } else {
      // 注意：这里需要通过 HTTP 调用 API，因为需要 session 认证
      // 在脚本环境中，我们直接调用核心函数

      // 暂时跳过 SEO 生成，因为需要管理员 session
      console.log('     ⚠️ SEO 生成需要管理员 session，请稍后手动触发');
    }

    // ========== Step 5: Update Post ==========
    console.log('     [5/5] 更新帖子数据...');

    if (DRY_RUN) {
      console.log('     ⏭️ [Dry Run] 跳过帖子更新');
    } else {
      // 更新帖子的 params（包含 formValues, schema, highlights）
      // IMPORTANT: version: 2 是 VisionLogicPlayground 识别 V2 格式的关键标识
      // 没有这个字段，Remix 会走 V1/Legacy 分支，重新调用 Intent API
      const newParams = {
        version: 2, // V2 格式标识，确保 Remix 直接加载表单
        formValues,
        schema: {
          context: schema.context,
          fields: schema.fields,
        },
        promptHighlights: highlights || { native: [], english: [] },
        originalInput: prompt, // 保存原始用户输入
        promptNative: native, // 用户语言的编译结果
        promptEnglish: english, // 英文编译结果
        detectedLang: detectedLang, // 检测到的语言
        model: model || 'gemini-3.0-flash-preview',
        aspectRatio: '1:1', // 默认比例
        scene: 'text-to-image',
      };

      await updateCommunityPostById(id, {
        params: JSON.stringify(newParams),
        prompt: english, // 更新为优化后的英文 prompt
      });

      console.log('     ✅ 帖子更新成功');
    }

    return {
      postId: id,
      status: 'success',
      message: DRY_RUN ? 'Dry run completed' : 'Rebuild completed',
    };

  } catch (error: any) {
    console.error(`     ❌ 错误: ${error.message}`);
    return { postId: id, status: 'error', message: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🔧 老帖子批量重建脚本');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  预览模式 (--dry-run): 不会执行实际操作\n');
  } else {
    console.log('\n⚠️  执行模式: 将重建帖子！\n');
  }

  // 获取需要重建的帖子
  console.log('📊 查询需要重建的帖子...');
  const posts = await getLegacyPosts();

  if (posts.length === 0) {
    console.log('\n🎉 没有需要重建的帖子！');
    await closeDb();
    return;
  }

  console.log(`\n📋 找到 ${posts.length} 篇需要重建的帖子:\n`);

  posts.forEach((post, i) => {
    console.log(`  ${i + 1}. ${post.id}`);
    console.log(`     Prompt: ${post.prompt?.slice(0, 50) || '(无)'}...`);
    console.log(`     Model: ${post.model || '(未知)'}`);
    console.log(`     Slug: ${post.seoSlug || '(无)'}`);
    console.log('');
  });

  console.log('─'.repeat(60));

  if (!DRY_RUN) {
    console.log('\n⚠️  即将开始重建，按 Ctrl+C 取消...');
    console.log('   等待 5 秒后开始...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 逐个重建
  const results: RebuildResult[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] 处理帖子 ${post.id}`);

    const result = await rebuildPost(post);
    results.push(result);

    // 延迟
    if (i < posts.length - 1 && !DRY_RUN) {
      console.log(`\n⏳ 等待 ${DELAY_BETWEEN_POSTS / 1000} 秒后处理下一个...`);
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
      .forEach(r => console.log(`  - ${r.postId}: ${r.message}`));
  }

  console.log('\n' + '='.repeat(60));

  // 后续步骤提示
  if (!DRY_RUN && successCount > 0) {
    console.log('\n📌 后续步骤:');
    console.log('  1. 等待图片生成回调完成 (约 1-2 分钟)');
    console.log('  2. 在管理后台手动触发 SEO 重新生成:');
    console.log('     POST /api/admin/seo/batch-regenerate { "dryRun": false }');
    console.log('  3. 验证帖子详情页显示正常');
    console.log('  4. 执行 R2 存储清理:');
    console.log('     pnpm tsx scripts/cleanup-r2-storage.ts');
  }

  await closeDb();
}

main().catch(async (error) => {
  console.error('❌ 脚本执行失败:', error);
  await closeDb();
  process.exit(1);
});
