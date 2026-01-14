/**
 * 验证社区帖子的标签分布
 * 用于评估路由结构实现的可行性
 */

import { db } from '../src/core/db';
import { communityPost } from '../src/config/db/schema.sqlite';
import { eq, and } from 'drizzle-orm';
import { GALLERY_CATEGORIES } from '../src/shared/constants/gallery-categories';

interface TagStats {
  tag: string;
  count: number;
  slugified: string;
}

/**
 * 标签slug化：转小写 + 空格替换为连字符
 */
function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, ''); // 保留中文、英文、数字、连字符
}

async function verifyTags() {
  console.log('='.repeat(70));
  console.log('📊 社区帖子标签分布验证');
  console.log('='.repeat(70));

  // 1. 统计总体情况
  const allPosts = await db()
    .select({
      id: communityPost.id,
      category: communityPost.category,
      visualTags: communityPost.visualTags,
      status: communityPost.status,
    })
    .from(communityPost);

  console.log(`\n总帖子数: ${allPosts.length}`);

  const publishedPosts = allPosts.filter(p => p.status === 'published');
  console.log(`已发布: ${publishedPosts.length}`);
  console.log(`未发布: ${allPosts.length - publishedPosts.length}`);

  // 2. 检查visualTags字段情况
  const postsWithTags = publishedPosts.filter(p => p.visualTags);
  const postsWithoutTags = publishedPosts.filter(p => !p.visualTags);

  console.log(`\nvisualTags字段情况:`);
  console.log(`  有标签: ${postsWithTags.length}`);
  console.log(`  无标签: ${postsWithoutTags.length}`);

  if (postsWithoutTags.length > 0) {
    console.log(`\n⚠️  警告: ${postsWithoutTags.length} 个帖子没有visualTags，将无法被标签路由访问`);
  }

  // 3. 显示前3个帖子的visualTags示例
  console.log(`\n📝 visualTags格式示例（前3个）:`);
  for (let i = 0; i < Math.min(3, postsWithTags.length); i++) {
    const post = postsWithTags[i];
    console.log(`\n  帖子 ${i + 1} (${post.id.substring(0, 8)}...)`);
    console.log(`  Category: ${post.category}`);
    try {
      const tags = JSON.parse(post.visualTags!);
      console.log(`  Tags (${tags.length}): ${JSON.stringify(tags)}`);
    } catch (e) {
      console.log(`  ❌ JSON解析失败: ${post.visualTags}`);
    }
  }

  // 4. 按分类统计
  console.log('\n' + '='.repeat(70));
  console.log('📂 按分类统计');
  console.log('='.repeat(70));

  const categoryStats: Record<string, {
    total: number;
    withTags: number;
    tags: Record<string, number>;
  }> = {};

  for (const category of GALLERY_CATEGORIES) {
    const posts = publishedPosts.filter(p => p.category === category);
    const withTags = posts.filter(p => p.visualTags);

    categoryStats[category] = {
      total: posts.length,
      withTags: withTags.length,
      tags: {},
    };

    // 聚合标签
    for (const post of withTags) {
      try {
        const tags = JSON.parse(post.visualTags!) as string[];
        for (const tag of tags) {
          categoryStats[category].tags[tag] = (categoryStats[category].tags[tag] || 0) + 1;
        }
      } catch (e) {
        // 跳过解析失败的
      }
    }
  }

  // 5. 输出每个分类的统计
  let totalTagsWith5Plus = 0;

  for (const category of GALLERY_CATEGORIES) {
    const stats = categoryStats[category];
    const tagList: TagStats[] = Object.entries(stats.tags)
      .map(([tag, count]) => ({
        tag,
        count,
        slugified: slugifyTag(tag),
      }))
      .sort((a, b) => b.count - a.count);

    const validTags = tagList.filter(t => t.count >= 5);

    console.log(`\n📁 ${category}`);
    console.log(`  帖子数: ${stats.total} (有标签: ${stats.withTags})`);
    console.log(`  该分类标签数: ${tagList.length}`);
    console.log(`  有效标签 (≥5帖子): ${validTags.length}`);

    totalTagsWith5Plus += validTags.length;

    if (validTags.length > 0) {
      console.log(`\n  Top 10 有效标签:`);
      for (const { tag, count, slugified } of validTags.slice(0, 10)) {
        console.log(`    ${count.toString().padStart(3)} × "${tag}" → /${category}/${slugified}`);
      }
    } else {
      console.log(`  ⚠️  警告: 该分类没有达到5个帖子的标签！`);
    }

    // 显示不足5个的标签（如果有的话）
    const lowCountTags = tagList.filter(t => t.count < 5);
    if (lowCountTags.length > 0) {
      console.log(`\n  不足5个帖子的标签 (${lowCountTags.length}个):`);
      for (const { tag, count } of lowCountTags.slice(0, 5)) {
        console.log(`    ${count} × "${tag}"`);
      }
      if (lowCountTags.length > 5) {
        console.log(`    ... 还有 ${lowCountTags.length - 5} 个`);
      }
    }
  }

  // 6. 全局去重收集所有标签
  const allTagCounts: Record<string, number> = {};
  for (const category of GALLERY_CATEGORIES) {
    const tags = categoryStats[category].tags;
    for (const [tag, count] of Object.entries(tags)) {
      allTagCounts[tag] = (allTagCounts[tag] || 0) + count;
    }
  }

  // 统计全局有效标签（≥5帖子）
  const globalValidTags = Object.entries(allTagCounts).filter(([_, count]) => count >= 5);

  // 7. 总结
  console.log('\n' + '='.repeat(70));
  console.log('📊 总结');
  console.log('='.repeat(70));
  console.log(`\n总标签数（全局去重）: ${Object.keys(allTagCounts).length}`);
  console.log(`有效标签数 (≥5帖子，全局统计): ${globalValidTags.length}`);
  console.log(`\n路由数量估算:`);
  console.log(`  分类页: ${GALLERY_CATEGORIES.length}`);
  console.log(`  标签页: ${globalValidTags.length}`);
  console.log(`  总路由: ${GALLERY_CATEGORIES.length + globalValidTags.length}`);

  // 8. 检查trending keywords是否存在
  console.log('\n' + '='.repeat(70));
  console.log('🔥 Trending Keywords 匹配检查');
  console.log('='.repeat(70));

  const TRENDING_CONFIG = {
    'face-lock': ['face lock', 'identity', 'face swap', 'same face'],
    'y2k-flash': ['y2k', 'flash', 'retro', 'nostalgic'],
    'photo-grid': ['photo grid', 'grid', 'collage', 'multi-photo'],
    'miniature-world': ['miniature', 'tiny', 'small world', 'macro'],
    'aesthetics': ['aesthetic', 'vibe', 'mood', 'style'],
  };

  for (const [slug, keywords] of Object.entries(TRENDING_CONFIG)) {
    console.log(`\n🔥 ${slug}`);
    console.log(`  Keywords: ${keywords.join(', ')}`);

    const matchedTags: Array<{ keyword: string; actualTag: string; count: number }> = [];

    for (const keyword of keywords) {
      // 查找精确匹配或包含关系
      for (const [actualTag, count] of Object.entries(allTagCounts)) {
        const normalizedActual = actualTag.toLowerCase();
        const normalizedKeyword = keyword.toLowerCase();

        if (normalizedActual === normalizedKeyword ||
            normalizedActual.includes(normalizedKeyword) ||
            normalizedKeyword.includes(normalizedActual)) {
          matchedTags.push({ keyword, actualTag, count });
        }
      }
    }

    if (matchedTags.length > 0) {
      console.log(`  ✅ 找到 ${matchedTags.length} 个匹配标签:`);
      for (const { keyword, actualTag, count } of matchedTags) {
        console.log(`    "${keyword}" → "${actualTag}" (${count}帖子)`);
      }

      const totalPosts = matchedTags.reduce((sum, m) => sum + m.count, 0);
      console.log(`  总帖子数: ${totalPosts}`);
    } else {
      console.log(`  ❌ 没有找到匹配的标签`);
    }
  }

  // 8. 建议
  console.log('\n' + '='.repeat(70));
  console.log('💡 建议');
  console.log('='.repeat(70));

  if (totalTagsWith5Plus < 10) {
    console.log('\n⚠️  有效标签数较少，建议：');
    console.log('  1. 降低最小帖子数要求（从5降到3）');
    console.log('  2. 或继续运行pipeline生成更多帖子');
    console.log('  3. 检查SEO生成是否正确填充visualTags字段');
  } else {
    console.log('\n✅ 有效标签数充足，可以开始实现路由结构');
  }

  if (postsWithoutTags.length > 10) {
    console.log('\n⚠️  大量帖子缺少visualTags，建议：');
    console.log('  1. 检查SEO生成流程是否正常');
    console.log('  2. 对现有帖子补充标签（运行修复脚本）');
  }
}

verifyTags().catch(console.error);
