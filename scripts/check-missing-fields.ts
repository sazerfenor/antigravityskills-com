import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { sql, isNull, and, eq } from 'drizzle-orm';

async function checkMissingFields() {
  console.log('检查 community_post 表字段缺失情况...\n');

  // 1. 总帖子数
  const totalPosts = await db()
    .select({ count: sql<number>`count(*)` })
    .from(communityPost);
  console.log(`📊 总帖子数: ${totalPosts[0].count}`);

  // 2. 已发布帖子数
  const publishedPosts = await db()
    .select({ count: sql<number>`count(*)` })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'));
  console.log(`✅ 已发布帖子数: ${publishedPosts[0].count}\n`);

  // 3. 检查 subcategory 缺失
  const missingSubcategory = await db()
    .select({ count: sql<number>`count(*)` })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        isNull(communityPost.subcategory)
      )
    );
  console.log(`🔴 subcategory 为 NULL 的已发布帖子: ${missingSubcategory[0].count}`);

  // 4. 检查 title 缺失
  const missingTitle = await db()
    .select({ count: sql<number>`count(*)` })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        isNull(communityPost.title)
      )
    );
  console.log(`🔴 title 为 NULL 的已发布帖子: ${missingTitle[0].count}`);

  // 5. 检查 anchor 缺失
  const missingAnchor = await db()
    .select({ count: sql<number>`count(*)` })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        isNull(communityPost.anchor)
      )
    );
  console.log(`⚠️  anchor 为 NULL 的已发布帖子: ${missingAnchor[0].count}`);

  // 6. 检查 microFocus 缺失
  const missingMicroFocus = await db()
    .select({ count: sql<number>`count(*)` })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        isNull(communityPost.microFocus)
      )
    );
  console.log(`⚠️  microFocus 为 NULL 的已发布帖子: ${missingMicroFocus[0].count}`);

  // 7. 检查 params 缺失
  const missingParams = await db()
    .select({ count: sql<number>`count(*)` })
    .from(communityPost)
    .where(
      and(
        eq(communityPost.status, 'published'),
        isNull(communityPost.params)
      )
    );
  console.log(`🔴 params 为 NULL 的已发布帖子: ${missingParams[0].count}`);

  // 8. 抽样查看缺失字段的帖子
  console.log('\n📋 抽样查看缺失字段的帖子（前5条）:');
  const samplePosts = await db()
    .select({
      id: communityPost.id,
      createdAt: communityPost.createdAt,
      subcategory: communityPost.subcategory,
      title: communityPost.title,
      anchor: communityPost.anchor,
      microFocus: communityPost.microFocus,
      params: communityPost.params,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'))
    .orderBy(communityPost.createdAt)
    .limit(5);

  samplePosts.forEach((post, idx) => {
    console.log(`\n帖子 ${idx + 1}:`);
    console.log(`  ID: ${post.id}`);
    console.log(`  创建时间: ${post.createdAt}`);
    console.log(`  subcategory: ${post.subcategory || '❌ NULL'}`);
    console.log(`  title: ${post.title || '❌ NULL'}`);
    console.log(`  anchor: ${post.anchor || '❌ NULL'}`);
    console.log(`  microFocus: ${post.microFocus || '❌ NULL'}`);
    console.log(`  params: ${post.params ? '✅ 有数据' : '❌ NULL'}`);
  });
}

checkMissingFields()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  });
