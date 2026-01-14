/**
 * 查找社区中缺少高亮的帖子
 */

import { db } from '../src/core/db';
import { communityPost, user } from '../src/config/db/schema.sqlite';
import { eq } from 'drizzle-orm';

async function findPostsWithoutHighlights() {
  // 查询所有已发布的帖子
  const posts = await db()
    .select({
      id: communityPost.id,
      seoSlug: communityPost.seoSlug,
      prompt: communityPost.prompt,
      params: communityPost.params,
      userId: communityPost.userId,
      userName: user.name,
    })
    .from(communityPost)
    .leftJoin(user, eq(communityPost.userId, user.id))
    .where(eq(communityPost.status, 'published'));

  console.log(`\n总帖子数: ${posts.length}`);

  // 分类统计
  const withHighlights: typeof posts = [];
  const withoutHighlights: typeof posts = [];
  const noParams: typeof posts = [];

  for (const post of posts) {
    if (!post.params) {
      noParams.push(post);
      continue;
    }

    try {
      const parsed = JSON.parse(post.params);
      const highlights = parsed.promptHighlights?.english || [];

      if (highlights.length > 0) {
        withHighlights.push(post);
      } else {
        withoutHighlights.push(post);
      }
    } catch (e) {
      noParams.push(post);
    }
  }

  console.log(`\n📊 统计:`);
  console.log(`  ✅ 有高亮: ${withHighlights.length}`);
  console.log(`  ❌ 无高亮: ${withoutHighlights.length}`);
  console.log(`  ⚠️ 无 params: ${noParams.length}`);

  if (withoutHighlights.length > 0) {
    console.log(`\n❌ 无高亮的帖子:`);
    for (const post of withoutHighlights) {
      const slug = post.seoSlug ? post.seoSlug.substring(0, 50) : 'no-slug';
      console.log(`  - ${post.id} | ${slug} | 作者: ${post.userName || post.userId}`);
    }
  }

  if (noParams.length > 0) {
    console.log(`\n⚠️ 无 params 的帖子:`);
    for (const post of noParams) {
      const slug = post.seoSlug ? post.seoSlug.substring(0, 50) : 'no-slug';
      console.log(`  - ${post.id} | ${slug} | 作者: ${post.userName || post.userId}`);
    }
  }

  // 输出需要删除的 ID 列表
  const toDelete = [...withoutHighlights, ...noParams];
  if (toDelete.length > 0) {
    console.log(`\n🗑️ 需要删除的帖子 ID (共 ${toDelete.length} 个):`);
    console.log(JSON.stringify(toDelete.map(p => p.id)));
  }

  return toDelete;
}

findPostsWithoutHighlights().catch(console.error);
