/**
 * 修复非标准标签 - 将它们转换为标准 4 标签
 * 
 * 标准标签: subject, atmos, detail, tech
 * 非标准标签映射:
 * - action → subject
 * - location → atmos
 * - composition → detail
 * - style → atmos
 * - camera, lighting, aspectRatio → tech
 */

import * as fs from 'fs';
import casesOptimized from '../src/data/cases-optimized.json';
import casesForImageGen from '../src/data/cases-for-image-gen.json';

const tagMapping: Record<string, string> = {
  'action': 'detail',
  'location': 'atmos',
  'composition': 'detail',
  'style': 'atmos',
  'camera': 'tech',
  'lighting': 'tech',
  'aspectRatio': 'tech',
};

function fixTags(prompt: string): string {
  let fixed = prompt;
  
  for (const [nonStandard, standard] of Object.entries(tagMapping)) {
    // 替换开始标签
    fixed = fixed.replace(new RegExp(`<${nonStandard}>`, 'g'), `<${standard}>`);
    // 替换结束标签
    fixed = fixed.replace(new RegExp(`</${nonStandard}>`, 'g'), `</${standard}>`);
  }
  
  return fixed;
}

let fixedCount = 0;

// 修复 cases-optimized.json
const fixedOptimized = (casesOptimized.cases as any[]).map(c => {
  const original = c.optimizedPrompt || '';
  const fixed = fixTags(original);
  
  if (original !== fixed) {
    fixedCount++;
    console.log(`✅ 修复: ${c.id}`);
    return { ...c, optimizedPrompt: fixed };
  }
  return c;
});

// 修复 cases-for-image-gen.json
const fixedImageGen = (casesForImageGen.cases as any[]).map(c => {
  const original = c.optimizedPrompt || '';
  const fixed = fixTags(original);
  
  if (original !== fixed) {
    return { ...c, optimizedPrompt: fixed };
  }
  return c;
});

// 保存
fs.writeFileSync('src/data/cases-optimized.json', JSON.stringify({
  ...casesOptimized,
  cases: fixedOptimized,
  generatedAt: new Date().toISOString(),
}, null, 2));

fs.writeFileSync('src/data/cases-for-image-gen.json', JSON.stringify({
  ...casesForImageGen,
  cases: fixedImageGen,
  generatedAt: new Date().toISOString(),
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log(`📊 修复完成: ${fixedCount} 个 cases`);
console.log('='.repeat(60));
console.log('💾 已更新:');
console.log('  - src/data/cases-optimized.json');
console.log('  - src/data/cases-for-image-gen.json');
