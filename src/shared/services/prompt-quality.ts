/**
 * Prompt Quality Service - Stage 3 Quality Filter
 *
 * 核心职责：
 * 1. 加载并合并原始数据 + Stage 1 分析结果
 * 2. 基础清洗（仅排除明显垃圾）
 * 3. LLM 批次评分（Clarity + Detail + Completeness）
 * 4. 加分计算（社区信号 + 商业价值）
 * 5. 去重并按总分排序
 *
 * @see /Users/lixuanying/.claude/plans/polymorphic-waddling-hartmanis.md
 */

import { generateText } from './gemini-text';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================
// Type Definitions
// ============================================

/** 原始 Prompt 数据结构 (prompts_api.json) */
export interface RawPrompt {
  id: number;
  title: string;
  content: string;
  translatedContent?: string;
  media?: string[];
  featured?: boolean;
  language?: string;
  author?: {
    name: string;
    link?: string;
  };
}

/** Stage 1 分析结果结构 (intent-mining-progress.json) */
export interface Stage1Analysis {
  id: number;
  statistical_vertical: string;
  seo_specific_intent: string;
  subject_type?: string;
  visual_style?: string;
  commercial_probability: number;
  requires_upload: boolean;
  reasoning?: string;
  keywords?: string[];
}

/** 合并后的数据结构 */
export interface MergedPrompt {
  id: number;
  prompt: string; // 优先使用 translatedContent，fallback 到 content
  title: string;
  featured: boolean;
  mediaCount: number;
  // Stage 1 分析字段
  seo_intent: string;
  vertical: string;
  requires_upload: boolean;
  commercial_prob: number;
  keywords: string[];
}

/** LLM 评分结果 */
export interface LLMScores {
  clarity: number; // 0-40
  detail: number; // 0-35
  completeness: number; // 0-25
}

/** 加分项 */
export interface BonusScores {
  featured: number; // 0 或 15
  media: number; // 0, 5, 或 10
  commercial: number; // 0 或 5
}

/** 最终输出的质量评估结果 */
export interface QualityResult {
  id: number;
  prompt: string;
  title: string;

  llm_scores: LLMScores;
  llm_total: number;

  bonus: BonusScores;
  bonus_total: number;

  total_score: number;

  seo_intent: string;
  vertical: string;
  requires_upload: boolean;

  recommendation: 'strong_recommend' | 'recommend' | 'conditional' | 'low_priority';
  highlights?: string[];
  issues?: string[];

  /** V3.1: 用户搜索意图词 - 蓝海长尾关键词 (2-4 词) */
  search_keywords?: string[];
}

/** 批次评分结果（LLM 返回） */
interface BatchEvaluationResult {
  evaluations: Array<{
    id: number;
    scores: LLMScores;
    total: number;
    highlights?: string[];
    issues?: string[];
    /** V3.1: 用户搜索意图词 */
    search_keywords?: string[];
  }>;
}

// ============================================
// Configuration
// ============================================

const CONFIG = {
  // 数据源路径
  PROMPTS_API_PATH:
    '/Users/lixuanying/Documents/GitHub/bananaprompts-info/logs/prompts_api.json',
  INTENT_MINING_PATH:
    '/Users/lixuanying/Documents/GitHub/agents/bananaprompts-analysis/output/intent-mining-progress.json',

  // 输出路径
  OUTPUT_DIR: '/Users/lixuanying/Documents/GitHub/antigravityskills-com/docs/prompt-scoring/output',

  // 批次处理配置
  // 注意：批次大小设为 10，减少 LLM 输出复杂度，提高 JSON 格式稳定性
  BATCH_SIZE: 10,
  CONCURRENCY: 3,
  MAX_RETRIES: 2, // 单批次最大重试次数

  // 清洗规则
  MIN_PROMPT_LENGTH: 10,
  TEST_PATTERNS: [
    /^test$/i,
    /^hello$/i,
    /^asdf/i,
    /^123/,
    /^abc$/i,
    /^xxx$/i,
    /^aaa$/i,
  ],

  // 加分规则
  BONUS_FEATURED: 15,
  BONUS_MEDIA_MIN: 5,
  BONUS_MEDIA_MANY: 10,
  BONUS_COMMERCIAL_THRESHOLD: 0.7,
  BONUS_COMMERCIAL: 5,
};

// ============================================
// V3.0 分类评分标准 - Detail 维度
// ============================================

type VerticalType = 'Photography' | 'Design' | 'Art' | 'Commercial' | 'Character' | 'Other';

/**
 * 各类型的 Detail 评估维度
 * 参考来源：Google 官方 Antigravity Skills 指南（2025-11-20）
 */
