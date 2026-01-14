import { db } from '@/core/db';
import { virtualPersona, user } from '@/config/db/schema';
import { eq, notInArray } from 'drizzle-orm';

async function findOrphans() {
  console.log('🔍 查找孤儿虚拟用户...\n');

  // 1. 获取所有虚拟 users
  const virtualUsers = await db()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(eq(user.isVirtual, true));

  console.log(`虚拟 Users: ${virtualUsers.length}`);

  // 2. 获取所有 personas 关联的 userIds
  const personas = await db()
    .select({
      userId: virtualPersona.userId,
    })
    .from(virtualPersona);

  console.log(`虚拟 Personas: ${personas.length}`);

  const personaUserIds = new Set(personas.map(p => p.userId));

  // 3. 找出没有 persona 的 users
  const orphanUsers = virtualUsers.filter(u => !personaUserIds.has(u.id));

  console.log(`\n孤儿 Users (有 user 但没有 persona): ${orphanUsers.length}`);
  orphanUsers.forEach(u => {
    console.log(`  - ${u.name} (${u.id}) - ${u.email}`);
  });

  // 4. 反向检查：有 persona 但 user 不是虚拟用户的情况
  const virtualUserIds = new Set(virtualUsers.map(u => u.id));
  const orphanPersonas = personas.filter(p => !virtualUserIds.has(p.userId));

  console.log(`\n孤儿 Personas (有 persona 但 user 不是虚拟): ${orphanPersonas.length}`);
  if (orphanPersonas.length > 0) {
    for (const p of orphanPersonas) {
      const [userInfo] = await db()
        .select({ name: user.name, isVirtual: user.isVirtual })
        .from(user)
        .where(eq(user.id, p.userId))
        .limit(1);
      console.log(`  - userId: ${p.userId}, user: ${userInfo?.name}, isVirtual: ${userInfo?.isVirtual}`);
    }
  }

  process.exit(0);
}

findOrphans().catch(console.error);
