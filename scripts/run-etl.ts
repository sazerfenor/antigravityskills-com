/**
 * ETL Pipeline 2.0 - Batch Processing Script
 * 
 * 用法: npx tsx scripts/run-etl.ts
 * 
 * 功能:
 * 1. 读取 extracted-prompts.txt
 * 2. 并发调用 Gemini 执行 ETL
 * 3. 输出 processed_cases.json 和 audit_report.json
 * 
 * @module scripts/run-etl
 */

import fs from 'fs';
import path from 'path';

// ==================== 配置 ====================

const CONFIG = {
  /** 输入文件路径 */
  INPUT_FILE: 'src/data/extracted-prompts.txt',
  
  /** 输出目录 */
  OUTPUT_DIR: 'src/data/etl-results',
  
  /** ETL System Prompt 路径 */
  PROMPT_FILE: 'src/prompts/etl-style-extraction.md',
  
  /** 并发数 (避免 rate limit) */
  CONCURRENCY: 3,
  
  /** 请求间隔 (ms) */
  REQUEST_DELAY: 1500,
  
  /** Gemini 模型 - 使用最新 Gemini 3 Pro + 结构化输出 */
  MODEL: 'gemini-3-pro-preview',
  
  /** Temperature */
  TEMPERATURE: 0.3,
  
  /** 最大重试次数 */
  MAX_RETRIES: 2,
};

// ==================== 类型定义 ====================

interface ParsedCase {
  id: string;
  title: string;
  prompt: string;
}

interface ETLResponse {
  category: 'VISUAL' | 'LAYOUT' | 'EDITING' | 'UTILITY';
  template_payload: {
    template: string;
    default_subject: string;
    placeholder_type: 'subject' | 'topic' | 'target' | 'custom';
    additional_placeholders?: Array<{
      name: string;
      default_value: string;
      description?: string;
    }>;
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
}

interface ProcessResult {
  success: boolean;
  caseId: string;
  title: string;
  category?: string;
  data?: ETLResponse;
  error?: string;
  warnings: string[];
}

// ==================== 工具函数 ====================

/**
 * 解析 extracted-prompts.txt 文件
 */
function parseExtractedPrompts(filePath: string): ParsedCase[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cases: ParsedCase[] = [];
  
  // 按分隔符拆分
  const blocks = content.split(/^-{10,}$/m);
  
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    
    // 匹配 ## [id] title 格式
    const headerMatch = trimmed.match(/^##\s*\[([^\]]+)\]\s*(.+)$/m);
    if (!headerMatch) continue;
    
    const id = headerMatch[1];
    const title = headerMatch[2].trim();
    
    // 提取 prompt (header 之后的所有内容)
    const promptStart = trimmed.indexOf('\n', trimmed.indexOf(headerMatch[0]));
    const prompt = promptStart > 0 
      ? trimmed.slice(promptStart).trim()
      : '';
    
    if (prompt && prompt !== '(无 prompt)') {
      cases.push({ id, title, prompt });
    }
  }
  
  return cases;
}

/**
 * 分块数组
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

/**
 * ETL 输出的 JSON Schema（用于 Gemini 结构化输出）
 */
const ETL_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['VISUAL', 'LAYOUT', 'EDITING', 'UTILITY'],
      description: 'Category classification of the prompt'
    },
    template_payload: {
      type: 'object',
      properties: {
        template: { type: 'string', description: 'Prompt template with placeholder' },
        default_subject: { type: 'string', description: 'Default value for placeholder' },
        placeholder_type: { type: 'string', enum: ['subject', 'topic', 'target', 'custom'] }
      },
      required: ['template', 'default_subject', 'placeholder_type']
    },
    semantic_search_text: {
      type: 'string',
      description: 'Pure style description for vector search, NO nouns or params'
    },
    constraints: {
      type: 'object',
      properties: {
        requires_image_upload: { type: 'boolean' },
        original_aspect_ratio: { type: 'string' },
        model_hint: { type: 'string' },
        output_type: { type: 'string' }
      },
      required: ['requires_image_upload']
    },
    tags: {
      type: 'object',
      properties: {
        style: { type: 'array', items: { type: 'string' } },
        atmosphere: { type: 'array', items: { type: 'string' } },
        technique: { type: 'array', items: { type: 'string' } },
        composition: { type: 'array', items: { type: 'string' } },
        intent: { type: 'array', items: { type: 'string' } }
      },
      required: ['style', 'atmosphere', 'technique', 'composition', 'intent']
    },
    confidence: { type: 'number', description: 'Confidence score 0-1' },
    needs_review: { type: 'boolean' },
    review_reason: { type: 'string' }
  },
  required: ['category', 'template_payload', 'semantic_search_text', 'constraints', 'tags', 'confidence', 'needs_review']
};