const DETAIL_CRITERIA: Record<VerticalType, string> = {
  Photography: `**Photography 类型 Detail 评估维度**:
1. 光线 (lighting) - studio lighting, golden hour, backlighting
2. 色调 (color/tone) - warm tones, muted colors, color grading
3. 构图 (composition) - close-up, wide shot, low angle
4. 技术参数 (camera) - 85mm lens, f/1.8, shallow DoF
5. 材质纹理 (texture) - silk, leather, skin detail
6. 情绪氛围 (mood) - dramatic, peaceful, energetic`,

  Design: `**Design 类型 Detail 评估维度** (信息图、流程图、Quote Card 等):
1. 布局结构 (layout) - grid, hierarchy, sections
2. 文字排版 (typography) - font style, text placement, headline
3. 色彩方案 (color scheme) - palette, contrast, brand colors
4. 视觉风格 (visual style) - minimalist, hand-drawn, flat
5. 尺寸比例 (format) - aspect ratio, poster size, card format
6. 内容元素 (content) - icons, diagrams, data points`,

  Art: `**Art 类型 Detail 评估维度** (水彩、浮世绘、Concept Art 等):
1. 艺术风格 (art style) - watercolor, ukiyo-e, impressionist
2. 色彩运用 (color) - palette, contrast, saturation
3. 构图 (composition) - perspective, focal point, balance
4. 媒介描述 (medium) - oil paint, digital, ink wash
5. 情绪氛围 (mood) - dreamy, dramatic, nostalgic
6. 纹理效果 (texture) - brush strokes, grain, weathered`,

  Commercial: `**Commercial 类型 Detail 评估维度** (广告、产品展示等):
1. 产品展示 (product) - angle, arrangement, focus
2. 场景设置 (setting) - background, environment, context
3. 光线 (lighting) - studio, natural, dramatic
4. 营销元素 (marketing) - text, logo placement, call-to-action
5. 品牌风格 (brand) - consistency, visual identity
6. 目标受众暗示 (audience) - lifestyle, demographic cues`,

  Character: `**Character 类型 Detail 评估维度** (动漫角色、Avatar 等):
1. 角色特征 (features) - age, gender, body type, ethnicity
2. 服装配饰 (outfit) - clothing, accessories, style
3. 表情姿态 (expression/pose) - emotion, stance, gesture
4. 画风 (art style) - anime, realistic, chibi, vector
5. 背景设定 (background) - setting, context
6. 细节装饰 (details) - hair, eyes, props`,

  Other: `**Other 类型 Detail 评估维度** (通用标准):
1. 视觉风格 (style) - photorealistic, artistic, abstract
2. 色彩 (color) - palette, tone, contrast
3. 构图 (composition) - framing, perspective
4. 细节描述 (details) - textures, materials, elements
5. 氛围 (mood) - emotional tone, atmosphere
6. 技术规格 (specs) - resolution, format, rendering`,
};

/**
 * 图生图专属 Completeness 评估标准
 * 核心原则：依赖上传图片是正常行为，不应因此扣分
 */
const IMG2IMG_COMPLETENESS_CRITERIA = `**图生图 Completeness 评估标准** (requires_upload=true):
⚠️ 图生图 Prompt 依赖上传图片是正常行为，不因此扣分！

评估维度：
1. 变换意图 (transformation intent) - 要做什么修改？
2. 保留要素 (what to keep) - 保留原图哪些部分？
3. 修改要素 (what to change) - 具体修改什么？
4. 输出风格 (output style) - 期望的最终效果？

| 分数段 | 锚定标准 |
|--------|----------|
| 22-25 | 变换意图明确 + 保留/修改要素清晰 + 输出风格指定 |
| 15-21 | 变换意图明确 + 部分保留/修改描述 |
| 5-14 | 仅有模糊的修改意图 |
| 0-4 | 完全无法理解要如何修改 |

示例：
- "Focus on the flowers" → 22/25 (意图明确：改变焦点)
- "Turn this scene into nighttime" → 23/25 (意图明确：时间转换)
- "Make it look better" → 8/25 (意图模糊)`;

/**
 * 标准 Completeness 评估标准（非图生图）
 */
const STANDARD_COMPLETENESS_CRITERIA = `**标准 Completeness 评估标准** (requires_upload=false):
**问自己**: "不依赖任何外部信息，能直接执行吗？"

| 分数段 | 锚定标准 |
|--------|----------|
| 22-25 | 完全自包含，可直接执行 |
| 15-21 | 基本完整，需少量默认假设 |
| 5-14 | 需要上下文或补充信息 |
| 0-4 | 高度依赖外部图片或上下文 |`;

