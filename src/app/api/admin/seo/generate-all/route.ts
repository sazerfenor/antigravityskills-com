import { respData, respErr } from '@/shared/lib/resp';
import { getSignUser } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { generateSEOSlug } from '@/shared/lib/seo-slug-generator';
import { extractSEOKeywords } from '@/shared/lib/seo-keyword-extractor';
import { contentSectionsSchema } from '@/shared/schemas/api-schemas'; // V14.0: Zod validation

/**
 * POST /api/admin/seo/generate-all
 * AI 一次性生成所有SEO内容（slug + title + description + FAQ + tags）
 */
export async function POST(request: Request) {
  try {
    // 🔒 P0 Security: AuthN - 使用 getSignUser 获取真实用户
    const user = await getSignUser();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    // 🔒 P0 Security: AuthZ - RBAC 权限检查
    if (!await hasPermission(user.id, 'admin.seo.write')) {
      return respErr('Forbidden: Missing admin.seo.write permission', 403);
    }

    const { postId, prompt, model, imageUrl, subject } = await request.json() as {
      postId: string;
      prompt: string;
      model: string;
      imageUrl: string;
      subject?: string; // 新增：可选的核心主体
    };

    if (!prompt || !model || !postId) {
      throw new Error('Missing required fields: prompt, model, postId');
    }

    console.log('[AI Generate All] Starting AI generation for post:', postId);

    // 新增：读取 post 以获取 optimization 数据
    const { getCommunityPostById } = await import('@/shared/models/community_post');
    const { findAITaskById } = await import('@/shared/models/ai_task');

    const post = await getCommunityPostById(postId);
    let optimizationData = null;

    if (post?.aiTaskId) {
      const aiTask = await findAITaskById(post.aiTaskId);
      optimizationData = aiTask?.optimizationData || null;

      if (optimizationData) {
        console.log('[AI Generate All] Found optimization data:', {
          hasReferenceCase: !!optimizationData.referenceCaseUsed,
          hasEnhancement: !!optimizationData.enhancementLogic,
          hasModelAdvantage: !!optimizationData.modelAdvantage,
        });
      }
    }

    // V15.0: 解析 post.params 获取 formValues 和 schema
    let formValuesData: { formValues: Record<string, any> | null; schema?: any } | null = null;
    if (post?.params) {
      try {
        const params = typeof post.params === 'string' ? JSON.parse(post.params) : post.params;
        if (params?.formValues && Object.keys(params.formValues).length > 0) {
          formValuesData = {
            formValues: params.formValues,
            schema: params.schema || null,
          };
          console.log('[AI Generate All] Found formValues:', {
            fieldsCount: Object.keys(params.formValues).length,
            hasSchema: !!params.schema,
            fieldKeys: Object.keys(params.formValues),
          });
        }
      } catch (e) {
        console.warn('[AI Generate All] Failed to parse post.params:', e);
      }
    }

    // 2-7. AI 生成所有内容（传递subject + optimizationData + formValuesData）
    const aiResult = await generateSEOContentWithAI(prompt, model, subject, optimizationData, formValuesData);

    // V15.0: 生成 SEO Slug (新格式: [microFocus-prefix]-[keywords]-[shortId])
    let seoSlug: string;
    if (aiResult.seoSlugKeywords) {
      const { cleanSlugText } = await import('@/shared/lib/seo-slug-generator');

      // V15.0: 提取 microFocus 前缀（最多取前 2 个词）
      let microFocusPrefix = '';
      if (aiResult.microFocus) {
        const microFocusClean = cleanSlugText(aiResult.microFocus);
        const microFocusWords = microFocusClean.split('-').slice(0, 2);
        microFocusPrefix = microFocusWords.join('-');
      }

      const keywordsPart = cleanSlugText(aiResult.seoSlugKeywords);
      const shortId = postId.replace(/-/g, '').slice(-8);

      // V15.0: 新格式 [microFocus-prefix]-[keywords]-[shortId]，限制总长度 ≤ 60
      if (microFocusPrefix && !keywordsPart.startsWith(microFocusPrefix)) {
        // 确保 microFocus 不与 keywords 重复
        const fullSlug = `${microFocusPrefix}-${keywordsPart}-${shortId}`;
        seoSlug = fullSlug.length <= 60 ? fullSlug : `${keywordsPart}-${shortId}`.slice(0, 60);
      } else {
        seoSlug = `${keywordsPart}-${shortId}`;
      }

      console.log('[V15.0] Slug generated:', {
        microFocusPrefix,
        keywordsPart,
        finalSlug: seoSlug,
        length: seoSlug.length,
      });
    } else {
      // Fallback: 使用简单算法
      seoSlug = await generateSEOSlug({
        prompt,
        model,
        postId,
        useAI: false,
      });
    }

    console.log('[AI Generate All] ✅ AI generation complete');

    return respData({
      seoSlug,
      ...aiResult,
      subject: aiResult.subject, // 新增：返回最终使用的subject
      relatedPosts: '[]', // 暂时为空
    });
  } catch (error: any) {
    console.error('[AI Generate All] Error:', error);
    return respErr(error.message);
  }
}

// ===== AI生成核心函数 (V15.0 Two-Stage + Universal Context) =====

