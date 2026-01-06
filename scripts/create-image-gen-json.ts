/**
 * 生成跑图专用 JSON + 检测非标准标签
 */

import * as fs from 'fs';
import casesOptimized from '../src/data/cases-optimized.json';

const firstRunLog = JSON.parse(fs.readFileSync('logs/fix-test-detailed-log.json', 'utf-8'));

const imageDepIds = [
  'example_3', 'case_20', 'case_29', 'case_61', 'example_69', 
  'example_74', 'example_81', 'example_95', 'example_96', 
  'example_97', 'example_98', 'example_100', 'example_106'
];

const standardTags = ['subject', 'atmos', 'detail', 'tech'];
const nonStandardCases: any[] = [];

// 复制并处理
const casesForImageGen = (casesOptimized.cases as any[]).map(c => {
  const copy = { ...c };
  
  // 检测非标准标签
  const prompt = c.optimizedPrompt || '';
  const tagMatches = prompt.match(/<(\w+)>/g) || [];
  const foundTags = tagMatches.map((t: string) => t.replace(/<|>/g, ''));
  const nonStandard = foundTags.filter((t: string) => !standardTags.includes(t));
  
  if (nonStandard.length > 0) {
    nonStandardCases.push({
      id: c.id,
      title: c.title,
      nonStandardTags: [...new Set(nonStandard)],
      promptPreview: prompt.substring(0, 200),
    });
  }
  
  return copy;
});

// 替换图生图依赖的 cases 为具体主语版本
let updatedCount = 0;
for (const id of imageDepIds) {
  const firstRunResult = firstRunLog.find((l: any) => l.caseId === id && l.output.success);
  if (!firstRunResult) continue;
  
  const idx = casesForImageGen.findIndex(c => c.id === id);
  if (idx < 0) continue;
  
  const firstPrompt = firstRunResult.output.responseBody?.data?.optimizedPrompt;
  if (firstPrompt && firstPrompt.length > 50) {
    casesForImageGen[idx].optimizedPrompt = firstPrompt;
    casesForImageGen[idx]._isConcreteSubject = true;
    updatedCount++;
  }
}

// 保存跑图版本
fs.writeFileSync('src/data/cases-for-image-gen.json', JSON.stringify({
  cases: casesForImageGen,
  purpose: 'For thumbnail image generation (with concrete subjects)',
  generatedAt: new Date().toISOString(),
  totalCount: casesForImageGen.length,
}, null, 2));

console.log('='.repeat(60));
console.log('📊 跑图 JSON 生成完成');
console.log('='.repeat(60));
console.log(`✅ 使用具体主语: ${updatedCount} 个`);
console.log(`📝 总计: ${casesForImageGen.length} 个 cases`);
console.log(`💾 已保存: src/data/cases-for-image-gen.json`);

console.log('\n' + '='.repeat(60));
console.log('🏷️ 非标准标签检测');
console.log('='.repeat(60));
console.log(`发现 ${nonStandardCases.length} 个 cases 使用了非标准标签:\n`);
nonStandardCases.forEach(c => {
  console.log(`  ${c.id}: ${c.nonStandardTags.join(', ')}`);
});

// 保存非标准标签报告
fs.writeFileSync('logs/non-standard-tags.json', JSON.stringify(nonStandardCases, null, 2));
console.log(`\n💾 报告已保存: logs/non-standard-tags.json`);
