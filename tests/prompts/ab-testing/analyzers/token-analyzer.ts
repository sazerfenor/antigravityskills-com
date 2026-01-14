/**
 * Token Analyzer - Token 消耗统计器
 *
 * 统计 API 调用的 Token 使用量，计算节省率和成本预估
 */

// ===== 类型定义 =====

export interface TokenMetrics {
  test_id: string;
  layer: 'intent-analyzer' | 'field-generator' | 'compiler' | 'seo' | 'total';
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
}

export interface TokenComparisonResult {
  test_id: string;
  baseline: TokenMetrics;
  optimized: TokenMetrics;
  reduction: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    percentage: number;
  };
  cost_savings_usd: number;
}

// ===== Gemini Token 定价 =====
// 来源: https://ai.google.dev/pricing (2026-01-13)
const GEMINI_PRICING = {
  'gemini-3-flash': {
    input_per_million: 0.075,   // $0.075 per 1M input tokens
    output_per_million: 0.30,   // $0.30 per 1M output tokens
  },
  'gemini-3-pro': {
    input_per_million: 1.25,    // $1.25 per 1M input tokens
    output_per_million: 5.00,   // $5.00 per 1M output tokens
  },
};

// ===== 核心函数 =====

/**
 * 计算 Token 成本
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: keyof typeof GEMINI_PRICING = 'gemini-3-flash'
): number {
  const pricing = GEMINI_PRICING[model];

  const inputCost = (inputTokens / 1_000_000) * pricing.input_per_million;
  const outputCost = (outputTokens / 1_000_000) * pricing.output_per_million;

  return inputCost + outputCost;
}

/**
 * 从 API 响应中提取 Token 使用量
 *
 * 注意：Gemini API 可能在 usageMetadata 中返回 token 信息
 */
export function extractTokensFromResponse(response: any): { input: number; output: number } {
  // Gemini API 响应格式
  if (response.usageMetadata) {
    return {
      input: response.usageMetadata.promptTokenCount || 0,
      output: response.usageMetadata.candidatesTokenCount || 0,
    };
  }

  // 备用：如果没有 usageMetadata，返回估算值
  return {
    input: 0,
    output: 0,
  };
}

/**
 * 估算 Prompt 的 Token 数量
 * 简单估算：1 token ≈ 4 字符（英文）
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * 创建 Token 指标
 */
export function createTokenMetrics(
  testId: string,
  layer: TokenMetrics['layer'],
  inputTokens: number,
  outputTokens: number,
  model: keyof typeof GEMINI_PRICING = 'gemini-3-flash'
): TokenMetrics {
  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens, model);

  return {
    test_id: testId,
    layer,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: parseFloat(estimatedCost.toFixed(6)),
  };
}

/**
 * 对比两个版本的 Token 使用量
 */
export function compareTokenUsage(
  baseline: TokenMetrics,
  optimized: TokenMetrics
): TokenComparisonResult {
  if (baseline.test_id !== optimized.test_id) {
    throw new Error(`Test ID 不匹配: ${baseline.test_id} vs ${optimized.test_id}`);
  }

  const inputReduction = baseline.input_tokens - optimized.input_tokens;
  const outputReduction = baseline.output_tokens - optimized.output_tokens;
  const totalReduction = baseline.total_tokens - optimized.total_tokens;
  const percentage = baseline.total_tokens > 0
    ? (totalReduction / baseline.total_tokens) * 100
    : 0;

  const costSavings = baseline.estimated_cost_usd - optimized.estimated_cost_usd;

  return {
    test_id: baseline.test_id,
    baseline,
    optimized,
    reduction: {
      input_tokens: inputReduction,
      output_tokens: outputReduction,
      total_tokens: totalReduction,
      percentage: parseFloat(percentage.toFixed(2)),
    },
    cost_savings_usd: parseFloat(costSavings.toFixed(6)),
  };
}

/**
 * 批量对比 Token 使用量
 */
export function batchCompareTokens(
  baselineMetrics: TokenMetrics[],
  optimizedMetrics: TokenMetrics[]
): TokenComparisonResult[] {
  if (baselineMetrics.length !== optimizedMetrics.length) {
    throw new Error('Baseline 和 Optimized 结果数量不匹配');
  }

  return baselineMetrics.map((baseline, i) =>
    compareTokenUsage(baseline, optimizedMetrics[i])
  );
}

/**
 * 生成 Token 对比摘要
 */
export function generateTokenSummary(comparisons: TokenComparisonResult[]) {
  const totalTests = comparisons.length;

  // 总计
  const totalBaselineTokens = comparisons.reduce((sum, c) => sum + c.baseline.total_tokens, 0);
  const totalOptimizedTokens = comparisons.reduce((sum, c) => sum + c.optimized.total_tokens, 0);
  const totalReduction = totalBaselineTokens - totalOptimizedTokens;
  const totalPercentage = totalBaselineTokens > 0
    ? (totalReduction / totalBaselineTokens) * 100
    : 0;

  const totalCostSavings = comparisons.reduce((sum, c) => sum + c.cost_savings_usd, 0);

  // 平均值
  const avgBaselineTokens = totalBaselineTokens / totalTests;
  const avgOptimizedTokens = totalOptimizedTokens / totalTests;
  const avgReduction = totalReduction / totalTests;

  return {
    total_tests: totalTests,
    totals: {
      baseline_tokens: totalBaselineTokens,
      optimized_tokens: totalOptimizedTokens,
      reduction_tokens: totalReduction,
      reduction_percentage: parseFloat(totalPercentage.toFixed(2)),
      cost_savings_usd: parseFloat(totalCostSavings.toFixed(6)),
    },
    averages: {
      baseline_tokens: parseFloat(avgBaselineTokens.toFixed(0)),
      optimized_tokens: parseFloat(avgOptimizedTokens.toFixed(0)),
      reduction_tokens: parseFloat(avgReduction.toFixed(0)),
    },
    target_achieved: totalPercentage >= 20, // 目标：节省 ≥ 20%
  };
}
