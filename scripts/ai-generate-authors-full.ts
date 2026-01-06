/**
 * AI 驱动的虚拟作者生成（完整版）
 * 使用 Gemini 3 Pro 处理所有 138 个 prompts
 */

import casesData from '../src/data/cases.json';
import authorInfo from '../src/data/cases-author-info.json';
import { generateText } from '../src/shared/services/gemini-text';
import fs from 'fs';

async function aiDrivenAuthorGenerationFull() {
  console.log('='.repeat(80));
  console.log('🤖 AI 驱动虚拟作者生成（Gemini 3 Pro - 完整版）');
  console.log('='.repeat(80));

  // 准备所有数据摘要
  const promptSummaries = casesData.cases.map(c => ({
    id: c.id,
    title: c.title,
    author: c.author,
    subject: c.structured?.subject || c.title,
    intent: c.structured?.inferred_intent?.[0] || 'General',
  }));

  const aiPrompt = `# Task: 智能聚类 138 个 Prompts 并生成虚拟作者

## 数据概况
- 总 Prompts: 138
- 总原始作者: 74

## 目标
将这些 prompts 按**用途和风格**聚类，合并为 **10-15 个虚拟作者**。

## 完整 Prompts 列表:
${promptSummaries.map((p, i) => `${i + 1}. [${p.id}] ${p.title} (${p.intent}) - by ${p.author}`).join('\n')}

## 输出格式

按以下 JSON 格式返回（ONLY JSON, NO MARKDOWN）:

{
  "virtualAuthors": [
    {
      "id": "logo_master",
      "displayName": "Alex Chen",
      "username": "alex_logodesign",
      "bio": "专注品牌 Logo、App 图标设计，擅长简约风格",
      "category": "Logo & Icon Design",
      "matchedPromptIds": ["example_5", "example_12"],
      "matchedOriginalAuthors": ["@user1", "@user2"]
    }
  ],
  "reasoning": "聚类逻辑说明（中文）"
}

## 虚拟作者命名规则
1. **displayName**: 真实多样的英文名（Alex Chen, Emily Rodriguez, David Kim, Sarah O'Connor）
2. **username**: 小写，体现专业
3. **bio**: 中文，50-100字
4. **名字要多样化**：不要全是中文拼音，混合西方名、亚洲名

## 重要约束
- 每个虚拟作者管理 5-20 个 prompts
- 总共生成 10-15 个虚拟作者
- 所有 138 个 prompts 必须都被分配
- 按用途聚类（Logo、Character、Product、Marketing、3D、Education 等）

现在分析全部 138 个 prompts 并生成虚拟作者：`;

  console.log('\n📤 调用 Gemini 3 Pro 处理全部 138 个 prompts...\n');

  try {
    const response = await generateText(aiPrompt, {
      model: 'gemini-3-pro-preview',
      temperature: 0.7,
      maxOutputTokens: 16384,
    });

    console.log('✅ AI 响应成功\n');

    // 提取 JSON
    let jsonStr = response;
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const aiResult = JSON.parse(jsonStr);

    // 验证覆盖率
    const allAssignedPrompts = new Set<string>();
    for (const author of aiResult.virtualAuthors) {
      for (const promptId of author.matchedPromptIds) {
        allAssignedPrompts.add(promptId);
      }
    }

    console.log('📊 AI 生成的虚拟作者:\n');
    console.log('序号 | 虚拟作者名称          | Prompts | 分类');
    console.log('-'.repeat(90));

    for (const [i, author] of aiResult.virtualAuthors.entries()) {
      const num = (i + 1).toString().padStart(2);
      const name = author.displayName.padEnd(20);
      const count = author.matchedPromptIds.length.toString().padEnd(7);
      console.log(`${num}   | ${name} | ${count} | ${author.category}`);
      console.log(`      @${author.username}`);
      console.log(`      ${author.bio.substring(0, 70)}...`);
      console.log('');
    }

    console.log('='.repeat(90));
    console.log(`总虚拟作者: ${aiResult.virtualAuthors.length}`);
    console.log(`已分配 Prompts: ${allAssignedPrompts.size} / 138`);
    console.log(`覆盖率: ${((allAssignedPrompts.size / 138) * 100).toFixed(1)}%`);
    console.log(`作者减少: 74 → ${aiResult.virtualAuthors.length} (减少 ${(100 - aiResult.virtualAuthors.length / 74 * 100).toFixed(1)}%)`);
    console.log('='.repeat(90));

    if (allAssignedPrompts.size < 138) {
      console.log('\n⚠️  警告：有些 prompts 未被分配！');
      const unassigned = casesData.cases
        .filter(c => !allAssignedPrompts.has(c.id))
        .map(c => c.id);
      console.log('未分配:', unassigned.slice(0, 10).join(', '), '...');
    }

    console.log('\n💭 AI 聚类逻辑:\n');
    console.log(aiResult.reasoning);

    // 保存结果
    fs.writeFileSync(
      'ai-generated-authors-full.json',
      JSON.stringify(aiResult, null, 2)
    );

    // 生成映射表
    const promptToAuthorMap: Record<string, string> = {};
    for (const author of aiResult.virtualAuthors) {
      for (const promptId of author.matchedPromptIds) {
        promptToAuthorMap[promptId] = author.username;
      }
    }

    fs.writeFileSync(
      'prompt-to-virtual-author-mapping.json',
      JSON.stringify(promptToAuthorMap, null, 2)
    );

    console.log('\n💾 结果已保存:');
    console.log('  - ai-generated-authors-full.json (完整数据)');
    console.log('  - prompt-to-virtual-author-mapping.json (映射表)');

  } catch (error: any) {
    console.error('❌ AI 调用失败:', error.message);
    if (error.response) {
      console.error('响应:', error.response);
    }
  }
}

// 运行
aiDrivenAuthorGenerationFull().catch(console.error);