/**
 * V15.0: 序列化 formValues 为 VISUAL CONTEXT (Ground Truth)
 *
 * @description
 * 将用户在 Playground 中配置的 formValues 序列化为自然语言，
 * 作为 Ground Truth 注入 Stage 1 Prompt，优先级高于从 prompt 文本推断的内容。
 *
 * @param formValues - 用户配置的表单值
 * @param schema - 可选的 schema 定义，用于获取友好的 label
 * @returns 格式化的 VISUAL CONTEXT 字符串，或空字符串（如果无数据）
 */
function serializeFormValuesToContext(
  formValues: Record<string, any> | null | undefined,
  schema?: { fields: Array<{ id: string; label: string; type?: string }> } | null
): string {
  if (!formValues || Object.keys(formValues).length === 0) {
    return '';
  }

  // 获取字段的友好名称
  const getLabel = (key: string): string => {
    const field = schema?.fields?.find(f => f.id === key);
    if (field?.label) {
      return field.label;
    }
    // Fallback: 将 snake_case 转为 Title Case
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // 格式化值（处理不同类型）
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
      // 0-1 范围的数字转为百分比
      if (value >= 0 && value <= 1) {
        return `${(value * 100).toFixed(0)}%`;
      }
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  // 过滤并格式化所有有效字段
  const lines = Object.entries(formValues)
    .filter(([_, value]) => {
      // 过滤空值
      if (value === undefined || value === null || value === '') return false;
      // 过滤空数组
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
    .map(([key, value]) => `- ${getLabel(key)}: ${formatValue(value)}`);

  if (lines.length === 0) {
    return '';
  }

  return `## VISUAL CONTEXT (GROUND TRUTH)
The user explicitly configured the following parameters in Vision Logic Playground.
These are FACTS, not inferences. Prioritize these over any interpretation from the prompt text.

${lines.join('\n')}`;
}

// Helper: Safe JSON Parse that handles Markdown code blocks
function safeParseJSON(text: string): any {
  text = text.trim();
  // 1. Try direct parse
  try {
    return JSON.parse(text);
  } catch (e) {
    // 2. Try extracting from ```json ... ``` or just { ... }
    const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[1] || match[0]);
      } catch (inner: unknown) {
        throw new Error('Found JSON-like block but failed to parse: ' + (inner instanceof Error ? inner.message : String(inner)));
      }
    }
    throw new Error('No valid JSON object found in response');
  }
}

/**
 * Stage 1: Strategist - 提取 Anchor, MicroFocus, 规划 Blocks
 */
async function callStage1(
  promptTemplate: string,
  userPrompt: string,
  modelName: string,
  aiModel: string,
  temperature: number,
  geminiProvider: any
): Promise<{
  anchor: string;
  microFocus: string;
  intent: string;
  plannedBlocks: any[];
  galleryCategory: string;
  categoryConfidence: 'high' | 'medium' | 'low';
  _debug: { prompt: string; rawResponse: string };
}> {
  const aiPrompt = promptTemplate
    .replace(/\{\{prompt\}\}/g, userPrompt)
    .replace(/\{\{model\}\}/g, modelName);

  console.log('\n=== [Stage 1: Strategist] ===');
  console.log('📤 Sending to AI (first 500 chars):', aiPrompt.substring(0, 500) + '...');

  const aiText = await geminiProvider.chat({
    model: aiModel,
    prompt: aiPrompt,
    temperature: temperature,
    maxTokens: 1024, // Stage 1 needs less tokens
    jsonMode: true,
  });

  if (!aiText) {
    throw new Error('Stage 1: No response from AI');
  }

  console.log('📥 Stage 1 Raw Response:', aiText);

  const parsed = safeParseJSON(aiText);
  console.log('✅ Stage 1 Parsed:', { anchor: parsed.anchor, microFocus: parsed.microFocus, blocksCount: parsed.plannedBlocks?.length || 0 });

  return {
    anchor: parsed.anchor || 'AI Image',
    microFocus: parsed.microFocus || '',
    intent: parsed.intent || 'Artistic',
    plannedBlocks: parsed.plannedBlocks || [{ id: 'block_1', type: 'rich-text', intent: 'Intro' }],
    galleryCategory: parsed.galleryCategory || 'unknown',
    categoryConfidence: parsed.categoryConfidence || 'low',
    _debug: { prompt: aiPrompt, rawResponse: aiText },
  };
}

/**
 * Stage 2: Writer - 根据 Stage 1 策略生成内容
 */
async function callStage2(
  promptTemplate: string,
  userPrompt: string,
  stage1Result: { anchor: string; microFocus: string; intent: string; plannedBlocks: any[] },
  aiModel: string,
  temperature: number,
  maxTokens: number,
  geminiProvider: any
): Promise<{ _debug: { prompt: string; rawResponse: string }; [key: string]: any }> {
  const blueprintJson = JSON.stringify(stage1Result, null, 2);
  const aiPrompt = promptTemplate
    .replace(/\{\{prompt\}\}/g, userPrompt)
    .replace(/\{\{blueprint\}\}/g, blueprintJson);

  console.log('\n=== [Stage 2: Writer] ===');
  console.log('📤 Sending to AI (first 500 chars):', aiPrompt.substring(0, 500) + '...');

  const aiText = await geminiProvider.chat({
    model: aiModel,
    prompt: aiPrompt,
    temperature: temperature,
    maxTokens: maxTokens,
    jsonMode: true,
  });

  if (!aiText) {
    throw new Error('Stage 2: No response from AI');
  }

  console.log('📥 Stage 2 Raw Response (first 1000 chars):', aiText.substring(0, 1000) + '...');

  const parsed = safeParseJSON(aiText);
  console.log('✅ Stage 2 Parsed:', { seoTitle: parsed.seoTitle, sectionsCount: parsed.contentSections?.length || 0 });

  return {
    ...parsed,
    _debug: { prompt: aiPrompt, rawResponse: aiText },
  };
}

