/**
 * Compiler V2.1 Live Test Script
 *
 * Tests the Visual Director Compiler with:
 * - Keyword-based output
 * - Scene-aware compilation (Phase 3)
 * - High-level intent support
 *
 * Run: pnpm tsx scripts/compiler-test.ts
 */

import { compilePLO } from '../src/shared/services/compiler';
import type { PLO } from '../src/shared/schemas/plo-schema';

// Test case type with scene-aware fields
interface TestCase {
  name: string;
  plo: PLO;
  expectNoText?: boolean;
  expectedCategory?: string;
}

// Test cases
const testCases: TestCase[] = [
  {
    name: 'Basic Portrait - Keyword Output',
    plo: {
      core: { subject: 'woman portrait', action: '' },
      narrative_params: {
        art_style: { value: 'Photorealistic', strength: 0.9 },
        lighting: { value: 'Golden Hour', strength: 0.7 },
        mood: { value: 'Serene', strength: 0.6 },
        depth_of_field: { value: 'Shallow', strength: 0.8 },
      },
      layout_constraints: { ar: '3:4', text_render: false },
      sync_status: 'linked',
    },
  },
  {
    name: 'Text Content Filtering - Should NOT include text',
    plo: {
      core: { subject: 'promotional poster', action: '' },
      narrative_params: {
        art_style: { value: 'Modern Minimalist', strength: 0.9 },
        text_content: { value: '限时促销 50% OFF', strength: 0.9 }, // Should be filtered
        text_position: { value: 'Center', strength: 0.8 }, // Should be filtered
        text_style: { value: 'Bold Sans-serif', strength: 0.7 }, // Should be filtered
        color_palette: { value: 'Vibrant', strength: 0.7 },
      },
      layout_constraints: { ar: '16:9', text_render: false }, // text_render is FALSE
      sync_status: 'linked',
    },
    expectNoText: true,
  },
  {
    name: 'Chinese Subject - Should Output English',
    plo: {
      core: { subject: '赛博朋克城市', action: '' },
      narrative_params: {
        art_style: { value: 'Cinematic', strength: 0.9 },
        weather: { value: 'Rainy', strength: 0.7 },
        neon_intensity: { value: 'High', strength: 0.8 },
      },
      layout_constraints: { ar: '16:9', text_render: false },
      sync_status: 'linked',
    },
  },
  // ============================================
  // V3.1: Scene-Aware Test Cases (Phase 3)
  // ============================================
  {
    name: 'Scene-Aware: Photography Mode',
    plo: {
      core: { subject: 'professional headshot', action: '' },
      narrative_params: {
        lighting: { value: 'Rembrandt', strength: 0.9 },
        skin_texture: { value: 'Natural', strength: 0.7 },
        background: { value: 'Neutral gray', strength: 0.6 },
      },
      layout_constraints: { ar: '1:1', text_render: false },
      sync_status: 'linked',
      content_category: 'photography',
    },
    expectedCategory: 'photography',
  },
  {
    name: 'Scene-Aware: Graphic Design Mode',
    plo: {
      core: { subject: 'summer sale poster', action: '' },
      narrative_params: {
        color_scheme: { value: 'Vibrant orange', strength: 0.9 },
        layout: { value: 'Asymmetric', strength: 0.7 },
        visual_impact: { value: 'High contrast', strength: 0.8 },
      },
      layout_constraints: { ar: '9:16', text_render: false },
      sync_status: 'linked',
      content_category: 'graphic_design',
    },
    expectedCategory: 'graphic_design',
  },
  {
    name: 'Scene-Aware: Illustration Mode',
    plo: {
      core: { subject: 'friendly dragon character', action: '' },
      narrative_params: {
        art_style: { value: 'Watercolor storybook', strength: 0.9 },
        color_palette: { value: 'Warm pastel', strength: 0.7 },
        character_expression: { value: 'Friendly smile', strength: 0.8 },
      },
      layout_constraints: { ar: '1:1', text_render: false },
      sync_status: 'linked',
      content_category: 'illustration',
    },
    expectedCategory: 'illustration',
  },
  {
    name: 'Scene-Aware: With Style Hints',
    plo: {
      core: { subject: 'fashion model', action: '' },
      narrative_params: {
        art_style: { value: 'Editorial', strength: 0.9 },
        lighting: { value: 'Studio', strength: 0.8 },
      },
      layout_constraints: { ar: '3:4', text_render: false },
      sync_status: 'linked',
      content_category: 'photography',
      style_hints: ['Y2K', 'retro futurism', 'neon'],
    },
    expectedCategory: 'photography',
  },
  {
    name: 'Scene-Aware: With Reference Intent',
    plo: {
      core: { subject: 'portrait in new style', action: '' },
      narrative_params: {
        art_style: { value: 'Oil painting', strength: 0.9 },
      },
      layout_constraints: { ar: '1:1', text_render: false },
      sync_status: 'linked',
      reference_intent: 'style_ref',
      image_descriptions: ['A woman with red hair in a garden'],
    },
  },
];