/**
 * 调用 Gemini API 执行 ETL
 */
async function callETL(
  systemPrompt: string,
  caseData: ParsedCase
): Promise<ETLResponse> {
  const userMessage = `
[ID] ${caseData.id}
[TITLE] ${caseData.title}
[PROMPT]
${caseData.prompt}
`.trim();

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n---\n\n${userMessage}` }]
        }],
        generationConfig: {
          temperature: CONFIG.TEMPERATURE,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseJsonSchema: ETL_OUTPUT_SCHEMA,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    // 检查是否有 finish_reason 问题
    const finishReason = result.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      throw new Error(`Gemini finished with reason: ${finishReason}`);
    }
    throw new Error('No response text from Gemini');
  }

  // 清理可能的 markdown 代码块
  const cleanedText = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  return JSON.parse(cleanedText);
}

/**
 * 处理单个 case
 */
async function processCase(
  systemPrompt: string,
  caseData: ParsedCase
): Promise<ProcessResult> {
  const warnings: string[] = [];
  
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`  [${attempt}/${CONFIG.MAX_RETRIES}] Processing ${caseData.id}...`);
      
      const etlResult = await callETL(systemPrompt, caseData);
      
      // 验证结果
      if (!etlResult.semantic_search_text) {
        warnings.push('Missing semantic_search_text');
      }
      if (!etlResult.template_payload?.template) {
        warnings.push('Missing template');
      }
      
      // 检查是否包含禁止内容
      const forbiddenPatterns = [
        /\bcat\b/i, /\bdog\b/i, /\bbatman\b/i, /\bpikachu\b/i,
        /--ar\s*\d/i, /\bISO\s*\d/i, /\bf\/\d/i,
      ];
      
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(etlResult.semantic_search_text)) {
          warnings.push(`semantic_search_text may contain forbidden content: ${pattern}`);
        }
      }
      
      return {
        success: true,
        caseId: caseData.id,
        title: caseData.title,
        category: etlResult.category,
        data: etlResult,
        warnings,
      };
      
    } catch (error: any) {
      console.error(`  ❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < CONFIG.MAX_RETRIES) {
        await sleep(2000);
      } else {
        return {
          success: false,
          caseId: caseData.id,
          title: caseData.title,
          error: error.message,
          warnings,
        };
      }
    }
  }
  
  // Should never reach here
  return {
    success: false,
    caseId: caseData.id,
    title: caseData.title,
    error: 'Unknown error',
    warnings,
  };
}

// ==================== 主函数 ====================