// ============================================
// Step 1: Load and Merge Data
// ============================================

/**
 * 加载并合并两个数据源
 * - prompts_api.json: 原始 Prompt 数据
 * - intent-mining-progress.json: Stage 1 分析结果
 */
export function loadAndMergeData(): MergedPrompt[] {
  console.log('[PromptQuality] Loading data sources...');

  // 1. 加载原始 Prompt 数据
  const rawPromptsData = fs.readFileSync(CONFIG.PROMPTS_API_PATH, 'utf-8');
  const rawPrompts: RawPrompt[] = JSON.parse(rawPromptsData);
  console.log(`[PromptQuality] Loaded ${rawPrompts.length} raw prompts`);

  // 2. 加载 Stage 1 分析结果，展平为 id -> analysis 的 Map
  const stage1Data = fs.readFileSync(CONFIG.INTENT_MINING_PATH, 'utf-8');
  const stage1Raw = JSON.parse(stage1Data);

  const stage1Map = new Map<number, Stage1Analysis>();
  for (const batch of stage1Raw.batch_results || []) {
    for (const item of batch.batch_analysis || []) {
      stage1Map.set(item.id, item);
    }
  }
  console.log(`[PromptQuality] Loaded ${stage1Map.size} Stage 1 analyses`);

  // 3. 合并数据
  const merged: MergedPrompt[] = rawPrompts.map((p) => {
    const s1 = stage1Map.get(p.id);
    return {
      id: p.id,
      prompt: p.translatedContent || p.content, // 英文优先
      title: p.title || '',
      featured: p.featured || false,
      mediaCount: (p.media || []).length,
      // Stage 1 分析字段
      seo_intent: s1?.seo_specific_intent || 'Other',
      vertical: s1?.statistical_vertical || 'Other',
      requires_upload: s1?.requires_upload || false,
      commercial_prob: s1?.commercial_probability || 0,
      keywords: s1?.keywords || [],
    };
  });

  console.log(`[PromptQuality] Merged ${merged.length} prompts`);
  return merged;
}

// ============================================
// Step 2: Basic Cleaning
// ============================================

/**
 * 基础清洗 - 只排除明显无效的垃圾数据
 * 注意：不排除图生图 Prompt！
 */
export function cleanData(prompts: MergedPrompt[]): MergedPrompt[] {
  console.log('[PromptQuality] Cleaning data...');

  const cleaned = prompts.filter((p) => {
    // 1. 太短的 Prompt
    if (p.prompt.length < CONFIG.MIN_PROMPT_LENGTH) {
      return false;
    }

    // 2. 明显的测试内容
    const promptLower = p.prompt.trim().toLowerCase();
    for (const pattern of CONFIG.TEST_PATTERNS) {
      if (pattern.test(promptLower)) {
        return false;
      }
    }

    return true;
  });

  console.log(
    `[PromptQuality] Cleaned: ${prompts.length} -> ${cleaned.length} (removed ${prompts.length - cleaned.length})`
  );
  return cleaned;
}

// ============================================
// Step 3: LLM Batch Evaluation
// ============================================

/**
 * LLM 评分系统提示 (V3.0 - 分类评分版)
 *
 * 应用的 Prompt Engineering 技巧：
 * 1. Few-Shot Learning: 提供完整的输入→输出示例
 * 2. Chain-of-Thought: 引导逐步分析
 * 3. Anchoring: 使用具体的锚定示例
 * 4. Authority: 使用明确的指令语言
 * 5. Type-Aware: 根据 Prompt 类型使用不同评估标准
 *
 * V3.0 改进：
 * - Detail 评估按 vertical 类型分流（Photography/Design/Art/Commercial/Character/Other）
 * - 图生图 Prompt 使用专属 Completeness 标准，不因依赖上传扣分
 */