/**
 * V15.0 FormValues 数据结构
 */
interface FormValuesData {
  formValues: Record<string, any> | null;
  schema?: { fields: Array<{ id: string; label: string; type?: string }> } | null;
}

/**
 * 使用 AI 生成所有 SEO 内容（V15.0 Two-Stage + Universal Context）
 *
 * @param prompt - 用户原始 Prompt
 * @param model - 使用的模型
 * @param userSubject - 可选的用户指定主题
 * @param optimizationData - 可选的优化数据（来自 Vision Analysis）
 * @param formValuesData - V15.0 新增：用户配置的表单数据
 */
async function generateSEOContentWithAI(
  prompt: string,
  model: string,
  userSubject?: string,
  optimizationData?: any,
  formValuesData?: FormValuesData | null
) {
  // TODO: 自定义你的模型显示名称
  const modelName = model.includes('gemini-3') ? 'Pro' : 'Standard';

  // 从配置读取 Stage 1 和 Stage 2 Prompt
  const { getConfigsByKeys } = await import('@/shared/models/config');
  const configs = await getConfigsByKeys([
    'seo_prompt_stage1',
    'seo_prompt_stage2',
    'seo_generation_model',
    'seo_generation_temperature',
    'seo_generation_max_tokens',
  ]);

  const stage1Prompt = configs.seo_prompt_stage1 || getDefaultStage1Prompt();
  const stage2Prompt = configs.seo_prompt_stage2 || getDefaultStage2Prompt();
  const aiModel = configs.seo_generation_model || 'gemini-3.0-flash-preview';
  const temperature = parseFloat(configs.seo_generation_temperature || '0.7');
  const maxTokens = parseInt(configs.seo_generation_max_tokens || '2048');

  try {
    // 获取 AI Provider
    const { getAIService } = await import('@/shared/services/ai');
    const aiService = await getAIService();
    const geminiProvider = aiService.getProvider('gemini');
    
    if (!geminiProvider || !geminiProvider.chat) {
      throw new Error('Gemini provider not configured or does not support chat');
    }

    // Prepare Prompt with Optimization Context if available
    let effectivePrompt = prompt;
    let formValuesInjected = false;

    // V15.0: 注入 VISUAL CONTEXT (Ground Truth) - 优先级最高
    if (formValuesData?.formValues) {
      const visualContext = serializeFormValuesToContext(
        formValuesData.formValues,
        formValuesData.schema
      );
      if (visualContext) {
        // 将 VISUAL CONTEXT 放在最前面，确保高优先级
        effectivePrompt = `${visualContext}\n\n---\n\n## USER PROMPT\n${effectivePrompt}`;
        formValuesInjected = true;
        console.log('[V15.0] VISUAL CONTEXT injected:', {
          fieldsCount: Object.keys(formValuesData.formValues).length,
          hasSchema: !!formValuesData.schema,
        });
      }
    }

    // V14.0: 注入 optimizationData（兼容旧逻辑）
    if (optimizationData) {
      const optSummary = [
        optimizationData.referenceCaseUsed ? `Reference Case: ${optimizationData.referenceCaseUsed.title}` : '',
        optimizationData.enhancementLogic ? `Enhancement Logic: ${optimizationData.enhancementLogic}` : '',
        optimizationData.suggestedModifiers?.length ? `Keywords: ${optimizationData.suggestedModifiers.join(', ')}` : ''
      ].filter(Boolean).join('\n');
      
      if (optSummary) {
        effectivePrompt += `\n\n[Context from Vision Analysis]:\n${optSummary}`;
      }
    }

    // ===== Stage 1: Strategist =====
    const stage1Result = await callStage1(
      stage1Prompt,
      effectivePrompt,
      modelName,
      aiModel,
      temperature,
      geminiProvider
    );

    // ===== Stage 2: Writer =====
    const stage2Result = await callStage2(
      stage2Prompt,
      effectivePrompt,
      stage1Result,
      aiModel,
      temperature,
      maxTokens,
      geminiProvider
    );

    // 合并结果
    const toTitleCase = (str: string) => str.replace(/\b\w/g, (char) => char.toUpperCase());
    const finalSubject = stage1Result.anchor || userSubject || 'AI Image';
    const titleCasedSubject = toTitleCase(finalSubject);

    // V14.0: Zod Runtime Validation for contentSections
    let validatedSections = stage2Result.contentSections || [];
    if (stage2Result.contentSections && Array.isArray(stage2Result.contentSections)) {
      const validationResult = contentSectionsSchema.safeParse(stage2Result.contentSections);
      if (validationResult.success) {
        validatedSections = validationResult.data;
        console.log('✅ contentSections Zod validation passed');
      } else {
        console.warn('⚠️ contentSections Zod validation failed:', validationResult.error.issues);
        validatedSections = stage2Result.contentSections;
      }
    }

    // 构建debug信息 - 完整调试链路
    const debugInfo = {
      // 1. 用户输入
      input: {
        userPrompt: prompt,
        model: model,
        userSubject: userSubject,
        effectivePrompt: effectivePrompt,
        formValuesInjected: formValuesInjected, // V15.0: 是否注入了 VISUAL CONTEXT
        formValuesCount: formValuesData?.formValues ? Object.keys(formValuesData.formValues).length : 0,
      },
      // 2. Stage 1: Strategist
      stage1: {
        prompt: stage1Result._debug.prompt,
        rawResponse: stage1Result._debug.rawResponse,
        parsed: {
          anchor: stage1Result.anchor,
          microFocus: stage1Result.microFocus,
          intent: stage1Result.intent,
          plannedBlocks: stage1Result.plannedBlocks,
        },
      },
      // 3. Stage 2: Writer
      stage2: {
        prompt: stage2Result._debug.prompt,
        rawResponse: stage2Result._debug.rawResponse,
        parsed: {
          seoTitle: stage2Result.seoTitle,
          h1Title: stage2Result.h1Title,
          seoDescription: stage2Result.seoDescription,
          contentSectionsCount: validatedSections.length,
        },
      },
      // 4. 元信息
      meta: {
        modelUsed: aiModel,
        temperature: temperature,
        maxTokens: maxTokens,
      },
    };

    // V14.0: Dual-Write Strategy - Extract FAQ from contentSections for backward compatibility
    let faqItemsForLegacy: any[] = [];
    if (validatedSections && Array.isArray(validatedSections)) {
      const faqSection = validatedSections.find((s: any) => s.type === 'faq-accordion');
      if (faqSection && faqSection.data?.items) {
        faqItemsForLegacy = faqSection.data.items.map((item: any) => ({
          question: item.q,
          answer: item.a,
        }));
      }
    }

    // Extract visualTags from contentSections if present
    let visualTagsForLegacy: string[] = [];
    const tagsSection = validatedSections.find((s: any) => s.type === 'tags');
    if (tagsSection && tagsSection.data?.items) {
      visualTagsForLegacy = tagsSection.data.items;
    }

    return {
      seoTitle: stage2Result.seoTitle,
      h1Title: stage2Result.h1Title || stage2Result.seoTitle?.replace(' | Your Brand', ''),
      seoDescription: stage2Result.seoDescription,
      seoKeywords: stage2Result.seoKeywords,
      seoSlugKeywords: stage2Result.slugKeywords || stage2Result.seoSlugKeywords,
      contentIntro: '', // Deprecated - now in contentSections
      promptBreakdown: '', // Deprecated - now in contentSections
      imageAlt: stage2Result.imageAlt,
      dynamicHeaders: '{}', // Deprecated - now in contentSections titles
      faqItems: JSON.stringify(faqItemsForLegacy),
      visualTags: JSON.stringify(visualTagsForLegacy),
      useCases: '[]', // Deprecated
      expertCommentary: null,
      remixIdeas: [],
      relatedConcepts: [],
      // V14.0 New Fields
      contentSections: validatedSections,
      anchor: stage1Result.anchor,
      microFocus: stage1Result.microFocus,
      subject: titleCasedSubject,
      // V15.0 GEO Fields
      snippetSummary: stage2Result.snippetSummary || null,
      // V16.0 Auto Category Fields
      galleryCategory: stage1Result.galleryCategory,
      categoryConfidence: stage1Result.categoryConfidence,
      debugInfo,
    };
  } catch (error) {
    console.error('[AI Generate] Two-stage generation failed:', error);
    
    // Fallback: Return simple placeholder content
    const fallbackSubject = userSubject || 'AI Image';
    const toTitleCase = (str: string) => str.replace(/\b\w/g, (char) => char.toUpperCase());
    const titleCasedFallback = toTitleCase(fallbackSubject);
    
    return {
      // TODO: 自定义你的品牌名称
      seoTitle: `${titleCasedFallback} - ${modelName} | Your Brand`,
      h1Title: titleCasedFallback,
      seoDescription: `Explore ${titleCasedFallback} AI image generation with ${modelName}.`,
      seoKeywords: [titleCasedFallback.toLowerCase()],
      seoSlugKeywords: titleCasedFallback.toLowerCase().replace(/\s+/g, '-'),
      contentIntro: '',
      promptBreakdown: '',
      imageAlt: `${titleCasedFallback} generated with ${modelName}`,
      dynamicHeaders: '{}',
      faqItems: '[]',
      visualTags: '[]',
      useCases: '[]',
      expertCommentary: null,
      remixIdeas: [],
      relatedConcepts: [],
      contentSections: [],
      anchor: titleCasedFallback,
      microFocus: '',
      subject: fallbackSubject,
      snippetSummary: null, // V15.0: Fallback has no snippet
      // V16.0: Fallback uses unknown category with low confidence
      galleryCategory: 'unknown',
      categoryConfidence: 'low' as const,
      debugInfo: { error: String(error) },
    };
  }
}

