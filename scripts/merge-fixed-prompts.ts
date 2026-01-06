/**
 * 合并修复后的 prompts 到 cases-optimized.json
 */

import * as fs from 'fs';
import casesOptimized from '../src/data/cases-optimized.json';

// 加载两个修复日志
const fixLog = JSON.parse(fs.readFileSync('logs/fix-test-detailed-log.json', 'utf-8'));
const imageDepLog = JSON.parse(fs.readFileSync('logs/image-dep-retest-log.json', 'utf-8'));

const optimizedCases = [...(casesOptimized.cases as any[])];

let updatedCount = 0;
let addedCount = 0;

// 处理函数
function mergeCase(logEntry: any) {
  if (!logEntry.output.success) return;
  
  const caseId = logEntry.caseId;
  const existingIndex = optimizedCases.findIndex(c => c.id === caseId);
  
  // 从 responseBody 提取数据
  const data = logEntry.output.responseBody?.data || {};
  const optimizedPrompt = data.optimizedPrompt || logEntry.output.optimizedPrompt;
  
  if (!optimizedPrompt || optimizedPrompt.length < 50) {
    console.log(`⚠️ 跳过 ${caseId}: prompt 太短或缺失`);
    return;
  }
  
  const newCase = {
    id: caseId,
    title: logEntry.title,
    originalPrompt: logEntry.input.originalPrompt || logEntry.input.apiParams?.userPrompt,
    optimizedPrompt: optimizedPrompt,
    templateVersion: data.templateVersion,
    structuredExtraction: data.structuredExtraction,
    tipsCompliance: data.tipsCompliance,
    optimizedAt: logEntry.timestamp,
  };
  
  if (existingIndex >= 0) {
    optimizedCases[existingIndex] = newCase;
    updatedCount++;
    console.log(`✅ 更新: ${caseId}`);
  } else {
    optimizedCases.push(newCase);
    addedCount++;
    console.log(`➕ 新增: ${caseId}`);
  }
}

console.log('='.repeat(60));
console.log('🔄 合并修复结果到 cases-optimized.json');
console.log('='.repeat(60));

console.log('\n📁 处理 fix-test-detailed-log.json (39 个)...');
fixLog.forEach(mergeCase);

console.log('\n📁 处理 image-dep-retest-log.json (13 个)...');
imageDepLog.forEach(mergeCase);

// 保存
fs.writeFileSync('src/data/cases-optimized.json', JSON.stringify({
  cases: optimizedCases,
  generatedAt: new Date().toISOString(),
  totalCount: optimizedCases.length,
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log('📊 合并完成');
console.log('='.repeat(60));
console.log(`✅ 更新: ${updatedCount}`);
console.log(`➕ 新增: ${addedCount}`);
console.log(`📝 总计: ${optimizedCases.length} 个 cases`);
console.log(`\n💾 已保存: src/data/cases-optimized.json`);