const QUALITY_EVALUATION_SYSTEM_PROMPT = `# Role
你是资深 AI 图像生成 Prompt 质量评估专家，专注于评估 Prompt 的可执行性和视觉表达力。

# 评分框架 (总分 100)

## Clarity (清晰度) - 40 分 [通用]
**问自己**: "AI 模型能立刻知道要生成什么吗？"

根据 Google 官方指南，好的 Prompt 应包含：
- Subject: 主体是什么？要具体
- Action: 发生什么动作？
- Location: 场景在哪？

| 分数段 | 锚定标准 |
|--------|----------|
| 36-40 | 主体 + 具体属性 + 明确意图/动作 |
| 25-35 | 主体明确，但属性较少 |
| 10-24 | 主体模糊或过于泛泛 |
| 0-9 | 完全无法理解意图 |

## Detail (细节丰富度) - 35 分 [按类型分流]
**⚠️ 重要：必须根据每个 Prompt 的 vertical 字段选择对应的评估维度！**

评分标准（适用于所有类型）：
| 分数段 | 标准 |
|--------|------|
| 30-35 | 包含 4+ 类相关描述 |
| 20-29 | 包含 2-3 类相关描述 |
| 10-19 | 包含 1 类相关描述 |
| 0-9 | 无明确相关描述 |

## Completeness (完整性) - 25 分 [图生图特殊处理]
**⚠️ 重要：必须根据每个 Prompt 的 requires_upload 字段选择对应的评估标准！**

# 🆕 V3.1 新增：search_keywords (用户搜索意图词)

**目标**：生成用户真实会搜索的精准关键词（2-4个词，3-5个关键词组）

**蓝海策略**：我们要挖掘的是**小众精准词**，不是大众通用词！
- ❌ 避免红海词：AI image generator, portrait photo, beautiful image
- ✅ 寻找蓝海词：mirror selfie, quote card template, ukiyo-e style

**核心原则：语义精准，不加冗余词**

⚠️ **禁止添加冗余类别词**：
- ❌ "mirror selfie photography" → ✅ "mirror selfie" (selfie 已暗示拍照，不要加 photography)
- ❌ "portrait photo prompt" → ✅ "portrait photo" (永远不要加 prompt 后缀)
- ❌ "anime art illustration" → ✅ "anime art" (不要堆砌同义词)
- ❌ "cute cat photo image" → ✅ "cute cat photo" (photo 和 image 是同义词)

**判断标准**：删掉这个词，意思还完整吗？如果完整，就删掉它。

**规则**：
1. **语义精准**: 每个词都要增加信息量，不加冗余
   - ❌ "Mirror Selfie Photography Prompt" (photography 和 prompt 都是冗余)
   - ✅ "mirror selfie" (精准)
2. **用户视角**: 普通人会怎么搜？不是 SEO 专家会怎么写
3. **去掉冗余**: 不要加 a/the/for 等停用词，也不要加类别词 (prompt/photography/art/image)
4. **品牌词可以用**: 如 "antigravity skills" 是有效的品牌词
5. **多样化**: 不同搜索意图的词都要覆盖
   - 场景型：mirror selfie, cat on windowsill
   - 风格型：anime portrait, watercolor landscape
   - 用途型：quote card, blog header

# Few-Shot 示例 (YOU MUST FOLLOW THIS PATTERN)

## 示例 1: 高分 Prompt
**输入**:
{
  "id": 999,
  "prompt": "Professional corporate headshot of a confident middle-aged Asian businesswoman, wearing a tailored navy blue blazer over a cream silk blouse, subtle pearl earrings. Soft studio lighting with a gentle fill light, neutral gray gradient background. Shot with 85mm portrait lens, f/2.8 for creamy bokeh, eye-level framing, warm color grading.",
  "title": "Corporate Headshot"
}

**思考过程**:
1. Clarity: 主体 = Asian businesswoman，属性 = middle-aged, confident, 服装细节完整 → 38/40
2. Detail: 光线 ✓ (studio lighting, fill light)，色调 ✓ (warm color grading)，构图 ✓ (eye-level)，技术 ✓ (85mm, f/2.8, bokeh)，材质 ✓ (silk, pearl) → 5类 → 34/35
3. Completeness: 完全自包含，无需任何补充 → 24/25
4. search_keywords: 用户搜什么词能找到这种图？
   - "corporate headshot" (场景)
   - "business portrait" (同义)
   - "linkedin profile photo" (用途)

**输出**:
{
  "id": 999,
  "scores": { "clarity": 38, "detail": 34, "completeness": 24 },
  "total": 96,
  "highlights": ["主体+属性完整", "5类视觉描述", "技术参数专业"],
  "issues": [],
  "search_keywords": ["corporate headshot", "business portrait", "linkedin profile photo"]
}

## 示例 2: 中等分 Prompt
**输入**:
{
  "id": 888,
  "prompt": "A cute cat sitting on a windowsill, afternoon sunlight",
  "title": "Cat on windowsill"
}

**思考过程**:
1. Clarity: 主体 = cat，属性 = cute, sitting，位置 = windowsill，但缺少品种、颜色等具体属性 → 28/40
2. Detail: 光线 ✓ (afternoon sunlight)，其他未明确 → 1类 → 15/35
3. Completeness: 基本可执行，但风格、构图需默认假设 → 18/25
4. search_keywords:
   - "cat windowsill" (场景)
   - "cute cat photo" (风格)
   - "cozy cat aesthetic" (氛围)

**输出**:
{
  "id": 888,
  "scores": { "clarity": 28, "detail": 15, "completeness": 18 },
  "total": 61,
  "highlights": ["主体明确"],
  "issues": ["缺少具体属性", "视觉描述单一"],
  "search_keywords": ["cat windowsill", "cute cat photo", "cozy cat aesthetic"]
}

## 示例 3: 低分 Prompt
**输入**:
{
  "id": 777,
  "prompt": "make it look better, more professional",
  "title": "Improve image"
}

**思考过程**:
1. Clarity: 无明确主体，"it"指代不明，"better/professional"太模糊 → 5/40
2. Detail: 无任何视觉描述 → 0/35
3. Completeness: 完全依赖外部图片和上下文 → 2/25
4. search_keywords: 这种模糊 prompt 仍需生成搜索词
   - "image enhancement" (可能意图)
   - "photo retouching" (具体操作)

**输出**:
{
  "id": 777,
  "scores": { "clarity": 5, "detail": 0, "completeness": 2 },
  "total": 7,
  "highlights": [],
  "issues": ["无明确主体", "依赖外部上下文", "无视觉描述"],
  "search_keywords": ["image enhancement", "photo retouching"]
}

# 执行规则 (MUST FOLLOW)

1. **逐条评估**: 对每个 Prompt 进行独立思考
2. **类型感知**: 根据 vertical 字段选择 Detail 评估维度，根据 requires_upload 字段选择 Completeness 标准
3. **严格锚定**: 参照示例的评分标准，不要随意偏离
4. **JSON 格式**: 输出必须是有效 JSON，无 markdown 代码块
5. **完整输出**: 必须评估输入中的每一个 Prompt，不要遗漏
6. **search_keywords 必填**: 每个 Prompt 都必须输出 3-5 个搜索关键词`;

