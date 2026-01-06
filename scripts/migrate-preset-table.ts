/**
 * V15.0 预设系统数据库迁移脚本
 *
 * 创建独立的 preset 表
 *
 * 使用方法:
 *   pnpm tsx scripts/migrate-preset-table.ts
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../src/core/db';

async function migrate() {
  console.log('🔧 Creating preset table...\n');

  try {
    // 创建 preset 表
    await db().execute(sql`
      CREATE TABLE IF NOT EXISTS "preset" (
        "id" text PRIMARY KEY,
        "slug" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "category" text,
        "type" text NOT NULL DEFAULT 'user',
        "user_id" text REFERENCES "user"("id") ON DELETE CASCADE,
        "source_post_id" text REFERENCES "community_post"("id") ON DELETE SET NULL,
        "params" text NOT NULL,
        "thumbnail_url" text,
        "image_url" text,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('   ✅ Created table: preset');

    // 创建索引
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_preset_type_order" ON "preset" ("type", "display_order")
    `);
    console.log('   ✅ Created index: idx_preset_type_order');

    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_preset_user" ON "preset" ("user_id")
    `);
    console.log('   ✅ Created index: idx_preset_user');

    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_preset_category" ON "preset" ("category")
    `);
    console.log('   ✅ Created index: idx_preset_category');

    console.log('\n✅ Preset table migration completed!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
