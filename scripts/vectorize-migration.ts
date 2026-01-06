/**
 * Vectorize Migration Script
 * 
 * Phase 1: 将清洗好的 136 条数据向量化并写入 JSON 文件
 * 
 * 用法: npx tsx scripts/vectorize-migration.ts
 * 
 * 注意：由于脚本无法直接访问 Cloudflare Workers KV，
 * 这个脚本生成带向量的 JSON 文件，然后通过 sync-to-kv API 入库
 * 
 * @module scripts/vectorize-migration
 */

import fs from 'fs';
import path from 'path';

// ==================== 配置 ====================

const CONFIG = {
  /** 输入：ETL 处理结果 */
  INPUT_FILE: 'src/data/etl-results/processed_cases.json',
  
  /** 输入：原始 prompts (用于提取 origin_prompt) */
  PROMPTS_FILE: 'src/data/extracted-prompts.txt',
  
  /** 输出：带向量的 CaseV2 数据 */
  OUTPUT_FILE: 'src/data/cases-v2-with-vectors.json',
  
  /** Embedding 模型 - Google 最强检索模型 */
  EMBEDDING_MODEL: 'text-embedding-004',
  
  /** 强制 768 维输出 - 行业标准 */
  OUTPUT_DIMENSIONS: 768,
  
  /** 并发数 */
  CONCURRENCY: 5,
  
  /** 请求间隔 (ms) */
  REQUEST_DELAY: 500,
};

// ==================== Types ====================

interface ProcessedCase {
  success: boolean;
  caseId: string;
  title: string;
  category?: string;
  data?: {
    category: string;
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
    confidence: number;
    needs_review: boolean;
    review_reason?: string;
  };
  error?: string;
  warnings?: string[];
}

interface CaseV2WithVector {
  id: string;
  title: string;
  version: '2.0';
  category: string;
  origin_prompt: string;
  template_payload: ProcessedCase['data']['template_payload'];
  semantic_search_text: string;
  constraints: ProcessedCase['data']['constraints'];
  tags: ProcessedCase['data']['tags'];
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

interface MigrationOutput {
  model: string;
  dimensions: number;
  generatedAt: string;
  totalCases: number;
  cases: CaseV2WithVector[];
}

// ==================== Functions ====================

/**
 * 解析 extracted-prompts.txt 获取原始 prompts
 */
function parseExtractedPrompts(filePath: string): Map<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const prompts = new Map<string, string>();
  const blocks = content.split(/^-{10,}$/m);
  
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    
    const headerMatch = trimmed.match(/^##\s*\[([^\]]+)\]\s*(.+)$/m);
    if (!headerMatch) continue;
    
    const id = headerMatch[1];
    const promptStart = trimmed.indexOf('\n', trimmed.indexOf(headerMatch[0]));
    const prompt = promptStart > 0 ? trimmed.slice(promptStart).trim() : '';
    
    if (prompt && prompt !== '(无 prompt)') {
      prompts.set(id, prompt);
    }
  }
  
  return prompts;
}

/**
 * 生成 Embedding (768 维)
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${CONFIG.EMBEDDING_MODEL}`,
        content: {
          parts: [{ text }]
        },
        // 强制 768 维输出
        outputDimensionality: CONFIG.OUTPUT_DIMENSIONS,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const embedding = result.embedding?.values;
  
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Invalid embedding response');
  }

  return embedding;
}

/**
 * 分块
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * 延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Main ====================

async function main() {
  console.log('🚀 Vectorize Migration Script');
  console.log('='.repeat(60));
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing GEMINI_API_KEY');
    process.exit(1);
  }
  
  // 1. 加载 ETL 处理结果
  console.log('\n📖 Loading processed cases...');
  const processedCases: ProcessedCase[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), CONFIG.INPUT_FILE), 'utf-8')
  );
  const successCases = processedCases.filter(c => c.success && c.data);
  console.log(`   Total: ${processedCases.length}, Success: ${successCases.length}`);
  
  // 2. 加载原始 prompts
  console.log('\n📖 Loading original prompts...');
  const originalPrompts = parseExtractedPrompts(
    path.join(process.cwd(), CONFIG.PROMPTS_FILE)
  );
  console.log(`   Found ${originalPrompts.size} original prompts`);
  
  // 3. 向量化
  console.log('\n🔄 Generating embeddings...');
  console.log(`   Model: ${CONFIG.EMBEDDING_MODEL}`);
  console.log(`   Concurrency: ${CONFIG.CONCURRENCY}`);
  
  const casesWithVectors: CaseV2WithVector[] = [];
  const batches = chunk(successCases, CONFIG.CONCURRENCY);
  let totalProcessed = 0;
  let embeddingDimensions = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n   Batch ${i + 1}/${batches.length}`);
    
    const batchResults = await Promise.all(
      batch.map(async (caseData) => {
        try {
          const vector = await generateEmbedding(caseData.data!.semantic_search_text, apiKey);
          
          if (embeddingDimensions === 0) {
            embeddingDimensions = vector.length;
            console.log(`   📐 Embedding dimensions: ${embeddingDimensions}`);
          }
          
          const caseV2: CaseV2WithVector = {
            id: caseData.caseId,
            title: caseData.title,
            version: '2.0',
            category: caseData.data!.category,
            origin_prompt: originalPrompts.get(caseData.caseId) || '',
            template_payload: caseData.data!.template_payload,
            semantic_search_text: caseData.data!.semantic_search_text,
            constraints: caseData.data!.constraints,
            tags: caseData.data!.tags,
            vector,
            thumbnail: '',  // 需要后续补充
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            etl_metadata: {
              confidence: caseData.data!.confidence,
              needs_review: caseData.data!.needs_review,
              review_reason: caseData.data!.review_reason,
              processed_at: new Date().toISOString(),
            },
          };
          
          return { success: true, case: caseV2, id: caseData.caseId };
        } catch (error: any) {
          return { success: false, case: null, id: caseData.caseId, error: error.message };
        }
      })
    );
    
    // 收集结果
    for (const result of batchResults) {
      if (result.success && result.case) {
        casesWithVectors.push(result.case);
        totalProcessed++;
      } else {
        console.log(`   ❌ Failed: ${result.id} - ${result.error}`);
      }
    }
    
    console.log(`   ✅ Processed: ${totalProcessed}/${successCases.length}`);
    
    // Rate limit 保护
    if (i < batches.length - 1) {
      await sleep(CONFIG.REQUEST_DELAY);
    }
  }
  
  // 4. 保存结果
  console.log('\n💾 Saving results...');
  
  const output: MigrationOutput = {
    model: CONFIG.EMBEDDING_MODEL,
    dimensions: embeddingDimensions,
    generatedAt: new Date().toISOString(),
    totalCases: casesWithVectors.length,
    cases: casesWithVectors,
  };
  
  const outputPath = path.join(process.cwd(), CONFIG.OUTPUT_FILE);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n✅ Migration complete!`);
  console.log(`   Output: ${CONFIG.OUTPUT_FILE}`);
  console.log(`   Total cases: ${casesWithVectors.length}`);
  console.log(`   Embedding model: ${CONFIG.EMBEDDING_MODEL}`);
  console.log(`   Dimensions: ${embeddingDimensions}`);
  
  // 5. 类别统计
  const categoryBreakdown = casesWithVectors.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 Category breakdown:');
  for (const [category, count] of Object.entries(categoryBreakdown)) {
    console.log(`   ${category}: ${count}`);
  }
}

main().catch(console.error);
