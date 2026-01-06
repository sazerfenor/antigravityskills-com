import { db } from '../src/core/db';
import { communityPost } from '../src/config/db/schema';
import { isNotNull, desc, or, like } from 'drizzle-orm';

async function main() {
  // 查找 logo 相关的图片
  const posts = await db().select({
    imageUrl: communityPost.imageUrl,
    prompt: communityPost.prompt
  })
    .from(communityPost)
    .where(
      or(
        like(communityPost.prompt, '%logo%'),
        like(communityPost.prompt, '%emblem%'),
        like(communityPost.prompt, '%brand%')
      )
    )
    .orderBy(desc(communityPost.createdAt))
    .limit(10);

  console.log('Found logo images:');
  posts.forEach((p, i) => {
    const promptPreview = p.prompt ? p.prompt.slice(0, 80) : '';
    console.log(`${i+1}. ${p.imageUrl}`);
    console.log(`   ${promptPreview}...`);
    console.log('');
  });

  process.exit(0);
}
main().catch(console.error);
