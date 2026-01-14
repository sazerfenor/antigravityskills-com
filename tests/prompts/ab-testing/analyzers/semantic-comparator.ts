/**
 * Semantic Comparator - 语义一致性检测器
 *
 * 对比优化前后的 Intent Analyzer 输出，确保语义等价
 */

// ===== 类型定义 =====

interface IntentAnalyzerOutput {
  primaryIntent: {
    phrase: string;
    category: string;
    confidence: number;
  } | null;
  contentCategory: string;
  fields?: Array<{
    id: string;
    label: string;
    type: string;
    [key: string]: any;
  }>;
  context?: string;
  detectedSubject?: string;
  creativeParams?: Record<string, any>;
  styleHints?: string[];
  explicitDetails?: string[];
  [key: string]: any;
}

export interface SemanticComparisonResult {
  test_id: string;
  similarity_score: number;        // 0-1 总体相似度
  primary_intent_match: boolean;
  content_category_match: boolean;
  fields_overlap: number;          // Jaccard 相似度
  missing_fields: string[];        // baseline 有但 optimized 没有的字段
  extra_fields: string[];          // optimized 有但 baseline 没有的字段
  is_breaking_change: boolean;     // similarity < 0.9
  details: {
    baseline_primary_intent: string | null;
    optimized_primary_intent: string | null;
    baseline_field_count: number;
    optimized_field_count: number;
    field_id_overlap: string[];
  };
}

// ===== 核心比较函数 =====

/**
 * 计算两个字符串的规范化相似度
 */
function normalizeAndCompare(str1: string | null | undefined, str2: string | null | undefined): boolean {
  if (!str1 && !str2) return true;  // 都为空 → 相同
  if (!str1 || !str2) return false; // 一个为空 → 不同

  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  return normalize(str1) === normalize(str2);
}

/**
 * 计算 Jaccard 相似度
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * 比较两个 Intent Analyzer 输出
 */
export function compareOutputs(
  baseline: IntentAnalyzerOutput,
  optimized: IntentAnalyzerOutput,
  testId: string
): SemanticComparisonResult {
  // 1. 比较 Primary Intent
  let primaryIntentMatch = false;
  const baselineIntent = baseline.primaryIntent?.phrase || null;
  const optimizedIntent = optimized.primaryIntent?.phrase || null;

  if (baselineIntent === null && optimizedIntent === null) {
    primaryIntentMatch = true; // 都没有 primary intent
  } else if (baselineIntent && optimizedIntent) {
    primaryIntentMatch = normalizeAndCompare(baselineIntent, optimizedIntent);
  }

  // 2. 比较 Content Category
  const contentCategoryMatch = baseline.contentCategory === optimized.contentCategory;

  // 3. 比较 Fields（通过 field ID）
  const baselineFieldIds = new Set(
    (baseline.fields || []).map(f => f.id)
  );
  const optimizedFieldIds = new Set(
    (optimized.fields || []).map(f => f.id)
  );

  const fieldsOverlap = jaccardSimilarity(baselineFieldIds, optimizedFieldIds);

  const missingFields = [...baselineFieldIds].filter(id => !optimizedFieldIds.has(id));
  const extraFields = [...optimizedFieldIds].filter(id => !baselineFieldIds.has(id));
  const fieldIdOverlap = [...baselineFieldIds].filter(id => optimizedFieldIds.has(id));

  // 4. 计算总体相似度
  const weights = {
    primaryIntent: 0.4,      // Primary Intent 最重要（40%）
    contentCategory: 0.2,    // Content Category 次之（20%）
    fieldsOverlap: 0.4,      // Fields 重叠度（40%）
  };

  const similarityScore =
    (primaryIntentMatch ? 1 : 0) * weights.primaryIntent +
    (contentCategoryMatch ? 1 : 0) * weights.contentCategory +
    fieldsOverlap * weights.fieldsOverlap;

  // 5. 判断是否是 breaking change
  const isBreakingChange = similarityScore < 0.9 || missingFields.length > 2;

  return {
    test_id: testId,
    similarity_score: similarityScore,
    primary_intent_match: primaryIntentMatch,
    content_category_match: contentCategoryMatch,
    fields_overlap: fieldsOverlap,
    missing_fields: missingFields,
    extra_fields: extraFields,
    is_breaking_change: isBreakingChange,
    details: {
      baseline_primary_intent: baselineIntent,
      optimized_primary_intent: optimizedIntent,
      baseline_field_count: baselineFieldIds.size,
      optimized_field_count: optimizedFieldIds.size,
      field_id_overlap: fieldIdOverlap,
    },
  };
}

/**
 * 批量比较多个测试用例
 */
export function batchCompare(
  baselineResults: IntentAnalyzerOutput[],
  optimizedResults: IntentAnalyzerOutput[],
  testIds: string[]
): SemanticComparisonResult[] {
  if (baselineResults.length !== optimizedResults.length) {
    throw new Error('Baseline 和 Optimized 结果数量不匹配');
  }

  return baselineResults.map((baseline, i) =>
    compareOutputs(baseline, optimizedResults[i], testIds[i])
  );
}

/**
 * 生成比较摘要
 */
export function generateSummary(comparisons: SemanticComparisonResult[]) {
  const totalTests = comparisons.length;
  const avgSimilarity = comparisons.reduce((sum, c) => sum + c.similarity_score, 0) / totalTests;
  const minSimilarity = Math.min(...comparisons.map(c => c.similarity_score));
  const maxSimilarity = Math.max(...comparisons.map(c => c.similarity_score));

  const breakingChanges = comparisons.filter(c => c.is_breaking_change);
  const primaryIntentMatches = comparisons.filter(c => c.primary_intent_match).length;
  const contentCategoryMatches = comparisons.filter(c => c.content_category_match).length;

  return {
    total_tests: totalTests,
    avg_similarity: parseFloat(avgSimilarity.toFixed(3)),
    min_similarity: parseFloat(minSimilarity.toFixed(3)),
    max_similarity: parseFloat(maxSimilarity.toFixed(3)),
    primary_intent_match_rate: parseFloat((primaryIntentMatches / totalTests).toFixed(3)),
    content_category_match_rate: parseFloat((contentCategoryMatches / totalTests).toFixed(3)),
    breaking_changes_count: breakingChanges.length,
    breaking_changes: breakingChanges.map(c => ({
      test_id: c.test_id,
      similarity: c.similarity_score,
      missing_fields: c.missing_fields,
    })),
  };
}
