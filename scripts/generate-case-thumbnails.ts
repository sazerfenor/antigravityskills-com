/**
 * Batch Case Thumbnail Generator
 * 
 * Purpose: Generate preview images for all cases using cleaned prompts
 * - Uses CLEANED prompts (not original, to avoid copyright)
 * - Directly calls Gemini Provider (bypasses user auth)
 * - Saves to public/images/cases/{case_id}/thumbnail.png
 * 
 * Usage: 
 *   Test mode (first 10): pnpm tsx scripts/generate-case-thumbnails.ts
 *   Full batch:          pnpm tsx scripts/generate-case-thumbnails.ts --full
 */

import fs from 'fs';
import path from 'path';
import { getAIService } from '@/shared/services/ai';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';

interface Case {
  id: string;
  title: string;
  prompt: string;
  thumbnail: string;
  structured: {
    subject: string;
    style: string;
    inferred_intent: string[];
    technique: string;
    search_optimized_text: string;
  };
}

interface CasesData {
  cases: Case[];
}

// Configuration
const OUTPUT_DIR = 'public/images/cases';
const PROVIDER = 'gemini';
const MODEL = 'gemini-3-pro-image-preview';

// Test mode: only process first 10 cases
const TEST_MODE = !process.argv.includes('--full');
const TEST_LIMIT = 10;

// Progress tracking
let processed = 0;
let successful = 0;
let failed = 0;
const failedCases: string[] = [];

async function generateImage(prompt: string, caseId: string): Promise<string> {
  console.log('[AI] Calling Gemini API (Nano Banana Pro)...');
  console.log(`[DEBUG] Case ID: ${caseId}`);
  console.log(`[DEBUG] Prompt length: ${prompt.length} characters`);
  
  const aiService = await getAIService();
  const provider = aiService.getProvider(PROVIDER);
  
  if (!provider) {
    throw new Error(`Provider ${PROVIDER} not found. Please check your Gemini API key configuration.`);
  }

  const params = {
    mediaType: AIMediaType.IMAGE,
    model: MODEL,
    prompt: prompt,
    // 不传 options - 参考 gemini.ts:86
  };
  
  console.log('[DEBUG] Request params:', JSON.stringify(params, null, 2));

  try {
    // 调用 Gemini Provider - 参考 gemini.ts 第35-96行
    const result = await provider.generate({ params });
    
    console.log('[DEBUG] Result status:', result.taskStatus);
    console.log('[DEBUG] Result structure:', JSON.stringify({
      taskStatus: result.taskStatus,
      taskId: result.taskId,
      hasTaskInfo: !!result.taskInfo,
      hasImages: result.taskInfo?.images?.length || 0,
    }, null, 2));

    if (result.taskStatus !== AITaskStatus.SUCCESS) {
      throw new Error(`Generation failed with status: ${result.taskStatus}`);
    }

    if (!result.taskInfo?.images || result.taskInfo.images.length === 0) {
      console.log('[DEBUG] Full result:', JSON.stringify(result, null, 2));
      throw new Error('No images returned from API');
    }

    const imageUrl = result.taskInfo.images[0].imageUrl;
    console.log(`[AI] Generated image URL: ${imageUrl.substring(0, 60)}...`);
    
    return imageUrl;
  } catch (error: any) {
    console.error('[DEBUG] Generation error:', error.message);
    if (error.stack) {
      console.error('[DEBUG] Stack trace:', error.stack);
    }
    throw error;
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processCase(caseItem: Case): Promise<void> {
  processed++;
  console.log(`\n[${processed}] Processing: ${caseItem.id} - ${caseItem.title}`);
  
  try {
    // Use the CLEANED prompt
    const prompt = caseItem.prompt;
    console.log(`[Prompt] ${prompt.substring(0, 100)}...`);
    
    // Generate image via Gemini
    const imageUrl = await generateImage(prompt, caseItem.id);
    
    // Download image
    console.log('[Download] Fetching generated image...');
    const imageBuffer = await downloadImage(imageUrl);
    
    // Create output directory
    const caseDir = path.join(OUTPUT_DIR, caseItem.id);
    if (!fs.existsSync(caseDir)) {
      fs.mkdirSync(caseDir, { recursive: true });
    }
    
    // Save image
    const outputPath = path.join(caseDir, 'thumbnail.png');
    fs.writeFileSync(outputPath, imageBuffer);
    
    console.log(`[SUCCESS] Saved to: ${outputPath}`);
    successful++;
    
    // Add delay to avoid rate limiting (3 seconds between requests)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error: any) {
    console.error(`[FAILED] ${caseItem.id}: ${error.message}`);
    failed++;
    failedCases.push(`${caseItem.id}: ${error.message}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Case Thumbnail Batch Generator');
  console.log('='.repeat(60));
  console.log(`Mode: ${TEST_MODE ? `TEST (First ${TEST_LIMIT} cases)` : 'FULL BATCH'}`);
  console.log(`Output Directory: ${OUTPUT_DIR}`);
  console.log(`AI Model: ${MODEL} (Nano Banana Pro)`);
  console.log('='.repeat(60));
  
  // Load cases
  const casesPath = path.join(process.cwd(), 'src/data/cases.json');
  const casesData: CasesData = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  
  // Limit to test cases if in test mode
  const casesToProcess = TEST_MODE 
    ? casesData.cases.slice(0, TEST_LIMIT) 
    : casesData.cases;
  
  console.log(`\nTotal cases to process: ${casesToProcess.length}/${casesData.cases.length}`);
  
  // Verify AI service
  try {
    const aiService = await getAIService();
    const provider = aiService.getProvider(PROVIDER);
    if (!provider) {
      throw new Error('Gemini provider not configured');
    }
    console.log('AI Service: ✓ Ready (Gemini)');
  } catch (error: any) {
    console.error('\n❌ AI Service initialization failed!');
    console.error('Error:', error.message);
    console.error('\nPlease ensure your Gemini API key is configured in the database.');
    console.error('Check: config table -> gemini_api_key');
    process.exit(1);
  }
  
  // Confirm before starting
  if (!TEST_MODE) {
    console.log('\n⚠️  WARNING: This is FULL BATCH mode and will make many API calls.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    console.log('\n✓ TEST MODE: Only processing first 10 cases.\n');
    console.log('  To run full batch, use: pnpm tsx scripts/generate-case-thumbnails.ts --full\n');
  }
  
  // Process each case
  for (const caseItem of casesToProcess) {
    await processCase(caseItem);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  Generation Complete');
  console.log('='.repeat(60));
  console.log(`Total Processed: ${processed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  
  if (failedCases.length > 0) {
    console.log('\nFailed Cases:');
    failedCases.forEach(msg => console.log(`  - ${msg}`));
  }
  
  if (TEST_MODE && successful > 0) {
    console.log('\n✓ Test run successful!');
    console.log('  Check the generated images in public/images/cases/');
    console.log('  To run full batch, use: pnpm tsx scripts/generate-case-thumbnails.ts --full');
  } else if (!TEST_MODE) {
    console.log('\nNext Step: Update cases.json thumbnail paths to point to new images.');
    console.log('Example: "thumbnail": "images/cases/{id}/thumbnail.png"');
  }
}

main().catch(console.error);
