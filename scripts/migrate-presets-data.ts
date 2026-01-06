/**
 * V15.0 预设数据迁移脚本
 *
 * 将 community_post 表中标记为预设的数据迁移到新的 preset 表
 *
 * 使用方法:
 *   pnpm tsx scripts/migrate-presets-data.ts
 *   pnpm tsx scripts/migrate-presets-data.ts --dry-run  # 预览模式
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/core/db';
import { communityPost, preset } from '../src/config/db/schema';
import { getUuid } from '../src/shared/lib/hash';

// 初始系统预设列表（从 init-presets.ts 复制）
const SYSTEM_PRESETS = [
  {
    postId: '391e6bac-9b04-4cbe-9b29-62dce0ed8404',
    slug: 'isometric-office',
    name: '3D Isometric Office',
    category: 'illustration',
    order: 1,
  },
  {
    postId: 'ace4c44d-55cc-459e-bc86-805fd9a0cc5d',
    slug: 'emoji-stickers',
    name: 'Emoji Sticker Set',
    category: 'design',
    order: 2,
  },
  {
    postId: 'a1c11fcf-0afa-4137-8354-e795d5e96890',
    slug: 'tarot-card',
    name: 'Dark Gothic Tarot',
    category: 'illustration',
    order: 3,
  },
];

async function migratePresets() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🔧 Migrating presets to new table...');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const presetConfig of SYSTEM_PRESETS) {
    console.log(`📌 Processing: ${presetConfig.name}`);

    // 获取原始帖子数据
    const [post] = await db()
      .select({
        id: communityPost.id,
        params: communityPost.params,
        imageUrl: communityPost.imageUrl,
        thumbnailUrl: communityPost.thumbnailUrl,
      })
      .from(communityPost)
      .where(eq(communityPost.id, presetConfig.postId))
      .limit(1);

    if (!post) {
      console.log(`   ❌ Post not found: ${presetConfig.postId}`);
      skippedCount++;
      continue;
    }

    // 验证 V2 params
    let params: any = null;
    try {
      if (post.params) {
        params = JSON.parse(post.params);
      }
    } catch (e) {
      console.log(`   ❌ Invalid params JSON`);
      skippedCount++;
      continue;
    }

    if (!params || params.version !== 2 || !params.schema) {
      console.log(`   ❌ Not V2 format`);
      skippedCount++;
      continue;
    }

    // 检查是否已存在
    const [existing] = await db()
      .select({ id: preset.id })
      .from(preset)
      .where(eq(preset.slug, presetConfig.slug))
      .limit(1);

    if (existing) {
      console.log(`   ⏭️ Already exists in preset table`);
      skippedCount++;
      continue;
    }

    console.log(`   ✅ V2 format verified`);
    console.log(`   📊 Fields: ${params.schema.fields?.length || 0}`);
    console.log(`   🔦 Highlights: ${params.promptHighlights?.english?.length || 0}`);

    if (isDryRun) {
      console.log(`   🔍 DRY RUN: Would insert into preset table`);
    } else {
      // 插入到新的 preset 表
      await db()
        .insert(preset)
        .values({
          id: getUuid(),
          slug: presetConfig.slug,
          name: presetConfig.name,
          category: presetConfig.category,
          type: 'system',
          userId: null,
          sourcePostId: post.id,
          params: post.params || '{}',
          thumbnailUrl: post.thumbnailUrl,
          imageUrl: post.imageUrl,
          displayOrder: presetConfig.order,
          isActive: true,
        });

      console.log(`   ✅ Inserted into preset table`);
      migratedCount++;
    }

    console.log('');
  }

  console.log('✅ Migration complete!');
  console.log(`   Migrated: ${migratedCount}`);
  console.log(`   Skipped: ${skippedCount}`);

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }

  process.exit(0);
}

migratePresets().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
