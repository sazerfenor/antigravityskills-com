/**
 * 语义三明治向量生成脚本 (Semantic Sandwich Embedding)
 * 
 * 基于产品经理架构设计：
 * - 不拆分 Case，每个 Case 作为完整向量单位
 * - 重组向量内容：Title + StructuredExtraction + OptimizedPrompt
 * - 输出：向量化后的数据，准备上传到 KV 存储
 * 
 * @see logs/optimized-prompts-diff-report.md
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// ==================== Types ====================

interface StructuredExtraction {
  subject: string;
  style: string;
  composition: string;
  technique: string;
}

interface TemplateVersion {
  enabled: boolean;
  optimizedFilled?: string;
  optimizedTemplate?: string;
  variables?: Array<{
    id: string;
    label: string;
    type: string;
    default_value?: string | null;
    placeholder?: string | null;
    description?: string;
    original_text?: string;
  }>;
  original_template?: string;
}

interface CaseItem {
  id: string;
  title: string;
  originalPrompt: string;
  optimizedPrompt: string;
  structuredExtraction?: StructuredExtraction;
  templateVersion?: TemplateVersion;
  tipsCompliance?: Record<string, string>;
  optimizedAt?: string;
}

interface CasesData {
  cases: CaseItem[];
}

interface SemanticEmbeddingResult {
  id: string;
  title: string;
  
  // 语义核心文本（用于生成向量）
  semanticText: string;
  
  // 向量
  vector: number[];
  
  // 精简 payload（只包含必要字段，不含 thumbnail 和 originalPrompt）
  payload: {
    id: string;
    title: string;
    optimizedPrompt: string;
    optimizedAt?: string;
  };
  
  // 元数据（用于过滤）
  metadata: {
    category?: string;
    hasImageUpload: boolean;
    keywords: string[];
  };
}

interface EmbeddingOutput {
  model: string;
  dimensions: number;
  generatedAt: string;
  totalCases: number;
  embeddings: SemanticEmbeddingResult[];
}

// ==================== Constants ====================

const GEMINI_EMBED_MODEL = 'text-embedding-004';
const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent`;

const INPUT_FILE = path.resolve(__dirname, '../src/data/cases-optimized.json');
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/cases-with-semantic-vectors.json');
const LOG_FILE = path.resolve(__dirname, '../logs/semantic-embedding-log.json');

// Rate limiting
const DELAY_BETWEEN_REQUESTS_MS = 200; // 200ms between requests to avoid rate limiting

// ==================== Core Functions ====================

/**
 * 构建语义三明治文本 (Semantic Sandwich)
 * 
 * 公式：Title + StructuredExtraction + OptimizedPrompt
 * 
 * 权重分布：
 * 1. Title + Subject/Style/Technique/Composition = 语义核心（高权重）
 * 2. OptimizedPrompt = 细节补充（次权重）
 */
function buildSemanticText(caseItem: CaseItem): string {
  const structured = caseItem.structuredExtraction;
  
  // 1. 语义核心（权重最高）
  const semanticCore = `
Style Case: ${caseItem.title}.
Subject: ${structured?.subject || 'Not specified'}.
Art Style: ${structured?.style || 'Not specified'}.
Technique: ${structured?.technique || 'Not specified'}.
Composition: ${structured?.composition || 'Not specified'}.
`.trim();

  // 2. 细节补充（权重次之）
  const detailContext = `
Full Description: ${caseItem.optimizedPrompt}
`.trim();

  // 3. 合并并转小写（有助于某些模型匹配）
  const fullText = `${semanticCore}\n\n${detailContext}`;
  
  return fullText.toLowerCase();
}

/**
 * 提取关键词（用于混合检索）
 * 从 structuredExtraction.style 和 technique 中提取
 */
function extractKeywords(caseItem: CaseItem): string[] {
  const keywords: string[] = [];
  const structured = caseItem.structuredExtraction;
  
  if (structured?.style) {
    // 分割 style 字段，提取关键词
    const styleKeywords = structured.style
      .split(/[,，、;；]/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 2);
    keywords.push(...styleKeywords);
  }
  
  if (structured?.technique) {
    const techKeywords = structured.technique
      .split(/[,，、;；]/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 2);
    keywords.push(...techKeywords);
  }
  
  // 去重
  return [...new Set(keywords)];
}

/**
 * 检测是否需要图片上传
 */
function detectImageUploadRequirement(caseItem: CaseItem): boolean {
  if (!caseItem.templateVersion?.variables) return false;
  
  return caseItem.templateVersion.variables.some(
    v => v.type === 'image_upload'
  );
}