/**
 * 生成评分的 User Prompt (V3.0 - 分类评分版)
 *
 * 改进：
 * - 传入 vertical 和 requires_upload 字段
 * - 动态注入对应类型的 Detail 评估标准
 * - 标注图生图 Prompt 使用专属 Completeness 标准
 */
function buildEvaluationUserPrompt(
  batch: Array<{ id: number; prompt: string; title: string; vertical: string; requires_upload: boolean }>
): string {
  // 收集批次中涉及的所有 vertical 类型
  const verticals = new Set(batch.map((p) => p.vertical));

  // 构建类型专属的 Detail 评估标准
  let detailCriteriaSection = '# 本批次类型专属 Detail 评估标准\n\n';
  for (const v of verticals) {
    const criteria = DETAIL_CRITERIA[v as VerticalType] || DETAIL_CRITERIA.Other;
    detailCriteriaSection += criteria + '\n\n';
  }

  // 标注图生图 Prompt
  const img2imgIds = batch.filter((p) => p.requires_upload).map((p) => p.id);
  let completenessSection = '# Completeness 评估标准\n\n';

  if (img2imgIds.length > 0) {
    completenessSection += `⚠️ **以下 ID 为图生图 Prompt，使用图生图专属标准**: ${img2imgIds.join(', ')}\n\n`;
    completenessSection += IMG2IMG_COMPLETENESS_CRITERIA + '\n\n';
  }
  if (img2imgIds.length < batch.length) {
    completenessSection += STANDARD_COMPLETENESS_CRITERIA + '\n\n';
  }

  // 构建待评估数据（包含 vertical 和 requires_upload）
  const batchJson = JSON.stringify(
    batch.map((p) => ({
      id: p.id,
      prompt: p.prompt,
      title: p.title,
      vertical: p.vertical,
      requires_upload: p.requires_upload,
    })),
    null,
    2
  );

  return `${detailCriteriaSection}${completenessSection}# 待评估数据

${batchJson}

# 输出要求

对以上每个 Prompt 进行评估，输出严格 JSON 格式：

{
  "evaluations": [
    {
      "id": [原始ID],
      "scores": { "clarity": [0-40], "detail": [0-35], "completeness": [0-25] },
      "total": [三项之和],
      "highlights": ["优点1", "优点2"],
      "issues": ["问题1", "问题2"],
      "search_keywords": ["关键词1", "关键词2", "关键词3"]
    }
  ]
}

⚠️ 注意：search_keywords 必须是 3-5 个蓝海长尾词，每个词 2-4 个单词！

开始评估：`;
}

/**
 * 解析 LLM 返回的 JSON
 */
