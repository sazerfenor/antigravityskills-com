/**
 * P0 优化措施自动应用脚本
 *
 * 根据优化计划文档应用以下优化：
 * 1. 精简示例数量
 * 2. 移除冗余字段说明
 * 3. 减少"CRITICAL"/"MANDATORY"标记
 * 4. 精简规则说明（保留核心逻辑）
 */

import fs from 'fs';
import path from 'path';

const BASELINE_DIR = path.join(__dirname, 'prompts/baseline');
const OPTIMIZED_DIR = path.join(__dirname, 'prompts/optimized');

/**
 * 优化 Intent Analyzer Prompt
 * P0 措施：
 * - 精简 Primary Intent 示例（保留最具代表性的）
 * - 减少"CRITICAL"/"MANDATORY"标记
 * - 精简规则说明
 */
function optimizeIntentAnalyzer(content: string): string {
  let optimized = content;

  // 1. 减少过度强调标记
  optimized = optimized.replace(/⚠️\s*/g, '');
  optimized = optimized.replace(/\*\*CRITICAL\*\*:\s*/g, '');
  optimized = optimized.replace(/\(CRITICAL\s*-?\s*/gi, '(');
  optimized = optimized.replace(/\(MANDATORY\s*-?\s*/gi, '(');

  // 2. 精简 Ambiguity Exclusion Rule（保留核心逻辑）
  const verboseRule = /⚠️ CRITICAL EXCLUSION RULE \(V3\.3\):[\s\S]*?\*\*What belongs in explicit_details\*\*:[^\n]*\n/;
  const conciseRule = `## Rule: Ambiguity Content Exclusion (V3.3)
If a detail appears in \`ambiguities[].options[]\`, DO NOT include it in \`explicit_details\`.
Reason: User must choose; auto-including would override their choice.
Only include non-conflicting details in explicit_details.

`;
  optimized = optimized.replace(verboseRule, conciseRule);

  // 3. 精简重复的"MUST FOLLOW"说明
  optimized = optimized.replace(/# CRITICAL RULES \(MUST FOLLOW\)/g, '# Rules');

  // 4. 移除 style_hints 字段说明（已废弃）
  optimized = optimized.replace(/5\.\s*\*\*style_hints\*\*:[^\n]*\n/g, '');

  // 5. 精简冗长的规则说明
  optimized = optimized.replace(/\n{3,}/g, '\n\n'); // 移除多余空行

  return optimized;
}

/**
 * 优化 Field Generator Prompt
 * P0 措施：
 * - 精简 EXCLUDED PARAMETERS 列表
 * - 精简 "THE GOLDEN RULE"
 * - 删除重复的字段排序规则
 */
function optimizeFieldGenerator(content: string): string {
  let optimized = content;

  // 1. 减少过度强调标记
  optimized = optimized.replace(/⚠️\s*/g, '');
  optimized = optimized.replace(/\*\*CRITICAL\*\*:\s*/g, '');
  optimized = optimized.replace(/\(MANDATORY\)/gi, '');

  // 2. 精简 EXCLUDED PARAMETERS（保留核心概念，删除冗长解释）
  const excludedParamsSection = /## EXCLUDED PARAMETERS[\s\S]*?(?=##)/;
  const conciseExcluded = `## EXCLUDED PARAMETERS

Do NOT create fields for:
- Technical constraints (aspect_ratio, seed, weights, num_inference_steps)
- Internal signals (reference_intent, visual_complexity)
- Metadata (context, input_complexity)

These are handled by the system, not user input.

`;
  optimized = optimized.replace(excludedParamsSection, conciseExcluded);

  // 3. 精简 "THE GOLDEN RULE"（保留核心逻辑）
  const goldenRuleSection = /## THE GOLDEN RULE[\s\S]*?(?=##)/;
  const conciseGoldenRule = `## THE GOLDEN RULE

**Every field must serve a clear creative purpose.**

Ask: "If user changes this field, does the output meaningfully change?"
- Yes → Include field
- No → Skip field

Balance: Provide enough control without overwhelming the user.

`;
  optimized = optimized.replace(goldenRuleSection, conciseGoldenRule);

  // 4. 移除多余空行
  optimized = optimized.replace(/\n{3,}/g, '\n\n');

  return optimized;
}

/**
 * 优化 Compiler Prompt
 * P0 措施：
 * - 精简 V3.5 EXAMPLES（保留最具代表性的）
 * - 删除 LEGACY EXAMPLES
 * - 精简规则说明
 */
function optimizeCompiler(content: string): string {
  let optimized = content;

  // 1. 减少过度强调标记
  optimized = optimized.replace(/⚠️\s*/g, '');
  optimized = optimized.replace(/\*\*CRITICAL\*\*:\s*/g, '');
  optimized = optimized.replace(/\(V3\.5 - CRITICAL\)/gi, '(V3.5)');

  // 2. 删除 LEGACY EXAMPLES（查找并删除明确标记为 legacy 的示例）
  optimized = optimized.replace(/### LEGACY EXAMPLES?[\s\S]*?(?=###|##|$)/gi, '');

  // 3. 精简冗长的规则说明
  optimized = optimized.replace(/\n{3,}/g, '\n\n');

  // 4. 精简反面示例（保留核心概念）
  const antiPatternSection = /### Anti-Patterns?[\s\S]*?(?=###|##|$)/gi;
  optimized = optimized.replace(antiPatternSection, (match) => {
    // 保留前3个示例，删除其余
    const lines = match.split('\n');
    const exampleCount = (match.match(/- ❌/g) || []).length;
    if (exampleCount > 3) {
      // 简单截断，保留前半部分
      return lines.slice(0, Math.ceil(lines.length / 2)).join('\n') + '\n\n';
    }
    return match;
  });

  return optimized;
}

/**
 * 应用所有优化
 */
function applyOptimizations() {
  console.log('🔧 开始应用 P0 优化措施...\n');

  // 1. Intent Analyzer
  console.log('📝 优化 Intent Analyzer Prompt...');
  const intentAnalyzerBaseline = fs.readFileSync(
    path.join(BASELINE_DIR, 'intent-analyzer.txt'),
    'utf-8'
  );
  const intentAnalyzerOptimized = optimizeIntentAnalyzer(intentAnalyzerBaseline);
  fs.writeFileSync(
    path.join(OPTIMIZED_DIR, 'intent-analyzer.txt'),
    intentAnalyzerOptimized,
    'utf-8'
  );
  const intentReduction = (
    ((intentAnalyzerBaseline.length - intentAnalyzerOptimized.length) /
      intentAnalyzerBaseline.length) *
    100
  ).toFixed(1);
  console.log(`  ✅ 字符数: ${intentAnalyzerBaseline.length} → ${intentAnalyzerOptimized.length} (-${intentReduction}%)`);

  // 2. Field Generator
  console.log('📝 优化 Field Generator Prompt...');
  const fieldGeneratorBaseline = fs.readFileSync(
    path.join(BASELINE_DIR, 'field-generator.txt'),
    'utf-8'
  );
  const fieldGeneratorOptimized = optimizeFieldGenerator(fieldGeneratorBaseline);
  fs.writeFileSync(
    path.join(OPTIMIZED_DIR, 'field-generator.txt'),
    fieldGeneratorOptimized,
    'utf-8'
  );
  const fieldReduction = (
    ((fieldGeneratorBaseline.length - fieldGeneratorOptimized.length) /
      fieldGeneratorBaseline.length) *
    100
  ).toFixed(1);
  console.log(`  ✅ 字符数: ${fieldGeneratorBaseline.length} → ${fieldGeneratorOptimized.length} (-${fieldReduction}%)`);

  // 3. Compiler
  console.log('📝 优化 Compiler Prompt...');
  const compilerBaseline = fs.readFileSync(
    path.join(BASELINE_DIR, 'compiler.txt'),
    'utf-8'
  );
  const compilerOptimized = optimizeCompiler(compilerBaseline);
  fs.writeFileSync(
    path.join(OPTIMIZED_DIR, 'compiler.txt'),
    compilerOptimized,
    'utf-8'
  );
  const compilerReduction = (
    ((compilerBaseline.length - compilerOptimized.length) / compilerBaseline.length) *
    100
  ).toFixed(1);
  console.log(`  ✅ 字符数: ${compilerBaseline.length} → ${compilerOptimized.length} (-${compilerReduction}%)`);

  // 4. 总结
  console.log('\n📊 优化总结:');
  const totalBaseline =
    intentAnalyzerBaseline.length + fieldGeneratorBaseline.length + compilerBaseline.length;
  const totalOptimized =
    intentAnalyzerOptimized.length + fieldGeneratorOptimized.length + compilerOptimized.length;
  const totalReduction = (((totalBaseline - totalOptimized) / totalBaseline) * 100).toFixed(1);

  console.log(`  总字符数: ${totalBaseline} → ${totalOptimized} (-${totalReduction}%)`);
  console.log(`  预计 Token 节省: ~${totalReduction}% (目标: 26%)`);
  console.log(`\n✅ P0 优化措施已应用！`);
  console.log(`📁 优化后的 Prompts 保存在: ${OPTIMIZED_DIR}`);
}

// 执行优化
applyOptimizations();
