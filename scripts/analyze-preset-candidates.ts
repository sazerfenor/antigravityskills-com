/**
 * 分析数据库中的 V2 帖子，找出适合作为系统预设的候选
 *
 * 使用方法:
 *   pnpm tsx scripts/analyze-preset-candidates.ts
 */

import 'dotenv/config';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../src/core/db';
import { communityPost } from '../src/config/db/schema';

interface V2Params {
  version: number;
  schema?: {
    context?: string;
    contentCategory?: string;
    fields?: unknown[];
  };
  promptHighlights?: {
    english?: unknown[];
    native?: unknown[];
  };
  promptEnglish?: string;
}

interface CategoryCount {
  category: string;
  count: number;
  posts: Array<{
    id: string;
    title: string;
    context: string;
    highlightCount: number;
    fieldCount: number;
    hasImage: boolean;
  }>;
}

async function analyzePresetCandidates() {
  console.log('🔍 分析 V2 帖子，寻找预设候选...\n');

  // 获取所有有 params 的已发布帖子
  const posts = await db()
    .select({
      id: communityPost.id,
      title: communityPost.title,
      params: communityPost.params,
      imageUrl: communityPost.imageUrl,
      thumbnailUrl: communityPost.thumbnailUrl,
    })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        isNotNull(communityPost.params)
      )
    );

  console.log(`📊 总帖子数: ${posts.length}\n`);

  // 按 contentCategory 分组统计
  const categoryMap = new Map<string, CategoryCount>();

  let v2Count = 0;
  let withHighlights = 0;

  for (const post of posts) {
    if (!post.params) continue;

    let params: V2Params;
    try {
      params = JSON.parse(post.params);
    } catch {
      continue;
    }

    // 只统计 V2 格式
    if (params.version !== 2 || !params.schema) continue;
    v2Count++;

    const category = params.schema.contentCategory || params.schema.context || 'unknown';
    const highlightCount = params.promptHighlights?.english?.length || 0;
    const fieldCount = params.schema.fields?.length || 0;

    if (highlightCount > 0) withHighlights++;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { category, count: 0, posts: [] });
    }

    const catData = categoryMap.get(category)!;
    catData.count++;
    catData.posts.push({
      id: post.id,
      title: post.title || 'Untitled',
      context: params.schema.context || '',
      highlightCount,
      fieldCount,
      hasImage: !!(post.thumbnailUrl || post.imageUrl),
    });
  }

  console.log(`📈 V2 格式帖子: ${v2Count}`);
  console.log(`✨ 有高亮的帖子: ${withHighlights}\n`);

  // 按类别显示统计
  console.log('='.repeat(80));
  console.log('📊 按类别统计:');
  console.log('='.repeat(80));

  const sortedCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.count - a.count);

  for (const cat of sortedCategories) {
    console.log(`\n🏷️ ${cat.category} (${cat.count} 个)`);

    // 排序：优先有高亮、有图片的
    const topPosts = cat.posts
      .sort((a, b) => {
        if (b.highlightCount !== a.highlightCount) return b.highlightCount - a.highlightCount;
        if (b.hasImage !== a.hasImage) return b.hasImage ? 1 : -1;
        return b.fieldCount - a.fieldCount;
      })
      .slice(0, 5);

    for (const post of topPosts) {
      const indicators = [];
      if (post.highlightCount > 0) indicators.push(`✨${post.highlightCount} highlights`);
      if (post.hasImage) indicators.push('🖼️ has image');
      indicators.push(`📝${post.fieldCount} fields`);

      console.log(`   • ${post.title.slice(0, 50)}`);
      console.log(`     ID: ${post.id}`);
      console.log(`     Context: ${post.context.slice(0, 60)}`);
      console.log(`     ${indicators.join(' | ')}`);
    }
  }

  // 推荐的 9 个预设候选（每类挑最好的）
  console.log('\n');
  console.log('='.repeat(80));
  console.log('🌟 推荐的 9 个预设候选:');
  console.log('='.repeat(80));

  // 目标覆盖的类别
  const targetCategories = [
    'illustration',
    'graphic_design',
    'photography',
    'other',
  ];

  const recommendations: Array<{
    category: string;
    id: string;
    title: string;
    context: string;
    score: number;
  }> = [];

  for (const cat of sortedCategories) {
    // 找每个类别中最好的2-3个
    const best = cat.posts
      .filter(p => p.hasImage && p.highlightCount > 0)
      .sort((a, b) => b.highlightCount - a.highlightCount)
      .slice(0, 3);

    for (const post of best) {
      recommendations.push({
        category: cat.category,
        id: post.id,
        title: post.title,
        context: post.context,
        score: post.highlightCount * 2 + post.fieldCount,
      });
    }
  }

  // 按分数排序，取前 9 个
  const top9 = recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  for (let i = 0; i < top9.length; i++) {
    const rec = top9[i];
    console.log(`\n${i + 1}. [${rec.category}] ${rec.title.slice(0, 50)}`);
    console.log(`   ID: ${rec.id}`);
    console.log(`   Context: ${rec.context.slice(0, 80)}`);
    console.log(`   Score: ${rec.score}`);
  }

  // 输出可直接使用的配置
  console.log('\n');
  console.log('='.repeat(80));
  console.log('📋 可直接使用的配置 (复制到迁移脚本):');
  console.log('='.repeat(80));
  console.log('\nconst SYSTEM_PRESETS = [');
  for (let i = 0; i < Math.min(9, top9.length); i++) {
    const rec = top9[i];
    const slug = rec.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    console.log(`  {`);
    console.log(`    postId: '${rec.id}',`);
    console.log(`    slug: '${slug}',`);
    console.log(`    name: '${rec.title.slice(0, 40)}',`);
    console.log(`    category: '${rec.category}',`);
    console.log(`    order: ${i + 1},`);
    console.log(`  },`);
  }
  console.log('];');

  process.exit(0);
}

analyzePresetCandidates().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