/**
 * 调用 Gemini Embedding API
 */
async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const response = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini Embedding API failed: ${response.status} - ${errorText}`
    );
  }

  const data = (await response.json()) as {
    embedding?: { values?: number[] };
  };
  
  const embedding = data.embedding?.values || [];

  if (embedding.length === 0) {
    throw new Error('No embedding returned');
  }

  return embedding;
}

/**
 * 延时函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Main Process ====================

async function main() {
  console.log('🥪 Semantic Sandwich Embedding Generator');
  console.log('=' .repeat(50));
  
  // 1. 检查 API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }
  
  // 2. 读取 cases-optimized.json
  console.log(`\n📖 Loading cases from: ${INPUT_FILE}`);
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }
  
  const casesData: CasesData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const cases = casesData.cases;
  console.log(`✅ Loaded ${cases.length} cases`);
  
  // 3. 生成语义向量
  console.log(`\n🔧 Generating semantic embeddings...`);
  console.log(`   Model: ${GEMINI_EMBED_MODEL}`);
  console.log(`   Delay: ${DELAY_BETWEEN_REQUESTS_MS}ms between requests`);
  
  const results: SemanticEmbeddingResult[] = [];
  const errors: Array<{ id: string; error: string }> = [];
  
  for (let i = 0; i < cases.length; i++) {
    const caseItem = cases[i];
    const progress = `[${i + 1}/${cases.length}]`;
    
    try {
      // 3.1 构建语义三明治文本
      const semanticText = buildSemanticText(caseItem);
      
      // 3.2 生成向量
      const vector = await generateEmbedding(semanticText, apiKey);
      
      // 3.3 提取元数据
      const keywords = extractKeywords(caseItem);
      const hasImageUpload = detectImageUploadRequirement(caseItem);
      
      // 3.4 组装结果 - 只保存必要字段，减少 KV 存储大小
      const result: SemanticEmbeddingResult = {
        id: caseItem.id,
        title: caseItem.title,
        semanticText,
        vector,
        payload: {
          id: caseItem.id,
          title: caseItem.title,
          optimizedPrompt: caseItem.optimizedPrompt,
          optimizedAt: caseItem.optimizedAt,
          // 注意：不再存储 originalPrompt 和 thumbnail，以减少存储大小
        },
        metadata: {
          hasImageUpload,
          keywords,
        },
      };
      
      results.push(result);
      console.log(`${progress} ✅ ${caseItem.id}: ${caseItem.title} (${vector.length} dims)`);
      
      // 3.5 Rate limiting
      if (i < cases.length - 1) {
        await delay(DELAY_BETWEEN_REQUESTS_MS);
      }
      
    } catch (error: any) {
      console.error(`${progress} ❌ ${caseItem.id}: ${error.message}`);
      errors.push({ id: caseItem.id, error: error.message });
    }
  }
  
  // 4. 输出结果
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${results.length}`);
  console.log(`   ❌ Failed: ${errors.length}`);
  
  if (results.length === 0) {
    console.error('❌ No embeddings generated. Exiting.');
    process.exit(1);
  }
  
  // 5. 保存结果
  const output: EmbeddingOutput = {
    model: GEMINI_EMBED_MODEL,
    dimensions: results[0]?.vector.length || 0,
    generatedAt: new Date().toISOString(),
    totalCases: results.length,
    embeddings: results,
  };
  
  // 移除 vector 字段的单独文件（太大），只保存元数据
  const outputWithoutVectors = {
    ...output,
    embeddings: results.map(r => ({
      id: r.id,
      title: r.title,
      semanticTextPreview: r.semanticText.slice(0, 200) + '...',
      vectorDimensions: r.vector.length,
      metadata: r.metadata,
    })),
  };
  
  console.log(`\n💾 Saving results...`);
  
  // 保存完整数据（包含向量）
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`   📄 Full data: ${OUTPUT_FILE}`);
  
  // 保存日志（不含向量）
  const logData = {
    generatedAt: output.generatedAt,
    model: output.model,
    dimensions: output.dimensions,
    totalCases: output.totalCases,
    successCount: results.length,
    errorCount: errors.length,
    errors,
    caseSummary: outputWithoutVectors.embeddings,
  };
  
  fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2));
  console.log(`   📋 Log file: ${LOG_FILE}`);
  
  console.log(`\n✅ Done! Generated ${results.length} semantic embeddings.`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review the output file: ${OUTPUT_FILE}`);
  console.log(`   2. Upload to KV storage (Cloudflare Workers KV / Pinecone / etc.)`);
  console.log(`   3. Integrate with search API`);
}

// ==================== Entry Point ====================

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
