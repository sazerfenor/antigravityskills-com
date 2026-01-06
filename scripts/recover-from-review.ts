/**
 * 正确恢复 cases-optimized.json
 * 
 * 逻辑：
 * 1. 从 prompts-for-review.md 获取第一版 138 个
 * 2. 从 logs/fix-test-detailed-log.json 获取重新优化的结果
 * 3. 从 logs/image-dep-retest-log.json 获取图生图依赖重新优化结果
 * 4. 合并：第一版中没问题的 + 重新优化的
 */

import * as fs from 'fs';

console.log('='.repeat(60));
console.log('🔄 正确恢复 cases-optimized.json');
console.log('='.repeat(60));

// 1. 解析 prompts-for-review.md (第一版)
const reviewFile = fs.readFileSync('prompts-for-review.md', 'utf-8');
const casesData = JSON.parse(fs.readFileSync('src/data/cases.json', 'utf-8'));

const firstVersion = new Map<string, { title: string; optimizedPrompt: string; originalPrompt: string }>();

const sections = reviewFile.split(/^## \d+\./m).filter(s => s.trim());
for (const section of sections) {
  const idMatch = section.match(/\*\*ID\*\*:\s*`([^`]+)`/);
  if (!idMatch) continue;
  
  const id = idMatch[1];
  const titleMatch = section.match(/^([^\n]+)/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  const promptMatch = section.match(/\*\*优化后 Prompt\*\*:\s*\n\n```\n([\s\S]*?)```/);
  if (!promptMatch) continue;
  
  const optimizedPrompt = promptMatch[1].trim();
  if (optimizedPrompt === '无' || optimizedPrompt.length < 20) continue;
  
  const original = casesData.cases.find((c: any) => c.id === id);
  if (!original) continue;
  
  firstVersion.set(id, {
    title: original.title,
    optimizedPrompt,
    originalPrompt: original.prompt,
  });
}

console.log(`\n📁 第一版 prompts-for-review.md: ${firstVersion.size} 个有效`);

// 2. 加载重新优化的结果
const fixLog = JSON.parse(fs.readFileSync('logs/fix-test-detailed-log.json', 'utf-8'));
const imageDepLog = JSON.parse(fs.readFileSync('logs/image-dep-retest-log.json', 'utf-8'));

// 合并所有重新优化的结果
const reOptimized = new Map<string, any>();

// 图生图依赖优先（保留 "uploaded image" 引用）
for (const entry of imageDepLog) {
  if (!entry.output.success) continue;
  const data = entry.output.responseBody?.data;
  if (!data?.optimizedPrompt || data.optimizedPrompt.length < 50) continue;
  
  reOptimized.set(entry.caseId, {
    id: entry.caseId,
    title: entry.title,
    originalPrompt: entry.input.originalPrompt,
    optimizedPrompt: data.optimizedPrompt,
    templateVersion: data.templateVersion,
    structuredExtraction: data.structuredExtraction,
    tipsCompliance: data.tipsCompliance,
    optimizedAt: entry.timestamp,
  });
}
console.log(`📁 图生图依赖重优化: ${reOptimized.size} 个成功`);

// 其余重优化的
for (const entry of fixLog) {
  if (!entry.output.success) continue;
  if (reOptimized.has(entry.caseId)) continue; // 已有图生图版本
  
  const data = entry.output.responseBody?.data;
  if (!data?.optimizedPrompt || data.optimizedPrompt.length < 50) continue;
  
  reOptimized.set(entry.caseId, {
    id: entry.caseId,
    title: entry.title,
    originalPrompt: entry.input.originalPrompt,
    optimizedPrompt: data.optimizedPrompt,
    templateVersion: data.templateVersion,
    structuredExtraction: data.structuredExtraction,
    tipsCompliance: data.tipsCompliance,
    optimizedAt: entry.timestamp,
  });
}
console.log(`📁 总共重优化: ${reOptimized.size} 个`);

// 3. 合并：重优化的优先，否则用第一版
const finalCases: any[] = [];
const caseIds = casesData.cases.map((c: any) => c.id);

for (const id of caseIds) {
  if (reOptimized.has(id)) {
    // 使用重优化版本
    finalCases.push(reOptimized.get(id));
  } else if (firstVersion.has(id)) {
    // 使用第一版
    const first = firstVersion.get(id)!;
    finalCases.push({
      id,
      title: first.title,
      originalPrompt: first.originalPrompt,
      optimizedPrompt: first.optimizedPrompt,
      optimizedAt: '2025-12-04T00:00:00.000Z',
    });
  } else {
    console.log(`⚠️ ${id} - 无法恢复（两个来源都没有）`);
  }
}

console.log(`\n📊 最终结果:`);
console.log(`  ✅ 恢复成功: ${finalCases.length} 个`);
console.log(`  📁 cases.json: ${casesData.cases.length} 个`);

// 4. 保存
fs.writeFileSync('src/data/cases-optimized.json', JSON.stringify({
  cases: finalCases,
  generatedAt: new Date().toISOString(),
  totalCount: finalCases.length,
  recoveredFrom: [
    'prompts-for-review.md (第一版)',
    'fix-test-detailed-log.json (重优化)',
    'image-dep-retest-log.json (图生图重优化)'
  ],
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log('✅ 恢复完成');
console.log('='.repeat(60));
console.log(`💾 已保存: src/data/cases-optimized.json`);
