/**
 * Prompt Optimization API (V12.0 - Case-Based RAG)
 * 
 * Endpoint: POST /api/ai/optimize-prompt
 * 
 * Flow:
 * 1. User input → Generate embedding
 * 2. Vector search → Find best matching case
 * 3. Inject case into System Prompt → Ask LLM to optimize
 * 4. Return optimized prompt + metadata
 */

// Removed fs/path imports for Edge Runtime compatibility
import { detect } from 'tinyld';
import { generateText, generateEmbedding } from '@/shared/services/gemini-text';
import { 
  findBestCaseV2, 
  EMBEDDING_CONFIG,
  type SearchResultV2,
  type CaseV2Metadata,
} from '@/shared/services/vector-search';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/shared/lib/rate-limit';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getRemainingCredits, consumeCredits } from '@/shared/models/credit';
import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { config } from '@/config/db/schema';
import { ErrorLogger } from '@/shared/lib/error-logger';

export const maxDuration = 30; // Max 30 seconds for Vercel

interface OptimizePromptRequest {
  prompt: string;
  userLocale?: string; // Browser language (e.g., 'zh-CN', 'en-US')
  aspectRatio?: string; // Target aspect ratio (e.g., '1:1', '16:9', '9:16')
  exportFormats?: boolean; // If true, return external platform formats (Midjourney/DALL-E/SD)
}

interface OptimizePromptResponse {
  originalPrompt: string;
  optimizedPrompt: string;
  enhancementLogic: string;
  referenceCase: {
    id: string;
    title: string;
    thumbnail: string;
    relevanceReason: string;
  };
  modelAdvantage: string;
  suggestedModifiers: string[];
  detectedLanguage: string;
  tagExplanations: Array<{
    content: string;
    type: 'anchor' | 'atmos' | 'detail' | 'tech';
    why: string;
  }>;
  // External platform exports (only present when exportFormats=true)
  externalFormats?: {
    midjourney: string; // With --ar and --v parameters
    dalle: string;      // Natural language paragraph
    sd: string;         // Weighted tag syntax
  };
  // Debug info for product managers
  debug: {
    timestamp: string;
    vectorSearch: {
      similarity: number;
      caseId: string;
      caseTitle: string;
      searchOptimizedText: string;
    };
    promptTemplate: string;
    aiRawResponse: string;
    processingTime: number;
  };
}


