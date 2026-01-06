/**
 * 提取所有 Case 的原始 Prompt
 * 
 * 用法: node --experimental-json-modules scripts/extract-prompts.mjs
 * 输出: src/data/extracted-prompts.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// 读取源文件
const inputPath = path.join(rootDir, 'src/data/111.json');
const outputPath = path.join(rootDir, 'src/data/extracted-prompts.txt');

console.log('📖 读取源文件:', inputPath);

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

if (!data.cases || !Array.isArray(data.cases)) {
  console.error('❌ 无效的 JSON 结构，需要 { cases: [...] }');
  process.exit(1);
}

console.log(`📦 找到 ${data.cases.length} 个 cases`);

// 提取 prompts
const lines = [];
lines.push(`# 原始 Prompt 提取报告`);
lines.push(`# 生成时间: ${new Date().toISOString()}`);
lines.push(`# 总数: ${data.cases.length}`);
lines.push('');
lines.push('='.repeat(80));
lines.push('');

for (const caseItem of data.cases) {
  lines.push(`## [${caseItem.id}] ${caseItem.title}`);
  lines.push('');
  lines.push(caseItem.prompt || '(无 prompt)');
  lines.push('');
  lines.push('-'.repeat(80));
  lines.push('');
}

// 写入输出
fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

console.log(`✅ 已提取 ${data.cases.length} 个 prompts 到:`);
console.log(`   ${outputPath}`);
