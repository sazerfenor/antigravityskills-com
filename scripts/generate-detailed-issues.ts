/**
 * 生成失败 prompts 的详细报告（包含原始 prompt）
 */

import * as fs from 'fs';
import casesData from '../src/data/cases.json';
import casesOptimized from '../src/data/cases-optimized.json';
import issuesData from '../logs/prompt-quality-issues.json';

interface DetailedIssue {
  index: number;
  id: string;
  title: string;
  issueType: string;
  originalPrompt: string;
  optimizedPrompt: string;
}

const allCases = casesData.cases as any[];
const optimized = casesOptimized.cases as any[];

const issues: DetailedIssue[] = [];

issuesData.needsReoptimize.forEach((id: string, i: number) => {
  const original = allCases.find(c => c.id === id);
  const opt = optimized.find(c => c.id === id);
  
  let issueType = '未知';
  if (issuesData.details.missing.includes(id)) issueType = '🔴 内容缺失';
  else if (issuesData.details.imageDependency.includes(id)) issueType = '🟠 图生图依赖';
  else if (issuesData.details.placeholderIssue.includes(id)) issueType = '🟡 占位符残留';
  
  issues.push({
    index: i + 1,
    id,
    title: original?.title || '未知',
    issueType,
    originalPrompt: original?.prompt || '无',
    optimizedPrompt: opt?.optimizedPrompt || '无',
  });
});

// 生成 Markdown 报告
let md = `# 39 个问题 Prompts 详细分析

**生成时间**: ${new Date().toISOString()}

---

## 优化 API 输出结构

\`\`\`json
{
  "optimizedPrompt": "<subject>...</subject> <atmos>...</atmos> <detail>...</detail> <tech>...</tech>",
  "templateVersion": {
    "enabled": true,
    "optimizedFilled": "...",
    "optimizedTemplate": "...",
    "variables": [...]
  },
  "structuredExtraction": {
    "subject": "...",
    "style": "...",
    "composition": "...",
    "technique": "..."
  },
  "tipsCompliance": {
    "subject": "✅/❌",
    "composition": "✅/❌",
    ...
  }
}
\`\`\`

---

`;

issues.forEach(issue => {
  md += `## ${issue.index}. ${issue.title}

**ID**: \`${issue.id}\`  
**问题类型**: ${issue.issueType}

### 原始 Prompt

\`\`\`
${issue.originalPrompt.substring(0, 1500)}${issue.originalPrompt.length > 1500 ? '\n...(截断)' : ''}
\`\`\`

### 优化后 Prompt

\`\`\`
${issue.optimizedPrompt.substring(0, 500)}${issue.optimizedPrompt.length > 500 ? '\n...(截断)' : ''}
\`\`\`

---

`;
});

fs.writeFileSync('logs/prompt-issues-detailed.md', md);
console.log(`✅ 详细报告已生成: logs/prompt-issues-detailed.md`);
console.log(`📊 共 ${issues.length} 个问题 prompts`);
