/**
 * 从 README.md 和 cases.json 提取原始作者信息
 * 输出汇总结果
 */

import fs from 'fs';
import path from 'path';

interface CaseAuthorInfo {
  caseId: string;
  titleEN: string;
  titleCN: string;
  originalAuthor: string;
  authorUrl: string;
  postUrl: string;
  prompt: string;
  cleanedPrompt: string;
}

// 读取 README.md
const readmePath = path.join(process.cwd(), 'public/images/README.md');
const casesPath = path.join(process.cwd(), 'src/data/cases.json');

const readmeContent = fs.readFileSync(readmePath, 'utf-8');
const casesData = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));

// 正则匹配：### 例 X: [标题](帖子链接)（by [@作者名](作者主页)）
const caseRegex = /###\s+例\s+\d+:\s+\[([^\]]+)\]\((https:\/\/[^\)]+)\)（by\s+\[@([^\]]+)\]\((https:\/\/[^\)]+)\)）/g;

const results: CaseAuthorInfo[] = [];
let match;

console.log('📋 开始提取原始作者信息...\n');

// 提取 README 中的作者信息
const authorMap = new Map<string, {
  postUrl: string;
  authorName: string;
  authorUrl: string;
  titleCN: string;
}>();

while ((match = caseRegex.exec(readmeContent)) !== null) {
  const [, titleCN, postUrl, authorName, authorUrl] = match;
  const authorKey = `@${authorName}`;
  
  // 如果该作者已存在，添加到数组中
  if (!authorMap.has(authorKey)) {
    authorMap.set(authorKey, {
      postUrl: postUrl,
      authorName: authorKey,
      authorUrl,
      titleCN,
    });
  }
}

console.log(`从 README 找到 ${authorMap.size} 个作者的信息\n`);

// 按作者分组 cases.json 中的数据
const casesByAuthor = new Map<string, typeof casesData.cases>();
for (const caseItem of casesData.cases) {
  const author = caseItem.author;
  if (!casesByAuthor.has(author)) {
    casesByAuthor.set(author, []);
  }
  casesByAuthor.get(author)!.push(caseItem);
}

console.log(`cases.json 中有 ${casesByAuthor.size} 个作者\n`);

// 手动构建 README 作者到帖子链接的映射
const authorPostsMap = new Map<string, string[]>();
const lines = readmeContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/###\s+例\s+\d+:\s+\[([^\]]+)\]\((https:\/\/[^\)]+)\)（by\s+\[@([^\]]+)\]\((https:\/\/[^\)]+)\)）/);
  if (match) {
    const [, titleCN, postUrl, authorName, authorUrl] = match;
    const authorKey = `@${authorName}`;
    
    if (!authorPostsMap.has(authorKey)) {
      authorPostsMap.set(authorKey, []);
    }
    authorPostsMap.get(authorKey)!.push(postUrl);
  }
}

// 匹配 cases.json 中的数据
for (const [author, cases] of casesByAuthor) {
  const authorInfo = authorMap.get(author);
  const postUrls = authorPostsMap.get(author) || [];
  
  if (authorInfo) {
    for (let i = 0; i < cases.length; i++) {
      const caseItem = cases[i];
      
      // 清洗 prompt：移除示例内容和占位符说明
      let cleanedPrompt = caseItem.prompt || '';
      
      // 移除 {} 或 [] 占位符的说明
      cleanedPrompt = cleanedPrompt
        .replace(/\{[^}]+\}/g, '[VARIABLE]')
        .replace(/\[[^\]]+\]/g, '[PARAMETER]')
        .replace(/\n\n+/g, '\n\n')
        .trim();

      results.push({
        caseId: caseItem.id,
        titleEN: caseItem.title,
        titleCN: authorInfo.titleCN,
        originalAuthor: author,
        authorUrl: authorInfo.authorUrl,
        postUrl: postUrls[i] || authorInfo.postUrl,
        prompt: caseItem.prompt,
        cleanedPrompt,
      });
    }
  } else {
    // 作者信息未找到，仅记录基本信息
    for (const caseItem of cases) {
      let cleanedPrompt = caseItem.prompt || '';
      cleanedPrompt = cleanedPrompt
        .replace(/\{[^}]+\}/g, '[VARIABLE]')
        .replace(/\[[^\]]+\]/g, '[PARAMETER]')
        .replace(/\n\n+/g, '\n\n')
        .trim();

      results.push({
        caseId: caseItem.id,
        titleEN: caseItem.title,
        titleCN: '(未知中文标题)',
        originalAuthor: author,
        authorUrl: '(未知)',
        postUrl: '(未知)',
        prompt: caseItem.prompt,
        cleanedPrompt,
      });
    }
  }
}

// 输出汇总结果
console.log('='.repeat(80));
console.log('📊 原始作者信息汇总');
console.log('='.repeat(80));
console.log(`\n共找到 ${results.length} 个案例\n`);

// 按作者分组
const byAuthor = new Map<string, CaseAuthorInfo[]>();
results.forEach(item => {
  if (!byAuthor.has(item.originalAuthor)) {
    byAuthor.set(item.originalAuthor, []);
  }
  byAuthor.get(item.originalAuthor)!.push(item);
});

console.log(`共 ${byAuthor.size} 位作者\n`);

// 输出每个作者的信息
byAuthor.forEach((cases, author) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`👤 作者: ${author}`);
  console.log(`   主页: ${cases[0].authorUrl}`);
  console.log(`   案例数: ${cases.length}`);
  console.log('-'.repeat(80));
  
  cases.forEach((caseInfo, index) => {
    console.log(`\n  ${index + 1}. ${caseInfo.titleCN} / ${caseInfo.titleEN}`);
    console.log(`     ID: ${caseInfo.caseId}`);
    console.log(`     原帖: ${caseInfo.postUrl}`);
    console.log(`     Prompt 预览: ${caseInfo.cleanedPrompt.substring(0, 80)}...`);
  });
});

// 保存为 JSON 文件
const outputPath = path.join(process.cwd(), 'src/data/cases-author-info.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify({
    extractedAt: new Date().toISOString(),
    totalCases: results.length,
    totalAuthors: byAuthor.size,
    byAuthor: Object.fromEntries(
      Array.from(byAuthor.entries()).map(([author, cases]) => [
        author,
        {
          authorUrl: cases[0].authorUrl,
          caseCount: cases.length,
          cases: cases.map(c => ({
            caseId: c.caseId,
            titleEN: c.titleEN,
            titleCN: c.titleCN,
            postUrl: c.postUrl,
            cleanedPrompt: c.cleanedPrompt,
          })),
        },
      ])
    ),
    allCases: results,
  }, null, 2)
);

console.log(`\n\n✅ 汇总结果已保存到: ${outputPath}\n`);

