/**
 * ETL Script V3.0 - AI Template Detection + Dual-Version Generation
 * 
 * Stage 1: Extract raw data + AI cleaning (same as V2)
 * Stage 1.5: AI Template Detection (NEW)
 * Stage 2: Generate embeddings from cleaned data
 * 
 * Usage:
 * - Full pipeline: pnpm tsx scripts/process-cases-v3.ts
 * - Stage 1 only: pnpm tsx scripts/process-cases-v3.ts --stage=clean
 * - Stage 1.5 only: pnpm tsx scripts/process-cases-v3.ts --stage=template
 * - Stage 2 only: pnpm tsx scripts/process-cases-v3.ts --stage=embed
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { generateText } from '../src/shared/services/gemini-text';

// ==================== INTERFACES ====================

interface RawCaseData {
  id: string;
  title: string;
  prompt: string;
  thumbnail: string;
  author: string;
}

interface StructuredMetadata {
  subject: string;
  style: string;
  inferred_intent: string[];
  technique: string;
  search_optimized_text: string;
}

interface TemplateVariable {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'image_upload';
  default_value: string;
  placeholder?: string;
  description?: string;
  original_text: string;
}

interface TemplateSchema {
  enabled: boolean;
  original_prompt: string;
  filled_prompt: string;
  template_prompt: string;
  variables: TemplateVariable[];
  ai_detection: {
    confidence: number;
    method: 'ai_semantic';
    generated_at: string;
  };
}

interface CleanedCaseData extends RawCaseData {
  structured: StructuredMetadata;
  categories: string[];
}

interface CaseWithTemplate extends CleanedCaseData {
  template?: TemplateSchema;
  case_type: 'ready' | 'customizable' | 'template';
}

interface CaseWithEmbedding extends CaseWithTemplate {
  embedding: number[];
}

// ==================== STAGE 1: AI CLEANING (REUSE FROM V2) ====================

const AI_CLEANING_SYSTEM_PROMPT = `# Role
You are a Senior Data Engineer for an AI Image RAG System. 
Your goal is to transform raw user prompts into "High-Density Semantic Vectors".

# Task
Analyze the [Raw Prompt] and extract structured metadata.
CRITICAL: You must infer the *implied* usage and expand on synonyms.

# Output Schema (JSON ONLY, NO MARKDOWN)
{
  "subject": "Core subject (e.g., '3D Polaroid Camera')",
  "style": "Visual style (e.g., 'Minimalist Product Photography')",
  "inferred_intent": ["Logo Design", "App Icon", "Marketing Poster"],
  "technique": "Rendering technique (e.g., 'Octane Render')",
  "search_optimized_text": "dense english keywords lowercase no-stopwords synonym-expanded"
}

# Rules for "search_optimized_text"
1. MUST BE IN ENGLISH (translate if needed)
2. Include synonyms (Glass -> transparent translucent crystal)
3. Include Subject + Style + Technique + Intent keywords
4. NO stop words (a/an/the/with/featuring)
5. Lowercase only
6. Space-separated

# Rules for "inferred_intent"
Infer use cases based on visual style:
- Simple shapes + Clean → Logo, Icon, UI
- Text-heavy → Poster, Flyer
- Characters → Avatar, Profile
- Products → E-commerce, Marketing
- Diagrams → Infographic, Presentation

Return ONLY the JSON object, no explanation.`;

async function cleanPromptWithAI(
  rawPrompt: string,
  title: string
): Promise<StructuredMetadata> {
  const userPrompt = `Title: "${title}"\nRaw Prompt: "${rawPrompt}"\n\nExtract structured metadata:`;

  try {
    const aiResponse = await generateText(
      AI_CLEANING_SYSTEM_PROMPT + '\n\n' + userPrompt,
      { temperature: 0.3, maxOutputTokens: 512 }
    );

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as StructuredMetadata;

    if (!parsed.subject || !parsed.search_optimized_text) {
      throw new Error('Missing required fields in AI response');
    }

    return parsed;
  } catch (error) {
    console.error('AI cleaning failed:', error);
    return {
      subject: title,
      style: 'Unknown',
      inferred_intent: ['General'],
      technique: 'Unknown',
      search_optimized_text: `${title} ${rawPrompt}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 30)
        .join(' '),
    };
  }
}

function categorizeCase(
  structured: StructuredMetadata,
  title: string
): string[] {
  const categories = new Set<string>();

  for (const intent of structured.inferred_intent) {
    const intentLower = intent.toLowerCase();
    if (intentLower.includes('logo') || intentLower.includes('icon')) {
      categories.add('logo_icon');
    }
    if (intentLower.includes('poster') || intentLower.includes('flyer')) {
      categories.add('poster_design');
    }
    if (intentLower.includes('app') || intentLower.includes('ui')) {
      categories.add('ui_design');
    }
  }

  const text = structured.search_optimized_text.toLowerCase();
  if (text.includes('3d') || text.includes('render')) {
    categories.add('3d_rendering');
  }
  if (
    text.includes('glass') ||
    text.includes('crystal') ||
    text.includes('transparent')
  ) {
    categories.add('glass_material');
  }
  if (text.includes('portrait') || text.includes('character')) {
    categories.add('character');
  }
  if (text.includes('product')) {
    categories.add('product');
  }

  return Array.from(categories).slice(0, 5);
}

// ==================== STAGE 1.5: AI TEMPLATE DETECTION (NEW) ====================

const TEMPLATE_ANALYSIS_PROMPT = `# Role
You are a Prompt Engineering Expert specializing in Template Extraction.

# Task
Analyze the [Raw Prompt] and determine if it contains user-fillable variables.

## Smart Detection Rules
1. **Explicit Placeholders**: {Variable}, [[Input]], []
2. **Semantic Dependencies**: "uploaded image", "reference character", "article content"
3. **Context Understanding**: Distinguish "{emphasis}" (style) from "{Variable}" (input)

## Variable Types
- text: Short input (e.g., name, title)
- textarea: Long input (e.g., article, description)
- image_upload: Requires user to upload image

## Output Schema (JSON ONLY, NO MARKDOWN)
{
  "is_template": true/false,
  "confidence": 0.0-1.0,
  "variables": [
    {
      "id": "character_name",
      "label": "Character Name",
      "type": "text",
      "default_value": "炎柱·炼狱杏寿郎",
      "placeholder": "e.g., 水柱·富冈义勇",
      "description": "The protagonist appearing on the card",
      "original_text": "{Character Name}"
    }
  ],
  "filled_prompt": "The card protagonist is 炎柱·炼狱杏寿郎...",
  "template_prompt": "The card protagonist is {{character_name}}..."
}

# Important
- If no variables found, return is_template: false, variables: []
- For filled_prompt, generate high-quality, realistic default values
- For template_prompt, use {{variable_id}} syntax
- Confidence: 0.9+ if explicit {}, 0.7-0.8 if semantic, 0.5-0.6 if ambiguous

Return ONLY the JSON object.`;

async function analyzeTemplate(
  prompt: string,
  title: string,
  retryCount: number = 0
): Promise<TemplateSchema | null> {
  const userPrompt = `Title: "${title}"\nRaw Prompt: "${prompt}"\n\nAnalyze for template variables:`;

  try {
    const aiResponse = await generateText(
      TEMPLATE_ANALYSIS_PROMPT + '\n\n' + userPrompt,
      { temperature: 0.1, maxOutputTokens: 2048 } // Lower temperature, more tokens
    );

    // Try multiple JSON extraction methods
    let jsonStr: string | null = null;
    
    // Method 1: Match between { and }
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    // Method 2: Remove markdown code blocks
    if (!jsonStr) {
      const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
    }
    
    if (!jsonStr) {
      // Method 3: Find first { to last }
      const firstBrace = aiResponse.indexOf('{');
      const lastBrace = aiResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = aiResponse.substring(firstBrace, lastBrace + 1);
      }
    }
    
    if (!jsonStr) {
      throw new Error('No JSON found in AI response');
    }

    // Clean up common JSON issues
    jsonStr = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines in strings
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      // Try to fix common issues
      // Replace unescaped quotes in strings
      const fixed = jsonStr.replace(/(?<!\\)"/g, '\\"').replace(/\\\\"/g, '\\"');
      parsed = JSON.parse(fixed);
    }

    if (!parsed.is_template || parsed.confidence < 0.5) {
      return null; // Not a template
    }

    return {
      enabled: true,
      original_prompt: prompt,
      filled_prompt: parsed.filled_prompt || prompt,
      template_prompt: parsed.template_prompt || prompt,
      variables: parsed.variables || [],
      ai_detection: {
        confidence: parsed.confidence,
        method: 'ai_semantic',
        generated_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    // Retry logic
    if (retryCount < 2) {
      console.error(`Template analysis failed (attempt ${retryCount + 1}/3), retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return analyzeTemplate(prompt, title, retryCount + 1);
    }
    
    console.error('Template analysis failed after 3 attempts:', error);
    return null;
  }
}

function determineCaseType(template: TemplateSchema | null): string {
  if (!template) return 'ready';
  if (template.variables.length === 0) return 'ready';
  if (template.variables.length >= 3) return 'template';
  return 'customizable';
}

// ==================== MAIN PIPELINE ====================

function extractRawCases(content: string): RawCaseData[] {
  const cases: RawCaseData[] = [];
  const regex =
    /<!--\s*(Example|Case)\s+(\d+):\s*([^(]+?)\s*\(by\s+@([^)]+)\)\s*-->/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const [fullMatch, type, number, title, author] = match;
    const id = `${type.toLowerCase()}_${number}`;

    try {
      const startPos = match.index + fullMatch.length;
      const nextCommentMatch = content
        .substring(startPos)
        .search(/<!--\s*(Example|Case)\s+\d+:/);
      const blockEnd =
        nextCommentMatch === -1 ? content.length : startPos + nextCommentMatch;
      const block = content.substring(startPos, blockEnd);

      const promptMatch = block.match(/\*\*[Pp]rompt:\*\*\s*```([^`]+)```/s);
      const prompt = promptMatch ? promptMatch[1].trim() : '';

      if (!prompt) {
        console.warn(`Skipping ${id} - no prompt found`);
        continue;
      }

      let thumbnail = '';
      const outputMatch = block.match(/src="([^"]*output[^"]*)"/i);
      if (outputMatch) {
        thumbnail = outputMatch[1];
      } else {
        const anyImageMatch = block.match(/src="(images\/[^"]+)"/);
        if (anyImageMatch) {
          thumbnail = anyImageMatch[1];
        }
      }

      cases.push({
        id,
        title: title.trim(),
        prompt,
        thumbnail,
        author: `@${author.trim()}`,
      });
    } catch (error) {
      console.error(`Error processing ${id}:`, error);
    }
  }

  return cases;
}

async function runStage1() {
  console.log('🚀 Stage 1: AI Cleaning\n');

  const readmePath = resolve(process.cwd(), 'prompts/README_en.md');
  console.log(`📖 Reading: ${readmePath}`);
  const content = readFileSync(readmePath, 'utf-8');

  console.log('🔍 Extracting raw cases...');
  const rawCases = extractRawCases(content);
  console.log(`✅ Extracted ${rawCases.length} raw cases\n`);

  console.log('🤖 Cleaning with AI...');
  const cleanedCases: CleanedCaseData[] = [];

  for (let i = 0; i < rawCases.length; i++) {
    const rawCase = rawCases[i];
    const progress = ((i + 1) / rawCases.length) * 100;

    try {
      const structured = await cleanPromptWithAI(rawCase.prompt, rawCase.title);
      const categories = categorizeCase(structured, rawCase.title);

      cleanedCases.push({
        ...rawCase,
        structured,
        categories,
      });

      console.log(
        `  [${i + 1}/${rawCases.length}] ${rawCase.id} (${progress.toFixed(1)}%)`
      );

      await new Promise((resolve) => setTimeout(resolve, 8000));
    } catch (error) {
      console.error(`  ❌ Failed to clean ${rawCase.id}:`, error);
    }
  }

  const outputPath = resolve(process.cwd(), 'src/data/cases-cleaned.json');
  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        cases: cleanedCases,
        metadata: {
          total_cases: cleanedCases.length,
          generated_at: new Date().toISOString(),
          stage: 'cleaned',
        },
      },
      null,
      2
    )
  );

  console.log(`\n✅ Stage 1 Complete!`);
  console.log(`📦 Output: ${outputPath}`);
  console.log(`📊 Cleaned: ${cleanedCases.length} cases`);
}

async function runStage1_5() {
  console.log('🚀 Stage 1.5: Template Detection\n');

  const cleanedPath = resolve(process.cwd(), 'src/data/cases-cleaned.json');

  if (!existsSync(cleanedPath)) {
    throw new Error(
      'cases-cleaned.json not found. Run Stage 1 first: --stage=clean'
    );
  }

  console.log(`📖 Reading: ${cleanedPath}`);
  const cleanedData = JSON.parse(readFileSync(cleanedPath, 'utf-8'));
  const cleanedCases: CleanedCaseData[] = cleanedData.cases;

  console.log('🔍 Analyzing templates...');
  const casesWithTemplate: CaseWithTemplate[] = [];

  for (let i = 0; i < cleanedCases.length; i++) {
    const cleanedCase = cleanedCases[i];
    const progress = ((i + 1) / cleanedCases.length) * 100;

    try {
      const template = await analyzeTemplate(
        cleanedCase.prompt,
        cleanedCase.title
      );
      const caseType = determineCaseType(template);

      casesWithTemplate.push({
        ...cleanedCase,
        template: template || undefined,
        case_type: caseType as any,
      });

      const templateInfo = template
        ? `✓ Template (${template.variables.length} vars, conf: ${template.ai_detection.confidence})`
        : '○ Ready';

      console.log(
        `  [${i + 1}/${cleanedCases.length}] ${cleanedCase.id} - ${templateInfo} (${progress.toFixed(1)}%)`
      );

      await new Promise((resolve) => setTimeout(resolve, 8000));
    } catch (error) {
      console.error(`  ❌ Failed to analyze ${cleanedCase.id}:`, error);
      casesWithTemplate.push({
        ...cleanedCase,
        case_type: 'ready',
      });
    }
  }

  const outputPath = resolve(process.cwd(), 'src/data/cases-with-template.json');
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        cases: casesWithTemplate,
        metadata: {
          total_cases: casesWithTemplate.length,
          templates_detected: casesWithTemplate.filter((c) => c.template)
            .length,
          generated_at: new Date().toISOString(),
          stage: 'template_analyzed',
        },
      },
      null,
      2
    )
  );

  console.log(`\n✅ Stage 1.5 Complete!`);
  console.log(`📦 Output: ${outputPath}`);
  console.log(
    `📊 Templates detected: ${casesWithTemplate.filter((c) => c.template).length}/${casesWithTemplate.length}`
  );
}

async function getGeminiApiKey(): Promise<string> {
  const { getAllConfigs } = await import('../src/shared/models/config.js');
  const configs = await getAllConfigs();
  const apiKey = configs.gemini_api_key;

  if (!apiKey) {
    throw new Error('Gemini API key not configured in database');
  }

  return apiKey;
}

async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const model = 'text-embedding-004';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
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

async function runStage2() {
  console.log('🚀 Stage 2: Embedding Generation\n');

  const templatePath = resolve(
    process.cwd(),
    'src/data/cases-with-template.json'
  );

  if (!existsSync(templatePath)) {
    throw new Error(
      'cases-with-template.json not found. Run Stage 1.5 first: --stage=template'
    );
  }

  console.log('🔑 Getting API Key...');
  const apiKey = await getGeminiApiKey();

  console.log(`📖 Reading: ${templatePath}`);
  const templateData = JSON.parse(readFileSync(templatePath, 'utf-8'));
  const casesWithTemplate: CaseWithTemplate[] = templateData.cases;

  console.log('🧠 Generating embeddings...');
  const casesWithEmbeddings: CaseWithEmbedding[] = [];

  for (let i = 0; i < casesWithTemplate.length; i++) {
    const caseItem = casesWithTemplate[i];
    const progress = ((i + 1) / casesWithTemplate.length) * 100;

    try {
      // Use filled_prompt for templates (better vector representation)
      const textForEmbedding = caseItem.template
        ? `${caseItem.template.filled_prompt} ${caseItem.structured.search_optimized_text}`
        : `${caseItem.prompt} ${caseItem.structured.search_optimized_text}`;

      const embedding = await generateEmbedding(
        textForEmbedding.toLowerCase().trim(),
        apiKey
      );

      casesWithEmbeddings.push({
        ...caseItem,
        embedding,
      });

      console.log(
        `  [${i + 1}/${casesWithTemplate.length}] ${caseItem.id} (${progress.toFixed(1)}%)`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Failed to embed ${caseItem.id}:`, error);
      casesWithEmbeddings.push({
        ...caseItem,
        embedding: [],
      });
    }
  }

  const outputPath = resolve(process.cwd(), 'src/data/cases.json');
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        cases: casesWithEmbeddings,
        metadata: {
          total_cases: casesWithEmbeddings.length,
          templates_count: casesWithEmbeddings.filter((c) => c.template).length,
          generated_at: new Date().toISOString(),
          embedding_model: 'text-embedding-004',
          stage: 'final',
          version: '3.0',
        },
      },
      null,
      2
    )
  );

  console.log(`\n✅ Stage 2 Complete!`);
  console.log(`📦 Output: ${outputPath}`);
  console.log(`📊 Total cases: ${casesWithEmbeddings.length}`);
  console.log(
    `📝 Templates: ${casesWithEmbeddings.filter((c) => c.template).length}`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const stageArg = args.find((arg) => arg.startsWith('--stage='));
  const stage = stageArg ? stageArg.split('=')[1] : 'all';

  if (stage === 'all') {
    await runStage1();
    await runStage1_5();
    await runStage2();
  } else if (stage === 'clean') {
    await runStage1();
  } else if (stage === 'template') {
    await runStage1_5();
  } else if (stage === 'embed') {
    await runStage2();
  } else {
    console.error(
      'Invalid stage. Use: --stage=clean | template | embed | all (default)'
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ ETL failed:', error);
  process.exit(1);
});
