import { db } from '@/core/db';
import { virtualPersona, user } from '@/config/db/schema';
import { eq, count, sql } from 'drizzle-orm';

async function check() {
  console.log('正在检查虚拟作者状态...\n');

  const [personas] = await db().select({ count: count() }).from(virtualPersona);
  const [virtualUsers] = await db().select({ count: count() }).from(user).where(eq(user.isVirtual, true));

  console.log('虚拟 Persona:', personas.count);
  console.log('虚拟 User:', virtualUsers.count);

  if (personas.count > 0) {
    const byCategory = await db()
      .select({
        category: virtualPersona.category,
        count: count()
      })
      .from(virtualPersona)
      .groupBy(virtualPersona.category);

    console.log('\n按 Category 分布:');
    byCategory.forEach(r => console.log(`  ${r.category}: ${r.count}`));

    // 显示所有虚拟作者详情
    const allPersonas = await db()
      .select({
        id: virtualPersona.id,
        name: virtualPersona.name,
        category: virtualPersona.category,
        userId: virtualPersona.userId,
      })
      .from(virtualPersona)
      .limit(10);

    console.log('\n前 10 个虚拟作者:');
    allPersonas.forEach(p => console.log(`  ${p.name} (${p.category}) - userId: ${p.userId}`));
  }

  process.exit(0);
}

check().catch(console.error);
