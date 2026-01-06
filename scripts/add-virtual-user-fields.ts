/**
 * 添加虚拟用户字段到数据库
 * 运行: pnpm tsx scripts/add-virtual-user-fields.ts
 */

import { db } from '../src/core/db';
import { sql } from 'drizzle-orm';

async function addVirtualUserFields() {
  console.log('🔄 Adding virtual user fields to database...\n');

  try {
    // 1. Add is_virtual column
    console.log('Adding is_virtual column...');
    await db().execute(sql`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN DEFAULT false NOT NULL
    `);
    console.log('✅ Added is_virtual');

    // 2. Add bio column
    console.log('Adding bio column...');
    await db().execute(sql`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS bio TEXT
    `);
    console.log('✅ Added bio');

    // 3. Add original_twitter_handle column
    console.log('Adding original_twitter_handle column...');
    await db().execute(sql`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS original_twitter_handle VARCHAR(100)
    `);
    console.log('✅ Added original_twitter_handle');

    // 4. Add original_twitter_url column
    console.log('Adding original_twitter_url column...');
    await db().execute(sql`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS original_twitter_url TEXT
    `);
    console.log('✅ Added original_twitter_url');

    // 5. Add index for filtering
    console.log('Creating index on is_virtual...');
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_is_virtual ON "user" (is_virtual)
    `);
    console.log('✅ Created index');

    console.log('\n🎉 All virtual user fields added successfully!');
    console.log('\nNew columns:');
    console.log('  - is_virtual (BOOLEAN) - 标记虚拟用户');
    console.log('  - bio (TEXT) - 虚拟作者简介');
    console.log('  - original_twitter_handle (VARCHAR) - 原始 Twitter 用户名');
    console.log('  - original_twitter_url (TEXT) - 原始 Twitter 链接');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Some columns already exist (this is fine)');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }

  process.exit(0);
}

addVirtualUserFields();
