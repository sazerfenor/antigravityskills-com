/**
 * Intent Analyzer API Baseline Test Runner
 *
 * 功能：
 * 1. 读取测试用例集 (intent-test-cases.json)
 * 2. 调用 /api/logic/intent API
 * 3. 验证响应是否符合预期
 * 4. 收集性能指标（响应时间、Token 消耗估算）
 * 5. 生成 baseline 报告
 *
 * 使用：pnpm tsx tests/prompts/run-baseline.ts
 */

import fs from 'fs';
import path from 'path';

// ===== 配置 =====
const API_ENDPOINT = 'http://localhost:3000/api/logic/intent';
const TEST_CASES_PATH = path.join(__dirname, 'test-cases/intent-test-cases.json');
const RESULTS_DIR = path.join(__dirname, 'results');
const BASELINE_REPORT = path.join(RESULTS_DIR, `baseline-${new Date().toISOString().slice(0, 10)}.json`);

// Admin Cookie for bypassing rate limits
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || 'better-auth.session_token=l1jt4w9tTnZ1nBj2uTYTwGUqrRwWNgca.DTT37M2E1187OQWu0Zf%2FyQ7RB2O96eTtaP3e4w4C2p4%3D';

// ===== 类型定义 =====
interface TestCase {
  id: string;
  name: string;
  category: string;
  input: {
    input: string;
    imageUrls?: string[];
  };
  expected: any;
  validation_rules: Record<string, boolean>;
  note?: string;
}

interface TestResult {
  test_id: string;
  test_name: string;
  category: string;
  status: 'pass' | 'fail' | 'error';
  response_time_ms: number;
  estimated_input_tokens: number;
  validation_results: Record<string, boolean>;
  errors?: string[];
  response_summary?: {
    primary_intent: any;
    content_category?: string;
    fields_count?: number;
    ambiguities_count?: number;
  };
}

interface BaselineReport {
  metadata: {
    test_date: string;
    total_cases: number;
    passed: number;
    failed: number;
    errors: number;
    success_rate: number;
  };
  performance: {
    average_response_time_ms: number;
    min_response_time_ms: number;
    max_response_time_ms: number;
    average_input_tokens: number;
  };
  test_results: TestResult[];
  category_breakdown: Record<string, { passed: number; failed: number; total: number }>;
}

// ===== 工具函数 =====

/** 估算 Token 数量（简化版，1 token ≈ 4 字符） */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** 调用 Intent API */
async function callIntentAPI(input: { input: string; imageUrls?: string[] }): Promise<{ data: any; time_ms: number }> {
  const start = Date.now();

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': ADMIN_COOKIE, // Add admin authentication to bypass rate limits
    },
    body: JSON.stringify(input),
  });

  const time_ms = Date.now() - start;

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return { data, time_ms };
}

/** 验证规则检查器 */
function validateResponse(response: any, expected: any, rules: Record<string, boolean>): { results: Record<string, boolean>; errors: string[] } {
  const results: Record<string, boolean> = {};
  const errors: string[] = [];

  // Rule: primary_intent_must_be_null
  if (rules.primary_intent_must_be_null) {
    results.primary_intent_must_be_null = response.primary_intent === null;
    if (!results.primary_intent_must_be_null) {
      errors.push(`Expected primary_intent=null, got ${JSON.stringify(response.primary_intent)}`);
    }
  }

  // Rule: primary_intent_not_null
  if (rules.primary_intent_not_null) {
    results.primary_intent_not_null = response.primary_intent !== null && response.primary_intent !== undefined;
    if (!results.primary_intent_not_null) {
      errors.push('Expected primary_intent to exist, got null/undefined');
    }
  }

  // Rule: phrase_includes_clay
  if (rules.phrase_includes_clay && response.primary_intent?.phrase) {
    const phrase = response.primary_intent.phrase.toLowerCase();
    results.phrase_includes_clay = phrase.includes('clay');
    if (!results.phrase_includes_clay) {
      errors.push(`Expected phrase to include "clay", got "${response.primary_intent.phrase}"`);
    }
  }

  // Rule: confidence_high
  if (rules.confidence_high && response.primary_intent?.confidence !== undefined) {
    results.confidence_high = response.primary_intent.confidence >= 0.8;
    if (!results.confidence_high) {
      errors.push(`Expected confidence >= 0.8, got ${response.primary_intent.confidence}`);
    }
  }

  // Rule: content_category_is_photography
  if (rules.content_category_is_photography) {
    results.content_category_is_photography = response.content_category === 'photography';
    if (!results.content_category_is_photography) {
      errors.push(`Expected content_category="photography", got "${response.content_category}"`);
    }
  }

  // Rule: context_not_empty
  if (rules.context_not_empty) {
    results.context_not_empty = response.context && response.context.trim().length > 0;
    if (!results.context_not_empty) {
      errors.push('Expected context to be non-empty');
    }
  }

  // Rule: fields_count_gte (至少 3 个字段)
  if (rules.fields_count_gte) {
    const fieldsCount = response.fields?.length || 0;
    results.fields_count_gte = fieldsCount >= 3;
    if (!results.fields_count_gte) {
      errors.push(`Expected fields.length >= 3, got ${fieldsCount}`);
    }
  }

  // Rule: ambiguities_detected (check for ambiguity_resolution fields)
  if (rules.ambiguities_detected) {
    const hasAmbiguityField = response.fields?.some((field: any) => field.source === 'ambiguity_resolution');
    results.ambiguities_detected = hasAmbiguityField;
    if (!results.ambiguities_detected) {
      errors.push('Expected at least one field with source="ambiguity_resolution"');
    }
  }

  return { results, errors };
}

