import { db } from '@/core/db';
import { user, role, userRole } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getUuid } from '@/shared/lib/hash';

async function grantAdminRole() {
  const targetEmail = 'ansittlardyn@gmail.com';
  
  console.log(`\n🔍 Searching for user: ${targetEmail}`);
  
  // 1. Find user by email
  const [targetUser] = await db()
    .select()
    .from(user)
    .where(eq(user.email, targetEmail))
    .limit(1);
  
  if (!targetUser) {
    console.error(`❌ User not found: ${targetEmail}`);
    process.exit(1);
  }
  
  console.log(`✅ Found user:`, {
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    createdAt: targetUser.createdAt,
  });
  
  // 2. Find admin role
  console.log(`\n🔍 Searching for admin role...`);
  const [adminRole] = await db()
    .select()
    .from(role)
    .where(eq(role.name, 'admin'))
    .limit(1);
  
  if (!adminRole) {
    console.error(`❌ Admin role not found. Please run init-rbac script first.`);
    process.exit(1);
  }
  
  console.log(`✅ Found admin role:`, {
    id: adminRole.id,
    name: adminRole.name,
    title: adminRole.title,
  });
  
  // 3. Check if user already has admin role
  console.log(`\n🔍 Checking existing role assignments...`);
  const [existingRole] = await db()
    .select()
    .from(userRole)
    .where(eq(userRole.userId, targetUser.id))
    .limit(1);
  
  if (existingRole && existingRole.roleId === adminRole.id) {
    console.log(`⚠️  User already has admin role!`);
    process.exit(0);
  }
  
  // 4. Grant admin role
  console.log(`\n🎯 Granting admin role to user...`);
  await db().insert(userRole).values({
    id: getUuid(),
    userId: targetUser.id,
    roleId: adminRole.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null, // No expiration
  });
  
  console.log(`\n✅ Success! Admin role granted to ${targetEmail}`);
  console.log(`\n📊 Summary:`);
  console.log(`   User: ${targetUser.name} (${targetUser.email})`);
  console.log(`   Role: ${adminRole.title} (${adminRole.name})`);
  console.log(`   Status: Active`);
  console.log(`\n🎉 Done! User can now access admin panel.\n`);
}

// Run the script
grantAdminRole()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