function parseEvaluationJSON(response: string): BatchEvaluationResult {
  // 提取 JSON - 找到最外层的 { ... }
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * 评估单个批次（带重试）
 */
async function evaluateBatch(
  batch: MergedPrompt[]
): Promise<Map<number, BatchEvaluationResult['evaluations'][0]>> {
  const inputBatch = batch.map((p) => ({
    id: p.id,
    prompt: p.prompt,
    title: p.title,
    vertical: p.vertical,
    requires_upload: p.requires_upload,
  }));

  const userPrompt = buildEvaluationUserPrompt(inputBatch);
  const fullPrompt = `${QUALITY_EVALUATION_SYSTEM_PROMPT}\n\n${userPrompt}`;

  // 重试循环
  for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      const response = await generateText(fullPrompt, {
        temperature: 0.2, // 降低温度提高输出稳定性
        maxOutputTokens: 8192, // 确保有足够空间输出完整 JSON
        model: 'gemini-3-flash-preview',
        jsonMode: true,
      });

      const result = parseEvaluationJSON(response);

      // 转换为 Map
      const resultMap = new Map<number, BatchEvaluationResult['evaluations'][0]>();
      for (const eval_ of result.evaluations || []) {
        resultMap.set(eval_.id, eval_);
      }

      return resultMap;
    } catch (error: any) {
      const isLastAttempt = attempt === CONFIG.MAX_RETRIES;
      if (isLastAttempt) {
        console.error(`[PromptQuality] Batch failed after ${CONFIG.MAX_RETRIES + 1} attempts:`, error.message);
        return new Map();
      }
      console.warn(`[PromptQuality] Attempt ${attempt + 1} failed, retrying...`);
      // 短暂延迟后重试
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return new Map();
}

// ============================================
// 断点续传：进度保存与恢复
// ============================================

const PROGRESS_FILE = path.join(CONFIG.OUTPUT_DIR, 'evaluation-progress.json');

interface ProgressData {
  evaluations: Record<number, BatchEvaluationResult['evaluations'][0]>;
  lastUpdated: string;
  totalProcessed: number;
}

/**
 * 加载已保存的进度
 */
function loadProgress(): Map<number, BatchEvaluationResult['evaluations'][0]> {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data: ProgressData = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      console.log(`[PromptQuality] Loaded progress: ${data.totalProcessed} prompts already evaluated`);
      return new Map(Object.entries(data.evaluations).map(([k, v]) => [parseInt(k), v]));
    }
  } catch (e) {
    console.warn('[PromptQuality] Failed to load progress, starting fresh');
  }
  return new Map();
}

/**
 * 保存当前进度
 */
function saveProgress(results: Map<number, BatchEvaluationResult['evaluations'][0]>): void {
  try {
    // 确保目录存在
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    const data: ProgressData = {
      evaluations: Object.fromEntries(results),
      lastUpdated: new Date().toISOString(),
      totalProcessed: results.size,
    };
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[PromptQuality] Failed to save progress:', e);
  }
}

/**
 * 并发评估所有批次（支持断点续传）
 */
