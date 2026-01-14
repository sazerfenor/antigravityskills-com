/**
 * Prompt 队列导入脚本
 *
 * @description 从 JSON 文件或外部 API 批量导入 Prompts 到队列
 *
 * @usage
 *   # 从 JSON 文件导入
 *   pnpm tsx scripts/upload-prompt-queue.ts --file ./prompts.json
 *
 *   # 从 cases-optimized.json 导入（复用现有数据）
 *   pnpm tsx scripts/upload-prompt-queue.ts --from-cases
 *
 *   # 指定分类和优先级
 *   pnpm tsx scripts/upload-prompt-queue.ts --file ./prompts.json --category photography --priority 8
 */

import { createPromptQueueItems } from '@/shared/models/prompt_queue';
import type { PersonaCategory } from '@/shared/types/virtual-persona';

// ============================================
// 配置
// ============================================

const CASES_OPTIMIZED_FILE = './src/data/cases-optimized.json';

// ============================================
// 类型定义
// ============================================

interface PromptInput {
  prompt: string;
  category?: PersonaCategory;
  priority?: number;
  source?: string;
}

interface CaseData {
  id: string;
  title: string;
  originalPrompt: string;
  optimizedPrompt: string;
  category?: string;
}

// ============================================
// 辅助函数
// ============================================

function parseArgs(): {
  file?: string;
  fromCases: boolean;
  category?: PersonaCategory;
  priority: number;
  limit: number;
} {
  const args = process.argv.slice(2);
  const result = {
    file: undefined as string | undefined,
    fromCases: false,
    category: undefined as PersonaCategory | undefined,
    priority: 5,
    limit: 1000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' && args[i + 1]) {
      result.file = args[++i];
    } else if (arg === '--from-cases') {
      result.fromCases = true;
    } else if (arg === '--category' && args[i + 1]) {
      result.category = args[++i] as PersonaCategory;
    } else if (arg === '--priority' && args[i + 1]) {
      result.priority = parseInt(args[++i], 10);
    } else if (arg === '--limit' && args[i + 1]) {
      result.limit = parseInt(args[++i], 10);
    }
  }

  return result;
}

async function loadPromptsFromFile(filePath: string): Promise<PromptInput[]> {
  const fs = await import('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  // 支持多种格式
  if (Array.isArray(data)) {
    // 直接是数组
    return data.map((item: any) => ({
      prompt: item.prompt || item.optimizedPrompt || item.text,
      category: item.category,
      priority: item.priority,
      source: item.source || 'file',
    }));
  } else if (data.prompts && Array.isArray(data.prompts)) {
    // { prompts: [...] } 格式
    return data.prompts.map((item: any) => ({
      prompt: item.prompt || item.optimizedPrompt || item.text,
      category: item.category,
      priority: item.priority,
      source: item.source || 'file',
    }));
  }

  throw new Error('Unsupported file format');
}

async function loadPromptsFromCases(): Promise<PromptInput[]> {
  const fs = await import('fs');

  if (!fs.existsSync(CASES_OPTIMIZED_FILE)) {
    throw new Error(`Cases file not found: ${CASES_OPTIMIZED_FILE}`);
  }

  const content = fs.readFileSync(CASES_OPTIMIZED_FILE, 'utf-8');
  const cases: CaseData[] = JSON.parse(content);

  return cases.map((c) => ({
    prompt: c.optimizedPrompt || c.originalPrompt,
    category: mapCategoryString(c.category),
    priority: 5,
    source: 'cases',
  }));
}

function mapCategoryString(category?: string): PersonaCategory | undefined {
  if (!category) return undefined;

  const mapping: Record<string, PersonaCategory> = {
    'photography': 'photography',
    'photo': 'photography',
    'art': 'art-illustration',
    'illustration': 'art-illustration',
    'art-illustration': 'art-illustration',
    'design': 'design',
    'commercial': 'commercial-product',
    'commercial-product': 'commercial-product',
    'product': 'commercial-product',
    'character': 'character-design',
    'character-design': 'character-design',
  };

  return mapping[category.toLowerCase()];
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('🚀 Prompt 队列导入脚本启动\n');

  const options = parseArgs();

  if (!options.file && !options.fromCases) {
    console.log('用法:');
    console.log('  pnpm tsx scripts/upload-prompt-queue.ts --file ./prompts.json');
    console.log('  pnpm tsx scripts/upload-prompt-queue.ts --from-cases');
    console.log('\n选项:');
    console.log('  --file <path>       从 JSON 文件导入');
    console.log('  --from-cases        从 cases-optimized.json 导入');
    console.log('  --category <cat>    强制指定分类');
    console.log('  --priority <1-10>   设置优先级（默认 5）');
    console.log('  --limit <n>         最大导入数量（默认 1000）');
    process.exit(1);
  }

  // 加载 Prompts
  let prompts: PromptInput[];

  if (options.file) {
    console.log(`📂 从文件加载: ${options.file}`);
    prompts = await loadPromptsFromFile(options.file);
  } else {
    console.log(`📂 从 Cases 文件加载: ${CASES_OPTIMIZED_FILE}`);
    prompts = await loadPromptsFromCases();
  }

  console.log(`   找到 ${prompts.length} 个 Prompts\n`);

  // 应用过滤和限制
  prompts = prompts
    .filter((p) => p.prompt && p.prompt.trim().length > 10)
    .slice(0, options.limit);

  // 应用全局覆盖
  if (options.category) {
    prompts = prompts.map((p) => ({ ...p, category: options.category }));
  }
  if (options.priority !== 5) {
    prompts = prompts.map((p) => ({ ...p, priority: options.priority }));
  }

  console.log(`📝 准备导入 ${prompts.length} 个 Prompts\n`);

  // 批量插入（每批 50 个）
  const BATCH_SIZE = 50;
  let totalCreated = 0;

  for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
    const batch = prompts.slice(i, i + BATCH_SIZE);
    const now = new Date();

    const items = batch.map((p) => ({
      prompt: p.prompt.trim(),
      category: p.category,
      priority: p.priority || 5,
      source: p.source || 'script',
      status: 'pending' as const,
      createdAt: now,
    }));

    const created = await createPromptQueueItems(items);
    totalCreated += created.length;

    console.log(`   批次 ${Math.floor(i / BATCH_SIZE) + 1}: 创建 ${created.length} 条`);
  }

  console.log(`\n✅ 导入完成！共创建 ${totalCreated} 条记录`);
}

// 运行
main().catch((err) => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
