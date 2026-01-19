#!/usr/bin/env tsx
/**
 * 初始化 Skill 发布系统用户
 *
 * 用法:
 *   pnpm skill:init-user
 *
 * 创建 system-skill-bot 用户，用于自动发布 Skill 到 communityPost
 */

import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('🤖 初始化 Skill 发布系统用户...\n');

  // 动态导入数据库模块
  const { db } = await import('../src/core/db');
  const { user } = await import('../src/config/db/schema.sqlite');
  const { eq } = await import('drizzle-orm');

  const SYSTEM_USER_ID = 'system-skill-bot';
  const SYSTEM_USER_EMAIL = 'skill-bot@antigravityskills.com';
  const SYSTEM_USER_NAME = 'Skill Bot';

  // 检查用户是否已存在
  const [existing] = await db()
    .select()
    .from(user)
    .where(eq(user.id, SYSTEM_USER_ID))
    .limit(1);

  if (existing) {
    console.log('✅ 系统用户已存在:');
    console.log(`   - ID: ${existing.id}`);
    console.log(`   - Name: ${existing.name}`);
    console.log(`   - Email: ${existing.email}`);
    console.log(`   - isVirtual: ${existing.isVirtual}`);
    console.log('\n无需重复创建。');
    process.exit(0);
  }

  // 创建系统用户
  const now = new Date();
  const [newUser] = await db()
    .insert(user)
    .values({
      id: SYSTEM_USER_ID,
      name: SYSTEM_USER_NAME,
      email: SYSTEM_USER_EMAIL,
      emailVerified: true,
      isVirtual: true, // 标记为虚拟用户
      bio: 'Automated Skill publishing bot for Antigravity Skills platform.',
      image: '/images/skill-default.svg',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  console.log('✅ 系统用户创建成功:');
  console.log(`   - ID: ${newUser.id}`);
  console.log(`   - Name: ${newUser.name}`);
  console.log(`   - Email: ${newUser.email}`);
  console.log(`   - isVirtual: ${newUser.isVirtual}`);
  console.log('\n现在可以使用 pnpm skill:publish 发布 Skill 了。');
}

main().catch((e) => {
  console.error('💥 初始化失败:', e);
  process.exit(1);
});
