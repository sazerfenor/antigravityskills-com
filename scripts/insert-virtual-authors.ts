/**
 * 插入虚拟作者到数据库
 * 运行: pnpm tsx scripts/insert-virtual-authors.ts
 */

import { db } from '../src/core/db';
import { user } from '../src/config/db/schema';
import { nanoid } from 'nanoid';
import fs from 'fs';

// 读取 AI 生成的虚拟作者数据
const authorsData = JSON.parse(
  fs.readFileSync('./virtual-authors-final.json', 'utf-8')
);

interface VirtualAuthor {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  category: string;
  tags: string[];
  matchedPromptIds: string[];
}

async function insertVirtualAuthors() {
  console.log('='.repeat(60));
  console.log('🤖 插入虚拟作者到数据库');
  console.log('='.repeat(60));

  const authors: VirtualAuthor[] = authorsData.virtualAuthors;
  console.log(`\n📊 准备插入 ${authors.length} 个虚拟作者:\n`);

  const insertedAuthors: any[] = [];

  for (const author of authors) {
    const userId = nanoid();
    const email = `virtual+${author.username}@nanobananapro.com`;

    console.log(`[${author.id}] ${author.displayName} (@${author.username})`);
    console.log(`   📧 ${email}`);
    console.log(`   📝 ${author.bio.substring(0, 50)}...`);
    console.log(`   📁 ${author.category} (${author.matchedPromptIds.length} prompts)`);

    try {
      const [inserted] = await db()
        .insert(user)
        .values({
          id: userId,
          name: author.displayName,
          email: email,
          emailVerified: true, // 虚拟用户无需验证
          isVirtual: true,
          bio: author.bio,
          // 保存原始数据到 metadata (可选)
        })
        .returning();

      insertedAuthors.push({
        id: inserted.id,
        username: author.username,
        displayName: author.displayName,
        email: email,
        category: author.category,
        promptCount: author.matchedPromptIds.length,
      });

      console.log(`   ✅ 已插入 (ID: ${inserted.id})\n`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`   ⚠️  跳过 - 用户已存在\n`);
      } else {
        console.error(`   ❌ 错误: ${error.message}\n`);
      }
    }
  }

  console.log('='.repeat(60));
  console.log(`✅ 成功插入 ${insertedAuthors.length}/${authors.length} 个虚拟作者`);
  console.log('='.repeat(60));

  // 保存插入结果
  fs.writeFileSync(
    'virtual-authors-inserted.json',
    JSON.stringify({
      insertedAt: new Date().toISOString(),
      count: insertedAuthors.length,
      authors: insertedAuthors,
    }, null, 2)
  );

  console.log('\n💾 插入结果已保存到: virtual-authors-inserted.json');

  // 显示汇总表
  console.log('\n📋 虚拟作者汇总:');
  console.log('-'.repeat(80));
  console.log('ID                     | 名称                 | 邮箱                           | Prompts');
  console.log('-'.repeat(80));
  
  for (const a of insertedAuthors) {
    console.log(
      `${a.id.substring(0, 20).padEnd(22)} | ${a.displayName.padEnd(20)} | ${a.email.padEnd(30)} | ${a.promptCount}`
    );
  }

  process.exit(0);
}

insertVirtualAuthors().catch(console.error);