// ===== Fallback 简单生成函数 =====

function generateSEOTitleFallback(prompt: string, modelName: string): string {
  return `PLACEHOLDER_TITLE - ${modelName}`;
}

function generateSEODescriptionFallback(prompt: string): string {
  return `PLACEHOLDER_DESCRIPTION: This is a fallback description when AI generation fails.`;
}

function generateFAQFallback(prompt: string, modelName: string): Array<{question: string, answer: string}> {
  return [
    {
      question: `PLACEHOLDER_FAQ_QUESTION_1: What model is this?`,
      answer: `PLACEHOLDER_FAQ_ANSWER_1: ${modelName} fallback answer.`
    },
    {
      question: `PLACEHOLDER_FAQ_QUESTION_2: Can I modify?`,
      answer: `PLACEHOLDER_FAQ_ANSWER_2: Yes, this is fallback content.`
    },
    {
      question: `PLACEHOLDER_FAQ_QUESTION_3: How to use?`,
      answer: `PLACEHOLDER_FAQ_ANSWER_3: Copy and use, this is fallback.`
    }
  ];
}

function generateVisualTagsFallback(prompt: string): string[] {
  return ['PLACEHOLDER_TAG_1', 'PLACEHOLDER_TAG_2', 'PLACEHOLDER_TAG_3'];
}

