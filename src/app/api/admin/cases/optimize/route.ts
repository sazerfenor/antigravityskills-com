import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

/**
 * POST /api/admin/cases/optimize
 * 使用 cases-optimization-combined.txt 优化 prompt
 */
// Template variable interface (from v3)
interface TemplateVariable {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'image_upload';
  default_value: string;
  placeholder?: string;
  description?: string;
  original_text: string;
}

interface TemplateData {
  enabled: boolean;
  filled_prompt: string;
  template_prompt: string;
  variables: TemplateVariable[];
}

export async function POST(request: Request) {
  try {
    // 验证 Admin 权限
    const user = await getUserInfo();
    if (!user) {
      throw new Error('unauthorized');
    }

    const body = await request.json() as {
      userPrompt: string;
      referenceCaseId: string;
      referenceCaseTitle: string;
      referenceCaseSubject?: string;
      referenceCaseStyle?: string;
      referenceCaseTechnique?: string;
      userLanguage?: string;
      templateData?: TemplateData;  // 新增：模板数据
    };

    const {
      userPrompt,
      referenceCaseId,
      referenceCaseTitle,
      referenceCaseSubject,
      referenceCaseStyle,
      referenceCaseTechnique,
      userLanguage = 'zh',
      templateData,  // 新增
    } = body;

    if (!userPrompt || !referenceCaseId || !referenceCaseTitle) {
      throw new Error('Missing required fields: userPrompt, referenceCaseId, referenceCaseTitle');
    }

    console.log('[Cases Optimize] Starting optimization for:', referenceCaseId);
    if (templateData?.enabled) {
      console.log('[Cases Optimize] Template detected with', templateData.variables.length, 'variables');
    }

    // 调用优化核心函数
    const result = await optimizeCasePrompt({
      userPrompt,
      referenceCaseId,
      referenceCaseTitle,
      referenceCaseSubject,
      referenceCaseStyle,
      referenceCaseTechnique,
      userLanguage,
      templateData,  // 新增
    });

    console.log('[Cases Optimize] ✅ Optimization complete');

    return respData(result);
  } catch (error: any) {
    console.error('[Cases Optimize] Error:', error);
    return respErr(error.message);
  }
}

/**
 * 核心优化函数（可复用）
 */
