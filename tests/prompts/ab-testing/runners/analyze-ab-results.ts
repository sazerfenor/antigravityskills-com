import fs from 'fs/promises';
import path from 'path';

/**
 * A/B 测试结果分析脚本
 * 对比 baseline vs optimized 的结果，生成人工审查报告
 */

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

interface ComparisonResult {
  testCaseId: string;
  testCaseName: string;
  baseline: TestResult;
  optimized: TestResult;
  comparison: {
    stage1_fields: {
      baselineFieldIds: string[];
      optimizedFieldIds: string[];
      added: string[];
      removed: string[];
      changed: string[];
      summary: string;
    };
    stage3_prompt: {
      baselinePrompt: string;
      optimizedPrompt: string;
      baselineLength: number;
      optimizedLength: number;
      lengthDiff: number;
      lengthDiffPercent: number;
      keywordRepetition: {
        baseline: Record<string, number>;
        optimized: Record<string, number>;
        summary: string;
      };
    };
    duration: {
      baselineTotalMs: number;
      optimizedTotalMs: number;
      diff: number;
      diffPercent: number;
    };
  };
}

function analyzeKeywordRepetition(prompt: string): Record<string, number> {
  // 提取关键词（超过3个字符的单词）
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const counts: Record<string, number> = {};
  words.forEach((word) => {
    counts[word] = (counts[word] || 0) + 1;
  });

  // 只返回出现2次以上的关键词
  return Object.fromEntries(Object.entries(counts).filter(([, count]) => count >= 2));
}

function compareFields(baselineFields: any[], optimizedFields: any[]): {
  baselineFieldIds: string[];
  optimizedFieldIds: string[];
  added: string[];
  removed: string[];
  changed: string[];
  summary: string;
} {
  const baselineIds = baselineFields.map((f) => f.id);
  const optimizedIds = optimizedFields.map((f) => f.id);

  const added = optimizedIds.filter((id) => !baselineIds.includes(id));
  const removed = baselineIds.filter((id) => !optimizedIds.includes(id));
  const changed: string[] = [];

  // 检查字段类型或默认值是否改变
  baselineIds.forEach((id) => {
    const baselineField = baselineFields.find((f) => f.id === id);
    const optimizedField = optimizedFields.find((f) => f.id === id);
    if (optimizedField) {
      if (baselineField.type !== optimizedField.type || baselineField.defaultValue !== optimizedField.defaultValue) {
        changed.push(id);
      }
    }
  });

  let summary = '';
  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    summary = '✅ 字段完全一致';
  } else {
    summary = `⚠️ 字段有变化：+${added.length} -${removed.length} ~${changed.length}`;
  }

  return {
    baselineFieldIds: baselineIds,
    optimizedFieldIds: optimizedIds,
    added,
    removed,
    changed,
    summary,
  };
}

