/**
 * Mock Baseline Test Runner
 *
 * 功能：
 * 1. 使用 Mock 响应数据验证 validation rules 逻辑
 * 2. 不调用真实 API（避免限流 + 快速执行）
 * 3. 验证测试框架是否正确工作
 *
 * 使用：pnpm tsx tests/prompts/run-mock-baseline.ts
 */

import fs from 'fs';
import path from 'path';

// ===== 配置 =====
const TEST_CASES_PATH = path.join(__dirname, 'test-cases/intent-test-cases.json');
const RESULTS_DIR = path.join(__dirname, 'results');
const MOCK_REPORT = path.join(RESULTS_DIR, `mock-baseline-${new Date().toISOString().slice(0, 10)}.json`);

// ===== Mock 响应数据 =====
const MOCK_RESPONSES: Record<string, any> = {
  edge_no_primary_intent: {
    primary_intent: null,
    context: "A portrait of a young girl",
    content_category: "photography",
    fields: [
      { id: "art_style", label: "Art Style", type: "select" },
      { id: "lighting", label: "Lighting", type: "select" },
      { id: "mood", label: "Mood", type: "multiselect" }
    ],
    styleHints: [],
    ambiguities: []
  },

  edge_implicit_style: {
    primary_intent: {
      phrase: "Clay Style",
      category: "technique",
      confidence: 0.9
    },
    context: "A 3D clay style rendering with cute proportions",
    content_category: "photography",
    fields: [
      { id: "art_style", label: "Art Style", type: "select", value: "3D clay" }
    ],
    styleHints: ["clay", "3D", "handcrafted"],
    ambiguities: []
  },

  normal_photography: {
    primary_intent: {
      phrase: "Golden Hour Photography",
      category: "style",
      confidence: 1.0
    },
    context: "A beach portrait captured during golden hour",
    content_category: "photography",
    fields: [
      { id: "lighting", label: "Lighting", type: "select", value: "golden_hour" },
      { id: "location", label: "Location", type: "text", value: "beach" }
    ],
    styleHints: ["golden hour", "portrait", "beach"],
    ambiguities: []
  },

  normal_anime_style: {
    primary_intent: {
      phrase: "Anime Style",
      category: "style",
      confidence: 1.0
    },
    context: "An anime illustration with Studio Ghibli influences",
    content_category: "photography",
    fields: [
      { id: "art_style", label: "Art Style", type: "select", value: "anime" }
    ],
    styleHints: ["anime", "studio ghibli"],
    ambiguities: []
  },

  complex_3d_clay: {
    primary_intent: {
      phrase: "3D Clay Style",
      category: "technique",
      confidence: 1.0
    },
    context: "A 3D clay style portrait with tactile sculpted details",
    content_category: "photography",
    creative_params: {
      art_style: "3D clay",
      color_palette: "soft pastel"
    },
    fields: [
      { id: "art_style", label: "Art Style", type: "select", value: "3D clay" },
      { id: "color_palette", label: "Color Palette", type: "select", value: "soft pastel" }
    ],
    styleHints: ["3D clay", "sculpted", "tactile"],
    ambiguities: []
  },

  edge_style_transfer: {
    primary_intent: null,
    context: "Style transfer request with face preservation",
    content_category: "photography",
    internalSignals: {
      referenceIntent: "style_ref"
    },
    imageProcessingInstructions: [
      { image_index: 0, role: "face_source", instruction: "Preserve facial features from user photo" }
    ],
    fields: [],
    styleHints: [],
    ambiguities: []
  },

  edge_ambiguity: {
    primary_intent: {
      phrase: "Portrait Photography",
      category: "style",
      confidence: 0.7
    },
    context: "Portrait with conflicting styling options",
    content_category: "photography",
    ambiguities: [
      {
        field_id: "facial_hair",
        conflict_type: "subject_identity",
        options: [
          { value: "thick beard", source: "prompt_text" },
          { value: "clean-shaven", source: "prompt_text" }
        ]
      }
    ],
    fields: [
      { id: "lighting", label: "Lighting", type: "select" }
    ],
    styleHints: [],
  },

  performance_short_prompt: {
    primary_intent: null,
    context: "A portrait of a young girl",
    content_category: "photography",
    fields: [
      { id: "art_style", label: "Art Style", type: "select" }
    ],
    styleHints: [],
    ambiguities: []
  },

  performance_long_prompt: {
    primary_intent: {
      phrase: "3D Clay Style Portrait",
      category: "technique",
      confidence: 1.0
    },
    context: "A highly detailed 3D clay style portrait with extensive styling",
    content_category: "photography",
    fields: [
      { id: "art_style", label: "Art Style", type: "select", value: "3D clay" },
      { id: "lighting", label: "Lighting", type: "select", value: "golden_hour" },
      { id: "hair_style", label: "Hair Style", type: "text", value: "flowing long black hair" },
      { id: "outfit", label: "Outfit", type: "text", value: "elegant golden dress" }
    ],
    styleHints: ["3D clay", "detailed", "golden hour"],
    ambiguities: []
  }
};

