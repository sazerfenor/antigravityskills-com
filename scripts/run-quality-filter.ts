#!/usr/bin/env tsx
/**
 * Stage 3 Quality Filter - 独立执行脚本
 *
 * 用法: pnpm tsx scripts/run-quality-filter.ts
 *
 * 功能：
 * 1. 加载并合并原始数据 + Stage 1 分析结果
 * 2. LLM 批次评分
 * 3. 加分计算 + 去重
 * 4. 输出排序结果和报告
 */

import { config } from 'dotenv';
import * as path from 'path';

// 加载环境变量
config({ path: path.resolve(process.cwd(), '.env.local') });

import {
  loadAndMergeData,
  cleanData,
  evaluateAllBatches,
  assembleResults,
  deduplicateByHash,
  generateOutput,
} from '../src/shared/services/prompt-quality';

async function main() {
  console.log('========================================');
  console.log('  Stage 3 Quality Filter');
  console.log('========================================');
  console.log();

  const startTime = Date.now();

  try {
    // Step 1: 加载并合并数据
    console.log('[Step 1/6] Loading and merging data...');
    const merged = loadAndMergeData();
    console.log(`  ✓ Merged ${merged.length} prompts`);
    console.log();

    // Step 2: 基础清洗
    console.log('[Step 2/6] Cleaning data...');
    const cleaned = cleanData(merged);
    console.log(`  ✓ Cleaned: ${merged.length} -> ${cleaned.length}`);
    console.log();

    // Step 3: LLM 批次评分
    console.log('[Step 3/6] LLM evaluation (this may take 15-20 minutes)...');
    const llmResults = await evaluateAllBatches(cleaned, (completed, total) => {
      const percent = ((completed / total) * 100).toFixed(1);
      process.stdout.write(`\r  Progress: ${completed}/${total} batches (${percent}%)`);
    });
    console.log();
    console.log(`  ✓ Evaluated ${llmResults.size} prompts`);
    console.log();

    // Step 4: 组装结果（含加分）
    console.log('[Step 4/6] Assembling results with bonus scores...');
    let results = assembleResults(cleaned, llmResults);
    console.log(`  ✓ Assembled ${results.length} results`);
    console.log();

    // Step 5: 去重
    console.log('[Step 5/6] Deduplicating...');
    const beforeDedup = results.length;
    results = deduplicateByHash(results);
    console.log(`  ✓ Deduplicated: ${beforeDedup} -> ${results.length}`);
    console.log();

    // Step 6: 输出文件
    console.log('[Step 6/6] Generating output files...');
    generateOutput(results);
    console.log('  ✓ Output generated');
    console.log();

    // 统计摘要
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('========================================');
    console.log('  Summary');
    console.log('========================================');
    console.log(`  Total prompts: ${results.length}`);
    console.log(`  Elapsed time: ${elapsed}s`);
    console.log();
    console.log('  Distribution:');
    console.log(
      `    Strong Recommend (90+): ${results.filter((r) => r.recommendation === 'strong_recommend').length}`
    );
    console.log(
      `    Recommend (75-89):      ${results.filter((r) => r.recommendation === 'recommend').length}`
    );
    console.log(
      `    Conditional (60-74):    ${results.filter((r) => r.recommendation === 'conditional').length}`
    );
    console.log(
      `    Low Priority (<60):     ${results.filter((r) => r.recommendation === 'low_priority').length}`
    );
    console.log();
    console.log('  Requires Upload:');
    console.log(`    Yes: ${results.filter((r) => r.requires_upload).length}`);
    console.log(`    No:  ${results.filter((r) => !r.requires_upload).length}`);
    console.log();
    console.log('  Averages:');
    console.log(
      `    Total Score: ${(results.reduce((s, r) => s + r.total_score, 0) / results.length).toFixed(1)}`
    );
    console.log(
      `    LLM Score:   ${(results.reduce((s, r) => s + r.llm_total, 0) / results.length).toFixed(1)}`
    );
    console.log(
      `    Bonus:       ${(results.reduce((s, r) => s + r.bonus_total, 0) / results.length).toFixed(1)}`
    );
    console.log();
    console.log('  Top 5 Prompts:');
    results.slice(0, 5).forEach((r, i) => {
      console.log(`    ${i + 1}. [${r.total_score}] ${r.title.substring(0, 50)}...`);
    });
    console.log();
    console.log('  Output files:');
    console.log('    docs/output/quality-filter/quality-filtered-prompts.json');
    console.log('    docs/output/quality-filter/quality-report.md');
    console.log();
    console.log('========================================');
    console.log('  Done!');
    console.log('========================================');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
