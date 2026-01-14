/**
 * Pipeline 端到端测试
 *
 * 测试完整的三层链路：
 * Layer 1 (Intent) → Layer 2 (Compiler) → Layer 3 (SEO)
 *
 * 每一层使用前一层的实际输出作为输入，确保链路连贯性
 */

import fs from 'fs';
import path from 'path';

// ===== 配置 =====
const BASE_URL = 'http://localhost:3000';
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || 'better-auth.session_token=l1jt4w9tTnZ1nBj2uTYTwGUqrRwWNgca.DTT37M2E1187OQWu0Zf%2FyQ7RB2O96eTtaP3e4w4C2p4%3D';
const RESULTS_DIR = path.join(__dirname, 'results');
const PIPELINE_REPORT = path.join(RESULTS_DIR, `pipeline-${new Date().toISOString().slice(0, 10)}.json`);

// ===== 类型定义 =====
interface PipelineTestCase {
  id: string;
  name: string;
  category: string;
  input: {
    input: string;
    imageUrls?: string[];
  };
}

interface Layer1Output {
  test_id: string;
  input: any;
  output: {
    schema: any;
    response_time_ms: number;
  };
}

interface Layer2Output {
  test_id: string;
  input: any; // PLO
  output: {
    native: string;
    english: string;
    highlights: any;
    detectedLang: string;
    response_time_ms: number;
  };
}

interface Layer3Output {
  test_id: string;
  input: any;
  output: {
    seoTitle: string;
    h1Title: string;
    seoDescription: string;
    contentSections: any[];
    response_time_ms: number;
    [key: string]: any;
  };
}

interface PipelineResult {
  test_id: string;
  test_name: string;
  category: string;
  layer1: Layer1Output;
  layer2: Layer2Output;
  layer3: Layer3Output;
  total_time_ms: number;
  status: 'success' | 'failed';
  error?: string;
}

// ===== 工具函数 =====
function ensureResultsDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

async function callAPI(endpoint: string, method: string, body: any): Promise<{ data: any; time_ms: number }> {
  const start = Date.now();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': ADMIN_COOKIE,
    },
    body: JSON.stringify(body),
  });

  const time_ms = Date.now() - start;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  return { data, time_ms };
}

// ===== Layer 1: Intent Analyzer =====
async function runLayer1(testCase: PipelineTestCase): Promise<Layer1Output> {
  console.log(`\n📝 Layer 1 (Intent Analyzer): ${testCase.name}`);

  const { data, time_ms } = await callAPI('/api/logic/intent', 'POST', testCase.input);

  // Extract schema from nested response
  const schema = data.data?.schema || data.schema || data;

  console.log(`  ✅ Completed in ${time_ms}ms`);
  console.log(`  → Primary Intent: ${schema.primaryIntent?.phrase || 'null'}`);
  console.log(`  → Fields: ${schema.fields?.length || 0}`);

  return {
    test_id: testCase.id,
    input: testCase.input,
    output: {
      schema,
      response_time_ms: time_ms,
    },
  };
}

// ===== Layer 2: Compiler =====
async function runLayer2(layer1Output: Layer1Output): Promise<Layer2Output> {
  console.log(`\n📝 Layer 2 (Compiler): Compiling PLO → Prompt`);

  const schema = layer1Output.output.schema;

  // 构造 PLO (Prompt Logic Object) - 基于 Layer 1 的输出
  const plo: any = {
    core: {
      subject: schema.context || schema.detectedSubject || 'subject',
      action: schema.detectedAction || '',
    },
    narrative_params: {}, // 从 formValues 构造（如果有用户填写表单）
    layout_constraints: {
      ar: schema.extractedRatio || '1:1',
      text_render: false,
    },
    custom_input: layer1Output.input.input,
  };

  // Optional fields - 只在有值时添加
  if (schema.preservedDetails && schema.preservedDetails.length > 0) {
    plo.preserved_details = schema.preservedDetails;
  }
  if (schema.technicalConstraints && Object.keys(schema.technicalConstraints).length > 0) {
    plo.technical_constraints = schema.technicalConstraints;
  }
  if (schema.contentCategory) {
    plo.content_category = schema.contentCategory;
  }
  if (schema.styleHints && schema.styleHints.length > 0) {
    plo.style_hints = schema.styleHints;
  }
  if (schema.imageDescriptions && schema.imageDescriptions.length > 0) {
    plo.image_descriptions = schema.imageDescriptions;
  }
  if (schema.internalSignals && Object.keys(schema.internalSignals).length > 0) {
    plo.internal_signals = schema.internalSignals;
  }
  if (schema.imageProcessingInstructions && schema.imageProcessingInstructions.length > 0) {
    plo.image_processing_instructions = schema.imageProcessingInstructions;
  }
  if (schema.primaryIntent) {
    plo.primary_intent = schema.primaryIntent;
  }
  // 注意：reference_intent 不要单独传递，它在 internal_signals.referenceIntent 中

  const { data, time_ms } = await callAPI('/api/logic/compile', 'POST', { plo });

  // Extract from nested response
  const result = data.data || data;

  console.log(`  ✅ Completed in ${time_ms}ms`);
  console.log(`  → Native length: ${result.native?.length || 0} chars`);
  console.log(`  → English length: ${result.english?.length || 0} chars`);
  console.log(`  → Detected lang: ${result.detectedLang || 'unknown'}`);

  return {
    test_id: layer1Output.test_id,
    input: plo,
    output: {
      native: result.native,
      english: result.english,
      highlights: result.highlights,
      detectedLang: result.detectedLang,
      response_time_ms: time_ms,
    },
  };
}

