import fs from 'fs';
import path from 'path';
import { analyzeIntent } from '../../../../src/shared/services/intent-analyzer';
import { compilePLO } from '../../../../src/shared/services/compiler';
import type { PLO } from '../../../../src/shared/schemas/plo-schema';
import type { DynamicSchemaField } from '../../../../src/shared/services/intent-analyzer';

/**
 * 简化的 A/B 测试运行器
 * 用 baseline 和 optimized 两个版本分别运行 3 个测试用例
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

interface TestResult {
  testCaseId: string;
  testCaseName: string;
  version: 'baseline' | 'optimized';
  timestamp: string;
  stages: {
    stage1_intent: {
      success: boolean;
      data?: any;
      error?: string;
      duration: number;
    };
    stage2_field: {
      success: boolean;
      data?: any;
      error?: string;
      duration: number;
    };
    stage3_compiler: {
      success: boolean;
      data?: any;
      error?: string;
      duration: number;
    };
  };
  finalOutput?: {
    nativePrompt: string;
    englishPrompt: string;
  };
}

// ===== 加载 Prompt 文件 =====

function loadPrompts(version: 'baseline' | 'optimized'): {
  intentAnalyzer: string;
  fieldGenerator: string;
  compiler: string;
} {
  const versionDir = path.join(__dirname, '../prompts', version);

  const intentAnalyzer = fs.readFileSync(path.join(versionDir, 'intent-analyzer.txt'), 'utf-8');
  const fieldGenerator = fs.readFileSync(path.join(versionDir, 'field-generator.txt'), 'utf-8');
  const compiler = fs.readFileSync(path.join(versionDir, 'compiler.txt'), 'utf-8');

  return { intentAnalyzer, fieldGenerator, compiler };
}

// ===== 运行单个测试用例 =====

async function runTestCase(
  testCase: TestCase,
  version: 'baseline' | 'optimized'
): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 测试: ${testCase.name} [${version.toUpperCase()}]`);
  console.log(`${'='.repeat(60)}`);

  const result: TestResult = {
    testCaseId: testCase.id,
    testCaseName: testCase.name,
    version,
    timestamp: new Date().toISOString(),
    stages: {
      stage1_intent: { success: false, duration: 0 },
      stage2_field: { success: false, duration: 0 },
      stage3_compiler: { success: false, duration: 0 },
    },
  };

  // 🧪 加载并注入对应版本的 Prompts
  const prompts = loadPrompts(version);
  const testPromptOverride = JSON.stringify({
    intentAnalyzer: prompts.intentAnalyzer,
    fieldGenerator: prompts.fieldGenerator,
    compiler: prompts.compiler,
  });

  process.env.TEST_PROMPT_OVERRIDE = testPromptOverride;

  try {
    // Stage 1: Intent Analyzer
    console.log('\n📍 阶段一: Intent Analyzer');
    console.log(`   输入: "${testCase.input.userInput.substring(0, 50)}..."`);

    const startTime1 = Date.now();

    // Fetch images from URLs
    let multimodalImages: any[] | undefined = undefined;
    if (testCase.input.images.length > 0) {
      console.log(`   🖼️ 正在获取 ${testCase.input.images.length} 张图片...`);
      const imagePromises = testCase.input.images.map(async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          return { mimeType: contentType, data: base64 };
        } catch {
          return null;
        }
      });
      const fetchedImages = await Promise.all(imagePromises);
      multimodalImages = fetchedImages.filter((img) => img !== null);
      console.log(`   ✅ 成功获取 ${multimodalImages.length} 张图片`);
    }

    const intentResult = await analyzeIntent(testCase.input.userInput, multimodalImages);
    const duration1 = Date.now() - startTime1;

    if (!intentResult) {
      result.stages.stage1_intent.error = 'Intent Analyzer returned null';
      console.log(`   ❌ 失败: Intent Analyzer returned null`);
      return result;
    }

    result.stages.stage1_intent = {
      success: true,
      data: intentResult,
      duration: duration1,
    };

    console.log(`   ✅ 完成 (${duration1}ms)`);
    console.log(`   Primary Intent: ${intentResult.primaryIntent?.phrase || '无'}`);
    console.log(`   字段数量: ${intentResult.fields?.length || 0}`);

    // Stage 2: Build PLO
    console.log('\n📍 阶段二: 构建 PLO');

    const startTime2 = Date.now();
    const schema = result.stages.stage1_intent.data;

    // 提取 subject
    const subjectField = schema.fields?.find(
      (f: DynamicSchemaField) => f.id === 'subject' || f.id === 'subject_identity'
    );
    const subject = subjectField?.defaultValue || testCase.input.userInput.split(' ').slice(0, 3).join(' ');

    // 将 fields 转换为 narrative_params
    const narrative_params: Record<string, { value: string; strength: number }> = {};
    if (schema.fields) {
      schema.fields.forEach((field: DynamicSchemaField) => {
        if (field.id !== 'subject' && field.id !== 'subject_identity') {
          let value = '';
          if (field.type === 'select') {
            value = field.defaultValue || field.options?.[0];
          } else if (field.type === 'slider') {
            value = String(field.defaultValue || field.min || 0.5);
          } else if (field.type === 'text') {
            value = field.defaultValue || '';
          }
          if (value) {
            narrative_params[field.id] = { value, strength: 0.7 };
          }
        }
      });
    }

    const plo: PLO = {
      core: { subject, action: '' },
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
      duration: Date.now() - startTime2,
    };

    console.log(`   ✅ PLO 构建完成`);
    console.log(`   Subject: "${plo.core.subject}"`);
    console.log(`   Narrative Params: ${Object.keys(plo.narrative_params || {}).length} 个`);

    // Stage 3: Compiler
    console.log('\n📍 阶段三: Compiler');

    const startTime3 = Date.now();
    const compiledResult = await compilePLO(plo);
    const duration3 = Date.now() - startTime3;

    result.stages.stage3_compiler = {
      success: true,
      data: compiledResult,
      duration: duration3,
    };

    result.finalOutput = {
      nativePrompt: compiledResult.native || '',
      englishPrompt: compiledResult.english || '',
    };

    console.log(`   ✅ 完成 (${duration3}ms)`);
    console.log(`\n   📝 最终生成的 Prompt:`);
    console.log(`   ${compiledResult.native?.substring(0, 150)}...`);

    return result;
  } catch (error: any) {
    console.log(`   ❌ 失败: ${error.message}`);
    return result;
  } finally {
    delete process.env.TEST_PROMPT_OVERRIDE;
  }
}

// ===== 主流程 =====

async function main() {
  console.log('🚀 开始 A/B 对比测试...\n');

  // 读取测试用例
  const testCasesPath = path.join(__dirname, '../config/extracted-test-cases.json');
  const testCasesRaw = await fs.promises.readFile(testCasesPath, 'utf-8');
  const testCasesData = JSON.parse(testCasesRaw);

  const testCases: TestCase[] = [
    testCasesData.case1,
    testCasesData.case2,
    testCasesData.case3,
  ];

  const allResults: TestResult[] = [];

  // 运行 baseline 版本
  console.log('\n🔵 Running BASELINE tests...\n');
  for (const testCase of testCases) {
    const result = await runTestCase(testCase, 'baseline');
    allResults.push(result);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 避免限流
  }

  // 运行 optimized 版本
  console.log('\n\n🟢 Running OPTIMIZED tests...\n');
  for (const testCase of testCases) {
    const result = await runTestCase(testCase, 'optimized');
    allResults.push(result);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // 保存结果
  const outputDir = path.join(__dirname, '../results');
  await fs.promises.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(outputDir, `ab-test-${timestamp}.json`);

  await fs.promises.writeFile(outputPath, JSON.stringify(allResults, null, 2), 'utf-8');

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 测试总结');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const baselineResults = allResults.filter((r) => r.version === 'baseline');
  const optimizedResults = allResults.filter((r) => r.version === 'optimized');

  console.log(`\n✅ Baseline: ${baselineResults.filter((r) => r.finalOutput).length}/${baselineResults.length} 成功`);
  console.log(`✅ Optimized: ${optimizedResults.filter((r) => r.finalOutput).length}/${optimizedResults.length} 成功`);

  console.log(`\n💾 结果已保存到: ${outputPath}`);
  console.log('\n✨ A/B 测试完成！');
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
