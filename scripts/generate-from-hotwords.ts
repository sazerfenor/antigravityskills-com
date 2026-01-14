/**
 * 热词生成 Prompts 脚本
 *
 * @description 根据热门关键词/主题，使用 AI 批量生成高质量 Prompts
 *
 * @usage
 *   # 使用内置热词列表
 *   pnpm tsx scripts/generate-from-hotwords.ts
 *
 *   # 从文件加载热词
 *   pnpm tsx scripts/generate-from-hotwords.ts --file ./hotwords.json
 *
 *   # 指定生成数量
 *   pnpm tsx scripts/generate-from-hotwords.ts --count 50
 */

import { generateText } from '@/shared/services/gemini-text';
import { createPromptQueueItems } from '@/shared/models/prompt_queue';
import type { PersonaCategory } from '@/shared/types/virtual-persona';

// ============================================
// 配置
// ============================================

const DEFAULT_HOTWORDS: Array<{
  keyword: string;
  category: PersonaCategory;
  styles?: string[];
}> = [
  // Photography 热词
  { keyword: 'portrait photography', category: 'photography', styles: ['cinematic', 'natural light', 'studio'] },
  { keyword: 'landscape sunset', category: 'photography', styles: ['golden hour', 'dramatic', 'serene'] },
  { keyword: 'street photography', category: 'photography', styles: ['urban', 'candid', 'noir'] },
  { keyword: 'fashion editorial', category: 'photography', styles: ['high fashion', 'minimalist', 'avant-garde'] },
  { keyword: 'food photography', category: 'photography', styles: ['rustic', 'minimalist', 'vibrant'] },

  // Art & Illustration 热词
  { keyword: 'anime girl', category: 'art-illustration', styles: ['kawaii', 'dark fantasy', 'cyberpunk'] },
  { keyword: 'fantasy landscape', category: 'art-illustration', styles: ['epic', 'mystical', 'ethereal'] },
  { keyword: 'concept art', category: 'art-illustration', styles: ['sci-fi', 'fantasy', 'steampunk'] },
  { keyword: 'digital painting', category: 'art-illustration', styles: ['impressionist', 'hyperrealistic', 'abstract'] },
  { keyword: 'character design', category: 'character-design', styles: ['anime', 'western', 'chibi'] },

  // Design 热词
  { keyword: 'logo design', category: 'design', styles: ['minimalist', 'vintage', 'geometric'] },
  { keyword: 'ui design', category: 'design', styles: ['glassmorphism', 'neumorphism', 'flat'] },
  { keyword: 'poster design', category: 'design', styles: ['retro', 'modern', 'typographic'] },
  { keyword: 'packaging design', category: 'design', styles: ['premium', 'eco-friendly', 'playful'] },

  // Commercial Product 热词
  { keyword: 'product photography', category: 'commercial-product', styles: ['luxury', 'lifestyle', 'studio'] },
  { keyword: 'cosmetics ad', category: 'commercial-product', styles: ['elegant', 'youthful', 'natural'] },
  { keyword: 'tech product', category: 'commercial-product', styles: ['futuristic', 'clean', 'dynamic'] },
];

const PROMPT_GENERATION_TEMPLATE = `You are an expert AI image prompt engineer. Generate creative, detailed prompts for AI image generation.

Given the keyword and style, create a unique, specific prompt that would generate a stunning image.

Requirements:
1. Be specific about subject, composition, lighting, colors, and mood
2. Include technical details (camera angle, lens type for photos; art style for illustrations)
3. Make it unique and creative, not generic
4. Keep it between 50-150 words
5. Do NOT include any negative prompts or quality tags like "4k, masterpiece"

Keyword: {{KEYWORD}}
Style: {{STYLE}}
Category: {{CATEGORY}}

Output only the prompt text, nothing else.`;

// ============================================
// 辅助函数
// ============================================

function parseArgs(): {
  file?: string;
  count: number;
  priority: number;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    file: undefined as string | undefined,
    count: 30,
    priority: 5,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' && args[i + 1]) {
      result.file = args[++i];
    } else if (arg === '--count' && args[i + 1]) {
      result.count = parseInt(args[++i], 10);
    } else if (arg === '--priority' && args[i + 1]) {
      result.priority = parseInt(args[++i], 10);
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    }
  }

  return result;
}

async function loadHotwordsFromFile(filePath: string): Promise<typeof DEFAULT_HOTWORDS> {
  const fs = await import('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function generatePromptFromHotword(
  keyword: string,
  style: string,
  category: PersonaCategory
): Promise<string> {
  const prompt = PROMPT_GENERATION_TEMPLATE
    .replace('{{KEYWORD}}', keyword)
    .replace('{{STYLE}}', style)
    .replace('{{CATEGORY}}', category);

  const result = await generateText(prompt, {
    temperature: 0.9, // 高温度以增加多样性
    maxOutputTokens: 500,
    model: 'gemini-3-flash-preview',
  });

  return result.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('🔥 热词 Prompt 生成脚本启动\n');

  const options = parseArgs();

  // 加载热词
  let hotwords = DEFAULT_HOTWORDS;
  if (options.file) {
    console.log(`📂 从文件加载热词: ${options.file}`);
    hotwords = await loadHotwordsFromFile(options.file);
  } else {
    console.log(`📂 使用内置热词列表 (${hotwords.length} 个关键词)`);
  }

  console.log(`🎯 目标: 生成 ${options.count} 个 Prompts\n`);

  // 生成 Prompts
  const generatedPrompts: Array<{
    prompt: string;
    category: PersonaCategory;
    priority: number;
    source: string;
  }> = [];

  let generated = 0;
  const startTime = Date.now();

  while (generated < options.count) {
    // 随机选择热词和风格
    const hotword = hotwords[Math.floor(Math.random() * hotwords.length)];
    const style = hotword.styles
      ? hotword.styles[Math.floor(Math.random() * hotword.styles.length)]
      : 'professional';

    try {
      console.log(`   [${generated + 1}/${options.count}] 生成: ${hotword.keyword} + ${style}`);

      const prompt = await generatePromptFromHotword(
        hotword.keyword,
        style,
        hotword.category
      );

      if (prompt && prompt.length > 30) {
        generatedPrompts.push({
          prompt,
          category: hotword.category,
          priority: options.priority,
          source: 'hotword',
        });
        generated++;

        if (options.dryRun) {
          console.log(`      → ${prompt.substring(0, 80)}...`);
        }
      }

      // 速率限制：每秒最多 2 个请求
      await sleep(500);
    } catch (err: any) {
      console.error(`      ❌ 失败: ${err.message}`);
      await sleep(1000);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  生成完成，耗时 ${duration}s\n`);

  // 保存到队列
  if (options.dryRun) {
    console.log('🔍 Dry-run 模式，不写入数据库');
    console.log(`   生成了 ${generatedPrompts.length} 个 Prompts`);
    return;
  }

  console.log('💾 写入数据库...');

  const now = new Date();
  const items = generatedPrompts.map((p) => ({
    prompt: p.prompt,
    category: p.category,
    priority: p.priority,
    source: p.source,
    status: 'pending' as const,
    createdAt: now,
  }));

  const created = await createPromptQueueItems(items);

  console.log(`\n✅ 完成！共创建 ${created.length} 条记录`);
}

// 运行
main().catch((err) => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
