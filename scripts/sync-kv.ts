/**
 * Sync CaseV2 data to KV
 * 
 * 用法: 
 * - 本地调试: 直接运行生成 API 调用文件
 * - 生产: 通过 /api/admin/cases/sync-v2 接口调用
 * 
 * @module scripts/sync-kv
 */

import fs from 'fs';
import path from 'path';

// ==================== 配置 ====================

const CONFIG = {
  /** 输入文件 (768 维版本) */
  INPUT_FILE: 'src/data/cases-v2-with-vectors.json',
  
  /** 输出 API payload 文件 */
  OUTPUT_API_FILE: 'src/data/kv-sync-payload.json',
  
  /** 输出 index manifest */
  OUTPUT_INDEX_FILE: 'src/data/case-v2-index.json',
};

// ==================== Types ====================

interface CaseV2WithVector {
  id: string;
  title: string;
  version: '2.0';
  category: string;
  origin_prompt: string;
  template_payload: {
    template: string;
    default_subject: string;
    placeholder_type: string;
  };
  semantic_search_text: string;
  constraints: {
    requires_image_upload: boolean;
    original_aspect_ratio?: string;
    model_hint?: string;
    output_type?: string;
  };
  tags: {
    style: string[];
    atmosphere: string[];
    technique: string[];
    composition: string[];
    intent: string[];
  };
  vector: number[];
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  etl_metadata: {
    confidence: number;
    needs_review: boolean;
    review_reason?: string;
    processed_at: string;
  };
}

interface MigrationInput {
  model: string;
  dimensions: number;
  generatedAt: string;
  totalCases: number;
  cases: CaseV2WithVector[];
}

/**
 * KV 存储格式
 */
interface CaseV2KVEntry {
  key: string;  // "case-v2:{id}"
  value: {
    id: string;
    title: string;
    version: '2.0';
    category: string;
    semanticText: string;
    vector: number[];
    payload: {
      template_payload: CaseV2WithVector['template_payload'];
      constraints: CaseV2WithVector['constraints'];
      tags: CaseV2WithVector['tags'];
      origin_prompt: string;
      thumbnail: string;
    };
    metadata: {
      category: string;
      requires_image_upload: boolean;
      createdAt: string;
      updatedAt: string;
    };
  };
}

// ==================== Main ====================

async function main() {
  console.log('🚀 KV Sync Preparation Script');
  console.log('='.repeat(60));
  
  // 1. 加载数据
  console.log('\n📖 Loading vectorized data...');
  const inputPath = path.join(process.cwd(), CONFIG.INPUT_FILE);
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    console.log('   请先运行: npx tsx scripts/vectorize-migration.ts');
    process.exit(1);
  }
  
  const data: MigrationInput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`   Total cases: ${data.totalCases}`);
  console.log(`   Model: ${data.model}`);
  console.log(`   Dimensions: ${data.dimensions}`);
  
  // 验证维度
  if (data.dimensions !== 768) {
    console.error(`❌ Invalid dimensions: ${data.dimensions}. Expected 768.`);
    console.log('   请使用 text-embedding-004 @ 768 dims 重新生成');
    process.exit(1);
  }
  
  // 2. 转换为 KV 格式
  console.log('\n🔄 Converting to KV format...');
  
  const kvEntries: CaseV2KVEntry[] = data.cases.map(c => ({
    key: `case-v2:${c.id}`,
    value: {
      id: c.id,
      title: c.title,
      version: '2.0',
      category: c.category,
      semanticText: c.semantic_search_text,
      vector: c.vector,
      payload: {
        template_payload: c.template_payload,
        constraints: c.constraints,
        tags: c.tags,
        origin_prompt: c.origin_prompt,
        thumbnail: c.thumbnail,
      },
      metadata: {
        category: c.category,
        requires_image_upload: c.constraints.requires_image_upload,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
    },
  }));
  
  // 3. 生成 Index Manifest
  const indexManifest = {
    version: '2.0',
    model: data.model,
    dimensions: data.dimensions,
    generatedAt: data.generatedAt,
    totalCases: data.totalCases,
    ids: data.cases.map(c => c.id),
    categories: {
      VISUAL: data.cases.filter(c => c.category === 'VISUAL').map(c => c.id),
      EDITING: data.cases.filter(c => c.category === 'EDITING').map(c => c.id),
      LAYOUT: data.cases.filter(c => c.category === 'LAYOUT').map(c => c.id),
      UTILITY: data.cases.filter(c => c.category === 'UTILITY').map(c => c.id),
    },
  };
  
  // 4. 保存输出
  console.log('\n💾 Saving outputs...');
  
  // API Payload (用于批量 PUT)
  const apiPayload = {
    action: 'sync-v2',
    entries: kvEntries,
    indexManifest,
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.OUTPUT_API_FILE),
    JSON.stringify(apiPayload, null, 2),
    'utf-8'
  );
  console.log(`   ✅ API payload: ${CONFIG.OUTPUT_API_FILE}`);
  
  // Index manifest
  fs.writeFileSync(
    path.join(process.cwd(), CONFIG.OUTPUT_INDEX_FILE),
    JSON.stringify(indexManifest, null, 2),
    'utf-8'
  );
  console.log(`   ✅ Index manifest: ${CONFIG.OUTPUT_INDEX_FILE}`);
  
  // 5. 统计
  console.log('\n📊 Summary:');
  console.log(`   Total entries: ${kvEntries.length}`);
  console.log(`   VISUAL: ${indexManifest.categories.VISUAL.length}`);
  console.log(`   EDITING: ${indexManifest.categories.EDITING.length}`);
  console.log(`   LAYOUT: ${indexManifest.categories.LAYOUT.length}`);
  console.log(`   UTILITY: ${indexManifest.categories.UTILITY.length}`);
  
  // 计算存储大小
  const totalSize = JSON.stringify(apiPayload).length;
  console.log(`\n   Total payload size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n✅ Preparation complete!');
  console.log('   下一步: 通过 API 将数据同步到 KV');
  console.log('   POST /api/admin/cases/sync-v2 with payload from kv-sync-payload.json');
}

main().catch(console.error);
