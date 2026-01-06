/**
 * 查询需要重建的老帖子统计
 *
 * 使用方法:
 * pnpm tsx scripts/check-legacy-posts.ts
 */

import { and, count, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { db, closeDb } from '@/core/db';
import { communityPost } from '@/config/db/schema';

async function main() {
  console.log('='.repeat(60));
  console.log('📊 社区老帖子统计报告');
  console.log('='.repeat(60));

  const database = db();

  // 1. 总帖子数
  const [totalResult] = await database
    .select({ count: count() })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'));
  const totalPublished = totalResult?.count || 0;

  // 2. 缺少 contentSections 的帖子 (V14.0 以前)
  const [preV14Result] = await database
    .select({ count: count() })
    .from(communityPost)
    .where(and(
      eq(communityPost.status, 'published'),
      isNull(communityPost.contentSections)
    ));
  const preV14Count = preV14Result?.count || 0;

  // 3. 缺少 snippetSummary 的帖子 (V15.0 以前)
  const [preV15Result] = await database
    .select({ count: count() })
    .from(communityPost)
    .where(and(
      eq(communityPost.status, 'published'),
      isNull(communityPost.snippetSummary)
    ));
  const preV15Count = preV15Result?.count || 0;

  // 4. 有 contentSections 但缺少 snippetSummary (V14.0 但非 V15.0)
  const [v14OnlyResult] = await database
    .select({ count: count() })
    .from(communityPost)
    .where(and(
      eq(communityPost.status, 'published'),
      isNotNull(communityPost.contentSections),
      isNull(communityPost.snippetSummary)
    ));
  const v14OnlyCount = v14OnlyResult?.count || 0;

  // 5. 完全符合 V15.0 的帖子
  const [v15Result] = await database
    .select({ count: count() })
    .from(communityPost)
    .where(and(
      eq(communityPost.status, 'published'),
      isNotNull(communityPost.contentSections),
      isNotNull(communityPost.snippetSummary)
    ));
  const v15Count = v15Result?.count || 0;

  // 6. 缺少 formValues 的帖子 (需要检查 params JSON)
  const [noFormValuesResult] = await database
    .select({ count: count() })
    .from(communityPost)
    .where(and(
      eq(communityPost.status, 'published'),
      sql`(${communityPost.params} IS NULL OR ${communityPost.params}::jsonb->>'formValues' IS NULL)`
    ));
  const noFormValuesCount = noFormValuesResult?.count || 0;

  // 7. 获取需要重建的帖子列表 (缺少 contentSections 或 缺少 formValues)
  const legacyPosts = await database
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      model: communityPost.model,
      seoSlug: communityPost.seoSlug,
      createdAt: communityPost.createdAt,
      hasContentSections: sql<boolean>`${communityPost.contentSections} IS NOT NULL`,
      hasSnippetSummary: sql<boolean>`${communityPost.snippetSummary} IS NOT NULL`,
      hasFormValues: sql<boolean>`${communityPost.params}::jsonb->>'formValues' IS NOT NULL`,
    })
    .from(communityPost)
    .where(and(
      eq(communityPost.status, 'published'),
      sql`(${communityPost.params} IS NULL OR ${communityPost.params}::jsonb->>'formValues' IS NULL)`
    ))
    .orderBy(communityPost.createdAt);

  console.log('\n📈 统计概览:\n');
  console.log(`  总已发布帖子数:       ${totalPublished}`);
  console.log(`  ✅ V15.0 完整版:      ${v15Count}`);
  console.log(`  ⚠️ V14.0 (缺 V15.0):  ${v14OnlyCount}`);
  console.log(`  ❌ V14.0 以前:        ${preV14Count} ← 需要完整重建`);
  console.log(`  ❌ 缺少 formValues:   ${noFormValuesCount}`);

  console.log('\n' + '─'.repeat(60));
  console.log('📋 需要重建的帖子列表:\n');

  if (legacyPosts.length === 0) {
    console.log('  🎉 没有需要重建的帖子！所有帖子都已是最新版本。');
  } else {
    console.log(`  共 ${legacyPosts.length} 篇需要重建:\n`);

    legacyPosts.forEach((post, index) => {
      const promptPreview = post.prompt?.slice(0, 50) || '(无 prompt)';
      console.log(`  ${index + 1}. ${post.id}`);
      console.log(`     Slug: ${post.seoSlug || '(无)'}`);
      console.log(`     Prompt: ${promptPreview}${post.prompt && post.prompt.length > 50 ? '...' : ''}`);
      console.log(`     Model: ${post.model || '(未知)'}`);
      console.log(`     Created: ${post.createdAt?.toISOString().split('T')[0] || '(未知)'}`);
      console.log(`     状态: contentSections=${post.hasContentSections ? '✓' : '✗'}, snippetSummary=${post.hasSnippetSummary ? '✓' : '✗'}, formValues=${post.hasFormValues ? '✓' : '✗'}`);
      console.log('');
    });
  }

  console.log('─'.repeat(60));
  console.log('\n📌 重建建议:\n');

  if (preV14Count > 0) {
    console.log(`  需要完整重建 ${preV14Count} 篇帖子 (重新生成图片 + SEO)`);
    console.log('  运行命令: pnpm tsx scripts/rebuild-legacy-posts.ts');
  }

  if (v14OnlyCount > 0) {
    console.log(`  需要补充 V15.0 字段的帖子: ${v14OnlyCount} 篇`);
    console.log('  可以只运行 SEO 重建');
  }

  console.log('\n' + '='.repeat(60));

  await closeDb();
}

main().catch(console.error);
