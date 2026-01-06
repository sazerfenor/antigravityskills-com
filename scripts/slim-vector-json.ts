/**
 * 精简向量 JSON 文件
 * 
 * 从 cases-with-semantic-vectors.json 中移除不需要的字段：
 * - payload.thumbnail
 * - payload.originalPrompt
 * 
 * 这将显著减少 KV 存储大小
 */

import * as fs from 'fs';
import * as path from 'path';

const VECTORS_FILE = path.resolve(__dirname, '../src/data/cases-with-semantic-vectors.json');

function main() {
  console.log('🗜️  Slim Vector JSON - Remove thumbnail & originalPrompt');
  console.log('=' .repeat(50));
  
  // 1. 读取文件
  console.log(`\n📖 Loading: ${VECTORS_FILE}`);
  const data = JSON.parse(fs.readFileSync(VECTORS_FILE, 'utf-8'));
  
  const originalSize = fs.statSync(VECTORS_FILE).size;
  console.log(`   Original size: ${(originalSize / 1024).toFixed(2)} KB`);
  console.log(`   Total cases: ${data.totalCases}`);
  
  // 2. 处理每个 embedding
  console.log('\n🔧 Processing embeddings...');
  let thumbnailRemoved = 0;
  let originalPromptRemoved = 0;
  
  for (const embedding of data.embeddings) {
    if (embedding.payload) {
      // 移除 thumbnail
      if ('thumbnail' in embedding.payload) {
        delete embedding.payload.thumbnail;
        thumbnailRemoved++;
      }
      
      // 移除 originalPrompt
      if ('originalPrompt' in embedding.payload) {
        delete embedding.payload.originalPrompt;
        originalPromptRemoved++;
      }
    }
  }
  
  console.log(`   ✅ Removed ${thumbnailRemoved} thumbnail fields`);
  console.log(`   ✅ Removed ${originalPromptRemoved} originalPrompt fields`);
  
  // 3. 保存文件
  console.log('\n💾 Saving...');
  fs.writeFileSync(VECTORS_FILE, JSON.stringify(data, null, 2));
  
  const newSize = fs.statSync(VECTORS_FILE).size;
  const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(2);
  
  console.log(`   New size: ${(newSize / 1024).toFixed(2)} KB`);
  console.log(`   Reduction: ${reduction}% (saved ${((originalSize - newSize) / 1024).toFixed(2)} KB)`);
  
  console.log('\n✅ Done!');
}

main();