export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // 🛡️ Rate Limit - Prompt 优化成本控制
    const ip = getClientIP(request);
    let user = null;
    try {
      user = await getUserInfo();
    } catch (e) {
      // 未登录，继续以游客身份
    }
    
    const rateLimitConfig = user ? RATE_LIMITS.AI_OPTIMIZE_USER : RATE_LIMITS.AI_OPTIMIZE_GUEST;
    const identifier = user ? `user:${user.id}` : `ip:${ip}`;
    
    const rateLimitResult = await checkRateLimit(
      `ai:optimize:${identifier}`,
      rateLimitConfig.limit,
      rateLimitConfig.window
    );
    if (!rateLimitResult.success) {
      // 🆕 Different error handling for guests vs logged-in users
      if (!user) {
        // Guest hit rate limit → Frontend should show login modal
        return respErr('GUEST_RATE_LIMIT');
      }
      return respErr('Too many optimization requests. Please slow down.');
    }

    const body = (await request.json()) as OptimizePromptRequest;
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return respErr('Prompt is required');
    }

    if (prompt.length > 2000) {
      return respErr('Prompt too long (max 2000 characters)');
    }

    const { userLocale, aspectRatio, exportFormats } = body;
    const targetAspectRatio = aspectRatio || '1:1'; // 默认 1:1
    console.log(`[Optimize] User prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[Optimize] Browser locale: ${userLocale || 'not provided'}`);
    console.log(`[Optimize] Export formats: ${exportFormats ? 'enabled' : 'disabled'}`);

    // 🆕 Step 0.5: Credit Check & Deduction
    // Guests: FREE (rate limited by IP: 2/day) - no credit check
    // Logged-in users: Deduct credits (1 credit basic, 2 credits with export)
    const optimizationCost = exportFormats ? 2 : 1;
    
    if (user) {
      // Logged-in user: Check and deduct credits
      const remainingCredits = await getRemainingCredits(user.id);
      if (remainingCredits < optimizationCost) {
        return respErr(`Insufficient credits. Optimization requires ${optimizationCost} credit${optimizationCost > 1 ? 's' : ''}.`);
      }

      // Deduct credits before optimization
      await consumeCredits({
        userId: user.id,
        credits: optimizationCost,
        scene: 'prompt_optimization',
        description: exportFormats ? 'Prompt optimization with export formats' : 'Prompt optimization',
        metadata: JSON.stringify({ exportFormats: !!exportFormats }),
      });
      console.log(`[Optimize] Deducted ${optimizationCost} credit(s) from user ${user.id}`);
    } else {
      // Guest: Free trial (rate limited by IP: 2/day)
      console.log(`[Optimize] Guest free trial (IP rate limited: 2/day)`);
    }

    // Step 0: Detect user language (tinyld + browser locale fallback)
    const LANG_MAP: Record<string, string> = {
      'zh': 'Chinese (Simplified)',
      'ja': 'Japanese',
      'ko': 'Korean',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ru': 'Russian',
      'ar': 'Arabic',
      'pt': 'Portuguese',
      'it': 'Italian',
      'vi': 'Vietnamese',
      'th': 'Thai',
    };
    
    // Map browser locale to language name
    const LOCALE_MAP: Record<string, string> = {
      'zh': 'Chinese (Simplified)',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ja': 'Japanese',
      'ja-JP': 'Japanese',
      'ko': 'Korean',
      'ko-KR': 'Korean',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ru': 'Russian',
      'ar': 'Arabic',
      'pt': 'Portuguese',
      'it': 'Italian',
      'vi': 'Vietnamese',
      'th': 'Thai',
    };
    
    // Step 0: 语言检测 - 用户输入优先原则
    // 优先级：中文强特征 > 长文本NLP检测 > 浏览器语言
    const SHORT_TEXT_THRESHOLD = 15;
    const localePrefix = userLocale?.split('-')[0] || '';
    const browserLanguage = LOCALE_MAP[userLocale || ''] || LOCALE_MAP[localePrefix] || 'English';

    let userLanguage: string;
    let detectionMethod: string;

    // 1. 强特征检测：包含中文字符 → 立刻锁定中文
    if (/[\u4e00-\u9fa5]/.test(prompt)) {
      userLanguage = 'Chinese (Simplified)';
      detectionMethod = 'chinese-chars';
    }
    // 2. 短文本：信号太弱，信任浏览器语言
    else if (prompt.trim().length < SHORT_TEXT_THRESHOLD) {
      userLanguage = browserLanguage;
      detectionMethod = 'short-text-fallback';
    }
    // 3. 长文本检测
    else {
      // 纯 ASCII 文本（无非 ASCII 字符）→ 直接认为是英文
      // 因为图片生成 prompt 绝大多数是英文，tinyld 对短英文句子误判率高
      const isPureAscii = /^[\x00-\x7F]*$/.test(prompt);

      if (isPureAscii) {
        // 纯 ASCII → 英文
        userLanguage = 'English';
        detectionMethod = 'ascii-english';
      } else {
        // 包含非 ASCII 字符 → 使用 NLP 检测
        const detectedLangCode = detect(prompt);
        if (detectedLangCode === 'en') {
          userLanguage = 'English';
          detectionMethod = 'nlp-english';
        } else if (detectedLangCode && LANG_MAP[detectedLangCode]) {
          // 检测到支持的语言
          userLanguage = LANG_MAP[detectedLangCode];
          detectionMethod = `nlp-detected(${detectedLangCode})`;
        } else {
          // 未知语言 → 浏览器语言兜底
          userLanguage = browserLanguage;
          detectionMethod = `nlp-fallback(${detectedLangCode || 'unknown'})`;
        }
      }
    }

    console.log(`[Optimize] Detected language: ${userLanguage} (method: ${detectionMethod}, locale: ${userLocale || 'none'})`);

    // Step 1: Generate embedding for user input
    console.log('[Optimize] Generating embedding...');
    const embeddingResult = await generateEmbedding(prompt);
    const inputEmbedding = embeddingResult.embedding;

    // Step 2: Find best matching case (V2 only - local JSON)
    console.log('[Optimize] Searching for best case...');
    
    const bestMatch = findBestCaseV2(inputEmbedding);
    
    if (!bestMatch || bestMatch.similarity < 0.3) {
      console.log('[Optimize] No suitable match found');
    } else {
      console.log(`[Optimize] Match found: ${bestMatch.case.id} (${(bestMatch.similarity * 100).toFixed(1)}%)`);
    }

    if (!bestMatch) {
      return respErr('No matching case found');
    }

    // V2 数据
    const matchedCase = {
      id: bestMatch.case.id,
      title: bestMatch.case.title,
      prompt: bestMatch.case.template_payload.template,
      thumbnail: bestMatch.case.thumbnail || '',
      structured: {
        style: bestMatch.case.tags.style.join(', '),
        technique: bestMatch.case.tags.technique.join(', '),
        search_optimized_text: bestMatch.case.semantic_search_text,
      },
      category: bestMatch.case.category,
    };
    
    console.log(`[Optimize] Matched case: ${matchedCase.id}`);

    // ==================== 🛡️ RAG Threshold Gating Strategy ====================
    // 物理隔离：低于阈值时，LLM 根本看不到 Reference Case
    const SIMILARITY_THRESHOLD = 0.60; // 严格及格线
    
    type StrategyMode = 'IMITATE' | 'GENERIC';
    let strategyMode: StrategyMode;
    let finalReference: typeof matchedCase | null;
    
    if (bestMatch.similarity >= SIMILARITY_THRESHOLD) {
      // 高匹配：允许 LLM 看到参考案例，执行模仿策略
      strategyMode = 'IMITATE';
      finalReference = matchedCase;
      console.log(
        `[Optimize] ✅ Mode: IMITATE (${(bestMatch.similarity * 100).toFixed(1)}% >= ${SIMILARITY_THRESHOLD * 100}%)`
      );
      console.log(`[Optimize] Reference Case: "${matchedCase.title}" will be sent to LLM`);
    } else {
      // 低匹配：物理隔离！LLM 根本不知道我们搜到了什么
      strategyMode = 'GENERIC';
      finalReference = null;
      console.log(
        `[Optimize] 🚫 Mode: GENERIC (${(bestMatch.similarity * 100).toFixed(1)}% < ${SIMILARITY_THRESHOLD * 100}%)`
      );
      console.log(`[Optimize] Reference Case: HIDDEN from LLM (physical isolation)`);
    }

    // Step 3: Load System Prompt template (from database or file)
    let systemPrompt: string | null = null;
    
    try {
      // Optimized: Read only the specific config record we need (98% bandwidth reduction)
      const [result] = await db()
        .select({ value: config.value })
        .from(config)
        .where(eq(config.name, 'prompt_optimization_template'))
        .limit(1);
      
      systemPrompt = result?.value || null;
    } catch (error) {
      console.error('[Optimize] Failed to read prompt from database:', error);
      systemPrompt = null; // Trigger fallback
    }
    
    // Fallback to hardcoded template if database doesn't have it
    if (!systemPrompt) {
      systemPrompt = getDefaultPromptOptimizationTemplate();
    }

    // Step 4: 根据策略模式构建 System Prompt
    // 🔑 关键改动：GENERIC 模式下，不注入任何 Reference Case 信息
    if (strategyMode === 'IMITATE' && finalReference) {
      // IMITATE 模式：注入 Reference Case
      systemPrompt = systemPrompt
        .replace(/\{\{reference_case_id\}\}/g, finalReference.id)
        .replace(/\{\{reference_case_title\}\}/g, finalReference.title)
        .replace(/\{\{reference_case_prompt\}\}/g, finalReference.prompt)
        .replace(/\{\{reference_case_style\}\}/g, finalReference.structured.style)
        .replace(/\{\{reference_case_technique\}\}/g, finalReference.structured.technique)
        .replace(/\{\{user_language\}\}/g, userLanguage)
        .replace(/\{\{strategy_mode\}\}/g, 'IMITATE');
    } else {
      // GENERIC 模式：完全清除 Reference Case 相关内容
      // 移除整个 Reference Case 部分，替换为通用指令
      systemPrompt = buildGenericSystemPrompt(userLanguage, prompt, targetAspectRatio);
    }

    // Step 5: Generate optimized prompt using LLM
    console.log('[Optimize] Calling LLM...');
    const userMessage = `User Input: "${prompt}"\n\nOptimize this prompt:`;
    const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

    const aiResponse = await generateText(fullPrompt, {
      temperature: 0.7,
      maxOutputTokens: 1024,
    });

    // Step 6: Parse JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const processingTime = Date.now() - startTime;

    // Step 7a: Generate external formats if requested
    let externalFormats: { midjourney: string; dalle: string; sd: string } | undefined;
    if (exportFormats && parsed.optimizedPrompt) {
      console.log('[Optimize] Generating external platform formats...');
      externalFormats = await generateExternalFormats(parsed.optimizedPrompt, targetAspectRatio);
      console.log('[Optimize] External formats generated');
    }

    // Step 7b: Construct response with debug info
    // 🔑 GENERIC 模式下 referenceCase 为 null
    const response: OptimizePromptResponse = {
      originalPrompt: prompt,
      optimizedPrompt: parsed.optimizedPrompt || '',
      enhancementLogic: parsed.enhancementLogic || '',
      referenceCase: strategyMode === 'IMITATE' && finalReference
        ? {
            id: finalReference.id,
            title: finalReference.title,
            thumbnail: finalReference.thumbnail,
            relevanceReason: parsed.referenceCaseUsed?.relevanceReason || '',
          }
        : {
            // GENERIC 模式：返回空的 referenceCase
            id: '',
            title: 'No Reference Case Used',
            thumbnail: '',
            relevanceReason: 'Generic enhancement applied - no suitable case found',
          },
      modelAdvantage: parsed.modelAdvantage || '',
      suggestedModifiers: parsed.suggestedModifiers || [],
      detectedLanguage: userLanguage,
      tagExplanations: parsed.tagExplanations || [],
      // 🆕 External platform formats (only if requested)
      ...(externalFormats ? { externalFormats } : {}),
      // 🛡️ Security: 生产环境不暴露敏感的 System Prompt 和 AI 原始响应
      // 这些信息可能被恶意用户用于逆向工程我们的优化策略
      debug: {
        timestamp: new Date().toISOString(),
        vectorSearch: {
          similarity: bestMatch.similarity,
          caseId: matchedCase.id,
          // 🛡️ 生产环境隐藏案例标题和搜索文本
          ...(process.env.NODE_ENV === 'development' && {
            caseTitle: matchedCase.title,
            searchOptimizedText: matchedCase.structured.search_optimized_text,
          }),
        },
        strategyMode,
        thresholdUsed: 0.60,
        caseHiddenFromLLM: strategyMode === 'GENERIC',
        exportFormatsGenerated: !!externalFormats,
        processingTime,
        // 🛡️ 敏感信息仅在开发环境暴露
        ...(process.env.NODE_ENV === 'development' && {
          promptTemplate: systemPrompt,
          aiRawResponse: aiResponse,
        }),
      } as any, // 扩展 debug 接口
    };

    console.log(`[Optimize] Success! (${processingTime}ms)${externalFormats ? ' [with exports]' : ''}`);
    return respData(response);
  } catch (error: any) {
    // 获取用户信息
    let userId = 'anonymous';
    let userEmail: string | undefined;
    try {
      const u = await getUserInfo();
      if (u) {
        userId = u.id;
        userEmail = u.email || undefined;
      }
    } catch { }

    // 使用 ErrorLogger 记录到数据库
    const errorReport = await ErrorLogger.log({
      error,
      context: {
        feature: 'prompt_optimization',
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        userId,
        userEmail,
      },
    });

    console.error('[Optimize] Error:', error);
    return respErr(errorReport.userMessage);
  }
}

