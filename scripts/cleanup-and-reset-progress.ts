/**
 * 删除无高亮帖子并重置进度
 */

import * as fs from 'fs';
import { db } from '../src/core/db';
import { communityPost, user } from '../src/config/db/schema.sqlite';
import { eq, inArray } from 'drizzle-orm';

// 需要删除的帖子 ID - 根据 find-posts-without-highlights.ts 输出更新
const POST_IDS_TO_DELETE = [
  'd0b3c34b-9d04-4a10-afcd-1e78fe934c32',
];

async function cleanupAndReset() {
  console.log('='.repeat(60));
  console.log('🧹 删除无高亮帖子并重置进度');
  console.log('='.repeat(60));

  // 1. 获取帖子的 prompt 信息（用于匹配进度文件）
  const posts = await db()
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      seoSlug: communityPost.seoSlug,
    })
    .from(communityPost)
    .where(inArray(communityPost.id, POST_IDS_TO_DELETE));

  console.log(`\n📋 找到 ${posts.length} 个帖子:`);
  for (const post of posts) {
    console.log(`  - ${post.id}`);
    console.log(`    Slug: ${post.seoSlug}`);
    console.log(`    Prompt: ${post.prompt?.substring(0, 80)}...`);
  }

  // 2. 删除帖子
  console.log(`\n🗑️ 删除帖子...`);
  const result = await db()
    .delete(communityPost)
    .where(inArray(communityPost.id, POST_IDS_TO_DELETE));

  console.log(`✅ 已删除 ${POST_IDS_TO_DELETE.length} 个帖子`);

  // 3. 读取进度文件，找到对应的 prompt ID
  const progressFile = 'logs/pipeline-progress-prompts-input.json';
  const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));

  // 4. 重置这些帖子对应的 prompt 进度
  // 根据 postId 匹配
  let resetCount = 0;
  for (const [promptId, p] of Object.entries(progress.prompts) as [string, any][]) {
    if (POST_IDS_TO_DELETE.includes(p.postId)) {
      console.log(`\n🔄 重置进度: ${promptId}`);
      console.log(`   原状态: step3=${p.step3_generate}, step4=${p.step4_post}, step5=${p.step5_seo}`);

      // 重置所有步骤（需要从头开始，确保拿到正确的 formValues）
      p.step1_intent = 'pending';
      p.step2_compile = 'pending';
      p.step3_generate = 'pending';
      p.step4_post = 'pending';
      p.step5_seo = 'pending';

      // 清除中间结果
      delete p.schema;
      delete p.extractedRatio;
      delete p.promptNative;
      delete p.promptEnglish;
      delete p.promptHighlights;
      delete p.detectedLang;
      delete p.aiTaskId;
      delete p.imageUrl;
      delete p.postId;
      delete p.error;

      resetCount++;
    }
  }

  console.log(`\n✅ 已重置 ${resetCount} 个 prompt 的进度`);

  // 5. 保存进度文件
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  console.log(`💾 已保存进度文件`);

  // 6. 统计当前状态
  let pending = 0;
  let done = 0;
  let error = 0;

  for (const p of Object.values(progress.prompts) as any[]) {
    if (p.step5_seo === 'done') done++;
    else if (p.step1_intent === 'pending') pending++;
    else if (p.step1_intent === 'error' || p.step2_compile === 'error' ||
             p.step3_generate === 'error' || p.step4_post === 'error' ||
             p.step5_seo === 'error') error++;
  }

  console.log(`\n📊 当前进度状态:`);
  console.log(`   ✅ 完成: ${done}`);
  console.log(`   ⏳ 待处理: ${pending}`);
  console.log(`   ❌ 错误: ${error}`);
  console.log(`\n🚀 可以重新运行 Pipeline:`);
  console.log(`   pnpm tsx scripts/prompt-pipeline.ts --input logs/prompts-input.json --resume`);
}

cleanupAndReset().catch(console.error);