export async function evaluateAllBatches(
  prompts: MergedPrompt[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<number, BatchEvaluationResult['evaluations'][0]>> {
  console.log('[PromptQuality] Starting LLM evaluation...');

  // 加载已保存的进度
  const allResults = loadProgress();
  const alreadyEvaluatedIds = new Set(allResults.keys());

  // 过滤掉已评估的 prompts
  const remainingPrompts = prompts.filter((p) => !alreadyEvaluatedIds.has(p.id));
  console.log(
    `[PromptQuality] ${alreadyEvaluatedIds.size} already evaluated, ${remainingPrompts.length} remaining`
  );

  if (remainingPrompts.length === 0) {
    console.log('[PromptQuality] All prompts already evaluated');
    return allResults;
  }

  // 分批
  const batches: MergedPrompt[][] = [];
  for (let i = 0; i < remainingPrompts.length; i += CONFIG.BATCH_SIZE) {
    batches.push(remainingPrompts.slice(i, i + CONFIG.BATCH_SIZE));
  }

  console.log(
    `[PromptQuality] Total ${batches.length} batches (${CONFIG.BATCH_SIZE} prompts each)`
  );

  let completed = 0;

  // 并发处理
  for (let i = 0; i < batches.length; i += CONFIG.CONCURRENCY) {
    const concurrentBatches = batches.slice(i, i + CONFIG.CONCURRENCY);

    const results = await Promise.all(concurrentBatches.map((batch) => evaluateBatch(batch)));

    // 合并结果
    for (const resultMap of results) {
      for (const [id, eval_] of resultMap) {
        allResults.set(id, eval_);
      }
    }

    // 每轮并发后保存进度
    saveProgress(allResults);

    completed += concurrentBatches.length;
    onProgress?.(completed, batches.length);
    console.log(`[PromptQuality] Progress: ${completed}/${batches.length} batches (total ${allResults.size} scored)`);
  }

  console.log(`[PromptQuality] Evaluation complete: ${allResults.size} prompts scored`);
  return allResults;
}

// ============================================
// Step 4: Bonus Calculation
// ============================================

/**
 * 计算加分项（基于数据信号，不用 LLM）
 */
export function calculateBonus(prompt: MergedPrompt): BonusScores {
  const bonus: BonusScores = {
    featured: 0,
    media: 0,
    commercial: 0,
  };

  // 1. Featured 加分
  if (prompt.featured) {
    bonus.featured = CONFIG.BONUS_FEATURED;
  }

  // 2. Media 加分
  if (prompt.mediaCount > 3) {
    bonus.media = CONFIG.BONUS_MEDIA_MANY;
  } else if (prompt.mediaCount > 0) {
    bonus.media = CONFIG.BONUS_MEDIA_MIN;
  }

  // 3. 商业价值加分
  if (prompt.commercial_prob > CONFIG.BONUS_COMMERCIAL_THRESHOLD) {
    bonus.commercial = CONFIG.BONUS_COMMERCIAL;
  }

  return bonus;
}

// ============================================
// Step 5: Deduplication
// ============================================

/**
 * 基于 MD5 哈希去重（保留分数更高的）
 */
export function deduplicateByHash(results: QualityResult[]): QualityResult[] {
  console.log('[PromptQuality] Deduplicating by hash...');

  const hashMap = new Map<string, QualityResult>();

  for (const result of results) {
    // Normalize: 去除空白，转小写
    const normalized = result.prompt.replace(/\s+/g, ' ').trim().toLowerCase();
    const hash = crypto.createHash('md5').update(normalized).digest('hex');

    const existing = hashMap.get(hash);
    if (!existing || result.total_score > existing.total_score) {
      hashMap.set(hash, result);
    }
  }

  const deduplicated = Array.from(hashMap.values());
  console.log(
    `[PromptQuality] Deduplicated: ${results.length} -> ${deduplicated.length} (removed ${results.length - deduplicated.length})`
  );

  return deduplicated;
}

// ============================================
// Step 6: Final Assembly
// ============================================

/**
 * 确定推荐等级
 */
function getRecommendation(
  totalScore: number
): 'strong_recommend' | 'recommend' | 'conditional' | 'low_priority' {
  if (totalScore >= 90) return 'strong_recommend';
  if (totalScore >= 75) return 'recommend';
  if (totalScore >= 60) return 'conditional';
  return 'low_priority';
}

/**
 * 组装最终结果
 */
export function assembleResults(
  prompts: MergedPrompt[],
  llmResults: Map<number, BatchEvaluationResult['evaluations'][0]>
): QualityResult[] {
  console.log('[PromptQuality] Assembling final results...');

  const results: QualityResult[] = [];

  for (const prompt of prompts) {
    const llmResult = llmResults.get(prompt.id);

    // 如果 LLM 没有返回结果，使用默认分数
    const llmScores: LLMScores = llmResult?.scores || {
      clarity: 20,
      detail: 15,
      completeness: 10,
    };
    const llmTotal = llmResult?.total || llmScores.clarity + llmScores.detail + llmScores.completeness;

    const bonus = calculateBonus(prompt);
    const bonusTotal = bonus.featured + bonus.media + bonus.commercial;
    const totalScore = llmTotal + bonusTotal;

    results.push({
      id: prompt.id,
      prompt: prompt.prompt,
      title: prompt.title,

      llm_scores: llmScores,
      llm_total: llmTotal,

      bonus,
      bonus_total: bonusTotal,

      total_score: totalScore,

      seo_intent: prompt.seo_intent,
      vertical: prompt.vertical,
      requires_upload: prompt.requires_upload,

      recommendation: getRecommendation(totalScore),
      highlights: llmResult?.highlights,
      issues: llmResult?.issues,

      // V3.1: 用户搜索意图词
      search_keywords: llmResult?.search_keywords,
    });
  }

  // 按总分降序排序
  results.sort((a, b) => b.total_score - a.total_score);

  console.log(`[PromptQuality] Assembled ${results.length} results`);
  return results;
}

// ============================================
// Step 7: Output Generation
// ============================================

/**
 * 生成输出文件
 */
export function generateOutput(results: QualityResult[]): void {
  console.log('[PromptQuality] Generating output files...');

  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  // 1. 完整 JSON 结果
  const jsonPath = path.join(CONFIG.OUTPUT_DIR, 'quality-filtered-prompts.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`[PromptQuality] Saved: ${jsonPath}`);

  // 2. 生成 Markdown 报告
  const report = generateMarkdownReport(results);
  const reportPath = path.join(CONFIG.OUTPUT_DIR, 'quality-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`[PromptQuality] Saved: ${reportPath}`);
}

/**
 * 生成 Markdown 报告
 */
function generateMarkdownReport(results: QualityResult[]): string {
  const now = new Date().toISOString().split('T')[0];

  // 统计分布
  const distribution = {
    strong_recommend: results.filter((r) => r.recommendation === 'strong_recommend').length,
    recommend: results.filter((r) => r.recommendation === 'recommend').length,
    conditional: results.filter((r) => r.recommendation === 'conditional').length,
    low_priority: results.filter((r) => r.recommendation === 'low_priority').length,
  };

  // 垂直分布
  const verticalCounts: Record<string, number> = {};
  for (const r of results) {
    verticalCounts[r.vertical] = (verticalCounts[r.vertical] || 0) + 1;
  }

  // 平均分
  const avgScore = results.reduce((sum, r) => sum + r.total_score, 0) / results.length;
  const avgLLM = results.reduce((sum, r) => sum + r.llm_total, 0) / results.length;
  const avgBonus = results.reduce((sum, r) => sum + r.bonus_total, 0) / results.length;

  // Top 10
  const top10 = results.slice(0, 10);

  return `# Prompt 质量筛选报告

## 执行摘要

- **分析日期**: ${now}
- **总数量**: ${results.length}
- **平均总分**: ${avgScore.toFixed(1)}
- **平均 LLM 分**: ${avgLLM.toFixed(1)}
- **平均加分**: ${avgBonus.toFixed(1)}

## 推荐等级分布

| 等级 | 数量 | 占比 |
|------|------|------|
| Strong Recommend (90+) | ${distribution.strong_recommend} | ${((distribution.strong_recommend / results.length) * 100).toFixed(1)}% |
| Recommend (75-89) | ${distribution.recommend} | ${((distribution.recommend / results.length) * 100).toFixed(1)}% |
| Conditional (60-74) | ${distribution.conditional} | ${((distribution.conditional / results.length) * 100).toFixed(1)}% |
| Low Priority (<60) | ${distribution.low_priority} | ${((distribution.low_priority / results.length) * 100).toFixed(1)}% |

## 垂直分布

| 垂直 | 数量 | 占比 |
|------|------|------|
${Object.entries(verticalCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([v, c]) => `| ${v} | ${c} | ${((c / results.length) * 100).toFixed(1)}% |`)
  .join('\n')}

## Top 10 高质量 Prompts

| 排名 | ID | 标题 | 总分 | LLM分 | 加分 | SEO 意图 |
|------|----|----|------|------|------|----------|
${top10.map((r, i) => `| ${i + 1} | ${r.id} | ${r.title.substring(0, 30)}... | ${r.total_score} | ${r.llm_total} | ${r.bonus_total} | ${r.seo_intent} |`).join('\n')}

## 图生图标记

- **需要上传图片**: ${results.filter((r) => r.requires_upload).length} 条
- **不需要上传**: ${results.filter((r) => !r.requires_upload).length} 条

> 注意：图生图 Prompt 并未被排除，仅做标记。

---

*Generated by Stage 3 Quality Filter*
`;
}

// ============================================
// Main Entry Point
// ============================================

/**
 * 主流程：执行完整的质量过滤
 */
export async function runQualityFilter(
  onProgress?: (stage: string, completed: number, total: number) => void
): Promise<QualityResult[]> {
  console.log('[PromptQuality] ========== Stage 3 Quality Filter ==========');
  const startTime = Date.now();

  // Step 1: 加载并合并数据
  onProgress?.('loading', 0, 1);
  const merged = loadAndMergeData();

  // Step 2: 基础清洗
  onProgress?.('cleaning', 0, 1);
  const cleaned = cleanData(merged);

  // Step 3: LLM 评分
  const llmResults = await evaluateAllBatches(cleaned, (completed, total) => {
    onProgress?.('evaluating', completed, total);
  });

  // Step 4 & 5: 组装结果（含加分）
  onProgress?.('assembling', 0, 1);
  let results = assembleResults(cleaned, llmResults);

  // Step 6: 去重
  onProgress?.('deduplicating', 0, 1);
  results = deduplicateByHash(results);

  // Step 7: 输出
  onProgress?.('output', 0, 1);
  generateOutput(results);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[PromptQuality] ========== Complete in ${elapsed}s ==========`);

  return results;
}
