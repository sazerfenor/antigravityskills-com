/**
 * AI 驱动的 Prompt-Persona 智能匹配脚本
 *
 * 让 AI 根据虚拟人格的专长和风格偏好，为每个 prompt 选择最合适的作者
 * 而不是简单的轮询分配
 *
 * 使用方法：
 * pnpm tsx scripts/assign-prompts-to-personas.ts --input logs/prompts-input.json
 */

import * as fs from 'fs';

// ============================================
// 配置
// ============================================

const INPUT_FILE = (() => {
  const idx = process.argv.indexOf('--input');
  return idx !== -1 ? process.argv[idx + 1] : 'logs/prompts-input.json';
})();

const BATCH_SIZE = 25; // 每批处理的 prompt 数量

// ============================================
// 类型定义
// ============================================

interface PersonaSummary {
  userId: string;
  username: string;
  category: string;
  specialties: string[];
  styleKeywords: string[];
  dislikes: string[];
  bio: string;
}

interface PromptSummary {
  id: string;
  category: string;
  // 从长 prompt 中提取的关键信息
  subject: string;
  style: string;
  keywords: string[];
}

interface PromptInput {
  id: string;
  prompt: string;
  title?: string;
  subject?: string;
  category?: string;
  userId?: string;
}

interface InputFile {
  prompts: PromptInput[];
  config?: {
    userIds?: Record<string, string[]>;
    autoPublish?: boolean;
    // 新增：AI 分配的映射
    aiAssignments?: Record<string, string>;
  };
}

// ============================================
// 主逻辑
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('🧠 AI 驱动的 Prompt-Persona 智能匹配');
  console.log('='.repeat(60));

  // 1. 加载输入文件
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ 输入文件不存在: ${INPUT_FILE}`);
    process.exit(1);
  }

  const input: InputFile = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`📂 输入文件: ${INPUT_FILE}`);
  console.log(`📊 Prompt 数量: ${input.prompts.length}`);

  // 2. 加载虚拟人格信息
  const { db } = await import('../src/core/db');
  const { virtualPersona, user } = await import('../src/config/db/schema');
  const { eq } = await import('drizzle-orm');

  const personas = await db()
    .select({
      userId: virtualPersona.userId,
      username: virtualPersona.username,
      category: virtualPersona.primaryCategory,
      specialties: virtualPersona.specialties,
      styleKeywords: virtualPersona.styleKeywords,
      dislikes: virtualPersona.dislikes,
      bio: user.bio,
    })
    .from(virtualPersona)
    .innerJoin(user, eq(virtualPersona.userId, user.id))
    .where(eq(virtualPersona.isActive, true));

  console.log(`👥 虚拟人格数量: ${personas.length}`);

  if (personas.length === 0) {
    console.error('❌ 没有找到活跃的虚拟人格');
    process.exit(1);
  }

  // 3. 准备人格摘要
  const personaSummaries: PersonaSummary[] = personas.map(p => ({
    userId: p.userId,
    username: p.username,
    category: p.category,
    specialties: p.specialties ? JSON.parse(p.specialties) : [],
    styleKeywords: p.styleKeywords ? JSON.parse(p.styleKeywords) : [],
    dislikes: p.dislikes ? JSON.parse(p.dislikes) : [],
    bio: p.bio || '',
  }));

  // 4. 按分类分组人格
  const personasByCategory: Record<string, PersonaSummary[]> = {};
  for (const persona of personaSummaries) {
    const cat = persona.category || 'photography';
    if (!personasByCategory[cat]) {
      personasByCategory[cat] = [];
    }
    personasByCategory[cat].push(persona);
  }

  console.log('\n📊 人格分布:');
  for (const [cat, list] of Object.entries(personasByCategory)) {
    console.log(`  ${cat}: ${list.length} 人`);
  }

  // 5. 准备 prompt 摘要（提取关键信息，避免发送完整 prompt）
  const promptSummaries: PromptSummary[] = input.prompts.map(p => ({
    id: p.id,
    category: p.category || 'photography',
    subject: p.subject || p.title || extractSubject(p.prompt),
    style: extractStyle(p.prompt),
    keywords: extractKeywords(p.prompt),
  }));

  // 6. 按分类分组 prompts
  const promptsByCategory: Record<string, PromptSummary[]> = {};
  for (const prompt of promptSummaries) {
    const cat = prompt.category;
    if (!promptsByCategory[cat]) {
      promptsByCategory[cat] = [];
    }
    promptsByCategory[cat].push(prompt);
  }

  console.log('\n📊 Prompt 分布:');
  for (const [cat, list] of Object.entries(promptsByCategory)) {
    console.log(`  ${cat}: ${list.length} 个`);
  }

  // 7. 分批调用 AI 进行匹配
  const { getAIService } = await import('../src/shared/services/ai');
  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini');

  if (!geminiProvider?.chat) {
    console.error('❌ Gemini provider 未配置');
    process.exit(1);
  }

  const assignments: Record<string, string> = {};
  const assignmentCounts: Record<string, number> = {}; // 跟踪每个人格分配了多少

  // 初始化计数
  for (const persona of personaSummaries) {
    assignmentCounts[persona.userId] = 0;
  }

  // 按分类处理
  for (const [category, prompts] of Object.entries(promptsByCategory)) {
    const categoryPersonas = personasByCategory[category] || [];

    if (categoryPersonas.length === 0) {
      console.warn(`⚠️ 分类 ${category} 没有对应的人格，跳过`);
      continue;
    }

    console.log(`\n🔄 处理分类: ${category} (${prompts.length} prompts, ${categoryPersonas.length} personas)`);

    // 计算每个人格应该分配多少
    const targetPerPersona = Math.ceil(prompts.length / categoryPersonas.length);
    console.log(`   目标: 每人 ${targetPerPersona} 个 prompts`);

    // 分批处理
    for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
      const batch = prompts.slice(i, i + BATCH_SIZE);
      console.log(`   批次 ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} prompts`);

      const result = await matchBatch(
        geminiProvider,
        batch,
        categoryPersonas,
        assignmentCounts,
        targetPerPersona
      );

      // 合并结果
      Object.assign(assignments, result);

      // 更新计数
      for (const userId of Object.values(result)) {
        assignmentCounts[userId] = (assignmentCounts[userId] || 0) + 1;
      }

      // 避免速率限制
      if (i + BATCH_SIZE < prompts.length) {
        await sleep(1000);
      }
    }
  }

  // 8. 更新输入文件
  input.config = input.config || {};
  input.config.aiAssignments = assignments;

  // 同时更新每个 prompt 的 userId
  for (const prompt of input.prompts) {
    if (assignments[prompt.id]) {
      prompt.userId = assignments[prompt.id];
    }
  }

  fs.writeFileSync(INPUT_FILE, JSON.stringify(input, null, 2));
  console.log(`\n✅ 已更新输入文件: ${INPUT_FILE}`);

  // 9. 输出统计
  console.log('\n📊 分配统计:');
  const sortedCounts = Object.entries(assignmentCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [userId, count] of sortedCounts) {
    const persona = personaSummaries.find(p => p.userId === userId);
    console.log(`  ${persona?.username || userId}: ${count} 个`);
  }

  console.log('\n✅ 智能分配完成！');
}

// ============================================
// 辅助函数
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractSubject(prompt: string): string {
  // 提取 prompt 的主题（前 100 个字符）
  const cleaned = prompt.replace(/[#*\n]/g, ' ').trim();
  return cleaned.substring(0, 100);
}

function extractStyle(prompt: string): string {
  // 提取风格相关关键词
  const styleKeywords = [
    'cinematic', 'moody', 'vibrant', 'minimal', 'dramatic',
    'realistic', 'photorealistic', 'artistic', 'abstract',
    'vintage', 'modern', 'futuristic', 'noir', 'ethereal',
    'dark', 'bright', 'colorful', 'monochrome', 'soft',
    'editorial', 'documentary', 'portrait', 'landscape',
    'street', 'fashion', 'commercial', 'fine art',
  ];

  const lowerPrompt = prompt.toLowerCase();
  const found = styleKeywords.filter(k => lowerPrompt.includes(k));
  return found.slice(0, 5).join(', ') || 'general';
}

function extractKeywords(prompt: string): string[] {
  // 提取关键词
  const words = prompt.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4);

  // 统计词频
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // 返回出现次数最多的词
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

async function matchBatch(
  geminiProvider: any,
  prompts: PromptSummary[],
  personas: PersonaSummary[],
  currentCounts: Record<string, number>,
  targetPerPersona: number
): Promise<Record<string, string>> {
  // 构建 AI prompt
  const personaList = personas.map(p => ({
    id: p.userId,
    name: p.username,
    specialties: p.specialties.slice(0, 5),
    style: p.styleKeywords.slice(0, 5),
    dislikes: p.dislikes.slice(0, 3),
    currentCount: currentCounts[p.userId] || 0,
  }));

  const promptList = prompts.map(p => ({
    id: p.id,
    subject: p.subject.substring(0, 80),
    style: p.style,
  }));

  const aiPrompt = `You are matching content creators with prompts based on their expertise and style preferences.