function generateUseCasesFallback(prompt: string): string[] {
  return ['PLACEHOLDER_USE_CASE_1', 'PLACEHOLDER_USE_CASE_2', 'PLACEHOLDER_USE_CASE_3'];
}

// ===== Helper: 获取默认 Prompt 模板 (V15.0 Master Edition) =====

/**
 * Stage 1: Strategist - 提取 Anchor, MicroFocus, 规划 Blocks (V15.0 Master Edition)
 *
 * V15.0 新增:
 * - PRIORITY RULE: VISUAL CONTEXT (Ground Truth) 优先
 * - CONFLICT RESOLUTION PROTOCOL: Form vs Prompt 冲突处理
 * - Chain-of-Thought (_reasoning) 推理过程
 * - Voice Persona 系统 (Curator/Engineer/Director)
 * - Anti-Templating Commitment
 */
function getDefaultStage1Prompt(): string {
  return `# V15.0 STAGE 1: THE STRATEGIST (MASTER EDITION)

## OBJECTIVE
You are an Elite SEO Strategist. Analyze the user's image prompt and create a "Content Blueprint" for a high-ranking Guide Page.
**GOAL**: Create a rich, comprehensive structure that satisfies User Intent and SEO Depth.

## PRIORITY RULE ⚠️
If a "## VISUAL CONTEXT (GROUND TRUTH)" section exists in the input:
1. These parameters are FACTS, not suggestions
2. ANCHOR and MICRO-FOCUS MUST reflect these parameters
3. Apply CONFLICT RESOLUTION PROTOCOL when Form conflicts with Prompt text

## CONFLICT RESOLUTION PROTOCOL
When VISUAL CONTEXT (Form) conflicts with User Prompt text:

| Attribute | Priority | Reason |
|-----------|----------|--------|
| Art Style, Lighting, Stylization | **Form wins** | User explicitly configured |
| Subject, Scene, Background | **Prompt wins** | Creative intent |
| Mood, Atmosphere | **Combine both** | Complementary |

## INPUT
{{prompt}}
- Model: {{model}}
- **LANGUAGE**: Auto-detect from the prompt. Output MUST be in the same language.

## CRITICAL TASKS

### 1. REASONING (Optional but Recommended)
Explain your analysis in \`_reasoning\`:
- \`contextAnalysis\`: What does VISUAL CONTEXT tell us?
- \`conflictResolution\`: Any conflicts between Form and Prompt? How resolved?
- \`microFocusSelection\`: Which parameter is most distinctive? Why?
- \`voiceSelection\`: Which Persona fits the Intent?

### 2. Extract ANCHOR (2-5 words)
- If VISUAL CONTEXT exists: Combine [Style from Form] + [Subject from Prompt]
- Rules:
  - ❌ Bad: "Digital Art", "Portrait" (Too Generic)
  - ✅ Good: "Anime Golden Dress Portrait", "Neon Cyberpunk City"
- **If prompt < 5 words**: Use full prompt as Anchor.

### 3. Identify MICRO-FOCUS
- Use the most distinctive parameter from VISUAL CONTEXT
- Examples: "Golden Hour Lighting", "Cel-Shading Technique", "Glassmorphism Effect"
- This is KEY to avoiding SEO cannibalization!

### 4. Determine INTENT & Suggest VOICE
- **ARTISTIC** → Curator Voice (Gallery curator tone, emphasize aesthetics)
- **FUNCTIONAL** → Engineer Voice (Technical documentation, precise specs)
- **COMMERCIAL** → Director Voice (Marketing narrative, use cases, brand mentions)

### 5. Plan BLOCKS (4-6 blocks, 3+ types)
- **CONSTRAINT**: Plan **4 to 6 blocks**.
- **VARIETY RULE**: Use at least **3 DIFFERENT** block types.
- **NO TEMPLATES**: Do not always use "Intro -> Tags -> FAQ". Mix it up!

**Available Block Types**:
- \`rich-text\`: Deep Analysis / Storytelling. (Max 2, NEVER consecutive).
- \`checklist\`: Elements (Artistic), Specs (Functional), Layout (Commercial).
- \`comparison-table\`: "Style A vs B" or "Do's and Don'ts".
- \`faq-accordion\`: Technical Q&A. (Max 1).
- \`tags\`: **5-8** strictly visual keywords. (Max 1).

### 6. Classify GALLERY CATEGORY (MANDATORY)
YOU MUST select exactly ONE category for homepage gallery display.
⚠️ This is DIFFERENT from "intent" - intent affects writing style, category affects gallery navigation.

**Available Categories**:
| Slug | Visual Indicators | Examples |
|------|-------------------|----------|
| \`photography\` | Photorealistic, camera terms (ISO, aperture, lens), real-world scenes | Portrait, landscape, street photo |
| \`art-illustration\` | Anime, manga, digital painting, watercolor, concept art, illustration | Anime girl, fantasy art, comic style |
| \`design\` | Logo, UI/UX, poster, typography, pattern, mockup, layout | Logo design, app UI, poster |
| \`commercial-product\` | Product shot, packaging, advertising, marketing, brand | Product mockup, ad creative |
| \`character-design\` | Game character, mascot, avatar, creature, OC (original character) | Game hero, mascot design |

**Decision Rules** (apply in order, first match wins):
1. If VISUAL CONTEXT has \`art_style: anime/manga/illustration/comic\` → \`art-illustration\`
2. If prompt mentions "product", "mockup", "packaging", "brand", "advertisement" → \`commercial-product\`
3. If primary focus is character appearance/outfit/design (not scene) → \`character-design\`
4. If contains "logo", "poster", "layout", "UI", "banner", "icon" → \`design\`
5. If photorealistic OR camera terms (ISO, f/2.8, 85mm, bokeh) → \`photography\`
6. If NONE clearly fit → output \`unknown\` and explain in _reasoning

**Confidence Levels**:
- \`high\`: Clear match to one category (e.g., "anime girl" → art-illustration)
- \`medium\`: Could fit multiple but one is most likely
- \`low\`: Ambiguous, recommend manual review

## OUTPUT FORMAT (Strict JSON)
{
  "_reasoning": {
    "contextAnalysis": "VISUAL CONTEXT shows art_style=anime, lighting=golden_hour...",
    "conflictResolution": "No conflicts detected / Form specifies anime, using over prompt text...",
    "microFocusSelection": "Golden Hour is the most distinctive parameter because...",
    "voiceSelection": "Artistic intent detected, recommending Curator voice...",
    "categorySelection": "Detected anime style, assigning art-illustration with high confidence"
  },
  "anchor": "string (2-5 words)",
  "microFocus": "string (unique angle)",
  "intent": "Artistic | Functional | Commercial",
  "suggestedVoice": "Curator | Engineer | Director",
  "language": "en | zh | ja | ...",
  "plannedBlocks": [
    { "id": "block_1", "type": "rich-text", "intent": "Explain the core concept..." },
    { "id": "block_2", "type": "checklist", "intent": "List 5 essential components..." },
    { "id": "block_3", "type": "comparison-table", "intent": "Compare attributes..." },
    { "id": "block_4", "type": "tags", "intent": "List 5-8 descriptive keywords..." }
  ],
  "galleryCategory": "photography | art-illustration | design | commercial-product | character-design | unknown",
  "categoryConfidence": "high | medium | low",
  "antiTemplatingCommitment": {
    "blocksStartWith": "checklist",
    "blocksEndWith": "faq-accordion",
    "noConsecutiveRichText": true
  }
}

## ERROR FALLBACK
If unable to extract subject, return:
{ "error": true, "fallbackAnchor": "AI Image", "fallbackMicroFocus": "Creative Style" }`;
}

