import 'dotenv/config';

/**
 * 使用 Better Auth API 创建管理员账户
 * 这样可以确保密码哈希格式与 Better Auth 兼容
 */

async function createAdminUser() {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const email = 'admin@bananaprompts.info';
  const password = 'Admin123456!';
  const name = 'Admin';

  console.log('🔐 Creating admin user via Better Auth API...');
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Name: ${name}`);
  console.log(`🌐 Base URL: ${baseURL}`);

  try {
    // 注册用户
    const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to create user:', data);
      process.exit(1);
    }

    console.log('✅ User created successfully!');
    console.log('📊 Response:', data);
    console.log('\n🎯 Next steps:');
    console.log(`   1. Run: pnpm rbac:assign -- --email=${email} --role=super_admin`);
    console.log(`   2. Login at: ${baseURL}/admin`);
    console.log(`   3. Email: ${email}`);
    console.log(`   4. Password: ${password}`);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
}

createAdminUser();
