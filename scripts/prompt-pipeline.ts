/**
 * Prompt 批量处理全链路脚本 (V2 - 完整用户路径 + 虚拟作者支持)
 *
 * 完全模拟真实用户路径：
 * Step 1: 分析意图 (/api/logic/intent) → schema
 * Step 2: 编译 Prompt (/api/logic/compile) → prompt + highlights
 * Step 3: 生成图片 (/api/ai/generate) → 用 compiled prompt
 * Step 4: 创建帖子 (直接数据库，支持虚拟作者)
 * Step 5: SEO + 发布 (/api/admin/seo/generate-all)
 *
 * 使用方法：
 * pnpm tsx scripts/prompt-pipeline.ts --input prompts-input.json
 * pnpm tsx scripts/prompt-pipeline.ts --input prompts-input.json --dry-run
 * pnpm tsx scripts/prompt-pipeline.ts --input prompts-input.json --limit 3
 * pnpm tsx scripts/prompt-pipeline.ts --input prompts-input.json --resume
 *
 * 环境变量：
 * ADMIN_COOKIE - 管理员 Cookie (必须，用于 API 调用)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 配置
// ============================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || '';
const DELAY_MS = {
  intent: 2000,   // 意图分析间隔
  compile: 1000,  // 编译间隔
  generate: 5000, // 图片生成间隔 (最耗时)
  seo: 3000,      // SEO 生成间隔
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
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : null;
})();

// ============================================
// 类型定义
// ============================================

interface PromptInput {
  id: string;
  prompt: string;
  title?: string;
  subject?: string;
  category: string;      // Ground Truth 分类（必填，不再可选）
  subcategory: string;   // Ground Truth 二级分类（必填）
  visualTags: string[];  // Ground Truth 视觉标签（必填）
  userId?: string;       // 可选：直接指定用户 ID
}

interface PipelineConfig {
  userId?: string;
  userIds?: Record<string, string[]>;  // 按分类映射用户 ID
  autoPublish?: boolean;
  aiAssignments?: Record<string, string>;  // AI 智能分配的 promptId → userId 映射
}

interface InputFile {
  prompts: PromptInput[];
  config?: PipelineConfig;
}

interface PromptProgress {
  // 新的 5 步骤状态
  step1_intent: 'pending' | 'done' | 'error';
  step2_compile: 'pending' | 'done' | 'error';
  step3_generate: 'pending' | 'done' | 'error';
  step4_post: 'pending' | 'done' | 'error';
  step5_seo: 'pending' | 'done' | 'error';

  // Step 1 输出
  schema?: any;
  extractedRatio?: string;

  // Step 2 输出
  promptNative?: string;
  promptEnglish?: string;
  promptHighlights?: any;
  detectedLang?: string;

  // Step 3 输出
  aiTaskId?: string;
  imageUrl?: string;

  // Step 4 输出
  postId?: string;

  // 错误信息
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
      step1_intent: 'pending',
      step2_compile: 'pending',
      step3_generate: 'pending',
      step4_post: 'pending',
      step5_seo: 'pending',
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
// Step 1: 分析意图 (/api/logic/intent)
// ============================================

async function step1_analyzeIntent(
  promptInput: PromptInput,
  progress: PromptProgress
): Promise<void> {
  if (progress.step1_intent === 'done') {
    log('⏭️', `[Step 1] ${promptInput.id} 已分析，跳过`);
    return;
  }

  log('🔄', `[Step 1] 分析意图: ${promptInput.id}`);

  if (DRY_RUN) {
    progress.step1_intent = 'done';
    progress.schema = null;
    progress.extractedRatio = '1:1';
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/logic/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ADMIN_COOKIE,
      },
      body: JSON.stringify({
        input: promptInput.prompt,
      }),
    });

    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    progress.schema = result.data?.schema || null;
    // 从 schema 提取 aspectRatio（如果存在）
    progress.extractedRatio = result.data?.schema?.extractedRatio || '1:1';
    progress.step1_intent = 'done';
    log('✅', `[Step 1] 分析完成: ${promptInput.id} (ratio: ${progress.extractedRatio})`);
  } catch (error: any) {
    progress.step1_intent = 'error';
    progress.error = `Step 1: ${error.message}`;
    log('❌', `[Step 1] 分析失败: ${error.message}`);
  }
}

// ============================================
// Step 2: 编译 Prompt (/api/logic/compile)
// ============================================

async function step2_compilePrompt(
  promptInput: PromptInput,
  progress: PromptProgress
): Promise<void> {
  if (progress.step2_compile === 'done') {
    log('⏭️', `[Step 2] ${promptInput.id} 已编译，跳过`);
    return;
  }

  if (progress.step1_intent !== 'done') {
    log('⚠️', `[Step 2] ${promptInput.id} 未分析，跳过编译`);
    progress.step2_compile = 'error';
    return;
  }

  log('🔄', `[Step 2] 编译 Prompt: ${promptInput.id}`);

  if (DRY_RUN) {
    progress.step2_compile = 'done';
    progress.promptNative = promptInput.prompt;
    progress.promptEnglish = promptInput.prompt;
    progress.promptHighlights = { native: [], english: [] };
    progress.detectedLang = 'English';
    return;
  }

  try {
    // 使用 buildPLO 构建正确的 PLO 结构
    const { buildPLO } = await import('../src/shared/blocks/vision-logic/utils/plo-builder');

    // Schema 可能为 null（某些简单 prompt 不需要 schema）
    // 如果 schema 为 null，创建一个空的默认 schema
    const schemaForPLO = progress.schema || {
      fields: [],
      preservedDetails: [],
      contentCategory: 'photography' as const,
      styleHints: [],
    };

    // 从 schema.fields 提取 defaultValue 构建 formValues
    // 这样 compiler 才能生成 highlights
    const formValues: Record<string, unknown> = {};
    const touchedFields = new Set<string>();

    if (schemaForPLO.fields && Array.isArray(schemaForPLO.fields)) {
      for (const field of schemaForPLO.fields) {
        if (field.id && field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
          formValues[field.id] = field.defaultValue;
          touchedFields.add(field.id);  // 标记为已触碰，这样 buildPLO 会处理它
        }
      }
    }

    const plo = buildPLO({
      input: promptInput.prompt,
      schema: schemaForPLO,
      formValues,
      touchedFields,
      aspectRatio: progress.extractedRatio || '1:1',
    });

    const response = await fetch(`${BASE_URL}/api/logic/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ADMIN_COOKIE,
      },
      body: JSON.stringify({
        plo,
        skipCreditDeduction: true, // Pipeline 跳过积分扣除
      }),
    });

    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    progress.promptNative = result.data?.native || promptInput.prompt;
    progress.promptEnglish = result.data?.english || promptInput.prompt;
    progress.promptHighlights = result.data?.highlights || { native: [], english: [] };
    progress.detectedLang = result.data?.detectedLang || 'English';

    const highlightCount = progress.promptHighlights?.english?.length || 0;

    // 检测 Gemini fallback 情况：highlights 为 0 说明 AI 编译失败
    if (highlightCount === 0) {
      progress.step2_compile = 'error';
      progress.error = `Step 2: AI compilation failed (0 highlights) - Gemini may have returned empty response`;
      log('❌', `[Step 2] 编译失败: ${promptInput.id} (0 highlights - Gemini fallback)`);
      return;
    }

    progress.step2_compile = 'done';
    log('✅', `[Step 2] 编译完成: ${promptInput.id} (highlights: ${highlightCount})`);
  } catch (error: any) {
    progress.step2_compile = 'error';
    progress.error = `Step 2: ${error.message}`;
    log('❌', `[Step 2] 编译失败: ${error.message}`);
  }
}

// ============================================
// Step 3: 生成图片 (/api/ai/generate)
// 注意：这里仍然用 API，但后续会直接修改数据库归属
// ============================================

async function step3_generateImage(
  promptInput: PromptInput,
  progress: PromptProgress
): Promise<void> {
  if (progress.step3_generate === 'done') {
    log('⏭️', `[Step 3] ${promptInput.id} 已生成，跳过`);
    return;
  }

  if (progress.step2_compile !== 'done') {
    log('⚠️', `[Step 3] ${promptInput.id} 未编译，跳过生成`);
    progress.step3_generate = 'error';
    return;
  }

  log('🔄', `[Step 3] 生成图片: ${promptInput.id}`);

  if (DRY_RUN) {
    progress.step3_generate = 'done';
    progress.aiTaskId = 'dry-run-task-id';
    progress.imageUrl = 'https://placeholder.com/image.png';
    return;
  }

  try {
    // 使用编译后的英文 Prompt
    const promptToUse = progress.promptEnglish || promptInput.prompt;

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
        prompt: promptToUse,
        scene: 'text-to-image',
        aspectRatio: progress.extractedRatio || '1:1',
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

    progress.aiTaskId = result.data?.id;
    progress.imageUrl = imageUrl;
    progress.step3_generate = 'done';
    log('✅', `[Step 3] 生成完成: ${promptInput.id} (aiTaskId: ${progress.aiTaskId})`);
  } catch (error: any) {
    progress.step3_generate = 'error';
    progress.error = `Step 3: ${error.message}`;
    log('❌', `[Step 3] 生成失败: ${error.message}`);
  }
}

// ============================================
// Step 4: 创建帖子 (直接数据库操作，支持虚拟作者)
// ============================================

async function step4_createPost(
  promptInput: PromptInput,
  progress: PromptProgress,
  userId: string
): Promise<void> {
  if (progress.step4_post === 'done') {
    log('⏭️', `[Step 4] ${promptInput.id} 已创建，跳过`);
    return;
  }

  if (progress.step3_generate !== 'done' || !progress.aiTaskId) {
    log('⚠️', `[Step 4] ${promptInput.id} 未生成图片，跳过创建帖子`);
    progress.step4_post = 'error';
    return;
  }

  log('🔄', `[Step 4] 创建帖子: ${promptInput.id} (userId: ${userId})`);

  if (DRY_RUN) {
    progress.step4_post = 'done';
    progress.postId = 'dry-run-post-id';
    return;
  }

  try {
    // 直接调用数据库函数，绕过 API 的用户验证
    const { createCommunityPost, CommunityPostStatus } = await import('../src/shared/models/community_post');
    const { updateAITaskById } = await import('../src/shared/models/ai_task');
    const { getUuid } = await import('../src/shared/lib/hash');

    // 1. 先更新 AI Task 的 userId 归属到虚拟作者
    await updateAITaskById(progress.aiTaskId, {
      userId: userId,
    });

    // 2. 从 schema 提取 defaultValue 构建 formValues（与 step2 一致）
    const formValuesForPost: Record<string, unknown> = {};
    if (progress.schema?.fields && Array.isArray(progress.schema.fields)) {
      for (const field of progress.schema.fields) {
        if (field.id && field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
          formValuesForPost[field.id] = field.defaultValue;
        }
      }
    }

    // 3. 构建完整的 visionLogicData (V2 格式)
    const visionLogicData = {
      version: 2,
      schema: progress.schema,
      formValues: formValuesForPost,  // 使用提取的 defaultValue
      originalInput: promptInput.prompt,
      promptNative: progress.promptNative,
      promptEnglish: progress.promptEnglish,
      promptHighlights: progress.promptHighlights,  // 关键：包含高亮数据
      detectedLang: progress.detectedLang,
      model: 'gemini-3-pro-image-preview',
      aspectRatio: progress.extractedRatio || '1:1',
    };

    // 3. 创建帖子
    const postId = getUuid();
    const newPost = await createCommunityPost({
      id: postId,
      userId: userId,  // 使用虚拟作者 ID
      aiTaskId: progress.aiTaskId,
      imageUrl: progress.imageUrl!,
      prompt: progress.promptEnglish || promptInput.prompt,
      model: 'gemini-3-pro-image-preview',
      params: JSON.stringify(visionLogicData),
      aspectRatio: progress.extractedRatio || '1:1',

      // Ground Truth 分类字段（从原始数据传递）
      category: promptInput.category,
      subcategory: promptInput.subcategory,
      visualTags: JSON.stringify(promptInput.visualTags),

      status: CommunityPostStatus.PRIVATE,  // 先创建为私有，Step 5 发布
      viewCount: 0,
      likeCount: 0,
    });

    progress.postId = newPost.id;
    progress.step4_post = 'done';
    log('✅', `[Step 4] 帖子创建完成: ${progress.postId} (虚拟作者: ${userId})`);
  } catch (error: any) {
    progress.step4_post = 'error';
    progress.error = `Step 4: ${error.message}`;
    log('❌', `[Step 4] 创建帖子失败: ${error.message}`);
  }
}

// ============================================
// Step 5: 生成 SEO + 发布
// ============================================

async function step5_seoAndPublish(
  promptInput: PromptInput,
  progress: PromptProgress,
  autoPublish: boolean
): Promise<void> {
  if (progress.step5_seo === 'done') {
    log('⏭️', `[Step 5] ${promptInput.id} 已生成 SEO，跳过`);
    return;
  }

  if (progress.step4_post !== 'done' || !progress.postId) {
    log('⚠️', `[Step 5] ${promptInput.id} 帖子未创建，跳过 SEO 生成`);
    progress.step5_seo = 'error';
    return;
  }

  log('🔄', `[Step 5] 生成 SEO: ${promptInput.id}`);

  if (DRY_RUN) {
    progress.step5_seo = 'done';
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
        prompt: progress.promptEnglish || promptInput.prompt,
        model: 'gemini-3-pro-image-preview',
        imageUrl: progress.imageUrl,
        subject: promptInput.subject,

        // Ground Truth 分类（从原始数据传递）
        groundTruth: {
          category: promptInput.category,
          subcategory: promptInput.subcategory,
          visualTags: promptInput.visualTags,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    // 保存 SEO 数据到数据库
    const { updateCommunityPostById, CommunityPostStatus, getCommunityPostById } = await import('../src/shared/models/community_post');

    // 读取现有帖子数据，确保不覆盖 Ground Truth
    const existingPost = await getCommunityPostById(progress.postId);

    await updateCommunityPostById(progress.postId, {
      // === Core SEO Fields ===
      seoSlug: result.data.seoSlug,
      seoTitle: result.data.seoTitle,
      seoDescription: result.data.seoDescription,
      seoKeywords: result.data.seoKeywords,
      seoSlugKeywords: result.data.seoSlugKeywords,

      // === V14.0 Structured Content ===
      h1Title: result.data.h1Title,
      contentSections: result.data.contentSections ? JSON.stringify(result.data.contentSections) : null,
      anchor: result.data.anchor,
      microFocus: result.data.microFocus,

      // === Images ===
      imageAlt: result.data.imageAlt,

      // === 🟡 P1 Field - V15.0 GEO Optimization ===
      snippetSummary: result.data.snippetSummary || null,

      // === 🔒 Ground Truth Fields - 仅在未设置时更新 ===
      // category 和 subcategory 已在 Step 4 保存，不覆盖
      // visualTags 已在 Step 4 保存，仅在缺失时使用 AI 结果作为 fallback
      ...(existingPost?.visualTags ? {} : {
        visualTags: result.data.visualTags || '[]'
      }),

      // === Publish Status ===
      ...(autoPublish ? {
        status: CommunityPostStatus.PUBLISHED,
        publishedAt: new Date(),
      } : {}),
    });

    log('✅', `[Step 5] SEO 生成完成: ${promptInput.id} (slug: ${result.data.seoSlug})`);
    if (autoPublish) {
      log('✅', `[Step 5] 帖子已发布: ${result.data.seoSlug}`);
    }

    progress.step5_seo = 'done';
  } catch (error: any) {
    progress.step5_seo = 'error';
    progress.error = `Step 5: ${error.message}`;
    log('❌', `[Step 5] SEO 生成失败: ${error.message}`);
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Prompt Pipeline V2 - 完整用户路径 + 虚拟作者支持');
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
  if (LIMIT) console.log(`🔢 限制数量: ${LIMIT}`);
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

  // 用户分配逻辑
  // 优先使用 AI 智能分配的结果
  const aiAssignments = input.config?.aiAssignments || {};
  const userIdsByCategory = input.config?.userIds || {};
  const userIndexByCategory: Record<string, number> = {};

  // 检查是否有 AI 分配
  const hasAIAssignments = Object.keys(aiAssignments).length > 0;
  if (hasAIAssignments) {
    console.log(`🧠 使用 AI 智能分配 (${Object.keys(aiAssignments).length} 个映射)`);
  } else {
    console.log(`⚠️ 未找到 AI 分配，使用轮询模式`);
    console.log(`   提示: 运行 pnpm tsx scripts/assign-prompts-to-personas.ts --input ${INPUT_FILE}`);
  }

  // 获取指定 prompt 的用户 ID
  function getUserIdForPrompt(promptInput: PromptInput): string {
    // 1. 优先使用 prompt 自带的 userId（可能是 AI 分配写入的）
    if (promptInput.userId) return promptInput.userId;

    // 2. 使用 AI 智能分配的结果
    if (aiAssignments[promptInput.id]) {
      return aiAssignments[promptInput.id];
    }

    // 3. Fallback: 根据分类轮询分配
    const category = promptInput.category || 'default';
    const categoryUsers = userIdsByCategory[category];
    if (categoryUsers && categoryUsers.length > 0) {
      const index = userIndexByCategory[category] || 0;
      userIndexByCategory[category] = (index + 1) % categoryUsers.length;
      return categoryUsers[index];
    }

    // 4. 回退到默认用户
    return input.config?.userId || '';
  }

  // 检查是否有用户配置
  const hasUserConfig = input.config?.userId || Object.keys(userIdsByCategory).length > 0;
  if (!hasUserConfig && !DRY_RUN) {
    console.error('❌ 错误：未配置用户分配');
    console.error('请在输入文件中配置 config.userId 或 config.userIds');
    process.exit(1);
  }

  const autoPublish = input.config?.autoPublish ?? true;

  // 处理每个 Prompt
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  const promptsToProcess = LIMIT ? input.prompts.slice(0, LIMIT) : input.prompts;

  for (let i = 0; i < promptsToProcess.length; i++) {
    const promptInput = promptsToProcess[i];
    let p = progress.prompts[promptInput.id];

    if (!p) {
      // 新增的 prompt
      progress.prompts[promptInput.id] = {
        step1_intent: 'pending',
        step2_compile: 'pending',
        step3_generate: 'pending',
        step4_post: 'pending',
        step5_seo: 'pending',
      };
      p = progress.prompts[promptInput.id];
    }

    console.log(`\n[${i + 1}/${promptsToProcess.length}] 处理: ${promptInput.id}`);
    console.log('-'.repeat(40));

    try {
      // Step 1: 分析意图
      if (!STEP || STEP === 1) {
        await step1_analyzeIntent(promptInput, p);
        saveProgress(progress);
        if (p.step1_intent === 'done' && !STEP) {
          await sleep(DELAY_MS.intent);
        }
      }

      // Step 2: 编译 Prompt
      if (!STEP || STEP === 2) {
        await step2_compilePrompt(promptInput, p);
        saveProgress(progress);
        if (p.step2_compile === 'done' && !STEP) {
          await sleep(DELAY_MS.compile);
        }
      }

      // Step 3: 生成图片
      if (!STEP || STEP === 3) {
        await step3_generateImage(promptInput, p);
        saveProgress(progress);
        if (p.step3_generate === 'done' && !STEP) {
          await sleep(DELAY_MS.generate);
        }
      }

      // Step 4: 创建帖子
      if (!STEP || STEP === 4) {
        await step4_createPost(promptInput, p, getUserIdForPrompt(promptInput));
        saveProgress(progress);
      }

      // Step 5: SEO + 发布
      if (!STEP || STEP === 5) {
        await step5_seoAndPublish(promptInput, p, autoPublish);
        saveProgress(progress);
        if (p.step5_seo === 'done' && !STEP) {
          await sleep(DELAY_MS.seo);
        }
      }

      // 统计
      const allDone = p.step1_intent === 'done' &&
                      p.step2_compile === 'done' &&
                      p.step3_generate === 'done' &&
                      p.step4_post === 'done' &&
                      p.step5_seo === 'done';
      if (allDone) successCount++;
      else if (p.step1_intent === 'error' || p.step2_compile === 'error' ||
               p.step3_generate === 'error' || p.step4_post === 'error' ||
               p.step5_seo === 'error') {
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
    .filter(([_, p]) => p.step1_intent === 'error' || p.step2_compile === 'error' ||
                        p.step3_generate === 'error' || p.step4_post === 'error' ||
                        p.step5_seo === 'error');
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
