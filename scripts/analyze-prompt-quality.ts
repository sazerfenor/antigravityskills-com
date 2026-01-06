/**
 * 分析 prompts 质量问题
 */

import * as fs from 'fs';
import casesOptimized from '../src/data/cases-optimized.json';

interface Issue {
  index: number;
  id: string;
  title: string;
  reason?: string;
}

const missing: Issue[] = [];
const imageDependency: Issue[] = [];
const placeholderIssue: Issue[] = [];
const good: Issue[] = [];

const cases = casesOptimized.cases as any[];

cases.forEach((c, i) => {
  const prompt = c.optimizedPrompt || '';
  const id = c.id;
  const title = c.title;
  
  // 1. 内容缺失
  if (!prompt || prompt === '无' || prompt.length < 50) {
    missing.push({ index: i+1, id, title, reason: `长度=${prompt.length}` });
    return;
  }
  
  // 2. 图生图依赖
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('uploaded') || 
      lowerPrompt.includes('reference image') ||
      lowerPrompt.includes('based on this')) {
    imageDependency.push({ index: i+1, id, title });
    return;
  }
  
  // 3. 占位符残留
  if (prompt.includes('[') && prompt.includes(']')) {
    placeholderIssue.push({ index: i+1, id, title });
    return;
  }
  
  good.push({ index: i+1, id, title });
});

console.log('='.repeat(60));
console.log('📊 Prompt 质量分析报告');
console.log('='.repeat(60));
console.log(`\n✅ 质量合格: ${good.length} (${(good.length/cases.length*100).toFixed(1)}%)`);
console.log(`🔴 内容缺失: ${missing.length}`);
console.log(`🟠 图生图依赖: ${imageDependency.length}`);
console.log(`🟡 占位符残留: ${placeholderIssue.length}`);
console.log(`📝 总计需修复: ${missing.length + imageDependency.length + placeholderIssue.length}`);

console.log('\n' + '='.repeat(60));
console.log('🔴 内容缺失列表:');
console.log('='.repeat(60));
missing.forEach(m => console.log(`  ${m.index}. ${m.id} - ${m.title} (${m.reason})`));

console.log('\n' + '='.repeat(60));
console.log('🟠 图生图依赖列表:');
console.log('='.repeat(60));
imageDependency.forEach(m => console.log(`  ${m.index}. ${m.id} - ${m.title}`));

console.log('\n' + '='.repeat(60));
console.log('🟡 占位符残留列表:');
console.log('='.repeat(60));
placeholderIssue.forEach(m => console.log(`  ${m.index}. ${m.id} - ${m.title}`));

// 保存问题 IDs
const issueReport = {
  summary: {
    total: cases.length,
    good: good.length,
    missing: missing.length,
    imageDependency: imageDependency.length,
    placeholderIssue: placeholderIssue.length,
  },
  needsReoptimize: [...missing, ...imageDependency, ...placeholderIssue].map(i => i.id),
  details: {
    missing: missing.map(i => i.id),
    imageDependency: imageDependency.map(i => i.id),
    placeholderIssue: placeholderIssue.map(i => i.id),
  }
};

fs.writeFileSync('logs/prompt-quality-issues.json', JSON.stringify(issueReport, null, 2));
console.log('\n💾 问题报告已保存到: logs/prompt-quality-issues.json');
