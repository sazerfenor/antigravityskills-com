/**
 * 清理 community_post 表中的旧预设字段
 *
 * 删除已迁移到独立 preset 表的字段：
 * - is_preset
 * - preset_slug
 * - preset_name
 * - preset_order
 * - preset_category
 *
 * 使用方法:
 *   pnpm tsx scripts/cleanup-old-preset-fields.ts
 *   pnpm tsx scripts/cleanup-old-preset-fields.ts --dry-run  # 预览模式
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../src/core/db';

async function cleanup() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🧹 Cleaning up old preset fields from community_post...');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  const steps = [
    {
      desc: 'Drop index idx_community_post_preset',
      sql: sql`DROP INDEX IF EXISTS "idx_community_post_preset"`,
    },
    {
      desc: 'Drop index idx_community_post_preset_slug',
      sql: sql`DROP INDEX IF EXISTS "idx_community_post_preset_slug"`,
    },
    {
      desc: 'Drop column is_preset',
      sql: sql`ALTER TABLE "community_post" DROP COLUMN IF EXISTS "is_preset"`,
    },
    {
      desc: 'Drop column preset_slug',
      sql: sql`ALTER TABLE "community_post" DROP COLUMN IF EXISTS "preset_slug"`,
    },
    {
      desc: 'Drop column preset_name',
      sql: sql`ALTER TABLE "community_post" DROP COLUMN IF EXISTS "preset_name"`,
    },
    {
      desc: 'Drop column preset_order',
      sql: sql`ALTER TABLE "community_post" DROP COLUMN IF EXISTS "preset_order"`,
    },
    {
      desc: 'Drop column preset_category',
      sql: sql`ALTER TABLE "community_post" DROP COLUMN IF EXISTS "preset_category"`,
    },
  ];

  for (const step of steps) {
    if (isDryRun) {
      console.log(`   🔍 Would: ${step.desc}`);
    } else {
      try {
        await db().execute(step.sql);
        console.log(`   ✅ ${step.desc}`);
      } catch (e: any) {
        console.log(`   ⚠️ ${step.desc}: ${e.message}`);
      }
    }
  }

  console.log('\n✅ Cleanup complete!');

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }

  process.exit(0);
}

cleanup().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
