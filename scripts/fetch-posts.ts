// 查询社区图片的脚本
import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

async function fetchPosts() {
  console.log('正在查询社区图片...\n');
  
  const posts = await (db() as any)
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      model: communityPost.model,
      imageUrl: communityPost.imageUrl,
      status: communityPost.status,
    })
    .from(communityPost)
    .where(eq(communityPost.status, 'published'))
    .limit(9);
  
  console.log(`找到 ${posts.length} 张图片:\n`);
  
  posts.forEach((post: any, index: number) => {
    console.log(`--- 图片 ${index + 1} ---`);
    console.log(`ID: ${post.id}`);
    console.log(`Model: ${post.model}`);
    console.log(`Prompt: ${post.prompt?.slice(0, 150)}...`);
    console.log(`Image: ${post.imageUrl}`);
    console.log('');
  });
  
  // 以JSON格式输出完整数据
  console.log('\n=== JSON格式（完整数据）===');
  console.log(JSON.stringify(posts, null, 2));
}

fetchPosts()
  .then(() => {
    console.log('\n查询完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