async function main() {
  console.log('🚀 ETL Pipeline 2.0 - Batch Processing');
  console.log('='.repeat(60));
  
  // 1. 读取 System Prompt
  const promptPath = path.join(process.cwd(), CONFIG.PROMPT_FILE);
  if (!fs.existsSync(promptPath)) {
    console.error(`❌ ETL prompt not found: ${promptPath}`);
    process.exit(1);
  }
  const systemPrompt = fs.readFileSync(promptPath, 'utf-8');
  console.log(`✅ Loaded system prompt (${systemPrompt.length} chars)`);
  
  // 2. 读取源数据
  const inputPath = path.join(process.cwd(), CONFIG.INPUT_FILE);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }
  const cases = parseExtractedPrompts(inputPath);
  console.log(`📦 Parsed ${cases.length} cases`);
  
  // 3. 创建输出目录
  const outputDir = path.join(process.cwd(), CONFIG.OUTPUT_DIR);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 4. 批量处理
  const results: ProcessResult[] = [];
  const batches = chunk(cases, CONFIG.CONCURRENCY);
  
  console.log(`\n🔄 Processing ${batches.length} batches (concurrency: ${CONFIG.CONCURRENCY})`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n📦 Batch ${i + 1}/${batches.length}`);
    
    const batchResults = await Promise.all(
      batch.map(c => processCase(systemPrompt, c))
    );
    
    results.push(...batchResults);
    
    // 进度
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    console.log(`  ✅ Success: ${successCount}, ❌ Failed: ${errorCount}`);
    
    // Rate limit 保护
    if (i < batches.length - 1) {
      console.log(`  ⏳ Waiting ${CONFIG.REQUEST_DELAY}ms...`);
      await sleep(CONFIG.REQUEST_DELAY);
    }
  }
  
  // 5. 生成报告
  console.log('\n📊 Generating reports...');
  
  // 统计
  const categoryBreakdown = {
    VISUAL: 0,
    LAYOUT: 0,
    EDITING: 0,
    UTILITY: 0,
  };
  
  for (const result of results) {
    if (result.success && result.category) {
      categoryBreakdown[result.category as keyof typeof categoryBreakdown]++;
    }
  }
  
  const report = {
    processedAt: new Date().toISOString(),
    totalCount: cases.length,
    successCount: results.filter(r => r.success).length,
    errorCount: results.filter(r => !r.success).length,
    categoryBreakdown,
    needsReviewCount: results.filter(r => r.success && r.data?.needs_review).length,
  };
  
  // 输出处理结果
  fs.writeFileSync(
    path.join(outputDir, 'processed_cases.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  
  // 输出审核报告
  const auditEntries = results
    .filter(r => r.success && r.data)
    .filter(r => 
      r.data!.needs_review || 
      r.data!.category === 'LAYOUT' || 
      r.data!.category === 'EDITING'
    )
    .map(r => ({
      id: r.caseId,
      title: r.title,
      category: r.data!.category,
      before: cases.find(c => c.id === r.caseId)?.prompt.slice(0, 200) || '',
      after: r.data!.semantic_search_text,
      template: r.data!.template_payload.template,
      confidence: r.data!.confidence,
      needs_review: true,
      review_reason: r.data!.review_reason || 'Category requires manual review',
      review_status: 'pending',
    }));
  
  fs.writeFileSync(
    path.join(outputDir, 'audit_report.json'),
    JSON.stringify({
      ...report,
      entries: auditEntries,
    }, null, 2),
    'utf-8'
  );
  
  // 6. 打印摘要
  console.log('\n' + '='.repeat(60));
  console.log('📋 ETL Processing Complete!');
  console.log('='.repeat(60));
  console.log(`  Total:   ${report.totalCount}`);
  console.log(`  Success: ${report.successCount}`);
  console.log(`  Failed:  ${report.errorCount}`);
  console.log('\n  Category Breakdown:');
  console.log(`    VISUAL:  ${categoryBreakdown.VISUAL}`);
  console.log(`    LAYOUT:  ${categoryBreakdown.LAYOUT}`);
  console.log(`    EDITING: ${categoryBreakdown.EDITING}`);
  console.log(`    UTILITY: ${categoryBreakdown.UTILITY}`);
  console.log(`\n  Needs Review: ${report.needsReviewCount}`);
  console.log('\n  Output Files:');
  console.log(`    ${path.join(CONFIG.OUTPUT_DIR, 'processed_cases.json')}`);
  console.log(`    ${path.join(CONFIG.OUTPUT_DIR, 'audit_report.json')}`);
}

// 运行
main().catch(console.error);