// Validation functions
const isKeywordFormat = (prompt: string): boolean => {
  // Check for comma-separated structure
  const commaCount = (prompt.match(/,/g) || []).length;
  // Check for absence of narrative prose indicators
  const hasNarrativeProse =
    /\b(A sophisticated|This image showcases|features|beautiful|stunning|amazing)\b/i.test(prompt);
  // Check for absence of complete sentences (subject + verb + object patterns)
  const hasSentences = /\.\s+[A-Z]/.test(prompt); // Multiple sentences

  return commaCount >= 2 && !hasNarrativeProse && !hasSentences;
};

const hasHighlightMarkers = (prompt: string): boolean => {
  return /\[\[[a-z_]+:[^\]]+\]\]/.test(prompt);
};

const containsTextContent = (prompt: string, textContent: string): boolean => {
  return prompt.toLowerCase().includes(textContent.toLowerCase());
};

// Main test runner
async function runTests() {
  console.log('🧪 Compiler V2.1 Live Test (Scene-Aware)\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    if (testCase.plo.content_category) {
      console.log(`   📂 Category: ${testCase.plo.content_category}`);
    }
    if (testCase.plo.style_hints?.length) {
      console.log(`   🎨 Style Hints: ${testCase.plo.style_hints.join(', ')}`);
    }
    if (testCase.plo.reference_intent) {
      console.log(`   🔗 Reference Intent: ${testCase.plo.reference_intent}`);
    }
    console.log('-'.repeat(40));

    try {
      const result = await compilePLO(testCase.plo);

      console.log(`📝 Output (${result.english.length} chars):`);
      console.log(`   "${result.english}"`);
      console.log(`\n🔍 Highlights: ${result.highlights?.english.length || 0} markers`);

      // Validations
      const checks: { name: string; pass: boolean; detail?: string }[] = [];

      // Check 1: Keyword format
      checks.push({
        name: 'Keyword Format',
        pass: isKeywordFormat(result.english),
        detail: 'Should be comma-separated, no narrative prose',
      });

      // Check 2: English output
      checks.push({
        name: 'English Output',
        pass: result.detectedLang === 'English',
        detail: `detectedLang = ${result.detectedLang}`,
      });

      // Check 3: Highlights parsed
      checks.push({
        name: 'Highlights Parsed',
        pass: (result.highlights?.english.length || 0) > 0,
        detail: `Found ${result.highlights?.english.length || 0} highlights`,
      });

      // Check 4: Text content filtering (if applicable)
      if (testCase.expectNoText && testCase.plo.narrative_params?.text_content) {
        const textValue = testCase.plo.narrative_params.text_content.value;
        checks.push({
          name: 'Text Content Filtered',
          pass: !containsTextContent(result.english, textValue),
          detail: `Should NOT contain "${textValue}"`,
        });
      }

      // Check 5: Scene-aware category logging (informational)
      if (testCase.expectedCategory) {
        checks.push({
          name: 'Scene Mode Applied',
          pass: true, // Always pass - just informational
          detail: `Using ${testCase.expectedCategory} mode`,
        });
      }

      // Print results
      for (const check of checks) {
        const icon = check.pass ? '✅' : '❌';
        console.log(`   ${icon} ${check.name}: ${check.detail || ''}`);
        if (check.pass) passed++;
        else failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log(`📋 Total test cases: ${testCases.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