export async function optimizeCasePrompt(options: {
  userPrompt: string;
  referenceCaseId: string;
  referenceCaseTitle: string;
  referenceCaseSubject?: string;
  referenceCaseStyle?: string;
  referenceCaseTechnique?: string;
  userLanguage?: string;
  templateData?: TemplateData;  // 新增：模板数据
}) {
  const {
    userPrompt,
    referenceCaseId,
    referenceCaseTitle,
    referenceCaseSubject = '',
    referenceCaseStyle = '',
    referenceCaseTechnique = '',
    userLanguage = 'zh',
    templateData,  // 新增
  } = options;

  // 决定优化哪个版本（v3 策略）
  const promptToOptimize = templateData?.enabled 
    ? templateData.filled_prompt  // 优化填充版本（质量更好）
    : userPrompt;

  // 1. 从配置读取 AI 参数
  const { getConfigsByKeys } = await import('@/shared/models/config');
  const configs = await getConfigsByKeys([
    'cases_optimization_prompt',
    'cases_optimization_model',
    'cases_optimization_temperature',
    'cases_optimization_max_tokens',
  ]);

  const promptTemplate = configs.cases_optimization_prompt || getDefaultPromptTemplate();
  const aiModel = configs.cases_optimization_model || 'gemini-2.0-flash-exp';
  const temperature = parseFloat(configs.cases_optimization_temperature || '0.3'); // ✅ 降低 temperature 提高精确度
  const maxTokens = parseInt(configs.cases_optimization_max_tokens || '4096');

  // 2. 替换模板变量（使用正确的 prompt 版本）
  const aiPrompt = promptTemplate
    .replace(/\{\{user_language\}\}/g, userLanguage)
    .replace(/\{\{reference_case_id\}\}/g, referenceCaseId)
    .replace(/\{\{reference_case_title\}\}/g, referenceCaseTitle)
    .replace(/\{\{reference_case_prompt\}\}/g, promptToOptimize)  // ✅ 使用 filled_prompt 或 userPrompt
    .replace(/\{\{reference_case_subject\}\}/g, referenceCaseSubject)
    .replace(/\{\{reference_case_style\}\}/g, referenceCaseStyle)
    .replace(/\{\{reference_case_technique\}\}/g, referenceCaseTechnique);

  // 3. 输入验证（防止幻觉）
  if (!userPrompt || userPrompt.trim().length < 10) {
    throw new Error('Input prompt is too short (minimum 10 characters)');
  }

  // 检测乱码输入
  const gibberishPattern = /^[a-z]{1,5}[0-9]*$/i; // 匹配 "asdf", "xyz123" 等
  if (gibberishPattern.test(userPrompt.trim())) {
    throw new Error('Input prompt appears to be gibberish');
  }

  // 4. 调用 Gemini API（使用标准 Provider 接口）
  const { getAIService } = await import('@/shared/services/ai');
  const aiService = await getAIService();
  const geminiProvider = aiService.getProvider('gemini');

  if (!geminiProvider) {
    throw new Error('Gemini provider not configured');
  }

  if (!geminiProvider.chat) {
    throw new Error('Gemini provider does not support chat method');
  }

  console.log('[Cases Optimize] Calling Gemini API via provider.chat():', aiModel);
  console.log('[Cases Optimize] AI Prompt (first 1000 chars):', aiPrompt.substring(0, 1000));
  console.log('[Cases Optimize] User Prompt:', userPrompt.substring(0, 200));

  let parsed: any;
  let lastError: Error | null = null;

  // 重试机制：最多尝试 2 次
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // ✅ 使用标准 chat() 方法
      const aiText = await geminiProvider.chat({
        model: aiModel,
        prompt: aiPrompt,
        temperature,
        maxTokens: maxTokens,
        jsonMode: true, // 使用 JSON 模式
      });

      if (!aiText) {
        throw new Error('No response from Gemini');
      }

      console.log(`[Cases Optimize] AI response received (attempt ${attempt}), parsing JSON...`);

      // 移除可能的 markdown code blocks
      const cleanedText = aiText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      parsed = JSON.parse(cleanedText);

      // ✅ 检查是否是错误响应
      if (parsed.error) {
        throw new Error(`AI returned error: ${parsed.error} - ${parsed.message}`);
      }

      // ✅ 验证必要字段存在且有效
      if (!parsed.optimizedPrompt) {
        console.error('[Cases Optimize] ❌ optimizedPrompt is missing or null:', JSON.stringify(parsed, null, 2).substring(0, 500));
        throw new Error(`AI response missing optimizedPrompt. Got: ${typeof parsed.optimizedPrompt}`);
      }
      
      if (typeof parsed.optimizedPrompt !== 'string') {
        throw new Error(`optimizedPrompt is not a string, got: ${typeof parsed.optimizedPrompt}`);
      }
      
      if (parsed.optimizedPrompt.length < 50) {
        throw new Error(`optimizedPrompt too short: ${parsed.optimizedPrompt.length} chars. Content: "${parsed.optimizedPrompt.substring(0, 100)}"`);
      }
      
      if (!parsed.structuredExtraction) {
        console.warn('[Cases Optimize] ⚠️ structuredExtraction missing, continuing with empty object');
        parsed.structuredExtraction = {};
      }

      // ✅ 成功，跳出重试循环
      console.log('[Cases Optimize] ✅ Successfully parsed AI response');
      break;

    } catch (error) {
      lastError = error as Error;
      console.error(`[Cases Optimize] Attempt ${attempt} failed:`, error);

      if (attempt < 2) {
        console.log('[Cases Optimize] Retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // 如果两次都失败
  if (!parsed) {
    console.error('[Cases Optimize] All retry attempts failed');
    throw new Error(`Optimization failed after 2 attempts: ${lastError?.message}`);
  }

  // 5. 处理模板版本（v3 策略）
  let templateVersion: any = undefined;
  
  if (templateData?.enabled) {
    console.log('[Cases Optimize] Generating template version via reverse replacement...');
    
    // 反向替换：将优化后的 filled prompt 中的具体值替换回 {{变量}}
    const optimizedTemplate = reverseReplacePlaceholders(
      parsed.optimizedPrompt,
      templateData.variables
    );
    
    templateVersion = {
      enabled: true,
      optimizedFilled: parsed.optimizedPrompt,  // 优化后的填充版本
      optimizedTemplate: optimizedTemplate,      // 优化后的模板版本
      variables: templateData.variables,
      original_template: templateData.template_prompt
    };
    
    console.log('[Cases Optimize] ✅ Template version generated');
  }

  // 6. 返回结构化结果
  const result = {
    optimizedPrompt: parsed.optimizedPrompt,
    tipsCompliance: parsed.tipsCompliance || {},
    enhancementLogic: parsed.enhancementLogic || '',
    missingInOriginal: parsed.missingInOriginal || [],
    addedFromTips: parsed.addedFromTips || [],
    referenceCaseUsed: parsed.referenceCaseUsed || {},
    modelAdvantage: parsed.modelAdvantage || '',
    suggestedModifiers: parsed.suggestedModifiers || [],
    structuredExtraction: parsed.structuredExtraction || {},
    templateVersion,  // 新增：模板版本（如果适用）
  };

  // ✅ 日志：记录优化统计
  console.log('[Cases Optimize] Optimization stats:', {
    promptLength: result.optimizedPrompt?.length,
    missingCount: result.missingInOriginal?.length,
    addedCount: result.addedFromTips?.length,
    hasModelAdvantage: !!result.modelAdvantage,
    hasTemplate: !!templateVersion,
  });

  return result;
}

/**
 * 反向替换函数：将填充后的 prompt 转换为模板版本
 * 策略：按长度降序替换，避免部分匹配问题
 */
function reverseReplacePlaceholders(
  filledText: string,
  variables: TemplateVariable[]
): string {
  // ✅ 空值保护 - 暴露错误而非静默失败
  if (!filledText) {
    throw new Error('reverseReplacePlaceholders: filledText is null or undefined');
  }
  
  if (!variables || !Array.isArray(variables)) {
    throw new Error('reverseReplacePlaceholders: variables is not a valid array');
  }
  
  let templateText = filledText;
  
  // 过滤并排序变量（按 default_value 长度降序，避免部分匹配）
  const sortedVars = [...variables]
    .filter(v => v && v.default_value && typeof v.default_value === 'string' && v.default_value.length > 0)
    .sort((a, b) => b.default_value.length - a.default_value.length);
  
  for (const variable of sortedVars) {
    // 转义特殊字符
    const escapedValue = variable.default_value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedValue, 'g');
    
    // 替换为 {{variable_id}}
    templateText = templateText.replace(regex, `{{${variable.id}}}`);
  }
  
  return templateText;
}

/**
 * 获取默认 prompt 模板（从文件读取）
 */
function getDefaultPromptTemplate(): string {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const promptPath = path.join(process.cwd(), 'src/prompts/cases-optimization-combined.txt');
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.error('[Cases Optimize] Failed to read prompt file:', error);
    throw new Error('Prompt template file not found');
  }
}