## Available Creators
${JSON.stringify(personaList, null, 2)}

## Prompts to Assign
${JSON.stringify(promptList, null, 2)}

## Rules
1. Match each prompt to the MOST SUITABLE creator based on:
   - Their specialties matching the prompt subject
   - Their style preferences matching the prompt style
   - Avoid creators whose "dislikes" conflict with the prompt
2. Balance the load: target ~${targetPerPersona} prompts per creator
3. Prioritize creators with lower currentCount to ensure even distribution

## Output
Return ONLY a JSON object mapping promptId to creatorId:
{"prompt-123": "user-abc", "prompt-456": "user-def", ...}

No explanation needed. Just the JSON.`;

  try {
    const response = await geminiProvider.chat({
      model: 'gemini-3-flash-preview',
      prompt: aiPrompt,
      temperature: 0.3,
      maxTokens: 2048,
      jsonMode: true,
    });

    // 解析响应
    const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim());

    // 验证并过滤有效分配
    const validPersonaIds = new Set(personas.map(p => p.userId));
    const validPromptIds = new Set(prompts.map(p => p.id));

    const result: Record<string, string> = {};
    for (const [promptId, userId] of Object.entries(parsed)) {
      if (validPromptIds.has(promptId) && validPersonaIds.has(userId as string)) {
        result[promptId] = userId as string;
      }
    }

    // 处理未分配的 prompts（fallback 到轮询）
    const assigned = new Set(Object.keys(result));
    let fallbackIndex = 0;
    for (const prompt of prompts) {
      if (!assigned.has(prompt.id)) {
        // 找当前分配最少的人格
        const sorted = personas
          .map(p => ({ userId: p.userId, count: (currentCounts[p.userId] || 0) + (result[prompt.id] === p.userId ? 1 : 0) }))
          .sort((a, b) => a.count - b.count);
        result[prompt.id] = sorted[0].userId;
      }
    }

    return result;
  } catch (error: any) {
    console.error(`   ❌ AI 匹配失败: ${error.message}`);

    // Fallback: 轮询分配
    const result: Record<string, string> = {};
    let index = 0;
    for (const prompt of prompts) {
      result[prompt.id] = personas[index % personas.length].userId;
      index++;
    }
    return result;
  }
}

// 运行
main().catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});
