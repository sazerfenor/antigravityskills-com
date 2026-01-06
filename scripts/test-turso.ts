import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';

console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

const db = drizzle({ client });

async function test() {
  // Test 1: List all tables
  const tables = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
  console.log('\nTables in database:', tables.length);
  console.log(tables.map((t: any) => t.name).join(', '));
  
  // Test 2: Count users
  const userCount = await db.all(sql`SELECT COUNT(*) as count FROM user`);
  console.log('\nUser count:', (userCount[0] as any).count);
  
  console.log('\n✅ Turso connection test passed!');
}

test().catch(console.error);