/**
 * Stage 2: Writer - 根据 Stage 1 策略生成内容 (V15.0 Master Edition)
 *
 * V15.0 新增:
 * - Voice Persona 系统支持 (Curator/Engineer/Director)
 * - GEO Snippet Formula 标准化
 * - Anti-Templating 强化规则
 */
function getDefaultStage2Prompt(): string {
  return `# V15.0 STAGE 2: THE WRITER (MASTER EDITION)

## OBJECTIVE
You are an Expert Technical Writer. Execute the Strategy Blueprint to generate final content.

## VOICE PERSONA SYSTEM
Adapt your writing style based on the \`suggestedVoice\` from the Blueprint:

### If Curator (Artistic Intent)
Write as an art gallery curator. Use evocative language, reference art movements, emphasize emotional impact.
- Opening: "The [Anchor] captures..."
- Analysis: "The interplay of [MicroFocus] creates..."
- Avoid: Technical jargon, bullet lists, imperative commands

### If Engineer (Functional Intent)
Write as a technical documentation author. Be precise, use numbered steps, include parameter references.
- Opening: "To achieve [Anchor], configure..."
- Analysis: "The [MicroFocus] setting controls..."
- Avoid: Subjective adjectives, emotional language

### If Director (Commercial Intent)
Write as a marketing creative director. Focus on use cases, brand mentions, call-to-action.
- Opening: "[Anchor] transforms your..."
- Analysis: "With [MicroFocus], you can..."
- Avoid: Technical details, lengthy explanations

**TONE by Model**:
- **Pro**: Professional, Technical, highlighting advanced features.
- **FLUX**: Photorealistic, focusing on lighting and texture.
- **Default**: Creative and balanced.

## INPUTS
- Strategy Blueprint: {{blueprint}}
- User Prompt: {{prompt}}

## VALIDATION & RECOVERY
- If \`plannedBlocks\` has < 4 items: Add 1 \`rich-text\` block about "Usage Tips".
- If \`plannedBlocks\` > 6 items: Merge similar blocks.

## SEO CONSTRAINTS (STRICT)

1. **Title Tag**: 50-60 characters MAX. Must include Anchor.
   - ✅ "[Anchor]: Master [MicroFocus] with AI"

2. **Meta Description**: 140-160 characters. Must include Anchor & CTA.

3. **Keywords**: EXACTLY 5-8 items.
   - MUST be **visible elements**. ⛔ NO abstract concepts ("Success", "Happiness").
   - Examples: Photo: "Bokeh", "85mm Lens"; UI: "Rounded Corners", "Dark Mode"; Anime: "Cel Shading".

4. **Brand Injection**:
   - Mention your brand naturally in the \`rich-text\` intro or \`faq\` (once per section max).

5. **Anti-Templating (MANDATORY)**:
   ⛔ BANNED PATTERNS:
   - Generic titles: "Introduction", "Conclusion", "Keywords", "FAQ", "Key Elements"
   - Opening phrases: "This stunning image...", "In this guide...", "Let's explore..."
   - Two consecutive \`rich-text\` blocks

   ✅ REQUIRED PATTERNS:
   - Titles MUST include Anchor or MicroFocus: "Deconstructing [Anchor]'s Visual Language"
   - Opening MUST be specific: "The [Anchor] achieves its [Effect] through..."

6. **Slug**: 3-5 words, kebab-case, no model name.

7. **Snippet Summary (V15.0 GEO Formula)**:
   Generate a 50-80 word summary for AI search engines using this formula:
   "To generate [Anchor] in [Style], the [Model] utilizes [Key Param from VISUAL CONTEXT].
   This technique achieves [Visual Effect] by [Technical Method from MicroFocus]."

   **Constraints**:
   - 50-80 words ONLY
   - MUST include: Anchor, Model Name, at least 2 parameters from VISUAL CONTEXT
   - MUST mention MicroFocus technique
   - NO marketing fluff ("stunning", "amazing", "beautiful")
   - MUST be factual and actionable

## OUTPUT FORMAT (Strict JSON)

⚠️ CRITICAL: The "data" field format must EXACTLY match these examples:

{
  "_reasoning": "Optional: explain creative decisions based on Voice Persona",
  "seoTitle": "string (Max 60 chars)",
  "h1Title": "string (Unique & Engaging)",
  "seoDescription": "string (140-160 chars)",
  "seoKeywords": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
  "imageAlt": "string (Natural description)",
  "slugKeywords": "string (kebab-case, 3-5 words)",
  "snippetSummary": "string (50-80 words, GEO formula)",
  "contentSections": [
    {
      "id": "block_1",
      "type": "rich-text",
      "title": "Descriptive H2 Title (must include Anchor or MicroFocus)",
      "headingLevel": "h2",
      "data": { "text": "Markdown paragraph content here. Must be in 'text' field." }
    },
    {
      "id": "block_2",
      "type": "checklist",
      "title": "[MicroFocus] Essentials",
      "headingLevel": "h3",
      "data": { "items": ["Item 1", "Item 2", "Item 3"] }
    },
    {
      "id": "block_3",
      "type": "tags",
      "title": "Visual Keywords",
      "headingLevel": "h3",
      "data": { "items": ["Keyword1", "Keyword2", "Keyword3"] }
    },
    {
      "id": "block_4",
      "type": "comparison-table",
      "title": "[Anchor] Style Comparison",
      "headingLevel": "h3",
      "data": {
        "left": "Option A",
        "right": "Option B",
        "rows": [
          { "pro": "Warm tones", "con": "Cool tones" },
          { "pro": "Soft lighting", "con": "Hard lighting" }
        ]
      }
    },
    {
      "id": "block_5",
      "type": "faq-accordion",
      "title": "Mastering [MicroFocus]: Common Questions",
      "headingLevel": "h3",
      "data": {
        "items": [
          { "q": "How to achieve this effect?", "a": "Use the AI generator with these settings..." },
          { "q": "What model works best?", "a": "For this style, we recommend..." }
        ]
      }
    }
  ]
}`;
}

