/**
 * 生成 prompts 列表供产品审核
 */

import * as fs from 'fs';
import casesOptimized from '../src/data/cases-optimized.json';

const cases = casesOptimized.cases;

let md = `# 138 个优化后的 Prompts 列表

> 产品审核用，每个 prompt 都将用于生成缩略图

---

`;

cases.forEach((c: any, i: number) => {
  md += `## ${i + 1}. ${c.title}\n\n`;
  md += `**ID**: \`${c.id}\`\n\n`;
  md += `**优化后 Prompt**:\n\n`;
  md += '```\n' + (c.optimizedPrompt || '无').substring(0, 800) + '\n```\n\n';
  md += `---\n\n`;
});

fs.writeFileSync('prompts-for-review.md', md);
console.log(`✅ Generated prompts-for-review.md with ${cases.length} prompts`);
