// Debug script to check Turso connection
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

console.log('=== Debug Info ===');
console.log('DATABASE_URL:', url);
console.log('DATABASE_AUTH_TOKEN exists:', !!authToken);
console.log('Token length:', authToken?.length);

if (!url || !authToken) {
  console.error('Missing DATABASE_URL or DATABASE_AUTH_TOKEN');
  process.exit(1);
}

console.log('\n=== Testing Connection ===');

const client = createClient({
  url,
  authToken,
});

async function test() {
  try {
    // 尝试执行一个简单的查询
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ Connection successful!');
    console.log('Result:', result.rows);
  } catch (e: any) {
    console.error('❌ Connection failed');
    console.error('Error message:', e.message);
    console.error('Error code:', e.code);
    if (e.cause) {
      console.error('Cause:', e.cause);
    }
  }
}

test();