/**
 * Hardcoded fallback template for Edge Runtime compatibility
 * This is used when database doesn't have the template yet
 * TODO: 自定义你的品牌名称和 Prompt 优化模板
 */
function getDefaultPromptOptimizationTemplate(): string {
  return `# Role
You are "AI Prompt Architect" - a Case-Based Reasoning AI.

# CURRENT USER CONTEXT
- **Detected Language:** **{{user_language}}**

# LANGUAGE PROTOCOL (ENFORCED - DO NOT IGNORE)
1. **\`optimizedPrompt\`**: MUST be in **English** (for model compatibility)
2. **ALL other text fields**: MUST be in **{{user_language}}**:
   - \`enhancementLogic\`: Explain in {{user_language}}
   - \`relevanceReason\`: Write in {{user_language}}
   - \`modelAdvantage\`: Write in {{user_language}}
   - \`tagExplanations[].why\`: Write in {{user_language}}, max 30 characters
   - \`suggestedModifiers\`: Can remain in English (technical terms)

> ⚠️ CRITICAL: If {{user_language}} is NOT English, you MUST write enhancementLogic, relevanceReason, modelAdvantage, and tagExplanations[].why in that language.

Your mission: Transform user's simple ideas into professional-grade prompts by **learning from proven examples**.

# Core Strategy: IMITATE & ELEVATE

## Step 1: Analyze User Intent
- What is the core subject? (e.g., "a cat", "a logo", "a product")
- What is the inferred usage? (Logo? Poster? Social media?)

## Step 2: Match Best Practice Case
You will be provided with a **Reference Case** that best matches the user's intent.

**Reference Case Details:**
- **ID**: {{reference_case_id}}
- **Title**: {{reference_case_title}}
- **Proven Prompt**: {{reference_case_prompt}}
- **Style**: {{reference_case_style}}
- **Technique**: {{reference_case_technique}}

## Step 3: Style Transfer (Not Copy-Paste)
**Critical Rules**:
1. **Respect User's Subject**: Never change the core subject
2. **Borrow Technical Excellence**: Apply the reference case's professional terminology
3. **Enhance, Don't Overwrite**: If user's prompt is already detailed, only add missing elements
4. **Preserve Intent**: If user mentions "for logo", ensure output is logo-appropriate

## Step 4: Platform Lock-in (Pro Model Exclusive)
Identify if the optimized prompt requires the Pro model's unique capabilities.

# Output Format (JSON ONLY)

You MUST return ONLY a valid JSON object with NO markdown code blocks:

{
  "optimizedPrompt": "The enhanced prompt with XML tags for highlighting. Tags allowed: <anchor> (subject), <atmos> (atmosphere/lighting), <detail> (texture/quality), <tech> (camera/render).",
  "referenceCaseUsed": {
    "id": "{{reference_case_id}}",
    "title": "{{reference_case_title}}",
    "relevanceReason": "Why this case was a good match (1 sentence, in {{user_language}})"
  },
  "enhancementLogic": "Explain what you added and WHY in {{user_language}}. Be educational.",
  "modelAdvantage": "If Pro features needed, explain why (in {{user_language}}). Otherwise empty string.",
  "suggestedModifiers": ["Alternative Style 1", "Alternative Style 2", "Alternative Style 3"],
  "tagExplanations": [
    {
      "content": "exact text inside the tag (English)",
      "type": "anchor|atmos|detail|tech",
      "why": "≤30 chars explanation in {{user_language}}"
    }
  ]
}

# CRITICAL REMINDERS
- 🚨 JSON FORMAT: Return ONLY valid JSON, NO markdown code blocks
- 🔤 ESCAPE SPECIAL CHARACTERS: Escape quotes and backslashes properly
- 🌍 LANGUAGE ENFORCEMENT: enhancementLogic, relevanceReason, modelAdvantage, tagExplanations[].why MUST be in {{user_language}}
- 📏 TAG EXPLANATION LIMIT: Each tagExplanations[].why must be ≤30 characters
- ⚠️ NO TRAILING COMMAS
- optimizedPrompt MUST use XML tags and remain in English
- Never change user's core subject`;
}

