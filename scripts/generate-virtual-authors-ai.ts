/**
 * AI 驱动的虚拟作者生成（优化版）
 * 使用专业 Prompt + Gemini 3 Pro 处理全部 138 个 prompts
 */

import casesData from '../src/data/cases.json';
import { generateText } from '../src/shared/services/gemini-text';
import fs from 'fs';

async function aiGenerateVirtualAuthors() {
  console.log('='.repeat(80));
  console.log('🏗️  虚拟社区架构师（Gemini 3 Pro）');
  console.log('='.repeat(80));

  // ✅ 全量数据（不切片）
  const promptSummaries = casesData.cases.map(c => ({
    id: c.id,
    title: c.title,
    author: c.author,
    subject: c.structured?.subject || c.title,
    intent: c.structured?.inferred_intent?.join(', ') || 'General',
    style: c.structured?.style || 'Unknown',
  }));

  console.log(`📊 数据准备完成: ${promptSummaries.length} prompts\n`);

  // 🚀 优化后的 System Prompt
  const aiPrompt = `# Role: 虚拟社区架构师 (Virtual Community Architect)

# Task
你正在为一个 AI 提示词分享社区构建"创作者生态"。你需要分析输入的所有 Prompt Case，根据**视觉风格、应用场景和潜在意图**将它们归类，并为每一类分配一个虚构的、极具真实感的"人类作者"。

# Input Data
Total Prompts: ${casesData.cases.length}
Data Set:
\`\`\`json
${JSON.stringify(promptSummaries, null, 2)}
\`\`\`

# 1. Analysis Phase (思维链)
不要直接生成结果，先在内心进行分析：
1.  **聚类分析**：遍历所有 Prompt，识别出核心领域（例如：Logo设计、二次元角色、照片级人像、UI/UX 界面、3D 渲染、抽象艺术等）。
2.  **原型构建**：为每个领域设计一个典型的用户画像（Archetype），例如："Logo 设计师"通常严谨、使用工作室名称；"二次元画师"通常使用日系ID或可爱的昵称。
3.  **完整性检查**：确保 Input Data 中的**每一个** \`id\` 都被分配到了某个作者名下，不能有遗漏。

# 2. Author Persona Guidelines (拟人化规则)
生成的虚拟作者必须像"真人"，混合以下几种命名风格：

* **Type A - 专业派**: 使用全名或工作室名 (e.g., "Alex Chen", "Nordic Studio", "DesignByLi")
* **Type B - 极简/抽象派**: 全小写，短单词 (e.g., "echo", "pluto_art", "void_render")
* **Type C - 社交媒体派**: 带有数字或下划线，口语化 (e.g., "momo_2024", "cyber_ninja", "jenny_draws")

**要求：**
* **displayName**: 英文名或拼音，自然多样（不要全部叫 "AI Master" 或 "Prompt God"）。
* **username**: 唯一的英文 ID，符合上述风格。
* **bio**: 中文，50-100字。要有"人味"，包含具体的擅长工具（如 Blender, MJ, Niji）或设计理念。

# 3. Output Schema (JSON Only)
输出必须严格符合以下 JSON 格式，不要包含 Markdown 代码块以外的文本。

\`\`\`json
{
  "reasoning": "简述你的聚类策略和主要风格划分逻辑（中文）",
  "virtualAuthors": [
    {
      "id": "unique_author_id_1",
      "displayName": "Display Name",
      "username": "user_handle",
      "bio": "Bio string...",
      "category": "主要擅长领域",
      "tags": ["Tag1", "Tag2"],
      "matchedPromptIds": ["case_id_1", "case_id_2"]
    }
  ],
  "stats": {
    "totalAuthorsGenerated": 0,
    "totalPromptsAssigned": 0
  }
}
\`\`\`

# Constraints
1. 生成 **10-15 位** 虚拟作者。
2. 即使某个类别只有 1-2 个 prompt，也可以归入一个"杂项/实验性风格"的作者，或者创建一个涉猎广泛的作者。
3. **CRITICAL**: 返回的 \`matchedPromptIds\` 总数必须等于 ${casesData.cases.length}。任何一个 case ID 都不能丢失。

现在开始分析并生成虚拟作者：`;

  console.log('📤 调用 Gemini 3 Pro（全量数据 + 优化 Prompt）...\n');

  try {
    const response = await generateText(aiPrompt, {
      model: 'gemini-3-pro-preview',
      temperature: 0.7,
      maxOutputTokens: 16384,
    });

    console.log('✅ AI 响应完成\n');

    // 提取 JSON
    let jsonStr = response.trim();
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1] || jsonMatch[0];
    }

    const aiResult = JSON.parse(jsonStr);

    // 验证数据完整性
    const allAssignedPrompts = new Set<string>();
    for (const author of aiResult.virtualAuthors) {
      for (const promptId of author.matchedPromptIds) {
        allAssignedPrompts.add(promptId);
      }
    }

    // 展示结果
    console.log('🎨 虚拟作者生成结果\n');
    console.log('序号 | 类型 | 作者名称                | Prompts | 分类');
    console.log('-'.repeat(100));

    for (const [i, author] of aiResult.virtualAuthors.entries()) {
      // 判断命名类型
      let type = 'A';
      if (author.username === author.username.toLowerCase() && !author.username.includes('_')) {
        type = 'B';
      } else if (author.username.match(/\d|_/)) {
        type = 'C';
      }

      const num = (i + 1).toString().padStart(2);
      const name = author.displayName.padEnd(22);
      const count = author.matchedPromptIds.length.toString().padEnd(7);
      
      console.log(`${num}   | ${type}  | ${name} | ${count} | ${author.category}`);
      console.log(`       @${author.username}`);
      console.log(`       ${author.bio.substring(0, 65)}${author.bio.length > 65 ? '...' : ''}`);
      console.log(`       标签: ${author.tags.join(', ')}`);
      console.log('');
    }

    console.log('='.repeat(100));
    console.log('📊 统计数据:');
    console.log(`  虚拟作者数: ${aiResult.stats.totalAuthorsGenerated}`);
    console.log(`  已分配 Prompts: ${aiResult.stats.totalPromptsAssigned} / ${casesData.cases.length}`);
    console.log(`  实际覆盖: ${allAssignedPrompts.size} / ${casesData.cases.length}`);
    console.log(`  覆盖率: ${((allAssignedPrompts.size / casesData.cases.length) * 100).toFixed(1)}%`);
    console.log(`  作者精简: 74 → ${aiResult.stats.totalAuthorsGenerated} (${((1 - aiResult.stats.totalAuthorsGenerated / 74) * 100).toFixed(1)}% 减少)`);
    console.log('='.repeat(100));

    // 检查遗漏
    if (allAssignedPrompts.size < casesData.cases.length) {
      console.log('\n⚠️  警告：以下 prompts 未被分配:');
      const unassigned = casesData.cases
        .filter(c => !allAssignedPrompts.has(c.id))
        .map(c => `${c.id} (${c.title})`);
      console.log(unassigned.join('\n'));
    } else {
      console.log('\n✅ 所有 prompts 都已分配！');
    }

    console.log('\n💭 AI 聚类逻辑:\n');
    console.log(aiResult.reasoning);

    // 保存结果
    fs.writeFileSync(
      'virtual-authors-final.json',
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
      'prompt-to-author-map.json',
      JSON.stringify(promptToAuthorMap, null, 2)
    );

    console.log('\n💾 文件已保存:');
    console.log('  ✓ virtual-authors-final.json (完整虚拟作者数据)');
    console.log('  ✓ prompt-to-author-map.json (ID 映射表)');
    console.log('='.repeat(100));

  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
    console.error(error);
  }
}

// 运行
aiGenerateVirtualAuthors().catch(console.error);