async function analyzeResults(): Promise<ComparisonResult[]> {
  const resultsPath = path.join(
    process.cwd(),
    'tests/prompts/ab-testing/results/ab-test-2026-01-13.json'
  );
  const rawData = await fs.readFile(resultsPath, 'utf-8');
  const allResults: TestResult[] = JSON.parse(rawData);

  // 按 testCaseId 分组
  const grouped: Record<string, { baseline?: TestResult; optimized?: TestResult }> = {};
  allResults.forEach((result) => {
    if (!grouped[result.testCaseId]) {
      grouped[result.testCaseId] = {};
    }
    grouped[result.testCaseId][result.version] = result;
  });

  const comparisons: ComparisonResult[] = [];

  Object.entries(grouped).forEach(([testCaseId, { baseline, optimized }]) => {
    if (!baseline || !optimized) {
      console.warn(`⚠️ 跳过 ${testCaseId}: 缺少 baseline 或 optimized 结果`);
      return;
    }

    const baselineFields = baseline.stages.stage1_intent.data?.fields || [];
    const optimizedFields = optimized.stages.stage1_intent.data?.fields || [];

    const baselinePrompt = baseline.finalOutput?.englishPrompt || '';
    const optimizedPrompt = optimized.finalOutput?.englishPrompt || '';

    const fieldsComparison = compareFields(baselineFields, optimizedFields);
    const baselineRepetition = analyzeKeywordRepetition(baselinePrompt);
    const optimizedRepetition = analyzeKeywordRepetition(optimizedPrompt);

    const baselineTotalMs =
      baseline.stages.stage1_intent.duration +
      baseline.stages.stage2_field.duration +
      baseline.stages.stage3_compiler.duration;
    const optimizedTotalMs =
      optimized.stages.stage1_intent.duration +
      optimized.stages.stage2_field.duration +
      optimized.stages.stage3_compiler.duration;

    const repetitionSummary = (() => {
      const baselineRepeats = Object.values(baselineRepetition).reduce((a, b) => a + b, 0);
      const optimizedRepeats = Object.values(optimizedRepetition).reduce((a, b) => a + b, 0);
      const diff = optimizedRepeats - baselineRepeats;
      if (diff === 0) return '✅ 重复关键词数量一致';
      if (diff > 0) return `⚠️ Optimized 重复更多（+${diff}）`;
      return `✅ Optimized 重复更少（${diff}）`;
    })();

    comparisons.push({
      testCaseId,
      testCaseName: baseline.testCaseName,
      baseline,
      optimized,
      comparison: {
        stage1_fields: {
          ...fieldsComparison,
        },
        stage3_prompt: {
          baselinePrompt,
          optimizedPrompt,
          baselineLength: baselinePrompt.length,
          optimizedLength: optimizedPrompt.length,
          lengthDiff: optimizedPrompt.length - baselinePrompt.length,
          lengthDiffPercent: ((optimizedPrompt.length - baselinePrompt.length) / baselinePrompt.length) * 100,
          keywordRepetition: {
            baseline: baselineRepetition,
            optimized: optimizedRepetition,
            summary: repetitionSummary,
          },
        },
        duration: {
          baselineTotalMs,
          optimizedTotalMs,
          diff: optimizedTotalMs - baselineTotalMs,
          diffPercent: ((optimizedTotalMs - baselineTotalMs) / baselineTotalMs) * 100,
        },
      },
    });
  });

  return comparisons;
}