/** 运行单个测试用例 */
async function runTestCase(testCase: TestCase): Promise<TestResult> {
  console.log(`\n📝 Running: ${testCase.name} (${testCase.id})`);

  try {
    const { data, time_ms } = await callIntentAPI(testCase.input);
    const estimated_tokens = estimateTokens(testCase.input.input);

    // Extract schema from response (data.data.schema for API, data.schema for mock)
    const schema = data.data?.schema || data.schema || data;

    // 验证响应（转换 camelCase 为 snake_case）
    const normalizedResponse = {
      primary_intent: schema.primaryIntent,
      content_category: schema.contentCategory,
      context: schema.context,
      fields: schema.fields,
      ambiguities: schema.ambiguities,
      creative_params: schema.creativeParams,
      internalSignals: schema.internalSignals,
      imageProcessingInstructions: schema.imageProcessingInstructions,
      styleHints: schema.styleHints,
    };

    const { results, errors } = validateResponse(normalizedResponse, testCase.expected, testCase.validation_rules);

    const all_passed = Object.values(results).every(v => v === true);
    const status = all_passed ? 'pass' : 'fail';

    if (status === 'fail') {
      console.log(`❌ FAILED: ${errors.join('; ')}`);
    } else {
      console.log(`✅ PASSED (${time_ms}ms)`);
    }

    return {
      test_id: testCase.id,
      test_name: testCase.name,
      category: testCase.category,
      status,
      response_time_ms: time_ms,
      estimated_input_tokens: estimated_tokens,
      validation_results: results,
      errors: errors.length > 0 ? errors : undefined,
      response_summary: {
        primary_intent: normalizedResponse.primary_intent,
        content_category: normalizedResponse.content_category,
        fields_count: normalizedResponse.fields?.length,
        ambiguities_count: normalizedResponse.ambiguities?.length,
      },
    };
  } catch (error: any) {
    console.log(`💥 ERROR: ${error.message}`);
    return {
      test_id: testCase.id,
      test_name: testCase.name,
      category: testCase.category,
      status: 'error',
      response_time_ms: 0,
      estimated_input_tokens: 0,
      validation_results: {},
      errors: [error.message],
    };
  }
}

/** 生成报告 */
function generateReport(results: TestResult[]): BaselineReport {
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;

  const response_times = results.filter(r => r.response_time_ms > 0).map(r => r.response_time_ms);
  const avg_time = response_times.reduce((a, b) => a + b, 0) / response_times.length;
  const min_time = Math.min(...response_times);
  const max_time = Math.max(...response_times);

  const avg_tokens = results.reduce((sum, r) => sum + r.estimated_input_tokens, 0) / results.length;

  // Category breakdown
  const category_breakdown: Record<string, { passed: number; failed: number; total: number }> = {};
  results.forEach(r => {
    if (!category_breakdown[r.category]) {
      category_breakdown[r.category] = { passed: 0, failed: 0, total: 0 };
    }
    category_breakdown[r.category].total++;
    if (r.status === 'pass') category_breakdown[r.category].passed++;
    if (r.status === 'fail') category_breakdown[r.category].failed++;
  });

  return {
    metadata: {
      test_date: new Date().toISOString(),
      total_cases: total,
      passed,
      failed,
      errors,
      success_rate: Math.round((passed / total) * 100),
    },
    performance: {
      average_response_time_ms: Math.round(avg_time),
      min_response_time_ms: min_time,
      max_response_time_ms: max_time,
      average_input_tokens: Math.round(avg_tokens),
    },
    test_results: results,
    category_breakdown,
  };
}

/** 主函数 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Intent Analyzer Baseline Test Runner');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. 读取测试用例
  const testData = JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf-8'));
  const testCases: TestCase[] = testData.test_cases;

  console.log(`📋 Loaded ${testCases.length} test cases from ${TEST_CASES_PATH}`);
  console.log(`🎯 API Endpoint: ${API_ENDPOINT}\n`);

  // 2. 运行所有测试
  const results: TestResult[] = [];
  for (const testCase of testCases) {
    const result = await runTestCase(testCase);
    results.push(result);

    // 避免 API 限流，每个测试后等待 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 3. 生成报告
  const report = generateReport(results);

  // 4. 保存报告
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  fs.writeFileSync(BASELINE_REPORT, JSON.stringify(report, null, 2));

  // 5. 打印总结
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 BASELINE REPORT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Passed: ${report.metadata.passed}/${report.metadata.total_cases}`);
  console.log(`❌ Failed: ${report.metadata.failed}/${report.metadata.total_cases}`);
  console.log(`💥 Errors: ${report.metadata.errors}/${report.metadata.total_cases}`);
  console.log(`📈 Success Rate: ${report.metadata.success_rate}%\n`);

  console.log('⚡ Performance:');
  console.log(`   Average Response Time: ${report.performance.average_response_time_ms}ms`);
  console.log(`   Min: ${report.performance.min_response_time_ms}ms | Max: ${report.performance.max_response_time_ms}ms`);
  console.log(`   Average Input Tokens: ${report.performance.average_input_tokens}\n`);

  console.log('📂 Category Breakdown:');
  Object.entries(report.category_breakdown).forEach(([category, stats]) => {
    console.log(`   ${category}: ${stats.passed}/${stats.total} passed (${Math.round((stats.passed / stats.total) * 100)}%)`);
  });

  console.log(`\n💾 Full report saved to: ${BASELINE_REPORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 6. Exit code
  process.exit(report.metadata.failed + report.metadata.errors > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
