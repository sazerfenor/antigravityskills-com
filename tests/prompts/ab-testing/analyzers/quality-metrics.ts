/**
 * Quality Metrics - 质量指标分析器
 *
 * 评估生成的 Prompt 质量，检测重复关键词、字段完整性等
 */

// ===== 类型定义 =====

export interface QualityMetrics {
  test_id: string;
  keyword_repetition_rate: number;  // 关键词重复率（0-1）
  repeated_keywords: Array<{
    keyword: string;
    count: number;
  }>;
  fields_completeness: number;      // 字段完整度（0-1）
  ambiguity_trigger_rate: number;   // Ambiguity 触发准确率（应触发的比例）
  response_time_ms: number;
  prompt_length: number;            // 生成的 Prompt 长度
}

export interface QualityComparisonResult {
  test_id: string;
  baseline: QualityMetrics;
  optimized: QualityMetrics;
  improvements: {
    repetition_reduction: number;    // 重复率下降百分比
    completeness_delta: number;
    response_time_delta_ms: number;
    prompt_length_delta: number;
  };
}

// ===== 核心函数 =====

/**
 * 检测关键词重复
 *
 * 例如："3D clay style portrait with clay texture" → "clay" 出现 2 次
 */
export function detectKeywordRepetition(text: string): {
  repetition_rate: number;
  repeated_keywords: Array<{ keyword: string; count: number }>;
} {
  if (!text) {
    return { repetition_rate: 0, repeated_keywords: [] };
  }

  // 分词（简单实现：按空格分割，转小写，移除标点）
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3); // 只统计长度 > 3 的词

  // 统计词频
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }

  // 找出重复的词（出现 ≥ 2 次）
  const repeatedKeywords = Array.from(wordCount.entries())
    .filter(([_, count]) => count >= 2)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count); // 按出现次数降序

  // 计算重复率：重复词的总数 / 总词数
  const totalRepeated = repeatedKeywords.reduce((sum, item) => sum + item.count, 0);
  const repetitionRate = words.length > 0 ? totalRepeated / words.length : 0;

  return {
    repetition_rate: parseFloat(repetitionRate.toFixed(3)),
    repeated_keywords: repeatedKeywords.slice(0, 10), // 只返回前 10 个
  };
}

/**
 * 计算字段完整度
 *
 * 检查必要字段是否存在
 */
export function calculateFieldsCompleteness(output: any): number {
  const requiredFields = [
    'primaryIntent',
    'contentCategory',
    'fields',
    'context',
  ];

  const presentFields = requiredFields.filter(field => {
    const value = output[field];
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  });

  return presentFields.length / requiredFields.length;
}

/**
 * 检查 Ambiguity 触发是否准确
 *
 * 对于特定测试用例（如多模态冲突），应该触发 ambiguity
 */
export function checkAmbiguityAccuracy(output: any, shouldTrigger: boolean): number {
  const hasAmbiguity = output.fields?.some((f: any) => f.source === 'ambiguity_resolution') || false;

  // 如果应该触发且确实触发 → 1.0
  // 如果不应触发且没触发 → 1.0
  // 否则 → 0.0
  return (hasAmbiguity === shouldTrigger) ? 1.0 : 0.0;
}

/**
 * 创建质量指标
 */
export function createQualityMetrics(
  testId: string,
  output: any,
  compiledPrompt: string,
  responseTimeMs: number,
  shouldTriggerAmbiguity: boolean = false
): QualityMetrics {
  const { repetition_rate, repeated_keywords } = detectKeywordRepetition(compiledPrompt);
  const fieldsCompleteness = calculateFieldsCompleteness(output);
  const ambiguityTriggerRate = checkAmbiguityAccuracy(output, shouldTriggerAmbiguity);

  return {
    test_id: testId,
    keyword_repetition_rate: repetition_rate,
    repeated_keywords,
    fields_completeness: fieldsCompleteness,
    ambiguity_trigger_rate: ambiguityTriggerRate,
    response_time_ms: responseTimeMs,
    prompt_length: compiledPrompt.length,
  };
}

/**
 * 对比两个版本的质量指标
 */
export function compareQuality(
  baseline: QualityMetrics,
  optimized: QualityMetrics
): QualityComparisonResult {
  if (baseline.test_id !== optimized.test_id) {
    throw new Error(`Test ID 不匹配: ${baseline.test_id} vs ${optimized.test_id}`);
  }

  const repetitionReduction = baseline.keyword_repetition_rate > 0
    ? ((baseline.keyword_repetition_rate - optimized.keyword_repetition_rate) / baseline.keyword_repetition_rate) * 100
    : 0;

  const completenessDelta = optimized.fields_completeness - baseline.fields_completeness;
  const responseTimeDelta = optimized.response_time_ms - baseline.response_time_ms;
  const promptLengthDelta = optimized.prompt_length - baseline.prompt_length;

  return {
    test_id: baseline.test_id,
    baseline,
    optimized,
    improvements: {
      repetition_reduction: parseFloat(repetitionReduction.toFixed(2)),
      completeness_delta: parseFloat(completenessDelta.toFixed(3)),
      response_time_delta_ms: responseTimeDelta,
      prompt_length_delta: promptLengthDelta,
    },
  };
}

/**
 * 批量对比质量指标
 */
export function batchCompareQuality(
  baselineMetrics: QualityMetrics[],
  optimizedMetrics: QualityMetrics[]
): QualityComparisonResult[] {
  if (baselineMetrics.length !== optimizedMetrics.length) {
    throw new Error('Baseline 和 Optimized 结果数量不匹配');
  }

  return baselineMetrics.map((baseline, i) =>
    compareQuality(baseline, optimizedMetrics[i])
  );
}

/**
 * 生成质量对比摘要
 */
export function generateQualitySummary(comparisons: QualityComparisonResult[]) {
  const totalTests = comparisons.length;

  // 平均重复率下降
  const avgRepetitionReduction = comparisons.reduce(
    (sum, c) => sum + c.improvements.repetition_reduction, 0
  ) / totalTests;

  // 平均完整度变化
  const avgCompletenessDelta = comparisons.reduce(
    (sum, c) => sum + c.improvements.completeness_delta, 0
  ) / totalTests;

  // 平均响应时间变化
  const avgResponseTimeDelta = comparisons.reduce(
    (sum, c) => sum + c.improvements.response_time_delta_ms, 0
  ) / totalTests;

  // 平均 Prompt 长度变化
  const avgPromptLengthDelta = comparisons.reduce(
    (sum, c) => sum + c.improvements.prompt_length_delta, 0
  ) / totalTests;

  // 统计恶化的情况
  const worseRepetition = comparisons.filter(c => c.improvements.repetition_reduction < 0).length;
  const worseCompleteness = comparisons.filter(c => c.improvements.completeness_delta < 0).length;

  return {
    total_tests: totalTests,
    averages: {
      repetition_reduction_percent: parseFloat(avgRepetitionReduction.toFixed(2)),
      completeness_delta: parseFloat(avgCompletenessDelta.toFixed(3)),
      response_time_delta_ms: parseFloat(avgResponseTimeDelta.toFixed(0)),
      prompt_length_delta: parseFloat(avgPromptLengthDelta.toFixed(0)),
    },
    quality_degradation: {
      worse_repetition_count: worseRepetition,
      worse_completeness_count: worseCompleteness,
    },
    target_achieved: avgRepetitionReduction >= 50, // 目标：重复率下降 ≥ 50%
  };
}
