import { db } from '@/core/db';
import { communityPost, aiTask, user } from '@/config/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { getUuid } from '@/shared/lib/hash';
import { analyzeIntent } from '@/shared/services/intent-analyzer';
import { compilePLO } from '@/shared/services/compiler';
import { buildPLO } from '@/shared/blocks/vision-logic/utils/plo-builder';

/**
 * 生成 5 个测试帖子
 *
 * 流程：
 * 1. 读取 test-prompts-5-correct.json
 * 2. 为每个 Prompt 执行完整 Pipeline（Intent → Field → Compiler → SEO）
 * 3. 分配给合适的虚拟作者
 * 4. 发布并验证
 */

async function generateTestPosts() {
  console.log('🚀 开始生成 5 个测试帖子...\n');
  console.log('='.repeat(60));

  // 1. 读取测试 Prompt
  const testPromptsPath = path.join(process.cwd(), 'test-prompts-5-correct.json');
  if (!fs.existsSync(testPromptsPath)) {
    console.error(`❌ 测试 Prompt 文件不存在: ${testPromptsPath}`);
    console.error('请先运行: pnpm tsx scripts/select-test-prompts.ts');
    process.exit(1);
  }

  const testData = JSON.parse(fs.readFileSync(testPromptsPath, 'utf-8'));
  const testPrompts = testData.testPrompts;

  console.log(`📂 已加载 ${testPrompts.length} 个测试 Prompt\n`);

  // 2. 获取所有虚拟作者
  const virtualAuthors = await db()
    .select({
      id: user.id,
      name: user.name,
      postCount: user.postCount,
    })
    .from(user)
    .where(eq(user.isVirtual, true));

  console.log(`👥 找到 ${virtualAuthors.length} 个虚拟作者\n`);

  if (virtualAuthors.length === 0) {
    console.error('❌ 没有虚拟作者可用！');
    process.exit(1);
  }

  // 3. 为每个 Prompt 生成帖子
  const results = [];

  for (let i = 0; i < testPrompts.length; i++) {
    const testPrompt = testPrompts[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`【${i + 1}/${testPrompts.length}】处理 Prompt ID: ${testPrompt.id}`);
    console.log(`  Subject Type: ${testPrompt.subject_type}`);
    console.log(`  Title: ${testPrompt.title}`);
    console.log(`  评分: ${testPrompt.total_score}`);

    try {
      // 3.1 阶段一：Intent Analyzer + Field Generator
      console.log('\n  📋 阶段一：Intent Analyzer + Field Generator');

      const schema = await analyzeIntent(testPrompt.prompt);

      if (!schema) {
        throw new Error('Intent analysis returned null');
      }

      console.log(`    ✅ 生成了 ${schema.fields.length} 个字段`);
      console.log(`    - Primary Intent: ${schema.primaryIntent?.phrase || 'N/A'}`);
      console.log(`    - Content Category: ${schema.contentCategory || 'N/A'}`);

      // 3.1.5 构建 formValues（使用字段的默认值）
      const formValues: Record<string, unknown> = {};
      for (const field of schema.fields) {
        formValues[field.id] = field.defaultValue;
      }

      // 3.1.6 构建 PLO 对象
      const plo = buildPLO({
        input: testPrompt.prompt,
        schema: schema,
        formValues: formValues,
        aspectRatio: schema.extractedRatio || '1:1',
      });

      console.log(`    ✅ 构建 PLO: ${Object.keys(plo.narrative_params || {}).length} 个 narrative params`);

      // 3.2 阶段二：Compiler
      console.log('\n  🔧 阶段二：Compiler');

      const compiledPrompt = await compilePLO(plo);

      console.log(`    ✅ 生成 Prompt 长度: ${compiledPrompt.native.length} 字符`);

      // 3.3 选择虚拟作者（平均分配）
      const authorIndex = i % virtualAuthors.length;
      const selectedAuthor = virtualAuthors[authorIndex];

      console.log(`\n  👤 分配给虚拟作者: ${selectedAuthor.name} (当前帖子数: ${selectedAuthor.postCount})`);

      // 3.4 创建 AI Task
      const taskId = getUuid();
      await db().insert(aiTask).values({
        id: taskId,
        userId: selectedAuthor.id,
        mediaType: 'text-to-image',
        status: 'completed',
        provider: 'gemini',
        model: 'gemini-3-pro-image-preview',
        prompt: compiledPrompt.native,
        options: JSON.stringify({
          plo: plo,
        }),
        taskResult: JSON.stringify({
          imageUrl: 'https://placeholder.example.com/test.png', // 占位符
        }),
        optimizationData: JSON.stringify({
          testPrompt: true,
          sourcePromptId: testPrompt.id,
          sourceScore: testPrompt.total_score,
        }),
        costCredits: 0,
        scene: 'test',
      });

      console.log(`  ✅ 创建 AI Task: ${taskId}`);

      // 3.5 创建 Community Post（待 SEO 生成）
      const postId = getUuid();
      await db().insert(communityPost).values({
        id: postId,
        userId: selectedAuthor.id,
        aiTaskId: taskId,
        imageUrl: 'https://placeholder.example.com/test.png',
        prompt: compiledPrompt.native,
        params: JSON.stringify({
          formValues: schema.fields,
          schema: schema,
        }),
        model: 'gemini-3-pro-image-preview',
        category: testPrompt.vertical?.toLowerCase() || 'photography',
        subcategory: testPrompt.subject_type, // ✅ 使用 subject_type
        status: 'pending', // 待 SEO 生成后发布
      });

      console.log(`  ✅ 创建 Community Post: ${postId}`);
      console.log(`  📌 状态: pending（待 SEO 生成）`);

      results.push({
        promptId: testPrompt.id,
        postId,
        taskId,
        authorId: selectedAuthor.id,
        authorName: selectedAuthor.name,
        subcategory: testPrompt.subject_type,
        status: 'pending_seo',
      });

    } catch (error: any) {
      console.error(`  ❌ 处理失败:`, error.message);
      results.push({
        promptId: testPrompt.id,
        error: error.message,
        status: 'failed',
      });
    }
  }

  // 4. 保存结果
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 生成结果汇总:\n');

  const successCount = results.filter((r) => r.status === 'pending_seo').length;
  const failCount = results.filter((r) => r.status === 'failed').length;

  console.log(`  成功: ${successCount}/${testPrompts.length}`);
  console.log(`  失败: ${failCount}/${testPrompts.length}`);

  if (successCount > 0) {
    console.log('\n  ✅ 成功创建的帖子:');
    results
      .filter((r) => r.status === 'pending_seo')
      .forEach((r, idx) => {
        console.log(`    ${idx + 1}. Post ID: ${r.postId}`);
        console.log(`       Subcategory: ${r.subcategory}`);
        console.log(`       Author: ${r.authorName}`);
      });
  }

  const outputPath = path.join(process.cwd(), 'test-posts-results.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        meta: {
          generatedAt: new Date().toISOString(),
          successCount,
          failCount,
          totalCount: testPrompts.length,
        },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n💾 结果已保存到: ${outputPath}`);

  console.log('\n📋 下一步:');
  console.log('  1. 运行 SEO 生成: pnpm tsx scripts/generate-seo-for-test-posts.ts');
  console.log('  2. 发布帖子: pnpm tsx scripts/publish-test-posts.ts');
  console.log('  3. 验证效果: 前往 /admin/gallery 查看');

  console.log(`\n🎉 生成完成！`);
}

generateTestPosts()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ 生成失败:', e);
    process.exit(1);
  });