// ===== 类型定义 =====
interface TestCase {
  id: string;
  name: string;
  category: string;
  input: any;
  expected: any;
  validation_rules: Record<string, boolean>;
  note?: string;
}

interface TestResult {
  test_id: string;
  test_name: string;
  category: string;
  status: 'pass' | 'fail' | 'error';
  validation_results: Record<string, boolean>;
  errors?: string[];
  response_summary?: any;
}

// ===== 验证函数（从 run-baseline.ts 复制） =====
function validateResponse(response: any, expected: any, rules: Record<string, boolean>): { results: Record<string, boolean>; errors: string[] } {
  const results: Record<string, boolean> = {};
  const errors: string[] = [];

  // Rule: primary_intent_must_be_null
  if (rules.primary_intent_must_be_null) {
    results.primary_intent_must_be_null = response.primary_intent === null;
    if (!results.primary_intent_must_be_null) {
      errors.push(`Expected primary_intent=null, got ${JSON.stringify(response.primary_intent)}`);
    }
  }

  // Rule: primary_intent_not_null
  if (rules.primary_intent_not_null) {
    results.primary_intent_not_null = response.primary_intent !== null && response.primary_intent !== undefined;
    if (!results.primary_intent_not_null) {
      errors.push('Expected primary_intent to exist, got null/undefined');
    }
  }

  // Rule: phrase_includes_clay
  if (rules.phrase_includes_clay && response.primary_intent?.phrase) {
    const phrase = response.primary_intent.phrase.toLowerCase();
    results.phrase_includes_clay = phrase.includes('clay');
    if (!results.phrase_includes_clay) {
      errors.push(`Expected phrase to include "clay", got "${response.primary_intent.phrase}"`);
    }
  }

  // Rule: confidence_high
  if (rules.confidence_high && response.primary_intent?.confidence !== undefined) {
    results.confidence_high = response.primary_intent.confidence >= 0.8;
    if (!results.confidence_high) {
      errors.push(`Expected confidence >= 0.8, got ${response.primary_intent.confidence}`);
    }
  }

  // Rule: content_category_is_photography
  if (rules.content_category_is_photography) {
    results.content_category_is_photography = response.content_category === 'photography';
    if (!results.content_category_is_photography) {
      errors.push(`Expected content_category="photography", got "${response.content_category}"`);
    }
  }

  // Rule: context_not_empty
  if (rules.context_not_empty) {
    results.context_not_empty = response.context && response.context.trim().length > 0;
    if (!results.context_not_empty) {
      errors.push('Expected context to be non-empty');
    }
  }

  // Rule: fields_count_gte
  if (rules.fields_count_gte) {
    const fieldsCount = response.fields?.length || 0;
    results.fields_count_gte = fieldsCount >= 3;
    if (!results.fields_count_gte) {
      errors.push(`Expected fields.length >= 3, got ${fieldsCount}`);
    }
  }

  // Rule: ambiguities_detected
  if (rules.ambiguities_detected) {
    results.ambiguities_detected = Array.isArray(response.ambiguities) && response.ambiguities.length > 0;
    if (!results.ambiguities_detected) {
      errors.push('Expected ambiguities to be non-empty array');
    }
  }

  // Rule: primary_intent_exists
  if (rules.primary_intent_exists) {
    results.primary_intent_exists = response.primary_intent !== null && response.primary_intent !== undefined;
    if (!results.primary_intent_exists) {
      errors.push('Expected primary_intent to exist');
    }
  }

  // Rule: style_hints_not_empty
  if (rules.style_hints_not_empty) {
    results.style_hints_not_empty = Array.isArray(response.styleHints) && response.styleHints.length > 0;
    if (!results.style_hints_not_empty) {
      errors.push('Expected styleHints to be non-empty array');
    }
  }

  // Rule: primary_intent_exact_match
  if (rules.primary_intent_exact_match && expected.primary_intent?.phrase_contains) {
    const phrase = response.primary_intent?.phrase || '';
    const expected_phrase = expected.primary_intent.phrase_contains;
    results.primary_intent_exact_match = phrase.includes(expected_phrase);
    if (!results.primary_intent_exact_match) {
      errors.push(`Expected phrase to contain "${expected_phrase}", got "${phrase}"`);
    }
  }

  // Rule: creative_params_not_empty
  if (rules.creative_params_not_empty) {
    const hasParams = response.creative_params && Object.keys(response.creative_params).length > 0;
    results.creative_params_not_empty = hasParams;
    if (!results.creative_params_not_empty) {
      errors.push('Expected creative_params to be non-empty object');
    }
  }

  // Rule: reference_intent_detected
  if (rules.reference_intent_detected) {
    results.reference_intent_detected = !!response.internalSignals?.referenceIntent;
    if (!results.reference_intent_detected) {
      errors.push('Expected internalSignals.referenceIntent to be set');
    }
  }

  // Rule: ambiguities_count_gte
  if (rules.ambiguities_count_gte) {
    const count = response.ambiguities?.length || 0;
    results.ambiguities_count_gte = count >= 1;
    if (!results.ambiguities_count_gte) {
      errors.push(`Expected ambiguities.length >= 1, got ${count}`);
    }
  }

  return { results, errors };
}