async function generateMarkdownReport(comparisons: ComparisonResult[]): Promise<string> {
  const lines: string[] = [];

  lines.push('# A/B 测试对比报告');
  lines.push('');
  lines.push(`**测试日期**: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`**测试用例数**: ${comparisons.length}`);
  lines.push('**对比版本**: Baseline vs Optimized (V1.0)');
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 执行摘要');
  lines.push('');

  const allFieldsIdentical = comparisons.every((c) => c.comparison.stage1_fields.summary.includes('✅'));
  const allPromptsIdentical = comparisons.every((c) => c.comparison.stage3_prompt.lengthDiff === 0);

  if (allFieldsIdentical && allPromptsIdentical) {
    lines.push('✅ **结论**: Baseline 和 Optimized 产生的结果完全一致，优化未产生功能性变化。');
  } else {
    lines.push('⚠️ **结论**: Baseline 和 Optimized 产生的结果有差异，需要人工审查。');
  }
  lines.push('');

  lines.push('### 快速统计');
  lines.push('');
  lines.push('| 指标 | Baseline | Optimized | 差异 |');
  lines.push('|------|----------|-----------|------|');

  const avgBaselineTime = comparisons.reduce((a, b) => a + b.comparison.duration.baselineTotalMs, 0) / comparisons.length;
  const avgOptimizedTime = comparisons.reduce((a, b) => a + b.comparison.duration.optimizedTotalMs, 0) / comparisons.length;
  const avgTimeDiff = avgOptimizedTime - avgBaselineTime;
  const avgTimeDiffPercent = (avgTimeDiff / avgBaselineTime) * 100;

  lines.push(
    `| 平均执行时间 | ${(avgBaselineTime / 1000).toFixed(2)}s | ${(avgOptimizedTime / 1000).toFixed(2)}s | ${avgTimeDiffPercent > 0 ? '+' : ''}${avgTimeDiffPercent.toFixed(2)}% |`
  );

  const avgBaselinePromptLength =
    comparisons.reduce((a, b) => a + b.comparison.stage3_prompt.baselineLength, 0) / comparisons.length;
  const avgOptimizedPromptLength =
    comparisons.reduce((a, b) => a + b.comparison.stage3_prompt.optimizedLength, 0) / comparisons.length;
  const avgLengthDiff = avgOptimizedPromptLength - avgBaselinePromptLength;
  const avgLengthDiffPercent = (avgLengthDiff / avgBaselinePromptLength) * 100;

  lines.push(
    `| 平均 Prompt 长度 | ${avgBaselinePromptLength.toFixed(0)} | ${avgOptimizedPromptLength.toFixed(0)} | ${avgLengthDiffPercent > 0 ? '+' : ''}${avgLengthDiffPercent.toFixed(2)}% |`
  );

  lines.push('');
  lines.push('---');
  lines.push('');

  comparisons.forEach((comp, index) => {
    lines.push(`## 用例 ${index + 1}: ${comp.testCaseName}`);
    lines.push('');
    lines.push(`**Test Case ID**: \`${comp.testCaseId}\``);
    lines.push('');

    lines.push('### 阶段一: Intent Analyzer');
    lines.push('');
    lines.push('**字段对比**:');
    lines.push('');
    lines.push(comp.comparison.stage1_fields.summary);
    lines.push('');

    if (comp.comparison.stage1_fields.added.length > 0) {
      lines.push(`**新增字段** (${comp.comparison.stage1_fields.added.length}):`);
      comp.comparison.stage1_fields.added.forEach((id) => lines.push(`- \`${id}\``));
      lines.push('');
    }

    if (comp.comparison.stage1_fields.removed.length > 0) {
      lines.push(`**删除字段** (${comp.comparison.stage1_fields.removed.length}):`);
      comp.comparison.stage1_fields.removed.forEach((id) => lines.push(`- \`${id}\``));
      lines.push('');
    }

    if (comp.comparison.stage1_fields.changed.length > 0) {
      lines.push(`**字段类型或默认值改变** (${comp.comparison.stage1_fields.changed.length}):`);
      comp.comparison.stage1_fields.changed.forEach((id) => lines.push(`- \`${id}\``));
      lines.push('');
    }

    lines.push('---');
    lines.push('');

    lines.push('### 阶段三: Compiler');
    lines.push('');
    lines.push('**Prompt 长度对比**:');
    lines.push('');
    lines.push('| 版本 | 长度 |');
    lines.push('|------|------|');
    lines.push(`| Baseline | ${comp.comparison.stage3_prompt.baselineLength} 字符 |`);
    lines.push(`| Optimized | ${comp.comparison.stage3_prompt.optimizedLength} 字符 |`);
    lines.push(
      `| 差异 | ${comp.comparison.stage3_prompt.lengthDiffPercent > 0 ? '+' : ''}${comp.comparison.stage3_prompt.lengthDiffPercent.toFixed(2)}% (${comp.comparison.stage3_prompt.lengthDiff > 0 ? '+' : ''}${comp.comparison.stage3_prompt.lengthDiff}) |`
    );
    lines.push('');

    lines.push('**关键词重复分析**:');
    lines.push('');
    lines.push(comp.comparison.stage3_prompt.keywordRepetition.summary);
    lines.push('');

    const baselineRepeats = Object.entries(comp.comparison.stage3_prompt.keywordRepetition.baseline)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);
    const optimizedRepeats = Object.entries(comp.comparison.stage3_prompt.keywordRepetition.optimized)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);

    if (baselineRepeats.length > 0 || optimizedRepeats.length > 0) {
      lines.push('| 关键词 | Baseline 出现次数 | Optimized 出现次数 |');
      lines.push('|--------|-------------------|-------------------|');

      const allKeywords = new Set([...baselineRepeats.map((r) => r[0]), ...optimizedRepeats.map((r) => r[0])]);
      allKeywords.forEach((keyword) => {
        const baselineCount = comp.comparison.stage3_prompt.keywordRepetition.baseline[keyword] || 0;
        const optimizedCount = comp.comparison.stage3_prompt.keywordRepetition.optimized[keyword] || 0;
        if (baselineCount >= 2 || optimizedCount >= 2) {
          lines.push(`| ${keyword} | ${baselineCount} | ${optimizedCount} |`);
        }
      });

      lines.push('');
    }

    lines.push('**Baseline Prompt**:');
    lines.push('```');
    lines.push(comp.comparison.stage3_prompt.baselinePrompt);
    lines.push('```');
    lines.push('');

    lines.push('**Optimized Prompt**:');
    lines.push('```');
    lines.push(comp.comparison.stage3_prompt.optimizedPrompt);
    lines.push('```');
    lines.push('');

    lines.push('---');
    lines.push('');

    lines.push('### 性能对比');
    lines.push('');
    lines.push('| 阶段 | Baseline | Optimized | 差异 |');
    lines.push('|------|----------|-----------|------|');
    lines.push(
      `| Stage 1 (Intent) | ${(comp.baseline.stages.stage1_intent.duration / 1000).toFixed(2)}s | ${(comp.optimized.stages.stage1_intent.duration / 1000).toFixed(2)}s | ${((comp.optimized.stages.stage1_intent.duration - comp.baseline.stages.stage1_intent.duration) / comp.baseline.stages.stage1_intent.duration * 100).toFixed(2)}% |`
    );
    lines.push(
      `| Stage 2 (PLO Build) | ${(comp.baseline.stages.stage2_field.duration / 1000).toFixed(2)}s | ${(comp.optimized.stages.stage2_field.duration / 1000).toFixed(2)}s | - |`
    );
    lines.push(
      `| Stage 3 (Compiler) | ${(comp.baseline.stages.stage3_compiler.duration / 1000).toFixed(2)}s | ${(comp.optimized.stages.stage3_compiler.duration / 1000).toFixed(2)}s | ${((comp.optimized.stages.stage3_compiler.duration - comp.baseline.stages.stage3_compiler.duration) / comp.baseline.stages.stage3_compiler.duration * 100).toFixed(2)}% |`
    );
    lines.push(
      `| **总计** | **${(comp.comparison.duration.baselineTotalMs / 1000).toFixed(2)}s** | **${(comp.comparison.duration.optimizedTotalMs / 1000).toFixed(2)}s** | **${comp.comparison.duration.diffPercent.toFixed(2)}%** |`
    );
    lines.push('');

    lines.push('---');
    lines.push('');
  });

  lines.push('## 附录: 完整数据');
  lines.push('');
  lines.push('完整的测试结果 JSON 文件位于:');
  lines.push('`tests/prompts/ab-testing/results/ab-test-2026-01-13.json`');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**报告生成时间**: ' + new Date().toISOString());
  lines.push('');

  return lines.join('\n');
}

