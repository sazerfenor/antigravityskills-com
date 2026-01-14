/**
 * 清理所有虚拟用户及其关联数据
 */
import { db } from '@/core/db';
import { user, virtualPersona } from '@/config/db/schema.sqlite';
import { eq } from 'drizzle-orm';

async function cleanup() {
  console.log('🧹 清理虚拟用户...');

  // 1. 获取所有虚拟用户
  const virtualUsers = await db()
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.isVirtual, true));

  console.log(`找到 ${virtualUsers.length} 个虚拟用户`);

  if (virtualUsers.length === 0) {
    console.log('没有需要清理的用户');
    return;
  }

  // 2. 删除 virtual_persona 记录
  for (const vu of virtualUsers) {
    await db().delete(virtualPersona).where(eq(virtualPersona.userId, vu.id));
    console.log(`  删除 persona: ${vu.name}`);
  }

  // 3. 删除 user 记录
  await db().delete(user).where(eq(user.isVirtual, true));

  console.log(`\n✅ 清理完成！删除了 ${virtualUsers.length} 个虚拟用户`);
}

cleanup().catch(console.error);
