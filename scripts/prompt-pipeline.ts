/**
 * Prompt 批量处理全链路脚本
 *
 * 串联现有脚本的核心函数，实现：
 * Input Prompts → 优化 → 生成图片 → 创建帖子 → 生成 SEO → 发布
 *
 * 使用方法：
 * pnpm tsx scripts/prompt-pipeline.ts --input prompts-input.json
 * pnpm tsx scripts/prompt-pipeline.ts --input prompts-input.json --dry-run
 * pnpm tsx scripts/prompt-pipeline.ts --input prompts-input.json --step 1
 * pnpm tsx scripts/prompt-pipeline.ts --input prompts-input.json --resume
 *
 * 环境变量：
 * ADMIN_COOKIE - 管理员 Cookie (必须)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 配置
// ============================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || '';
const DELAY_MS = {
  optimize: 2000,  // 优化间隔
  generate: 4000,  // 图片生成间隔
  seo: 3000,       // SEO 生成间隔
};

// 命令行参数
const DRY_RUN = process.argv.includes('--dry-run');
const RESUME = process.argv.includes('--resume');
const STEP = (() => {
  const idx = process.argv.indexOf('--step');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : null;
})();
const INPUT_FILE = (() => {
  const idx = process.argv.indexOf('--input');
  return idx !== -1 ? process.argv[idx + 1] : 'prompts-input.json';
})();
const USER_ID = (() => {
  const idx = process.argv.indexOf('--user-id');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// ============================================
// 类型定义
// ============================================

interface PromptInput {
  id: string;
  prompt: string;
  title?: string;
  subject?: string;
}

interface PipelineConfig {
  userId?: string;
  autoPublish?: boolean;
}

interface InputFile {
  prompts: PromptInput[];
  config?: PipelineConfig;
}

interface PromptProgress {
  step1_optimize: 'pending' | 'done' | 'error';
  step2_generate: 'pending' | 'done' | 'error';
  step3_post: 'pending' | 'done' | 'error';
  step4_seo: 'pending' | 'done' | 'error';
  optimizedPrompt?: string;
  imageUrl?: string;
  postId?: string;
  error?: string;
}

interface PipelineProgress {
  inputFile: string;
  startedAt: string;
  lastUpdated: string;
  config: PipelineConfig;
  prompts: Record<string, PromptProgress>;
}

// ============================================
// 工具函数
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function loadProgress(): PipelineProgress | null {
  const progressFile = `logs/pipeline-progress-${path.basename(INPUT_FILE, '.json')}.json`;
  try {
    if (fs.existsSync(progressFile)) {
      return JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    }
  } catch (e) {
    console.warn('⚠️ 无法读取进度文件');
  }
  return null;
}

function saveProgress(progress: PipelineProgress) {
  const dir = 'logs';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const progressFile = `logs/pipeline-progress-${path.basename(INPUT_FILE, '.json')}.json`;
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
}

function initProgress(input: InputFile): PipelineProgress {
  const prompts: Record<string, PromptProgress> = {};
  for (const p of input.prompts) {
    prompts[p.id] = {
      step1_optimize: 'pending',
      step2_generate: 'pending',
      step3_post: 'pending',
      step4_seo: 'pending',
    };
  }
  return {
    inputFile: INPUT_FILE,
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    config: input.config || {},
    prompts,
  };
}

// ============================================
// Step 1: 优化 Prompt (调用 /api/admin/cases/optimize)
// ============================================

async function step1_optimizePrompt(
  promptInput: PromptInput,
  progress: PromptProgress
): Promise<void> {
  if (progress.step1_optimize === 'done') {
    log('⏭️', `[Step 1] ${promptInput.id} 已完成优化，跳过`);
    return;
  }

  log('🔄', `[Step 1] 优化 Prompt: ${promptInput.id}`);

  if (DRY_RUN) {
    log('📝', '[DRY-RUN] 跳过实际优化');
    progress.step1_optimize = 'done';
    progress.optimizedPrompt = promptInput.prompt; // 干运行直接使用原始 prompt
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/admin/cases/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ADMIN_COOKIE,
      },
      body: JSON.stringify({
        userPrompt: promptInput.prompt,
        referenceCaseTitle: promptInput.title || '',
        referenceCaseSubject: promptInput.subject || '',
        userLanguage: 'zh',
      }),
    });

    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    progress.optimizedPrompt = result.data?.optimizedPrompt || promptInput.prompt;
    progress.step1_optimize = 'done';
    log('✅', `[Step 1] 优化完成: ${promptInput.id}`);
  } catch (error: any) {
    progress.step1_optimize = 'error';
    progress.error = `Step 1: ${error.message}`;
    log('❌', `[Step 1] 优化失败: ${error.message}`);
  }
}

// ============================================
// Step 2: 生成图片 (调用 /api/ai/generate)
// ============================================

async function step2_generateImage(
  promptInput: PromptInput,
  progress: PromptProgress
): Promise<void> {
  if (progress.step2_generate === 'done') {
    log('⏭️', `[Step 2] ${promptInput.id} 已生成图片，跳过`);
    return;
  }

  if (progress.step1_optimize !== 'done') {
    log('⚠️', `[Step 2] ${promptInput.id} 优化未完成，跳过图片生成`);
    return;
  }

  log('🔄', `[Step 2] 生成图片: ${promptInput.id}`);

  if (DRY_RUN) {
    log('📝', '[DRY-RUN] 跳过实际图片生成');
    progress.step2_generate = 'done';
    progress.imageUrl = 'https://placeholder.com/image.png';
    return;
  }

  try {
    // 清理 XML 标签
    const cleanPrompt = (progress.optimizedPrompt || promptInput.prompt)
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();

    const response = await fetch(`${BASE_URL}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ADMIN_COOKIE,
      },
      body: JSON.stringify({
        provider: 'gemini',
        mediaType: 'image',
        model: 'gemini-3-pro-image-preview',
        prompt: cleanPrompt,
        scene: 'text-to-image',
      }),
    });

    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    // 提取图片 URL
    const taskInfo = result.data?.taskInfo;
    let imageUrl: string | null = null;

    if (typeof taskInfo === 'string') {
      const parsed = JSON.parse(taskInfo);
      imageUrl = parsed?.images?.[0]?.imageUrl;
    } else if (typeof taskInfo === 'object') {
      imageUrl = taskInfo?.images?.[0]?.imageUrl;
    }

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    progress.imageUrl = imageUrl;
    progress.step2_generate = 'done';
    log('✅', `[Step 2] 图片生成完成: ${promptInput.id}`);
  } catch (error: any) {
    progress.step2_generate = 'error';
    progress.error = `Step 2: ${error.message}`;
    log('❌', `[Step 2] 图片生成失败: ${error.message}`);
  }
}

// ============================================
// Step 3: 创建帖子 (直接数据库操作)
// ============================================

async function step3_createPost(
  promptInput: PromptInput,
  progress: PromptProgress,
  userId: string
): Promise<void> {
  if (progress.step3_post === 'done') {
    log('⏭️', `[Step 3] ${promptInput.id} 已创建帖子，跳过`);
    return;
  }

  if (progress.step2_generate !== 'done' || !progress.imageUrl) {
    log('⚠️', `[Step 3] ${promptInput.id} 图片未生成，跳过创建帖子`);
    return;
  }

  log('🔄', `[Step 3] 创建帖子: ${promptInput.id}`);

  if (DRY_RUN) {
    log('📝', '[DRY-RUN] 跳过实际创建帖子');
    progress.step3_post = 'done';
    progress.postId = 'dry-run-post-id';
    return;
  }

  try {
    // 动态导入避免脚本启动时加载数据库
    const { createCommunityPostFromCase } = await import('./insert-virtual-author-posts');

    const postId = await createCommunityPostFromCase({
      userId,
      imageUrl: progress.imageUrl,
      prompt: progress.optimizedPrompt || promptInput.prompt,
      title: promptInput.title || `Generated from ${promptInput.id}`,
      model: 'gemini-3-pro-image-preview',
    });

    progress.postId = postId;
    progress.step3_post = 'done';
    log('✅', `[Step 3] 帖子创建完成: ${postId}`);
  } catch (error: any) {
    progress.step3_post = 'error';
    progress.error = `Step 3: ${error.message}`;
    log('❌', `[Step 3] 创建帖子失败: ${error.message}`);
  }
}

// ============================================
// Step 4: 生成 SEO + 发布 (调用 /api/admin/seo/generate-all)
// ============================================

async function step4_seoAndPublish(
  promptInput: PromptInput,
  progress: PromptProgress,
  autoPublish: boolean
): Promise<void> {
  if (progress.step4_seo === 'done') {
    log('⏭️', `[Step 4] ${promptInput.id} 已生成 SEO，跳过`);
    return;
  }

  if (progress.step3_post !== 'done' || !progress.postId) {
    log('⚠️', `[Step 4] ${promptInput.id} 帖子未创建，跳过 SEO 生成`);
    return;
  }

  log('🔄', `[Step 4] 生成 SEO: ${promptInput.id}`);

  if (DRY_RUN) {
    log('📝', '[DRY-RUN] 跳过实际 SEO 生成');
    progress.step4_seo = 'done';
    return;
  }

  try {
    // 调用 SEO 生成 API
    const response = await fetch(`${BASE_URL}/api/admin/seo/generate-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ADMIN_COOKIE,
      },
      body: JSON.stringify({
        postId: progress.postId,
        prompt: progress.optimizedPrompt || promptInput.prompt,
        model: 'gemini-3-pro-image-preview',
        imageUrl: progress.imageUrl,
        subject: promptInput.subject,
      }),
    });

    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    log('✅', `[Step 4] SEO 生成完成: ${promptInput.id}`);

    // 如果配置了自动发布，更新帖子状态
    if (autoPublish) {
      const { updateCommunityPostById } = await import('@/shared/models/community_post');
      await updateCommunityPostById(progress.postId, {
        status: 'published',
        publishedAt: new Date(),
      });
      log('✅', `[Step 4] 帖子已发布: ${progress.postId}`);
    }

    progress.step4_seo = 'done';
  } catch (error: any) {
    progress.step4_seo = 'error';
    progress.error = `Step 4: ${error.message}`;
    log('❌', `[Step 4] SEO 生成失败: ${error.message}`);
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Prompt Pipeline - 全链路批量处理');
  console.log('='.repeat(60));

  // 检查环境
  if (!ADMIN_COOKIE) {
    console.error('❌ 错误：未设置 ADMIN_COOKIE');
    console.error('请设置环境变量: export ADMIN_COOKIE="better-auth.session_token=xxx"');
    process.exit(1);
  }

  // 加载输入文件
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ 错误：输入文件不存在: ${INPUT_FILE}`);
    console.error('请创建输入文件，参考 prompts-input.example.json');
    process.exit(1);
  }

  const input: InputFile = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`📂 输入文件: ${INPUT_FILE}`);
  console.log(`📊 Prompt 数量: ${input.prompts.length}`);
  console.log(`🧪 模式: ${DRY_RUN ? '预览 (--dry-run)' : '执行'}`);
  if (STEP) console.log(`📌 仅执行 Step ${STEP}`);
  if (RESUME) console.log(`🔄 从断点继续`);
  console.log();

  // 加载或初始化进度
  let progress: PipelineProgress;
  if (RESUME) {
    const loaded = loadProgress();
    if (loaded) {
      progress = loaded;
      console.log(`📈 已加载进度: ${Object.keys(progress.prompts).length} 个 prompts`);
    } else {
      console.log('⚠️ 无进度文件，从头开始');
      progress = initProgress(input);
    }
  } else {
    progress = initProgress(input);
  }

  // 确定用户 ID
  const userId = USER_ID || progress.config.userId || input.config?.userId;
  if (!userId && !DRY_RUN) {
    console.error('❌ 错误：未指定用户 ID');
    console.error('请使用 --user-id 参数或在输入文件中配置 config.userId');
    process.exit(1);
  }

  const autoPublish = input.config?.autoPublish ?? true;

  // 处理每个 Prompt
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < input.prompts.length; i++) {
    const promptInput = input.prompts[i];
    const promptProgress = progress.prompts[promptInput.id];

    if (!promptProgress) {
      // 新增的 prompt
      progress.prompts[promptInput.id] = {
        step1_optimize: 'pending',
        step2_generate: 'pending',
        step3_post: 'pending',
        step4_seo: 'pending',
      };
    }

    console.log(`\n[${i + 1}/${input.prompts.length}] 处理: ${promptInput.id}`);
    console.log('-'.repeat(40));

    const p = progress.prompts[promptInput.id];

    try {
      // Step 1: 优化
      if (!STEP || STEP === 1) {
        await step1_optimizePrompt(promptInput, p);
        saveProgress(progress);
        if (p.step1_optimize === 'done' && !STEP) {
          await sleep(DELAY_MS.optimize);
        }
      }

      // Step 2: 生成图片
      if (!STEP || STEP === 2) {
        await step2_generateImage(promptInput, p);
        saveProgress(progress);
        if (p.step2_generate === 'done' && !STEP) {
          await sleep(DELAY_MS.generate);
        }
      }

      // Step 3: 创建帖子
      if (!STEP || STEP === 3) {
        await step3_createPost(promptInput, p, userId || '');
        saveProgress(progress);
      }

      // Step 4: SEO + 发布
      if (!STEP || STEP === 4) {
        await step4_seoAndPublish(promptInput, p, autoPublish);
        saveProgress(progress);
        if (p.step4_seo === 'done' && !STEP) {
          await sleep(DELAY_MS.seo);
        }
      }

      // 统计
      const allDone = p.step1_optimize === 'done' &&
                      p.step2_generate === 'done' &&
                      p.step3_post === 'done' &&
                      p.step4_seo === 'done';
      if (allDone) successCount++;
      else if (p.step1_optimize === 'error' || p.step2_generate === 'error' ||
               p.step3_post === 'error' || p.step4_seo === 'error') {
        errorCount++;
      }
    } catch (error: any) {
      console.error(`❌ 未预期错误: ${error.message}`);
      errorCount++;
    }
  }

  // 统计结果
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Pipeline 完成');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${errorCount}`);
  console.log(`⏱️ 耗时: ${elapsed} 分钟`);
  console.log(`📁 进度文件: logs/pipeline-progress-${path.basename(INPUT_FILE, '.json')}.json`);

  // 显示失败项
  const failed = Object.entries(progress.prompts)
    .filter(([_, p]) => p.step1_optimize === 'error' || p.step2_generate === 'error' ||
                        p.step3_post === 'error' || p.step4_seo === 'error');
  if (failed.length > 0) {
    console.log('\n❌ 失败项:');
    for (const [id, p] of failed) {
      console.log(`  - ${id}: ${p.error || 'Unknown error'}`);
    }
  }
}

// 运行
main().catch(error => {
  console.error('❌ Pipeline 执行失败:', error);
  process.exit(1);
});