async function main() {
  console.log('🔍 开始分析 A/B 测试结果...\n');

  const comparisons = await analyzeResults();
  console.log(`✅ 已分析 ${comparisons.length} 个测试用例\n`);

  const markdown = await generateMarkdownReport(comparisons);

  const outputDir = path.join(process.cwd(), 'tests/prompts/ab-testing/reports');
  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(outputDir, `ab-comparison-${timestamp}.md`);

  await fs.writeFile(outputPath, markdown, 'utf-8');

  console.log(`📊 对比报告已生成:`);
  console.log(`   ${outputPath}`);
  console.log('');

  // 输出简要统计
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 快速统计');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  comparisons.forEach((comp, index) => {
    console.log(`${index + 1}. ${comp.testCaseName}:`);
    console.log(`   字段: ${comp.comparison.stage1_fields.summary}`);
    console.log(`   Prompt 长度: ${comp.comparison.stage3_prompt.lengthDiffPercent > 0 ? '+' : ''}${comp.comparison.stage3_prompt.lengthDiffPercent.toFixed(2)}%`);
    console.log(`   关键词重复: ${comp.comparison.stage3_prompt.keywordRepetition.summary}`);
    console.log(`   执行时间: ${comp.comparison.duration.diffPercent > 0 ? '+' : ''}${comp.comparison.duration.diffPercent.toFixed(2)}%\n`);
  });

  console.log('✨ 分析完成！');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 分析失败:', error);
    process.exit(1);
  });
