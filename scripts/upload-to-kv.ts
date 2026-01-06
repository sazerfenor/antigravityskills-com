/**
 * 上传语义向量到 Cloudflare Workers KV
 * 
 * 通过调用 /api/admin/cases/sync-to-kv API 上传数据
 * 
 * 用法：
 *   pnpm tsx scripts/upload-to-kv.ts [--clear] [--status]
 * 
 * @see src/shared/lib/cases-kv.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const VECTORS_FILE = path.resolve(__dirname, '../src/data/cases-with-semantic-vectors.json');

// 从环境变量或命令行获取 Admin Cookie
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || '';

async function main() {
  console.log('📤 Upload Semantic Vectors to KV');
  console.log('=' .repeat(50));
  
  const args = process.argv.slice(2);
  
  if (args.includes('--status')) {
    await checkStatus();
    return;
  }
  
  if (args.includes('--clear')) {
    await clearKV();
    return;
  }
  
  // 默认：上传数据
  await uploadData();
}

async function checkStatus() {
  console.log('\n📊 Checking KV status...');
  
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/sync-to-kv`, {
    method: 'GET',
    headers: {
      'Cookie': `better-auth.session_token=${ADMIN_COOKIE}`,
    },
  });
  
  const result = await response.json() as any;
  
  if (result.code !== 0) {
    console.error('❌ Error:', result.message);
    return;
  }
  
  console.log('\n✅ KV Status:');
  console.log(`   Index Meta: ${JSON.stringify(result.data.indexMeta, null, 2)}`);
  console.log(`   Total Cases: ${result.data.totalCases}`);
  
  if (result.data.cases && result.data.cases.length > 0) {
    console.log('\n   Cases:');
    result.data.cases.slice(0, 10).forEach((c: any) => {
      console.log(`   - ${c.id}: ${c.title} ${c.hasImageUpload ? '📷' : ''}`);
    });
    if (result.data.cases.length > 10) {
      console.log(`   ... and ${result.data.cases.length - 10} more`);
    }
  }
}

async function clearKV() {
  console.log('\n🗑️  Clearing KV...');
  
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/sync-to-kv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `better-auth.session_token=${ADMIN_COOKIE}`,
    },
    body: JSON.stringify({ action: 'clear' }),
  });
  
  const result = await response.json() as any;
  
  if (result.code !== 0) {
    console.error('❌ Error:', result.message);
    return;
  }
  
  console.log(`✅ ${result.data.message}`);
}

async function uploadData() {
  console.log('\n📖 Loading vectors file...');
  
  if (!fs.existsSync(VECTORS_FILE)) {
    console.error(`❌ File not found: ${VECTORS_FILE}`);
    console.log('\n   Please run generate-semantic-embeddings.ts first:');
    console.log('   $env:GEMINI_API_KEY="your-key"; pnpm tsx scripts/generate-semantic-embeddings.ts');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(VECTORS_FILE, 'utf-8'));
  console.log(`✅ Loaded ${data.totalCases} cases`);
  
  console.log('\n📤 Uploading to KV...');
  console.log(`   API: ${API_BASE_URL}/api/admin/cases/sync-to-kv`);
  
  const response = await fetch(`${API_BASE_URL}/api/admin/cases/sync-to-kv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `better-auth.session_token=${ADMIN_COOKIE}`,
    },
    body: JSON.stringify({
      action: 'sync',
      data,
    }),
  });
  
  const result = await response.json() as any;
  
  if (result.code !== 0) {
    console.error('❌ Error:', result.message);
    return;
  }
  
  console.log('\n✅ Upload completed!');
  console.log(`   Success: ${result.data.successCount}`);
  console.log(`   Failed: ${result.data.errorCount}`);
  console.log(`   Model: ${result.data.model}`);
  console.log(`   Dimensions: ${result.data.dimensions}`);
  
  if (result.data.errors && result.data.errors.length > 0) {
    console.log('\n   Errors:');
    result.data.errors.forEach((e: any) => {
      console.log(`   - ${e.id}: ${e.error}`);
    });
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
