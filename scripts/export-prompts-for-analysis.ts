import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema';
import { isNull } from 'drizzle-orm';
import fs from 'fs';

async function exportPrompts() {
  console.log('📤 导出需要分析的 prompts...\n');

  const posts = await db()
    .select({
      id: communityPost.id,
      prompt: communityPost.prompt,
      category: communityPost.category,
    })
    .from(communityPost)
    .where(isNull(communityPost.subcategory));

  console.log(`找到 ${posts.length} 条需要分析的 prompts`);

  const output = posts.map(p => ({
    id: p.id,
    prompt: p.prompt,
    category: p.category,
    // AI 将填充这个字段
    subcategory: null,
  }));

  fs.writeFileSync('logs/prompts-need-subcategory.json', JSON.stringify(output, null, 2));
  console.log(`\n✅ 已导出到 logs/prompts-need-subcategory.json`);
  console.log(`   准备用 AI 分析 subcategory`);

  process.exit(0);
}

exportPrompts().catch(console.error);