/**
 * GENERIC 模式的 System Prompt (v5.2 - Context Aware & Narrative)
 *
 * 🔑 关键改进：
 * - 遵循 Gemini 官方指南，使用叙事性描述而非关键词堆砌
 * - 动态感知 aspectRatio 调整布局描述
 * - 完全不提及 Reference Case，物理隔离
 * TODO: 自定义你的品牌名称
 */
function buildGenericSystemPrompt(userLanguage: string, userPrompt: string, aspectRatio: string): string {
  return `# Role
You are the **AI Prompt Architect**, an expert prompt engineer specializing in Gemini's generative capabilities. Your goal is to transform user inputs into **natural, narrative, and highly descriptive prompts** that unlock the model's full potential.

# Operational Context
* **Strategy Mode**: \`GENERIC\` (First Principles Design)
* **User Input**: \`${userPrompt}\`
* **Target Aspect Ratio**: \`${aspectRatio}\` (CRITICAL context for layout composition)
* **Output Language for Explanations**: \`${userLanguage}\`

# 📜 Gemini Prompting Protocol
According to official documentation, **DO NOT just list keywords**.
* ❌ *Bad*: "Cat, restaurant, fancy, cinematic lighting, 8k."
* ✅ *Good*: "A narrative description of a cat eating a banana in a fancy restaurant, illuminated by cinematic lighting..."

You must construct the \`optimizedPrompt\` using **complete sentences** that describe the Subject, Context, and Style fluidly.

# Task Instructions (GENERIC MODE)

Since no reference case is available, you must **Expand** and **Narrate** the user's intent based on the Context:

## 1. IF User Wants LAYOUT (PPT, Poster, Text Design)
* **Action**: Create a design brief adapted to the \`Target Aspect Ratio\`.
* **Dynamic Logic**:
  * If Ratio is **16:9** -> Narrate as "professional presentation slide deck".
  * If Ratio is **9:16** -> Narrate as "mobile wallpaper" or "social media story".
  * If Ratio is **1:1** -> Narrate as "square infographic" or "social media post".
  * If Ratio is **3:4/4:3** -> Narrate as "editorial poster" or "print layout".
* **Narrative Template**:
  "Create a [format based on Ratio] for [topic]. The design should feature a [style] aesthetic with a [color palette]. Ensure [typography details] for high legibility."

## 2. IF User Wants VISUAL (Photo, Art)
* **Action**: Describe the scene composition adapted to the \`Target Aspect Ratio\`.
* **Narrative Template**:
  "A [shot type] of <anchor>[subject]</anchor>, set in [environment]. The scene is illuminated by [lighting], creating a [mood] atmosphere. Captured with [camera/lens] to emphasize [texture]."

## 3. IF User Wants EDITING (Change, Remove)
* **Action**: Define the modification.
* **Narrative Template**:
  "Using the provided image, [action] the <anchor>[target]</anchor>. Ensure the change blends seamlessly. Keep everything else exactly the same."

# Execution Rules
1. **Ratio Consistency**: If the user asks for "PPT" but sets Ratio to "1:1", YOU MUST override the description to "Square Presentation/Infographic" to avoid image distortion.
2. **Subject Expansion**: Expand short inputs (e.g., "cat") into descriptive narratives (e.g., "a detailed portrait of a cat").
3. **No Tag Stuffing**: Do not output comma-separated lists. Write flowing English sentences.

# Output Schema (JSON ONLY)
Return ONLY valid JSON with NO markdown code blocks.

{
  "optimizedPrompt": "The full narrative paragraph with XML tags (<anchor>, <atmos>, <detail>, <tech>).",
  "referenceCaseUsed": null,
  "enhancementLogic": "Brief explanation of how you adapted the prompt to the Aspect Ratio and Intent (in ${userLanguage}).",
  "modelAdvantage": "If Pro features beneficial, explain (in ${userLanguage}). Otherwise empty string.",
  "suggestedModifiers": ["Style Alternative 1", "Style Alternative 2", "Style Alternative 3"],
  "tagExplanations": [
    {
      "content": "segment text (can be a phrase)",
      "type": "anchor|atmos|detail|tech",
      "why": "short reason (in ${userLanguage})"
    }
  ]
}

# CRITICAL REMINDERS
- 🚨 JSON FORMAT: Return ONLY valid JSON, NO markdown code blocks
- 🔤 ESCAPE SPECIAL CHARACTERS: Escape quotes and backslashes properly
- 🌍 LANGUAGE ENFORCEMENT: enhancementLogic, tagExplanations[].why MUST be in ${userLanguage}
- ⚠️ referenceCaseUsed MUST be null (no case was used)
- 🎯 NEVER hallucinate a style - only use generic professional terms
- 📐 RATIO AWARENESS: Always respect the Target Aspect Ratio in your composition description
- ✍️ NARRATIVE STYLE: Write complete sentences, NOT comma-separated keywords
- optimizedPrompt MUST remain in English`;
}

