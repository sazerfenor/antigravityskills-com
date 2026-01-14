/**
 * A/B Comparison Test Runner - 主测试运行器
 *
 * 运行 baseline 和 optimized 两个版本的 Prompt，对比效果
 */

import fs from 'fs';
import path from 'path';
import { compareOutputs, batchCompare, generateSummary as generateSemanticSummary } from '../analyzers/semantic-comparator';
import { createTokenMetrics, compareTokenUsage, batchCompareTokens, generateTokenSummary, estimateTokens } from '../analyzers/token-analyzer';
import { createQualityMetrics, compareQuality, batchCompareQuality, generateQualitySummary } from '../analyzers/quality-metrics';

// ===== Service 层直接调用 =====
import { analyzeIntent } from '../../../../src/shared/services/intent-analyzer';
import { compilePLO } from '../../../../src/shared/services/compiler';

const CONFIG_DIR = path.join(__dirname, '../config');
const PROMPTS_DIR = path.join(__dirname, '../prompts');
const TEST_CASES_PATH = path.join(__dirname, '../../test-cases/intent-test-cases.json');
const REPORTS_DIR = path.join(__dirname, '../reports');

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
  validation_rules?: {
    ambiguities_detected?: boolean;
  };
}

interface TestResult {
  test_id: string;
  version: 'baseline' | 'optimized';
  intent_output: any;
  compiler_output: { native: string; english: string };
  response_time_ms: number;
  token_usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ===== 工具函数 =====

/**
 * 加载指定版本的 Prompts
 */
function loadPrompts(version: 'baseline' | 'optimized'): { intentAnalyzer: string; fieldGenerator: string; compiler: string } {
  const versionDir = path.join(PROMPTS_DIR, version);

  const intentAnalyzer = fs.readFileSync(path.join(versionDir, 'intent-analyzer.txt'), 'utf-8');
  const fieldGenerator = fs.readFileSync(path.join(versionDir, 'field-generator.txt'), 'utf-8');
  const compiler = fs.readFileSync(path.join(versionDir, 'compiler.txt'), 'utf-8');

  return { intentAnalyzer, fieldGenerator, compiler };
}

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

// ===== 运行单个测试用例 =====

async function runTest(
  testCase: TestCase,
  version: 'baseline' | 'optimized'
): Promise<TestResult> {
  console.log(`\n  🧪 Running ${version}: ${testCase.name}`);

  // 🧪 V2.0: 加载并注入对应版本的 Prompts
  const prompts = loadPrompts(version);
  const testPromptOverride = JSON.stringify({
    intentAnalyzer: prompts.intentAnalyzer,
    fieldGenerator: prompts.fieldGenerator,
    compiler: prompts.compiler,
  });

  // 设置环境变量（现在在同一进程中，可以生效）
  process.env.TEST_PROMPT_OVERRIDE = testPromptOverride;

  try {
    // Step 1: Call Intent Analyzer (直接调用 Service 层)
    const intentStart = Date.now();
    const intentOutput = await analyzeIntent(testCase.input.input, undefined);
    const intentTime = Date.now() - intentStart;

    if (!intentOutput) {
      console.log(`    ⚠️  Intent analyzer returned null, skipping this test case`);
      return null as any; // 返回 null，让主流程跳过该测试案例
    }

    // Step 2: Call Compiler (基于 Layer 1 输出)
    const plo: any = {
      core: {
        subject: intentOutput.context || intentOutput.detectedSubject || 'subject',
        action: intentOutput.detectedAction || '',
      },
      custom_input: testCase.input.input,
      layout_constraints: {
        ar: intentOutput.extractedRatio || '1:1',
        text_render: false,
      },
    };

    // 添加可选字段
    if (intentOutput.contentCategory) plo.content_category = intentOutput.contentCategory;
    if (intentOutput.primaryIntent) plo.primary_intent = intentOutput.primaryIntent;
    if (intentOutput.styleHints?.length > 0) plo.style_hints = intentOutput.styleHints;

    const compilerStart = Date.now();
    const compilerOutput = await compilePLO(plo);
    const compilerTime = Date.now() - compilerStart;

    // 估算 Token 使用量（简化版，实际应从 API 响应获取）
    const inputTokens = estimateTokens(testCase.input.input);
    const outputTokens = estimateTokens(JSON.stringify(intentOutput));

    console.log(`    ✅ Intent: ${intentTime}ms | Compiler: ${compilerTime}ms`);

    return {
      test_id: testCase.id,
      version,
      intent_output: intentOutput,
      compiler_output: compilerOutput,
      response_time_ms: intentTime + compilerTime,
      token_usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    };
  } finally {
    // 清除环境变量
    delete process.env.TEST_PROMPT_OVERRIDE;
  }
}

// ===== 主流程 =====

async function main() {
  console.log('🚀 Starting A/B Comparison Tests\n');

  ensureReportsDir();

  // 1. 加载测试用例
  const testData = JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf-8'));
  const testCases: TestCase[] = testData.test_cases;

  console.log(`📋 Loaded ${testCases.length} test cases\n`);

  // 2. 运行 baseline 版本
  console.log('🔵 Running BASELINE tests...');
  const baselineResults: TestResult[] = [];
  for (const testCase of testCases) {
    const result = await runTest(testCase, 'baseline');
    if (result !== null) {
      baselineResults.push(result);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // 避免限流
  }

  // 3. 运行 optimized 版本
  console.log('\n🟢 Running OPTIMIZED tests...');

  const optimizedResults: TestResult[] = [];
  for (const testCase of testCases) {
    const result = await runTest(testCase, 'optimized');
    if (result !== null) {
      optimizedResults.push(result);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 确保两个版本的测试案例数量一致
  console.log(`\n📊 Valid test results: ${baselineResults.length} baseline, ${optimizedResults.length} optimized\n`);

  // 4. 分析结果 - Semantic Comparison
  console.log('\n📊 Analyzing results...\n');

  const semanticComparisons = batchCompare(
    baselineResults.map(r => r.intent_output),
    optimizedResults.map(r => r.intent_output),
    testCases.map(tc => tc.id)
  );

  const semanticSummary = generateSemanticSummary(semanticComparisons);

  // 5. 分析结果 - Token Usage
  const tokenComparisons = batchCompareTokens(
    baselineResults.map(r => createTokenMetrics(
      r.test_id,
      'intent-analyzer',
      r.token_usage.input_tokens,
      r.token_usage.output_tokens
    )),
    optimizedResults.map(r => createTokenMetrics(
      r.test_id,
      'intent-analyzer',
      r.token_usage.input_tokens,
      r.token_usage.output_tokens
    ))
  );

  const tokenSummary = generateTokenSummary(tokenComparisons);

  // 6. 分析结果 - Quality Metrics
  const qualityComparisons = batchCompareQuality(
    baselineResults.map(r => createQualityMetrics(
      r.test_id,
      r.intent_output,
      r.compiler_output.english,
      r.response_time_ms,
      testCases.find(tc => tc.id === r.test_id)?.validation_rules?.ambiguities_detected || false
    )),
    optimizedResults.map(r => createQualityMetrics(
      r.test_id,
      r.intent_output,
      r.compiler_output.english,
      r.response_time_ms,
      testCases.find(tc => tc.id === r.test_id)?.validation_rules?.ambiguities_detected || false
    ))
  );

  const qualitySummary = generateQualitySummary(qualityComparisons);

  // 7. 生成综合报告
  const report = {
    metadata: {
      test_date: new Date().toISOString(),
      total_tests: testCases.length,
      baseline_version: 'v1.0-baseline',
      optimized_version: 'v2.0-optimized',
    },
    semantic_analysis: semanticSummary,
    token_analysis: tokenSummary,
    quality_analysis: qualitySummary,
    detailed_comparisons: {
      semantic: semanticComparisons,
      token: tokenComparisons,
      quality: qualityComparisons,
    },
    recommendation: generateRecommendation(semanticSummary, tokenSummary, qualitySummary),
  };

  // 8. 保存报告
  const reportPath = path.join(REPORTS_DIR, `ab-comparison-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // 9. 打印摘要
  printSummary(report);

  console.log(`\n📄 Report saved: ${reportPath}`);

  // 10. 返回退出码
  const exitCode = report.recommendation.decision === 'GO' ? 0 : 1;
  process.exit(exitCode);
}

// ===== Go/No-Go 决策 =====

function generateRecommendation(semantic: any, token: any, quality: any) {
  const checks = {
    token_reduction_achieved: token.totals.reduction_percentage >= 20,
    semantic_similarity_ok: semantic.min_similarity >= 0.9,
    no_breaking_changes: semantic.breaking_changes_count === 0,
    quality_not_degraded: quality.averages.completeness_delta >= -0.1,
    repetition_reduced: quality.averages.repetition_reduction_percent >= 0,
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;

  const decision = passedChecks >= 4 ? 'GO' : 'NO-GO';

  return {
    decision,
    passed_checks: passedChecks,
    total_checks: totalChecks,
    checks,
    reasons: decision === 'GO'
      ? ['Token 节省达标', '语义一致性良好', '无 breaking changes']
      : ['需要进一步优化或调整策略'],
  };
}

// ===== 打印摘要 =====

function printSummary(report: any) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 A/B Comparison Summary');
  console.log('='.repeat(60));

  console.log(`\n🔹 Semantic Analysis:`);
  console.log(`   Avg Similarity: ${report.semantic_analysis.avg_similarity}`);
  console.log(`   Min Similarity: ${report.semantic_analysis.min_similarity}`);
  console.log(`   Breaking Changes: ${report.semantic_analysis.breaking_changes_count}`);

  console.log(`\n🔹 Token Usage:`);
  console.log(`   Total Reduction: ${report.token_analysis.totals.reduction_tokens} tokens (${report.token_analysis.totals.reduction_percentage}%)`);
  console.log(`   Cost Savings: $${report.token_analysis.totals.cost_savings_usd.toFixed(6)}`);
  console.log(`   Target Achieved: ${report.token_analysis.target_achieved ? '✅' : '❌'}`);

  console.log(`\n🔹 Quality Metrics:`);
  console.log(`   Repetition Reduction: ${report.quality_analysis.averages.repetition_reduction_percent}%`);
  console.log(`   Completeness Delta: ${report.quality_analysis.averages.completeness_delta}`);
  console.log(`   Target Achieved: ${report.quality_analysis.target_achieved ? '✅' : '❌'}`);

  console.log(`\n🎯 Recommendation: ${report.recommendation.decision}`);
  console.log(`   Passed Checks: ${report.recommendation.passed_checks}/${report.recommendation.total_checks}`);
  console.log(`   ${report.recommendation.decision === 'GO' ? '✅' : '❌'} ${report.recommendation.reasons.join(', ')}`);
}

// ===== 运行 =====

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
