/**
 * 添加更多系统预设
 *
 * 从分析结果中选取 6 个高质量代表性预设，加上现有 3 个共 9 个
 *
 * 使用方法:
 *   pnpm tsx scripts/add-more-presets.ts
 *   pnpm tsx scripts/add-more-presets.ts --dry-run  # 预览模式
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/core/db';
import { communityPost, preset } from '../src/config/db/schema';
import { getUuid } from '../src/shared/lib/hash';

// 新增的 6 个系统预设（基于分析结果选取）
// 选择标准：高亮数多、有图片、类别多样化
const NEW_SYSTEM_PRESETS = [
  // 1. Y2K Scrapbook Poster - 26 highlights，设计类
  {
    postId: 'fe0fa363-3a0b-4582-b4a6-48b254e2c1b9',
    slug: 'y2k-scrapbook-poster',
    name: 'Y2K Scrapbook Poster',
    category: 'graphic_design',
    order: 4,
  },
  // 2. 1984 Movie Storyboard - 20 highlights，影视创作
  {
    postId: 'f2320390-e9be-4a81-a62d-22c95d5a7b1f',
    slug: 'movie-storyboard',
    name: 'Movie Storyboard',
    category: 'illustration',
    order: 5,
  },
  // 3. LEGO Packaging Design - 18 highlights，产品包装
  {
    postId: '03beb970-c8cb-42a0-b56d-ab046e7d570e',
    slug: 'lego-packaging',
    name: 'LEGO Minifigure Packaging',
    category: 'graphic_design',
    order: 6,
  },
  // 4. Therapy Session Concept - 18 highlights，概念插画
  {
    postId: '5651bc27-f455-4734-a041-f7870e067a10',
    slug: 'therapy-concept',
    name: 'Therapy Session Concept',
    category: 'illustration',
    order: 7,
  },
  // 5. Photo Restoration - 17 highlights，照片修复
  {
    postId: '7e52d539-7aca-4a3d-8c73-5664c1fe9168',
    slug: 'photo-restoration',
    name: 'Photo Restoration',
    category: 'photography',
    order: 8,
  },
  // 6. Fighting Game Scene - 17 highlights，游戏UI
  {
    postId: '82d46b82-940a-4100-a8b7-316596ffda73',
    slug: 'fighting-game-ui',
    name: 'Fighting Game Interface',
    category: 'graphic_design',
    order: 9,
  },
];

async function addMorePresets() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🔧 Adding more system presets...');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  let addedCount = 0;
  let skippedCount = 0;

  for (const presetConfig of NEW_SYSTEM_PRESETS) {
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
    console.log(`   🎨 Model: ${params.model || 'default'}`);
    console.log(`   📐 Ratio: ${params.aspectRatio || '1:1'}`);

    if (isDryRun) {
      console.log(`   🔍 DRY RUN: Would insert into preset table`);
    } else {
      // 插入到 preset 表
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
      addedCount++;
    }

    console.log('');
  }

  console.log('✅ Complete!');
  console.log(`   Added: ${addedCount}`);
  console.log(`   Skipped: ${skippedCount}`);

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }

  // 显示当前所有系统预设
  console.log('\n📋 Current system presets:');
  const allPresets = await db()
    .select({
      slug: preset.slug,
      name: preset.name,
      category: preset.category,
      order: preset.displayOrder,
    })
    .from(preset)
    .where(eq(preset.type, 'system'))
    .orderBy(preset.displayOrder);

  for (const p of allPresets) {
    console.log(`   ${p.order}. [${p.category}] ${p.name} (${p.slug})`);
  }

  process.exit(0);
}

addMorePresets().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