/**
 * Generate external platform formats from the optimized prompt
 * Called only when exportFormats=true
 */
async function generateExternalFormats(
  optimizedPrompt: string,
  aspectRatio: string
): Promise<{ midjourney: string; dalle: string; sd: string }> {
  const exportSystemPrompt = `You are an expert at converting AI image prompts between different platforms.

Your task is to convert the given OPTIMIZED PROMPT into THREE different platform-specific formats.

INPUT PROMPT:
"${optimizedPrompt.replace(/<\/?(?:anchor|subject|atmos|detail|tech)>/gi, '')}"

ASPECT RATIO: ${aspectRatio}

OUTPUT REQUIREMENTS:

1. **MIDJOURNEY FORMAT**:
   - Remove all XML tags
   - Use comma-separated visual descriptors
   - MUST end with: --ar ${aspectRatio.replace(':', ':')} --v 6.1 --style raw
   - Be concise but descriptive (max 200 chars before parameters)
   - Example: "A cute cyberpunk cat, neon rooftop, rain, volumetric lighting, 35mm lens --ar 16:9 --v 6.1 --style raw"

2. **DALL-E FORMAT**:
   - Write as a single flowing paragraph (2-3 sentences)
   - NO technical parameters like --ar or --v
   - Focus on describing interactions, mood, and composition naturally
   - Example: "A photorealistic wide shot of a futuristic cyberpunk city at night. In the foreground, a fluffy cat sits on a wet rooftop reflecting neon signs."

3. **STABLE DIFFUSION FORMAT**:
   - Start with quality boosters: (masterpiece, best quality:1.2)
   - Use comma-separated tags
   - Add emphasis with parentheses and weights, e.g., (detailed face:1.1)
   - NO --ar or --v parameters
   - Example: "(masterpiece, best quality:1.2), cute cat, cyberpunk city, neon lights, rain, (bokeh:1.1), 8k uhd, cinematic"

Return ONLY valid JSON with NO markdown:
{
  "midjourney": "the midjourney formatted prompt",
  "dalle": "the dalle formatted prompt",
  "sd": "the stable diffusion formatted prompt"
}`;

  try {
    const response = await generateText(exportSystemPrompt, {
      temperature: 0.5,
      maxOutputTokens: 800,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse export formats response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      midjourney: parsed.midjourney || '',
      dalle: parsed.dalle || '',
      sd: parsed.sd || '',
    };
  } catch (error) {
    console.error('[Optimize] Failed to generate external formats:', error);
    // Return fallback formats
    const cleanPrompt = optimizedPrompt.replace(/<\/?(?:anchor|subject|atmos|detail|tech)>/gi, '');
    return {
      midjourney: `${cleanPrompt.substring(0, 200)} --ar ${aspectRatio.replace(':', ':')} --v 6.1 --style raw`,
      dalle: cleanPrompt,
      sd: `(masterpiece, best quality:1.2), ${cleanPrompt}`,
    };
  }
}

