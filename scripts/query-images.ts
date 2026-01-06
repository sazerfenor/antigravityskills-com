import { db } from '../src/core/db';
import { communityPost } from '../src/config/db/schema';
import { isNotNull, desc, like } from 'drizzle-orm';

async function main() {
  // 查找 portrait, landscape, logo 相关的图片
  const keywords = ['portrait', 'landscape', 'logo'];

  for (const keyword of keywords) {
    console.log(`\n=== ${keyword.toUpperCase()} ===`);
    const posts = await db().select({
      imageUrl: communityPost.imageUrl,
    })
      .from(communityPost)
      .where(like(communityPost.prompt, `%${keyword}%`))
      .orderBy(desc(communityPost.createdAt))
      .limit(3);

    posts.forEach((p, i) => {
      console.log(`${i+1}. ${p.imageUrl}`);
    });
  }

  process.exit(0);
}
main().catch(console.error);
