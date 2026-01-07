#!/usr/bin/env tsx
/**
 * 合并 Prompt 数据脚本
 *
 * 将两个数据源的所有字段合并到一个文件：
 * 1. quality-input.json (Stage 1 分析 + 原始数据)
 * 2. quality-filtered-prompts.json (Stage 3 评分结果)
 *
 * 用法: pnpm tsx scripts/merge-prompt-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// 文件路径
const INPUT_DIR = path.resolve(process.cwd(), 'docs/prompt-scoring/input');
const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/prompt-scoring/output');

const QUALITY_INPUT_PATH = path.join(INPUT_DIR, 'quality-input.json');
const QUALITY_FILTERED_PATH = path.join(OUTPUT_DIR, 'quality-filtered-prompts.json');
const MERGED_OUTPUT_PATH = path.join(OUTPUT_DIR, 'merged-prompts-full.json');
const MERGED_CSV_PATH = path.join(OUTPUT_DIR, 'merged-prompts-full.csv');

// 类型定义
interface QualityInputPrompt {
  id: number;
  prompt: string;
  title: string;
  vertical: string;
  subject_type?: string;
  visual_style?: string;
  seo_intent?: string;
  requires_upload?: boolean;
  commercial_prob?: number;
  keywords?: string[];
  featured?: boolean;
  mediaCount?: number;
}

interface QualityFilteredPrompt {
  id: number;
  prompt: string;
  title: string;
  llm_scores: {
    clarity: number;
    detail: number;
    completeness: number;
  };
  llm_total: number;
  bonus: {
    featured: number;
    media: number;
    commercial: number;
  };
  bonus_total: number;
  total_score: number;
  seo_intent: string;
  vertical: string;
  requires_upload: boolean;
  recommendation: string;
  highlights: string[];
  issues: string[];
  search_keywords: string[];
}

interface MergedPrompt {
  // 基础信息
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

  // 原始数据字段
  featured: boolean;
  mediaCount: number;

  // Stage 3 评分字段
  clarity_score: number;
  detail_score: number;
  completeness_score: number;
  llm_total: number;
  featured_bonus: number;
  media_bonus: number;
  commercial_bonus: number;
  bonus_total: number;
  total_score: number;
  recommendation: string;
  highlights: string[];
  issues: string[];
  search_keywords: string[];
}

function main() {
  console.log('========================================');
  console.log('  Merge Prompt Data - All Fields');
  console.log('========================================\n');

  // Step 1: 加载 quality-input.json
  console.log('[Step 1] Loading quality-input.json...');
  const qualityInputRaw = JSON.parse(fs.readFileSync(QUALITY_INPUT_PATH, 'utf-8'));
  const qualityInputMap = new Map<number, QualityInputPrompt>();

  // 展平 prompts 对象（按 vertical 分组）
  for (const vertical of Object.keys(qualityInputRaw.prompts)) {
    for (const prompt of qualityInputRaw.prompts[vertical]) {
      qualityInputMap.set(prompt.id, prompt);
    }
  }
  console.log(`  ✓ Loaded ${qualityInputMap.size} prompts from quality-input.json\n`);

  // Step 2: 加载 quality-filtered-prompts.json
  console.log('[Step 2] Loading quality-filtered-prompts.json...');
  const qualityFiltered: QualityFilteredPrompt[] = JSON.parse(
    fs.readFileSync(QUALITY_FILTERED_PATH, 'utf-8')
  );
  const qualityFilteredMap = new Map<number, QualityFilteredPrompt>();
  for (const prompt of qualityFiltered) {
    qualityFilteredMap.set(prompt.id, prompt);
  }
  console.log(`  ✓ Loaded ${qualityFilteredMap.size} prompts from quality-filtered-prompts.json\n`);

  // Step 3: 合并数据
  console.log('[Step 3] Merging all fields...');

  // 使用 quality-filtered-prompts 作为基准（只包含已评分的 prompt）
  const mergedPrompts: MergedPrompt[] = [];

  for (const filtered of qualityFiltered) {
    const input = qualityInputMap.get(filtered.id);

    const merged: MergedPrompt = {
      // 基础信息
      id: filtered.id,
      prompt: filtered.prompt,
      title: filtered.title,

      // Stage 1 分析字段
      vertical: input?.vertical || filtered.vertical || 'Other',
      subject_type: input?.subject_type || '',
      visual_style: input?.visual_style || '',
      seo_intent: input?.seo_intent || filtered.seo_intent || '',
      requires_upload: input?.requires_upload ?? filtered.requires_upload ?? false,
      commercial_prob: input?.commercial_prob ?? 0,
      keywords: input?.keywords || [],

      // 原始数据字段
      featured: input?.featured ?? false,
      mediaCount: input?.mediaCount ?? 0,

      // Stage 3 评分字段
      clarity_score: filtered.llm_scores?.clarity ?? 0,
      detail_score: filtered.llm_scores?.detail ?? 0,
      completeness_score: filtered.llm_scores?.completeness ?? 0,
      llm_total: filtered.llm_total ?? 0,
      featured_bonus: filtered.bonus?.featured ?? 0,
      media_bonus: filtered.bonus?.media ?? 0,
      commercial_bonus: filtered.bonus?.commercial ?? 0,
      bonus_total: filtered.bonus_total ?? 0,
      total_score: filtered.total_score ?? 0,
      recommendation: filtered.recommendation || '',
      highlights: filtered.highlights || [],
      issues: filtered.issues || [],
      search_keywords: filtered.search_keywords || [],
    };

    mergedPrompts.push(merged);
  }

  // 按 total_score 降序排序
  mergedPrompts.sort((a, b) => b.total_score - a.total_score);

  console.log(`  ✓ Merged ${mergedPrompts.length} prompts\n`);

  // Step 4: 输出 JSON
  console.log('[Step 4] Writing merged-prompts-full.json...');
  fs.writeFileSync(MERGED_OUTPUT_PATH, JSON.stringify(mergedPrompts, null, 2));
  const jsonSize = (fs.statSync(MERGED_OUTPUT_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ Written to ${MERGED_OUTPUT_PATH} (${jsonSize} MB)\n`);

  // Step 5: 输出 CSV
  console.log('[Step 5] Writing merged-prompts-full.csv...');
  const csvHeaders = [
    'id',
    'total_score',
    'llm_total',
    'bonus_total',
    'clarity_score',
    'detail_score',
    'completeness_score',
    'featured_bonus',
    'media_bonus',
    'commercial_bonus',
    'vertical',
    'subject_type',
    'visual_style',
    'requires_upload',
    'featured',
    'mediaCount',
    'commercial_prob',
    'recommendation',
    'title',
    'seo_intent',
    'keywords',
    'search_keywords',
    'highlights',
    'issues',
    'prompt',
  ];

  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return `"${value.join('; ').replace(/"/g, '""')}"`;
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [csvHeaders.join(',')];
  for (const p of mergedPrompts) {
    const row = csvHeaders.map((h) => escapeCSV((p as any)[h]));
    csvRows.push(row.join(','));
  }

  fs.writeFileSync(MERGED_CSV_PATH, csvRows.join('\n'));
  const csvSize = (fs.statSync(MERGED_CSV_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ Written to ${MERGED_CSV_PATH} (${csvSize} MB)\n`);

  // Step 6: 统计摘要
  console.log('========================================');
  console.log('  MERGE COMPLETE - Summary');
  console.log('========================================\n');

  console.log(`Total prompts: ${mergedPrompts.length}`);

  // Vertical 分布
  const verticalCounts: Record<string, number> = {};
  mergedPrompts.forEach((p) => {
    verticalCounts[p.vertical] = (verticalCounts[p.vertical] || 0) + 1;
  });
  console.log('\nVertical Distribution:');
  Object.entries(verticalCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([v, c]) => console.log(`  ${v}: ${c}`));

  // Recommendation 分布
  const recCounts: Record<string, number> = {};
  mergedPrompts.forEach((p) => {
    recCounts[p.recommendation] = (recCounts[p.recommendation] || 0) + 1;
  });
  console.log('\nRecommendation Distribution:');
  Object.entries(recCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([r, c]) => console.log(`  ${r}: ${c}`));

  // 图生图统计
  const requiresUploadCount = mergedPrompts.filter((p) => p.requires_upload).length;
  console.log(`\nRequires Upload: ${requiresUploadCount} (${((requiresUploadCount / mergedPrompts.length) * 100).toFixed(1)}%)`);

  // Featured 统计
  const featuredCount = mergedPrompts.filter((p) => p.featured).length;
  console.log(`Featured: ${featuredCount} (${((featuredCount / mergedPrompts.length) * 100).toFixed(1)}%)`);

  // Top 5
  console.log('\nTop 5 Prompts:');
  mergedPrompts.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.total_score}] ${p.title.substring(0, 50)}... (${p.vertical})`);
  });

  console.log('\n✅ Done!');
}

main();
