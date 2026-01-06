/**
 * 从日志恢复 cases-optimized.json
 * 
 * 数据来源：
 * 1. logs/fix-test-detailed-log.json - 39 个问题 prompts 修复结果
 * 2. logs/image-dep-retest-log.json - 13 个图生图依赖重测结果
 * 3. cases.json - 补充未在日志中的 cases
 */

import * as fs from 'fs';

console.log('='.repeat(60));
console.log('🔄 从日志恢复 cases-optimized.json');
console.log('='.repeat(60));

// 加载日志
const fixLog = JSON.parse(fs.readFileSync('logs/fix-test-detailed-log.json', 'utf-8'));
const imageDepLog = JSON.parse(fs.readFileSync('logs/image-dep-retest-log.json', 'utf-8'));
const casesData = JSON.parse(fs.readFileSync('src/data/cases.json', 'utf-8'));

console.log(`\n📁 fix-test-detailed-log.json: ${fixLog.length} 条`);
console.log(`📁 image-dep-retest-log.json: ${imageDepLog.length} 条`);
console.log(`📁 cases.json: ${casesData.cases.length} 个`);

// 图生图依赖的 IDs (使用 image-dep-retest 的结果，保留 "uploaded image" 引用)
const imageDepIds = [
  'example_3', 'case_20', 'case_29', 'case_61', 'example_69', 
  'example_74', 'example_81', 'example_95', 'example_96', 
  'example_97', 'example_98', 'example_100', 'example_106'
];

const optimizedCases: any[] = [];
const usedIds = new Set<string>();

// 1. 先处理图生图依赖（使用 image-dep-retest 的结果）
console.log('\n1️⃣ 处理图生图依赖 (13个)...');
for (const entry of imageDepLog) {
  if (!entry.output.success) continue;
  
  const caseId = entry.caseId;
  const data = entry.output.responseBody?.data || {};
  const optimizedPrompt = data.optimizedPrompt;
  
  if (!optimizedPrompt || optimizedPrompt.length < 50) continue;
  
  optimizedCases.push({
    id: caseId,
    title: entry.title,
    originalPrompt: entry.input.originalPrompt,
    optimizedPrompt: optimizedPrompt,
    templateVersion: data.templateVersion,
    structuredExtraction: data.structuredExtraction,
    tipsCompliance: data.tipsCompliance,
    optimizedAt: entry.timestamp,
  });
  usedIds.add(caseId);
  console.log(`  ✅ ${caseId} (图生图)`);
}

// 2. 处理其他修复的 prompts（排除图生图依赖）
console.log('\n2️⃣ 处理其他修复 prompts...');
for (const entry of fixLog) {
  if (!entry.output.success) continue;
  
  const caseId = entry.caseId;
  if (usedIds.has(caseId)) continue; // 已处理过
  
  const data = entry.output.responseBody?.data || {};
  const optimizedPrompt = data.optimizedPrompt;
  
  if (!optimizedPrompt || optimizedPrompt.length < 50) continue;
  
  optimizedCases.push({
    id: caseId,
    title: entry.title,
    originalPrompt: entry.input.originalPrompt,
    optimizedPrompt: optimizedPrompt,
    templateVersion: data.templateVersion,
    structuredExtraction: data.structuredExtraction,
    tipsCompliance: data.tipsCompliance,
    optimizedAt: entry.timestamp,
  });
  usedIds.add(caseId);
}
console.log(`  ✅ 已处理 ${usedIds.size} 个`);

// 3. 检查是否有遗漏的 cases（如果有，需要重新优化）
console.log('\n3️⃣ 检查遗漏的 cases...');
const missingCases: string[] = [];
for (const c of casesData.cases) {
  if (!usedIds.has(c.id)) {
    missingCases.push(c.id);
  }
}

if (missingCases.length > 0) {
  console.log(`  ⚠️ 有 ${missingCases.length} 个 cases 未在日志中找到！`);
  console.log(`  需要重新优化: ${missingCases.slice(0, 10).join(', ')}${missingCases.length > 10 ? '...' : ''}`);
} else {
  console.log(`  ✅ 所有 ${casesData.cases.length} 个 cases 都已覆盖`);
}

// 保存
fs.writeFileSync('src/data/cases-optimized.json', JSON.stringify({
  cases: optimizedCases,
  generatedAt: new Date().toISOString(),
  totalCount: optimizedCases.length,
  recoveredFrom: ['fix-test-detailed-log.json', 'image-dep-retest-log.json'],
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log('📊 恢复完成');
console.log('='.repeat(60));
console.log(`✅ 已恢复: ${optimizedCases.length} 个`);
console.log(`⚠️ 遗漏: ${missingCases.length} 个`);
console.log(`\n💾 已保存: src/data/cases-optimized.json`);

if (missingCases.length > 0) {
  fs.writeFileSync('logs/missing-cases.json', JSON.stringify(missingCases, null, 2));
  console.log(`💾 遗漏列表: logs/missing-cases.json`);
}
