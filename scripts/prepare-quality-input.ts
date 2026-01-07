#!/usr/bin/env tsx
/**
 * Stage 3 预处理脚本 - 生成按类型分类的输入文件
 *
 * 用法: pnpm tsx scripts/prepare-quality-input.ts
 *
 * 输入:
 * - prompts_api.json (原始 Prompt 数据)
 * - intent-mining-progress.json (Stage 1 分析结果)
 *
 * 输出:
 * - docs/output/quality-filter/quality-input.json (按类型分类的数据)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 配置
// ============================================

const PROMPTS_API_PATH =
  '/Users/lixuanying/Documents/GitHub/bananaprompts-info/logs/prompts_api.json';
const STAGE1_PATH =
  '/Users/lixuanying/Documents/GitHub/agents/bananaprompts-analysis/output/intent-mining-progress.json';
const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/prompt-scoring/input');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'quality-input.json');

// ============================================
// 类型定义
// ============================================

interface RawPrompt {
  id: number;
  title: string;
  content: string;
  translatedContent?: string;
  media?: string[];
  featured?: boolean;
  language?: string;
  author?: {
    name: string;
    link?: string;
  };
}

interface Stage1Analysis {
  id: number;
  statistical_vertical: string;
  seo_specific_intent: string;
  subject_type: string;
  visual_style: string;
  commercial_probability: number;
  requires_upload: boolean;
  reasoning: string;
  keywords: string[];
}

interface Stage1Progress {
  processed_ids: number[];
  batch_results: Array<{
    batch_analysis: Stage1Analysis[];
  }>;
}

interface MergedPrompt {
  id: number;
  prompt: string;
  title: string;
  // Stage 1 分析字段
  vertical: string;
  subject_type: string;
  visual_style: string;
  seo_intent: string;
  requires_upload: boolean;
  commercial_prob: number;
  keywords: string[];
  // 原始数据加分字段
  featured: boolean;
  mediaCount: number;
}

type VerticalType = 'Photography' | 'Design' | 'Art' | 'Commercial' | 'Character' | 'Other';

interface OutputData {
  meta: {
    generated: string;
    total: number;
    by_vertical: Record<VerticalType, number>;
    requires_upload_count: number;
    by_subject_type: Record<string, number>;
  };
  prompts: Record<VerticalType, MergedPrompt[]>;
}

// ============================================
// 主逻辑
// ============================================

function main() {
  console.log('========================================');
  console.log('  Stage 3 预处理 - 生成分类输入文件');
  console.log('========================================');
  console.log();

  // Step 1: 加载原始数据
  console.log('[Step 1] 加载原始 Prompt 数据...');
  const rawPrompts: RawPrompt[] = JSON.parse(fs.readFileSync(PROMPTS_API_PATH, 'utf-8'));
  console.log(`  ✓ 加载 ${rawPrompts.length} 条原始 Prompt`);

  // Step 2: 加载 Stage 1 分析
  console.log('[Step 2] 加载 Stage 1 分析结果...');
  const stage1Data: Stage1Progress = JSON.parse(fs.readFileSync(STAGE1_PATH, 'utf-8'));

  // 展平 batch_results 为 id -> analysis 的 Map
  const stage1Map = new Map<number, Stage1Analysis>();
  for (const batch of stage1Data.batch_results) {
    for (const item of batch.batch_analysis) {
      stage1Map.set(item.id, item);
    }
  }
  console.log(`  ✓ 加载 ${stage1Map.size} 条 Stage 1 分析`);

  // Step 3: 合并数据
  console.log('[Step 3] 合并数据...');
  const merged: MergedPrompt[] = [];
  let skippedCount = 0;

  for (const p of rawPrompts) {
    const s1 = stage1Map.get(p.id);
    if (!s1) {
      skippedCount++;
      continue;
    }

    merged.push({
      id: p.id,
      prompt: p.translatedContent || p.content,
      title: p.title,
      // Stage 1 分析
      vertical: s1.statistical_vertical || 'Other',
      subject_type: s1.subject_type || 'Unknown',
      visual_style: s1.visual_style || 'Unknown',
      seo_intent: s1.seo_specific_intent || 'Other',
      requires_upload: s1.requires_upload || false,
      commercial_prob: s1.commercial_probability || 0,
      keywords: s1.keywords || [],
      // 加分字段
      featured: p.featured || false,
      mediaCount: (p.media || []).length,
    });
  }
  console.log(`  ✓ 合并 ${merged.length} 条 (跳过 ${skippedCount} 条无分析数据)`);

  // Step 4: 按 vertical 分类
  console.log('[Step 4] 按类型分类...');
  const verticals: VerticalType[] = ['Photography', 'Design', 'Art', 'Commercial', 'Character', 'Other'];
  const byVertical: Record<VerticalType, MergedPrompt[]> = {
    Photography: [],
    Design: [],
    Art: [],
    Commercial: [],
    Character: [],
    Other: [],
  };

  for (const p of merged) {
    const v = verticals.includes(p.vertical as VerticalType) ? (p.vertical as VerticalType) : 'Other';
    byVertical[v].push(p);
  }

  // 统计
  const verticalCounts: Record<VerticalType, number> = {} as Record<VerticalType, number>;
  for (const v of verticals) {
    verticalCounts[v] = byVertical[v].length;
    console.log(`  - ${v}: ${byVertical[v].length} 条`);
  }

  // Step 5: 统计 subject_type 分布
  console.log('[Step 5] 统计 subject_type 分布...');
  const subjectTypeCounts: Record<string, number> = {};
  for (const p of merged) {
    subjectTypeCounts[p.subject_type] = (subjectTypeCounts[p.subject_type] || 0) + 1;
  }
  // 按数量排序，取 Top 20
  const sortedSubjectTypes = Object.entries(subjectTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  console.log('  Top 20 subject_type:');
  for (const [type, count] of sortedSubjectTypes) {
    console.log(`    - ${type}: ${count}`);
  }

  // Step 6: 统计 requires_upload
  const requiresUploadCount = merged.filter((p) => p.requires_upload).length;
  console.log(`[Step 6] requires_upload=true: ${requiresUploadCount} 条 (${((requiresUploadCount / merged.length) * 100).toFixed(1)}%)`);

  // Step 7: 生成输出
  console.log('[Step 7] 生成输出文件...');

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const output: OutputData = {
    meta: {
      generated: new Date().toISOString().split('T')[0],
      total: merged.length,
      by_vertical: verticalCounts,
      requires_upload_count: requiresUploadCount,
      by_subject_type: Object.fromEntries(sortedSubjectTypes),
    },
    prompts: byVertical,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`  ✓ 输出: ${OUTPUT_FILE}`);

  // Step 8: 输出示例
  console.log();
  console.log('========================================');
  console.log('  示例数据 (每个类型前 2 条)');
  console.log('========================================');

  for (const v of verticals) {
    const samples = byVertical[v].slice(0, 2);
    if (samples.length === 0) continue;

    console.log();
    console.log(`## ${v} (${byVertical[v].length} 条)`);
    for (const s of samples) {
      console.log(`  ID ${s.id}: ${s.title.substring(0, 50)}...`);
      console.log(`    subject_type: ${s.subject_type}`);
      console.log(`    visual_style: ${s.visual_style}`);
      console.log(`    requires_upload: ${s.requires_upload}`);
      console.log(`    featured: ${s.featured}, media: ${s.mediaCount}`);
      console.log(`    prompt: ${s.prompt.substring(0, 80)}...`);
    }
  }

  console.log();
  console.log('========================================');
  console.log('  完成！');
  console.log('========================================');
}

main();
