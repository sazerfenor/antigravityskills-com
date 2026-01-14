import fs from 'fs';
import { getAIService } from '@/shared/services/ai';

// 分类映射（subcategory 标准定义）
const SUBCATEGORY_DEFINITIONS = {
  photography: [
    'Portrait',
    'Street Photography',
    'Fashion Editorial',
    'Macro Photography',
    'Landscape',
    'Editorial Shot',
    'Product Photography',
    'Documentary',
    'Architectural',
    'Wildlife',
    'Sports',
    'Event',
    'Fine Art Photography',
  ],
  'art-illustration': [
    'Digital Painting',
    'Concept Art',
    'Character Illustration',
    'Fantasy Art',
    'Surrealism',
    'Abstract Art',
    'Comic/Manga',
    'Children\'s Book Illustration',
    'Editorial Illustration',
    'Cover Art',
  ],
  design: [
    'Quote Card',
    'Logo Design',
    'Poster Design',
    'Infographic',
    'UI/UX Design',
    'Package Design',
    'Typography',
    'Icon Design',
    'Social Media Graphics',
    'Print Design',
  ],
  'commercial-product': [
    'Product Shot',
    'Advertising Visual',
    'E-commerce Image',
    'Lifestyle Product',
    'Food Photography',
    'Cosmetics',
    'Fashion Product',
    'Tech Product',
  ],
  'character-design': [
    '3D Character',
    '2D Character',
    'Mascot',
    'Game Character',
    'Anime Character',
    'Cartoon Character',
    'Realistic Character',
  ],
};

async function analyzeSubcategories() {
  console.log('🧠 使用 AI 分析 prompts 的 subcategory...\n');

  // 1. 加载需要分析的 prompts
  const input = JSON.parse(fs.readFileSync('logs/prompts-need-subcategory.json', 'utf-8'));
  console.log(`📂 加载了 ${input.length} 条 prompts\n`);

  // 2. 获取 AI 服务
  const aiService = await getAIService();
  const gemini = aiService.getProvider('gemini');

  if (!gemini?.chat) {
    console.error('❌ Gemini provider 未配置');
    process.exit(1);
  }

  // 3. 分批处理（每批 20 条）
  const BATCH_SIZE = 20;
  const results: any[] = [];

  for (let i = 0; i < input.length; i += BATCH_SIZE) {
    const batch = input.slice(i, i + BATCH_SIZE);
    console.log(`📊 处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(input.length / BATCH_SIZE)} (${batch.length} prompts)`);

    // 构建 AI prompt（避免 prompt 中的引号破坏 JSON）
    const promptList = batch.map(p => ({
      id: p.id,
      // 截断 prompt 并转义特殊字符
      prompt_summary: p.prompt.substring(0, 400).replace(/"/g, "'"),
      category: p.category,
    }));

    const aiPrompt = `You are an expert at categorizing AI image generation prompts.

Given a list of prompts, classify each one into a specific subcategory based on its content.

## Prompts to Analyze
${JSON.stringify(promptList, null, 2)}

## Available Subcategories by Category
${JSON.stringify(SUBCATEGORY_DEFINITIONS, null, 2)}

## Rules
1. Read the prompt carefully and identify its primary subject/purpose
2. Match it to the MOST SPECIFIC subcategory from the list for its category
3. If uncertain, choose the closest match
4. Return ONLY a JSON object mapping id → subcategory
5. IMPORTANT: Use double quotes for JSON keys and values

## Output Format
{"prompt-id-1": "Portrait", "prompt-id-2": "Quote Card"}

No explanation needed. Just valid JSON.`;

    try {
      // 改用 CSV 格式更稳定
      const csvPrompt = `${aiPrompt}

Return as CSV (one line per prompt):
id,subcategory
prompt-id-1,Portrait
prompt-id-2,Quote Card

No headers, just the data lines.`;

      const response = await gemini.chat({
        model: 'gemini-3-flash-preview',
        prompt: csvPrompt,
        temperature: 0.2,
        maxTokens: 2048,
      });

      // 解析 CSV 响应
      const lines = response.trim().split('\n').filter(line => line.trim() && !line.startsWith('id,'));
      const parsed: Record<string, string> = {};

      for (const line of lines) {
        const [id, subcategory] = line.split(',').map(s => s.trim());
        if (id && subcategory) {
          parsed[id] = subcategory;
        }
      }

      // 合并结果
      for (const item of batch) {
        const subcategory = parsed[item.id];
        results.push({
          ...item,
          subcategory: subcategory || 'Unknown',
        });
      }

      console.log(`   ✅ 完成`);

      // 避免速率限制
      if (i + BATCH_SIZE < input.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`   ❌ 失败: ${error.message}`);
      // Fallback: 标记为 Unknown
      results.push(...batch.map(b => ({ ...b, subcategory: 'Unknown' })));
    }
  }

  // 4. 保存结果
  fs.writeFileSync('logs/prompts-with-subcategory.json', JSON.stringify(results, null, 2));
  console.log(`\n✅ 分析完成！已保存到 logs/prompts-with-subcategory.json`);

  // 5. 统计
  const stats: Record<string, number> = {};
  results.forEach(r => {
    stats[r.subcategory] = (stats[r.subcategory] || 0) + 1;
  });

  console.log('\n📊 Subcategory 分布:');
  Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([sub, count]) => {
    console.log(`   ${sub}: ${count}`);
  });

  process.exit(0);
}

analyzeSubcategories().catch(error => {
  console.error('❌ 分析失败:', error);
  process.exit(1);
});
