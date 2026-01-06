/**
 * 重跑失败的 ETL cases
 * 
 * 用法: npx tsx scripts/etl-retry-failed.ts
 */

import fs from 'fs';
import path from 'path';

// ==================== 配置 ====================

const CONFIG = {
  PROMPT_FILE: 'src/prompts/etl-style-extraction.md',
  INPUT_FILE: 'src/data/extracted-prompts.txt',
  OUTPUT_FILE: 'src/data/etl-results/processed_cases.json',
  MODEL: 'gemini-3-pro-preview',
  TEMPERATURE: 0.3,
  MAX_OUTPUT_TOKENS: 16384,  // 提升到 16K
  FAILED_IDS: ['example_25', 'example_90'],  // 需要重跑的 case IDs
};

// ==================== Schema ====================

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

// ==================== 解析 ====================

interface ParsedCase {
  id: string;
  title: string;
  prompt: string;
}

function parseExtractedPrompts(filePath: string): ParsedCase[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cases: ParsedCase[] = [];
  const blocks = content.split(/^-{10,}$/m);
  
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    
    const headerMatch = trimmed.match(/^##\s*\[([^\]]+)\]\s*(.+)$/m);
    if (!headerMatch) continue;
    
    const id = headerMatch[1];
    const title = headerMatch[2].trim();
    const promptStart = trimmed.indexOf('\n', trimmed.indexOf(headerMatch[0]));
    const prompt = promptStart > 0 ? trimmed.slice(promptStart).trim() : '';
    
    if (prompt && prompt !== '(无 prompt)') {
      cases.push({ id, title, prompt });
    }
  }
  return cases;
}

// ==================== API 调用 ====================

async function callETL(systemPrompt: string, caseData: ParsedCase): Promise<any> {
  const userMessage = `
[ID] ${caseData.id}
[TITLE] ${caseData.title}
[PROMPT]
${caseData.prompt}
`.trim();

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  console.log(`  📤 Calling Gemini API with maxOutputTokens: ${CONFIG.MAX_OUTPUT_TOKENS}`);

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
          maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS,
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
    const finishReason = result.candidates?.[0]?.finishReason;
    throw new Error(`No response text. finishReason: ${finishReason}`);
  }

  return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
}

// ==================== 主函数 ====================

async function main() {
  console.log('🔄 ETL Retry Failed Cases');
  console.log('='.repeat(60));
  console.log(`  Max Output Tokens: ${CONFIG.MAX_OUTPUT_TOKENS}`);
  console.log(`  Failed IDs: ${CONFIG.FAILED_IDS.join(', ')}`);
  console.log('');

  // 1. 加载 System Prompt
  const systemPrompt = fs.readFileSync(path.join(process.cwd(), CONFIG.PROMPT_FILE), 'utf-8');
  console.log(`✅ Loaded system prompt`);

  // 2. 解析原始 prompts
  const allCases = parseExtractedPrompts(path.join(process.cwd(), CONFIG.INPUT_FILE));
  const failedCases = allCases.filter(c => CONFIG.FAILED_IDS.includes(c.id));
  console.log(`📦 Found ${failedCases.length} cases to retry`);

  // 3. 加载现有结果
  const outputPath = path.join(process.cwd(), CONFIG.OUTPUT_FILE);
  const existingResults = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  console.log(`📖 Loaded ${existingResults.length} existing results`);

  // 4. 重跑失败的 cases
  for (const caseData of failedCases) {
    console.log(`\n🔄 Retrying ${caseData.id}: ${caseData.title}`);
    
    try {
      const etlResult = await callETL(systemPrompt, caseData);
      
      // 找到并更新原结果
      const idx = existingResults.findIndex((r: any) => r.caseId === caseData.id);
      if (idx >= 0) {
        existingResults[idx] = {
          success: true,
          caseId: caseData.id,
          title: caseData.title,
          category: etlResult.category,
          data: etlResult,
          warnings: [],
        };
        console.log(`  ✅ Success! Category: ${etlResult.category}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }

  // 5. 保存更新后的结果
  fs.writeFileSync(outputPath, JSON.stringify(existingResults, null, 2), 'utf-8');
  console.log(`\n✅ Updated ${CONFIG.OUTPUT_FILE}`);

  // 6. 统计
  const successCount = existingResults.filter((r: any) => r.success).length;
  const failedCount = existingResults.filter((r: any) => !r.success).length;
  console.log(`\n📊 Final: ${successCount} success, ${failedCount} failed`);
}

main().catch(console.error);