// ===== Layer 3: SEO Generator =====
async function runLayer3(layer1Output: Layer1Output, layer2Output: Layer2Output): Promise<Layer3Output> {
  console.log(`\n📝 Layer 3 (SEO Generator): Generating SEO metadata`);

  const schema = layer1Output.output.schema;

  // 构造 SEO 输入 - 基于 Layer 1 + Layer 2 的输出
  const seoInput = {
    postId: `test-${layer1Output.test_id}`,
    prompt: layer2Output.output.english || 'test prompt', // 使用编译后的英文 Prompt
    model: 'gemini-3-pro-image-preview',
    imageUrl: 'https://media.nanobananaultra.com/ai/image/reference/253e6c75f16470e71077ea5943a47883.webp', // 测试用真实图片
    subject: schema.context || schema.detectedSubject || 'test subject',
    // groundTruth: undefined, // 手动测试不传 groundTruth
  };

  const { data, time_ms } = await callAPI('/api/admin/seo/generate-all', 'POST', seoInput);

  // Extract from nested response
  const result = data.data || data;

  console.log(`  ✅ Completed in ${time_ms}ms`);
  console.log(`  → SEO Title: ${result.seoTitle || 'N/A'}`);
  console.log(`  → H1 Title: ${result.h1Title || 'N/A'}`);
  console.log(`  → Content Sections: ${result.contentSections?.length || 0}`);

  return {
    test_id: layer1Output.test_id,
    input: seoInput,
    output: {
      ...result,
      response_time_ms: time_ms,
    },
  };
}

// ===== 运行单个 Pipeline 测试 =====
async function runPipelineTest(testCase: PipelineTestCase): Promise<PipelineResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Pipeline Test: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);

  const pipelineStart = Date.now();

  try {
    // Step 1: Layer 1 (Intent Analyzer)
    const layer1 = await runLayer1(testCase);

    // Step 2: Layer 2 (Compiler) - 使用 Layer 1 的输出
    const layer2 = await runLayer2(layer1);

    // Step 3: Layer 3 (SEO Generator) - 使用 Layer 1 + Layer 2 的输出
    const layer3 = await runLayer3(layer1, layer2);

    const total_time_ms = Date.now() - pipelineStart;

    console.log(`\n✅ Pipeline completed in ${total_time_ms}ms`);

    return {
      test_id: testCase.id,
      test_name: testCase.name,
      category: testCase.category,
      layer1,
      layer2,
      layer3,
      total_time_ms,
      status: 'success',
    };
  } catch (error: any) {
    const total_time_ms = Date.now() - pipelineStart;

    console.log(`\n❌ Pipeline failed: ${error.message}`);

    return {
      test_id: testCase.id,
      test_name: testCase.name,
      category: testCase.category,
      layer1: null as any,
      layer2: null as any,
      layer3: null as any,
      total_time_ms,
      status: 'failed',
      error: error.message,
    };
  }
}

// ===== 主流程 =====
async function main() {
  console.log('🚀 Starting Pipeline End-to-End Tests\n');

  ensureResultsDir();

  // 从 Layer 1 的测试用例中选取代表性用例
  const testCasesPath = path.join(__dirname, 'test-cases/intent-test-cases.json');
  const testData = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));

  // 选择 3 个代表性测试用例：edge case, normal, complex
  const selectedTestCases: PipelineTestCase[] = [
    testData.test_cases.find((tc: any) => tc.id === 'edge_no_primary_intent'),
    testData.test_cases.find((tc: any) => tc.id === 'normal_photography'),
    testData.test_cases.find((tc: any) => tc.id === 'complex_3d_clay'),
  ].filter(Boolean);

  console.log(`📋 Selected ${selectedTestCases.length} test cases for pipeline testing\n`);

  const results: PipelineResult[] = [];

  for (const testCase of selectedTestCases) {
    const result = await runPipelineTest(testCase);
    results.push(result);

    // 等待 1 秒避免 API 限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // ===== 生成报告 =====
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      total_tests: results.length,
      success: successCount,
      failed: failedCount,
      success_rate: `${((successCount / results.length) * 100).toFixed(1)}%`,
    },
    performance: {
      avg_layer1_ms: results.filter(r => r.layer1).reduce((sum, r) => sum + r.layer1.output.response_time_ms, 0) / successCount,
      avg_layer2_ms: results.filter(r => r.layer2).reduce((sum, r) => sum + r.layer2.output.response_time_ms, 0) / successCount,
      avg_layer3_ms: results.filter(r => r.layer3).reduce((sum, r) => sum + r.layer3.output.response_time_ms, 0) / successCount,
      avg_total_ms: results.reduce((sum, r) => sum + r.total_time_ms, 0) / results.length,
    },
    results,
  };

  fs.writeFileSync(PIPELINE_REPORT, JSON.stringify(report, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Pipeline Test Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`Success Rate: ${report.metadata.success_rate}`);
  console.log(`\nPerformance:`);
  console.log(`  Layer 1 avg: ${report.performance.avg_layer1_ms.toFixed(0)}ms`);
  console.log(`  Layer 2 avg: ${report.performance.avg_layer2_ms.toFixed(0)}ms`);
  console.log(`  Layer 3 avg: ${report.performance.avg_layer3_ms.toFixed(0)}ms`);
  console.log(`  Total avg: ${report.performance.avg_total_ms.toFixed(0)}ms`);
  console.log(`\n📄 Report saved: ${PIPELINE_REPORT}`);

  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
