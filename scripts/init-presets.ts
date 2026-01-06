/**
 * 初始化系统预设脚本
 *
 * 将已验证的高质量帖子标记为系统预设
 *
 * 使用方法:
 *   pnpm tsx scripts/init-presets.ts
 *   pnpm tsx scripts/init-presets.ts --dry-run  # 预览模式
 */

import 'dotenv/config';
import { db } from '../src/core/db';
import { communityPost } from '../src/config/db/schema';
import { eq } from 'drizzle-orm';

// 初始系统预设列表
// 这些帖子已验证具有完整的 V2 params 和正确的 promptHighlights
const SYSTEM_PRESETS = [
  {
    id: '391e6bac-9b04-4cbe-9b29-62dce0ed8404',
    slug: 'isometric-office',
    name: '3D Isometric Office',
    category: 'illustration',
    order: 1,
  },
  {
    id: 'ace4c44d-55cc-459e-bc86-805fd9a0cc5d',
    slug: 'emoji-stickers',
    name: 'Emoji Sticker Set',
    category: 'design',
    order: 2,
  },
  {
    id: 'a1c11fcf-0afa-4137-8354-e795d5e96890',
    slug: 'tarot-card',
    name: 'Dark Gothic Tarot',
    category: 'illustration',
    order: 3,
  },
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🔧 Initializing System Presets...');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');

  for (const preset of SYSTEM_PRESETS) {
    console.log(`📌 Processing: ${preset.name} (${preset.id})`);

    // 验证帖子存在
    const [existingPost] = await db()
      .select({
        id: communityPost.id,
        status: communityPost.status,
        params: communityPost.params,
        imageUrl: communityPost.imageUrl,
        isPreset: communityPost.isPreset,
      })
      .from(communityPost)
      .where(eq(communityPost.id, preset.id))
      .limit(1);

    if (!existingPost) {
      console.log(`   ❌ Post not found: ${preset.id}`);
      continue;
    }

    // 验证 V2 params
    let params: any = null;
    try {
      if (existingPost.params) {
        params = JSON.parse(existingPost.params);
      }
    } catch (e) {
      console.log(`   ❌ Invalid params JSON`);
      continue;
    }

    if (!params || params.version !== 2 || !params.schema) {
      console.log(`   ❌ Not V2 format (version: ${params?.version})`);
      continue;
    }

    // 统计信息
    const highlightsCount = params.promptHighlights?.english?.length || 0;
    console.log(`   ✅ V2 format verified`);
    console.log(`   📊 Fields: ${params.schema.fields?.length || 0}`);
    console.log(`   🔦 Highlights: ${highlightsCount}`);
    console.log(`   🖼️ Image: ${existingPost.imageUrl ? 'Yes' : 'No'}`);
    console.log(`   📍 Already Preset: ${existingPost.isPreset ? 'Yes' : 'No'}`);

    if (isDryRun) {
      console.log(`   🔍 DRY RUN: Would update with:`);
      console.log(`      isPreset: true`);
      console.log(`      presetSlug: ${preset.slug}`);
      console.log(`      presetName: ${preset.name}`);
      console.log(`      presetCategory: ${preset.category}`);
      console.log(`      presetOrder: ${preset.order}`);
    } else {
      // 执行更新
      await db()
        .update(communityPost)
        .set({
          isPreset: true,
          presetSlug: preset.slug,
          presetName: preset.name,
          presetCategory: preset.category,
          presetOrder: preset.order,
          // 系统预设的 userId 保持不变（不设置为 null）
          // 因为帖子已有作者，我们只是标记它为预设
        })
        .where(eq(communityPost.id, preset.id));

      console.log(`   ✅ Updated successfully`);
    }

    console.log('');
  }

  console.log('✅ Preset initialization complete!');
  console.log(`   Total presets: ${SYSTEM_PRESETS.length}`);

  if (isDryRun) {
    console.log('');
    console.log('💡 Run without --dry-run to apply changes');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
