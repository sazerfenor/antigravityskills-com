import { createClient } from '@libsql/client';

async function testConnection() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  
  console.log('Testing Turso connection...');
  console.log('URL:', url);
  console.log('Token (first 50 chars):', authToken?.substring(0, 50) + '...');
  
  if (!url || !authToken) {
    console.error('Missing DATABASE_URL or DATABASE_AUTH_TOKEN');
    process.exit(1);
  }
  
  const client = createClient({ url, authToken });
  
  try {
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ Connection successful!');
    console.log('Result:', JSON.stringify(result.rows));
  } catch (e: any) {
    console.error('❌ Connection failed:', e.message);
    console.error('Error code:', e.code);
    if (e.cause) {
      console.error('Cause:', e.cause.message);
      console.error('HTTP Status:', e.cause.status);
    }
  }
}

testConnection();