/**
 * 获取默认的 SEO 生成 Prompt 模板 (Legacy - 不再使用)
 * Hardcoded for Edge Runtime compatibility - no file system access
 */
function getDefaultPromptTemplate(): string {
  // V14.0 Prompt Template - SEO Optimization with Micro-Focus & ContentSections
  return `# SEO Generation Prompt (V14.0 - Micro-Focus & Dynamic Sections)

## 🎯 CORE OBJECTIVE
Transform this AI image prompt into a high-ranking, differentiated Guide Page.
You MUST output strict JSON matching the schema below.

---

## PHASE 1: ANCHOR & MICRO-FOCUS EXTRACTION (CRITICAL!)

### Step 1.1: Extract ANCHOR (The Core Subject)
- Extract the single most specific SUBJECT from the User Prompt.
- MUST be 2-5 words describing the SPECIFIC SCENE, not a generic category.
- ⛔ BANNED: "Illustration", "Portrait", "Landscape", "3D Render", "Design", "Art"
- ✅ EXAMPLES: "Neon Rain Cyberpunk Warrior", "Inflatable Fluffy Logo", "Golden Hour Beach Portrait"

### Step 1.2: Extract MICRO-FOCUS (The Unique Angle) 
⚠️ THIS IS THE KEY TO AVOIDING SEO CANNIBALIZATION!
- Identify a unique "Micro-Angle" that differentiates THIS page from similar topics.
- The entire guide must lean into this Micro-Focus.
- EXAMPLES:
  * Anchor: "Cyberpunk Street" → Micro-Focus: "Neon Reflection Physics"
  * Anchor: "Noir Portrait" → Micro-Focus: "Shadow Gradient Mastery"
  * Anchor: "Watercolor Landscape" → Micro-Focus: "Wet-on-Wet Blending Technique"

### Step 1.3: Intent Classification
Classify the prompt's Visual Intent into ONE category:
- **ARTISTIC**: Photography, 3D Renders, Art, Character Design
- **FUNCTIONAL**: Slides, Posters, Infographics, UI Screens
- **COMMERCIAL**: Product shots, Marketing materials, Ads

---

## PHASE 2: CONTENT SECTION PLANNING

Based on Intent, select 3-5 Content Sections from these types:
- **rich-text**: Explanatory paragraph (use for intro/analysis)
- **faq-accordion**: Q&A format (use for common questions)
- **checklist**: Bullet points with checkmarks (use for requirements/elements)
- **comparison-table**: Pro/Con or A vs B format (use for technique comparisons)

⚠️ VISUAL VARIETY RULE:
- You MUST use at least 3 DIFFERENT types.
- NO "Wall of Text": Do NOT use 'rich-text' twice in a row.

---

## PHASE 3: CONTENT GENERATION RULES

### Negative Constraints (STRICTLY FORBIDDEN!)
⛔ NEVER use these generic words in titles:
- "Key Elements", "Use Cases", "Introduction", "Tips", "Conclusion", "Best Practices"

✅ USE semantic synonyms instead:
- Instead of "Key Elements" → "[Micro-Focus] Essentials", "Visual Components", "Core Anatomy"
- Instead of "Tips" → "Pro Techniques", "Mastery Notes", "[Subject] Secrets"
- Instead of "FAQ" → "Common Questions about [Micro-Focus]", "Troubleshooting [Subject]"

### Tone
Write like an expert art curator, not a robot. Be evocative and specific.

---

## PHASE 4: OUTPUT FORMAT (STRICT JSON)

Output a single valid JSON object with this structure:

\`\`\`json
{
  "detectedLanguage": "en",
  "category": "ARTISTIC | FUNCTIONAL | COMMERCIAL",
  "anchor": "2-5 word core subject",
  "microFocus": "unique angle for this page",
  
  "seoTitle": "[Anchor]: [Micro-Focus] Guide - {{model}} Prompt | Your Brand",
  "h1Title": "[Anchor]: Mastering [Micro-Focus]",
  "seoDescription": "Curator-like description mentioning {{model}} prompt and the Micro-Focus.",
  "seoKeywords": "comma-separated, 5-8 LSI keywords including Micro-Focus",
  "seoSlugKeywords": "kebab-case-slug-no-model-name",
  
  "contentIntro": "2-3 sentence intro that hooks the reader and mentions Micro-Focus.",
  "promptBreakdown": "One concise sentence listing core elements.",
  "imageAlt": "Natural description: [Anchor] + [Style].",
  
  "contentSections": [
    {
      "id": "sec_1",
      "type": "rich-text",
      "title": "[Evocative title mentioning Micro-Focus]",
      "headingLevel": "h2",
      "data": { "text": "Detailed explanatory content..." }
    },
    {
      "id": "sec_2", 
      "type": "checklist",
      "title": "[Micro-Focus] Essentials",
      "headingLevel": "h2",
      "data": { "items": ["Item 1", "Item 2", "Item 3"] }
    },
    {
      "id": "sec_3",
      "type": "faq-accordion",
      "title": "Mastering [Micro-Focus]: Common Questions",
      "headingLevel": "h2",
      "data": { 
        "items": [
          { "q": "Question about technique?", "a": "Detailed answer..." },
          { "q": "Question about settings?", "a": "Detailed answer..." },
          { "q": "Question about variations?", "a": "Detailed answer..." }
        ]
      }
    }
  ],
  
  "dynamicHeaders": {
    "about": "Narrative H2 (e.g., 'Capturing [Micro-Focus] Elegance')",
    "breakdown": "Technique-focused H2 (e.g., 'Deconstructing [Micro-Focus]')",
    "analysis": "Storytelling H2 (e.g., 'Reading the [Anchor] Narrative')",
    "faq": "Expertise-angle H2 (e.g., 'Expert Notes on [Micro-Focus]')"
  },
  
  "faqItems": [
    { "question": "Same as contentSections FAQ q", "answer": "Same as contentSections FAQ a" }
  ],
  
  "visualTags": ["Tag1", "Tag2", "Tag3"],
  "useCases": ["Use case 1", "Use case 2"],
  
  "expertCommentary": {
    "whyItWorks": "Technical analysis (2-3 sentences)",
    "optimizationTips": "Practical advice (2-3 sentences)",
    "modelAdvantage": "Why {{model}} excels (1-2 sentences)"
  },
  
  "remixIdeas": ["Change X to Y for Z effect", "..."],
  "relatedConcepts": ["Broad Concept 1", "Broad Concept 2"],
  
  "subject": "Same as anchor (for backward compatibility)"
}
\`\`\`

{{optimizationContext}}

# User Input:
Prompt: {{prompt}}
Model: {{model}}
Core Subject: {{subject}}`;
}
