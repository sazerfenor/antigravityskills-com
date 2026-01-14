import { analyzeIntent } from '@/shared/services/intent-analyzer';
import { compilePLO } from '@/shared/services/compiler';
import type { PLO } from '@/shared/schemas/plo-schema';
import type { DynamicSchemaField } from '@/shared/services/intent-analyzer';
import fs from 'fs/promises';
import path from 'path';

/**
 * 完整链路测试脚本
 * 流程：输入 → Intent Analyzer → Field Generator → Compiler → 保存结果
 */

interface TestCase {
  id: string;
  name: string;
  description: string;
  input: {
    userInput: string;
    images: string[];
  };
  actualImageContent?: string;
  expectedBehavior: {
    stage1: string;
    stage2: string;
    stage3: string;
  };
}

interface StageResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

interface TestResult {
  testCaseId: string;
  testCaseName: string;
  timestamp: string;
  stages: {
    stage1_intent: StageResult;
    stage2_field: StageResult;
    stage3_compiler: StageResult;
    stage4_seo: StageResult;
  };
  finalOutput?: {
    nativePrompt: string;
    englishPrompt: string;
    seoMetadata?: any;
  };
}

async function runTestCase(testCase: TestCase): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 测试用例: ${testCase.name}`);
  console.log(`   ID: ${testCase.id}`);
  console.log(`   描述: ${testCase.description}`);
  console.log(`${'='.repeat(60)}`);

  const result: TestResult = {
    testCaseId: testCase.id,
    testCaseName: testCase.name,
    timestamp: new Date().toISOString(),
    stages: {
      stage1_intent: { success: false, duration: 0 },
      stage2_field: { success: false, duration: 0 },
      stage3_compiler: { success: false, duration: 0 },
    },
  };

  // Stage 1: Intent Analyzer
  console.log('\n📍 阶段一: Intent Analyzer');
  console.log(`   输入: "${testCase.input.userInput}"`);
  if (testCase.input.images.length > 0) {
    console.log(`   图片: ${testCase.input.images.length} 张`);
    console.log(`   实际图片内容: ${testCase.actualImageContent || '未提供'}`);
  }
  console.log(`   预期行为: ${testCase.expectedBehavior.stage1}`);

  try {
    const startTime = Date.now();

    // Fetch images from URLs and convert to MultimodalImage format
    let multimodalImages: any[] | undefined = undefined;
    if (testCase.input.images.length > 0) {
      console.log(`   🖼️ 正在获取 ${testCase.input.images.length} 张图片...`);
      const imagePromises = testCase.input.images.map(async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`   ⚠️ 无法获取图片: ${url}`);
            return null;
          }
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          return {
            mimeType: contentType,
            data: base64,
          };
        } catch (err) {
          console.warn(`   ⚠️ 图片获取失败: ${url}`, err);
          return null;
        }
      });
      const fetchedImages = await Promise.all(imagePromises);
      multimodalImages = fetchedImages.filter((img) => img !== null);
      console.log(`   ✅ 成功获取 ${multimodalImages.length} 张图片`);
    }

    const intentResult = await analyzeIntent(testCase.input.userInput, multimodalImages);
    const duration = Date.now() - startTime;

    result.stages.stage1_intent = {
      success: true,
      data: intentResult,
      duration,
    };

    console.log(`   ✅ 完成 (${duration}ms)`);
    console.log(`   Primary Intent: ${intentResult.primaryIntent?.phrase || '无'}`);
    console.log(`   Content Category: ${intentResult.contentCategory}`);
    console.log(`   字段数量: ${intentResult.fields?.length || 0}`);
    if (intentResult.fields && intentResult.fields.length > 0) {
      const fieldIds = intentResult.fields.map((f: DynamicSchemaField) => f.id).slice(0, 5);
      console.log(`   字段示例: ${fieldIds.join(', ')}${intentResult.fields.length > 5 ? '...' : ''}`);
    }
    // Check for ambiguity detection
    const hasAmbiguity = intentResult.fields?.some((f: DynamicSchemaField) => f.id === 'subject_identity');
    if (hasAmbiguity) {
      console.log(`   ⚠️  检测到冲突，生成了 subject_identity 字段`);
    }
  } catch (error: any) {
    const duration = Date.now() - Date.now();
    result.stages.stage1_intent.error = error.message;
    console.log(`   ❌ 失败: ${error.message}`);
    return result;
  }

  // Stage 2: Build PLO & Compile
  console.log('\n📍 阶段二: 构建 PLO 并编译');
  console.log(`   预期行为: ${testCase.expectedBehavior.stage2}`);

  try {
    const startTime = Date.now();
    const schema = result.stages.stage1_intent.data;

    // 将 DynamicSchema 转换为 PLO
    // 从 fields 中提取 subject
    const subjectField = schema.fields?.find((f: DynamicSchemaField) => f.id === 'subject' || f.id === 'subject_identity');
    // 修复：不再截断，使用完整的 userInput 作为 fallback
    const subject = subjectField?.options?.[0]?.value || testCase.input.userInput;

    // 将其他 fields 转换为 narrative_params
    const narrative_params: Record<string, { value: string; strength: number }> = {};
    if (schema.fields) {
      schema.fields.forEach((field: DynamicSchemaField) => {
        if (field.id !== 'subject' && field.id !== 'subject_identity') {
          const value = field.type === 'select'
            ? field.options?.[0]?.value
            : field.type === 'slider'
            ? String(field.defaultValue ?? field.min ?? 0.5)
            : field.type === 'text'
            ? field.defaultValue
            : '';
          if (value) {
            narrative_params[field.id] = {
              value,
              strength: 0.7,
            };
          }
        }
      });
    }

    const plo: PLO = {
      core: {
        subject,
        action: '',
      },
      narrative_params,
      content_category: schema.contentCategory,
      style_hints: schema.styleHints,
      primary_intent: schema.primaryIntent,
      image_descriptions: schema.imageDescriptions,
      internal_signals: schema.internalSignals,
      image_processing_instructions: schema.imageProcessingInstructions,
    };

    result.stages.stage2_field = {
      success: true,
      data: plo,
      duration: Date.now() - startTime,
    };

    console.log(`   ✅ PLO 构建完成`);
    console.log(`   Subject: "${plo.core.subject}"`);
    console.log(`   Narrative Params: ${Object.keys(plo.narrative_params || {}).length} 个`);
  } catch (error: any) {
    result.stages.stage2_field = {
      success: false,
      error: error.message,
      duration: 0,
    };
    console.log(`   ❌ 失败: ${error.message}`);
    return result;
  }

  // Stage 3: Compiler
  console.log('\n📍 阶段三: Compiler');
  console.log(`   预期行为: ${testCase.expectedBehavior.stage3}`);

  try {
    const startTime = Date.now();
    const plo = result.stages.stage2_field.data as PLO;

    const compiledResult = await compilePLO(plo);
    const duration = Date.now() - startTime;

    result.stages.stage3_compiler = {
      success: true,
      data: compiledResult,
      duration,
    };

    result.finalOutput = {
      nativePrompt: compiledResult.native || '',
      englishPrompt: compiledResult.english || '',
    };

    console.log(`   ✅ 完成 (${duration}ms)`);
    console.log(`\n   📝 最终生成的 Prompt (Native):`);
    console.log(`   ${compiledResult.native?.substring(0, 200)}${compiledResult.native && compiledResult.native.length > 200 ? '...' : ''}`);
    console.log(`\n   📝 最终生成的 Prompt (English):`);
    console.log(`   ${compiledResult.english?.substring(0, 200)}${compiledResult.english && compiledResult.english.length > 200 ? '...' : ''}`);
  } catch (error: any) {
    result.stages.stage3_compiler = {
      success: false,
      error: error.message,
      duration: 0,
    };
    console.log(`   ❌ 失败: ${error.message}`);
    return result;
  }

  // Stage 4: SEO Generation
  console.log('\n📍 阶段四: SEO Generation');
  console.log(`   预期行为: 生成 SEO metadata (title/description/tags)，围绕关键词且关联生成图片`);

  try {
    const startTime = Date.now();
    const compiledResult = result.stages.stage3_compiler.data;
    const schema = result.stages.stage1_intent.data;
    const plo = result.stages.stage2_field.data as PLO;

    // 构建 formValues（从 Stage 1 的 fields）
    const formValues: Record<string, any> = {};
    if (schema.fields && Array.isArray(schema.fields)) {
      schema.fields.forEach((field: DynamicSchemaField) => {
        if (field.defaultValue !== undefined && field.defaultValue !== null) {
          formValues[field.id] = field.defaultValue;
        }
      });
    }

    console.log(`   构建 formValues: ${Object.keys(formValues).length} 个字段`);

    // 准备 SEO 生成所需的数据
    const formValuesData = Object.keys(formValues).length > 0 ? {
      formValues,
      schema: { fields: schema.fields }
    } : null;

    const groundTruth = schema.contentCategory ? {
      category: schema.contentCategory,
      subcategory: schema.primaryIntent?.phrase || 'general',
      visualTags: schema.styleHints || []
    } : undefined;

    // 直接调用 SEO 生成的核心逻辑（复制自 route.ts）
    const { getAIService } = await import('@/shared/services/ai');
    const aiService = await getAIService();
    const geminiProvider = aiService.getProvider('gemini');

    if (!geminiProvider || !geminiProvider.chat) {
      throw new Error('Gemini provider not configured');
    }

    // 构建 effectivePrompt（注入 VISUAL CONTEXT）
    let effectivePrompt = compiledResult.english || compiledResult.native;

    // 序列化 formValues 为 VISUAL CONTEXT
    if (formValuesData?.formValues) {
      const visualContextLines: string[] = [];
      Object.entries(formValuesData.formValues).forEach(([key, value]) => {
        const field = schema.fields?.find((f: DynamicSchemaField) => f.id === key);
        const label = field?.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const formattedValue = typeof value === 'number' && value >= 0 && value <= 1
          ? `${(value * 100).toFixed(0)}%`
          : String(value);
        if (value !== null && value !== undefined && value !== '') {
          visualContextLines.push(`- ${label}: ${formattedValue}`);
        }
      });

      if (visualContextLines.length > 0) {
        const visualContext = `## VISUAL CONTEXT (GROUND TRUTH)\nThe user explicitly configured the following parameters in Vision Logic Playground.\nThese are FACTS, not inferences. Prioritize these over any interpretation from the prompt text.\n\n${visualContextLines.join('\n')}`;
        effectivePrompt = `${visualContext}\n\n---\n\n## USER PROMPT\n${effectivePrompt}`;
        console.log(`   注入 VISUAL CONTEXT: ${visualContextLines.length} 个参数`);
      }
    }

    // 调用 Gemini API 生成 SEO metadata (简化版 - 只生成核心字段)
    const seoPrompt = `You are an SEO expert. Analyze this AI image generation prompt and generate SEO metadata.

User Prompt:
${effectivePrompt}

Output JSON with:
{
  "seoTitle": "60 chars max, include main subject",
  "h1Title": "Engaging title",
  "seoDescription": "160 chars max",
  "seoKeywords": ["keyword1", "keyword2", ...],
  "anchor": "2-5 word core subject",
  "microFocus": "unique angle",
  "galleryCategory": "photography | art-illustration | design | commercial-product | character-design"
}`;

    const seoResponse = await geminiProvider.chat({
      model: 'gemini-3-flash-preview',
      prompt: seoPrompt,
      temperature: 0.7,
      maxTokens: 1024,
      jsonMode: true,
    });

    const seoMetadata = JSON.parse(seoResponse);

    const duration = Date.now() - startTime;

    result.stages.stage4_seo = {
      success: true,
      data: seoMetadata,
      duration,
    };

    if (result.finalOutput) {
      result.finalOutput.seoMetadata = seoMetadata;
    }

    console.log(`   ✅ 完成 (${duration}ms)`);
    console.log(`   SEO Title: ${seoMetadata.seoTitle}`);
    console.log(`   Anchor: ${seoMetadata.anchor}`);
    console.log(`   MicroFocus: ${seoMetadata.microFocus}`);
  } catch (error: any) {
    result.stages.stage4_seo = {
      success: false,
      error: error.message,
      duration: 0,
    };
    console.log(`   ❌ 失败: ${error.message}`);
    // SEO 失败不中断测试，继续返回结果
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ 测试用例 ${testCase.name} 完成`);
  console.log(`${'='.repeat(60)}`);

  return result;
}

async function main() {
  console.log('🚀 开始完整链路测试...\n');

  // 读取测试用例
  const testCasesPath = path.join(process.cwd(), 'tests/prompts/ab-testing/config/extracted-test-cases.json');
  const testCasesRaw = await fs.readFile(testCasesPath, 'utf-8');
  const testCases = JSON.parse(testCasesRaw);

  const results: TestResult[] = [];

  // 运行用例 1: 超短内容
  console.log('\n🎯 用例 1: 超短内容');
  const result1 = await runTestCase(testCases.case1);
  results.push(result1);

  // 运行用例 2: 超长 Prompt
  console.log('\n🎯 用例 2: 超长 Prompt');
  const result2 = await runTestCase(testCases.case2);
  results.push(result2);

  // 运行用例 3: 带图片（冲突检测）
  console.log('\n🎯 用例 3: 带图片（冲突检测）');
  const result3 = await runTestCase(testCases.case3);
  results.push(result3);

  // 保存结果
  const outputDir = path.join(process.cwd(), 'tests/prompts/ab-testing/results');
  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(outputDir, `pipeline-test-${timestamp}.json`);

  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 测试总结');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n测试用例总数: ${results.length}`);

  results.forEach((result, index) => {
    const allSuccess =
      result.stages.stage1_intent.success &&
      result.stages.stage2_field.success &&
      result.stages.stage3_compiler.success;
    const status = allSuccess ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.testCaseName}`);
    if (!allSuccess) {
      if (!result.stages.stage1_intent.success) {
        console.log(`   阶段一失败: ${result.stages.stage1_intent.error}`);
      }
      if (!result.stages.stage2_field.success) {
        console.log(`   阶段二失败: ${result.stages.stage2_field.error}`);
      }
      if (!result.stages.stage3_compiler.success) {
        console.log(`   阶段三失败: ${result.stages.stage3_compiler.error}`);
      }
    }
  });

  console.log(`\n💾 结果已保存到: ${outputPath}`);
  console.log('\n✨ 完整链路测试完成！');
}

// 执行脚本
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