// ===== 主函数 =====
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Mock Baseline Test Runner (Fast Validation)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. 读取测试用例
  const testData = JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf-8'));
  const testCases: TestCase[] = testData.test_cases;

  console.log(`📋 Loaded ${testCases.length} test cases`);
  console.log(`🎯 Mode: Mock (No API calls)\n`);

  // 2. 运行所有测试
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name} (${testCase.id})`);

    // 获取 Mock 响应
    const mockResponse = MOCK_RESPONSES[testCase.id];
    if (!mockResponse) {
      console.log(`⚠️  No mock response for ${testCase.id}, skipping`);
      continue;
    }

    // 验证响应
    const { results: validationResults, errors } = validateResponse(
      mockResponse,
      testCase.expected,
      testCase.validation_rules
    );

    const all_passed = Object.values(validationResults).every(v => v === true);
    const status = all_passed ? 'pass' : 'fail';

    if (status === 'pass') {
      console.log(`✅ PASSED - All ${Object.keys(validationResults).length} validation rules passed`);
      passed++;
    } else {
      console.log(`❌ FAILED - ${errors.length} validation errors:`);
      errors.forEach(err => console.log(`   - ${err}`));
      failed++;
    }

    results.push({
      test_id: testCase.id,
      test_name: testCase.name,
      category: testCase.category,
      status,
      validation_results: validationResults,
      errors: errors.length > 0 ? errors : undefined,
      response_summary: {
        primary_intent: mockResponse.primary_intent,
        content_category: mockResponse.content_category,
        fields_count: mockResponse.fields?.length,
        ambiguities_count: mockResponse.ambiguities?.length,
      },
    });
  }

  // 3. 生成报告
  const total = results.length;
  const success_rate = Math.round((passed / total) * 100);

  const report = {
    metadata: {
      test_date: new Date().toISOString(),
      test_mode: 'mock',
      total_cases: total,
      passed,
      failed,
      errors: 0,
      success_rate,
    },
    test_results: results,
    category_breakdown: results.reduce((acc, r) => {
      if (!acc[r.category]) {
        acc[r.category] = { passed: 0, failed: 0, total: 0 };
      }
      acc[r.category].total++;
      if (r.status === 'pass') acc[r.category].passed++;
      if (r.status === 'fail') acc[r.category].failed++;
      return acc;
    }, {} as Record<string, { passed: number; failed: number; total: number }>),
  };

  // 4. 保存报告
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  fs.writeFileSync(MOCK_REPORT, JSON.stringify(report, null, 2));

  // 5. 打印总结
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 MOCK BASELINE REPORT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${success_rate}%\n`);

  console.log('📂 Category Breakdown:');
  Object.entries(report.category_breakdown).forEach(([category, stats]) => {
    console.log(`   ${category}: ${stats.passed}/${stats.total} passed (${Math.round((stats.passed / stats.total) * 100)}%)`);
  });

  console.log(`\n💾 Full report saved to: ${MOCK_REPORT}`);
  console.log('\n🎯 Next Step: Run real API tests with Admin auth to collect performance metrics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 6. Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
