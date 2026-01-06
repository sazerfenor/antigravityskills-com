/**
 * 预设系统数据库迁移脚本
 *
 * 添加 community_post 表的预设相关字段
 *
 * 使用方法:
 *   pnpm tsx scripts/migrate-preset-fields.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../src/core/db';

async function migrate() {
  console.log('🔧 Starting preset fields migration...\n');

  try {
    // Add columns with IF NOT EXISTS (PostgreSQL 9.6+)
    const migrations = [
      {
        name: 'is_preset',
        sql: sql`ALTER TABLE "community_post" ADD COLUMN IF NOT EXISTS "is_preset" boolean DEFAULT false`,
      },
      {
        name: 'preset_slug',
        sql: sql`ALTER TABLE "community_post" ADD COLUMN IF NOT EXISTS "preset_slug" text`,
      },
      {
        name: 'preset_name',
        sql: sql`ALTER TABLE "community_post" ADD COLUMN IF NOT EXISTS "preset_name" text`,
      },
      {
        name: 'preset_order',
        sql: sql`ALTER TABLE "community_post" ADD COLUMN IF NOT EXISTS "preset_order" integer DEFAULT 0`,
      },
      {
        name: 'preset_category',
        sql: sql`ALTER TABLE "community_post" ADD COLUMN IF NOT EXISTS "preset_category" text`,
      },
    ];

    for (const m of migrations) {
      await db().execute(m.sql);
      console.log(`   ✅ Added column: ${m.name}`);
    }

    // Create indexes
    await db().execute(
      sql`CREATE INDEX IF NOT EXISTS "idx_community_post_preset" ON "community_post" ("is_preset", "preset_order")`
    );
    console.log('   ✅ Created index: idx_community_post_preset');

    await db().execute(
      sql`CREATE INDEX IF NOT EXISTS "idx_community_post_preset_slug" ON "community_post" ("preset_slug")`
    );
    console.log('   ✅ Created index: idx_community_post_preset_slug');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
