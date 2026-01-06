/**
 * Vision-Logic API 耗时基准测试脚本
 * 
 * 用途：测量 Build (Intent) 和 Optimize (Compile) 阶段的真实 API 耗时
 *       用于为进度条阈值提供数据支持
 * 
 * 运行方式：
 *   1. 确保本地开发服务器运行中: pnpm dev
 *   2. 运行脚本: pnpm tsx scripts/vision-logic-benchmark.ts
 * 
 * 输出：各阶段耗时的 p50 / p90 / max 统计
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// ============================================
// 测试用例定义
// ============================================

interface TestCase {
  name: string;
  input: string;
  imageUrls?: string[];
  category: 'text_only' | 'single_image' | 'multi_image';
}

const TEST_CASES: TestCase[] = [
  // 纯文本用例
  {
    name: '纯文本-简单',
    input: '一只可爱的猫咪',
    category: 'text_only',
  },
  {
    name: '纯文本-复杂',
    input: '赛博朋克风格的东京街头夜景，霓虹灯倒映在雨后的地面上，一个穿着机械外骨骼的女孩背对镜头站在街角',
    category: 'text_only',
  },
  {
    name: '纯文本-专业人像',
    input: '专业人像摄影，35mm镜头，浅景深，自然光',
    category: 'text_only',
  },
  {
    name: '纯文本-PPT模板',
    input: 'PPT封面模板，商务风格，蓝色主题',
    category: 'text_only',
  },

  // 单图用例 (使用 R2 CDN 图片)
  {
    name: '单图-风格参考',
    input: '按照这张图的风格画一只猫',
    imageUrls: ['https://cdn.bananaprompts.com/gallery/cyberpunk-1.jpg'],
    category: 'single_image',
  },
  {
    name: '单图-人物换脸',
    input: '把这个人画成吉卜力风格',
    imageUrls: ['https://cdn.bananaprompts.com/gallery/abstract-3d.jpg'],
    category: 'single_image',
  },

  // 多图用例
  {
    name: '多图-2张',
    input: '结合这两张图的风格创作新作品',
    imageUrls: [
      'https://cdn.bananaprompts.com/gallery/cyberpunk-1.jpg',
      'https://cdn.bananaprompts.com/gallery/space-station.jpg',
    ],
    category: 'multi_image',
  },
  {
    name: '多图-3张',
    input: '融合这三张图的元素',
    imageUrls: [
      'https://cdn.bananaprompts.com/gallery/cyberpunk-1.jpg',
      'https://cdn.bananaprompts.com/gallery/space-station.jpg',
      'https://cdn.bananaprompts.com/gallery/synthwave-city.jpg',
    ],
    category: 'multi_image',
  },
];

// ============================================
// API 调用函数
// ============================================

interface TimingResult {
  caseName: string;
  category: string;
  intentDuration: number;
  compileDuration: number | null;
  totalDuration: number;
  error?: string;
}

async function runSingleTest(testCase: TestCase): Promise<TimingResult> {
  const totalStart = Date.now();
  let intentDuration = 0;
  let compileDuration: number | null = null;

  try {
    // Step 1: Intent API (Build 阶段)
    console.log(`  📤 [${testCase.name}] 调用 Intent API...`);
    const intentStart = Date.now();

    const intentResponse = await fetch(`${BASE_URL}/api/logic/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: testCase.input,
        imageUrls: testCase.imageUrls || [],
      }),
    });

    intentDuration = Date.now() - intentStart;
    
    if (!intentResponse.ok) {
      const errorText = await intentResponse.text();
      throw new Error(`Intent API 失败: ${intentResponse.status} - ${errorText}`);
    }

    const intentData = await intentResponse.json();
    console.log(`  ✅ [${testCase.name}] Intent 完成: ${intentDuration}ms`);

    // Step 2: Compile API (Optimize 阶段) - 使用 Intent 返回的 schema
    if (intentData.code === 0 && intentData.data?.schema) {
      console.log(`  📤 [${testCase.name}] 调用 Compile API...`);
      const compileStart = Date.now();

      // 构造 PLO 对象
      const schema = intentData.data.schema;
      const plo = {
        context: schema.context || testCase.input,
        formValues: Object.fromEntries(
          (schema.fields || []).map((f: any) => [f.id, f.defaultValue ?? f.options?.[0] ?? ''])
        ),
        internalSignals: schema.internalSignals || {},
        metadata: {
          preservedDetails: schema.preservedDetails || [],
          styleHints: schema.styleHints || [],
          contentCategory: schema.contentCategory || 'general',
        },
      };

      const compileResponse = await fetch(`${BASE_URL}/api/logic/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plo, skipCreditDeduction: true }),
      });

      compileDuration = Date.now() - compileStart;

      if (!compileResponse.ok) {
        console.warn(`  ⚠️ [${testCase.name}] Compile 失败，但计时有效`);
      } else {
        console.log(`  ✅ [${testCase.name}] Compile 完成: ${compileDuration}ms`);
      }
    }

    return {
      caseName: testCase.name,
      category: testCase.category,
      intentDuration,
      compileDuration,
      totalDuration: Date.now() - totalStart,
    };
  } catch (error: any) {
    return {
      caseName: testCase.name,
      category: testCase.category,
      intentDuration,
      compileDuration,
      totalDuration: Date.now() - totalStart,
      error: error.message,
    };
  }
}

// ============================================
// 统计函数
// ============================================

function calculateStats(values: number[]): { p50: number; p90: number; max: number; avg: number } {
  if (values.length === 0) return { p50: 0, p90: 0, max: 0, avg: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p90Index = Math.floor(sorted.length * 0.9);
  
  return {
    p50: sorted[p50Index] || 0,
    p90: sorted[p90Index] || sorted[sorted.length - 1],
    max: sorted[sorted.length - 1],
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  };
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('🚀 Vision-Logic API 基准测试');
  console.log(`📍 目标: ${BASE_URL}`);
  console.log(`📊 测试用例: ${TEST_CASES.length} 个`);
  console.log('='.repeat(60));

  const RUNS_PER_CASE = 3; // 每个用例跑 3 次取平均
  const allResults: TimingResult[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n🔄 测试: ${testCase.name} (${testCase.category})`);
    
    for (let i = 0; i < RUNS_PER_CASE; i++) {
      console.log(`  [Run ${i + 1}/${RUNS_PER_CASE}]`);
      const result = await runSingleTest(testCase);
      allResults.push(result);
      
      if (result.error) {
        console.log(`  ❌ 错误: ${result.error}`);
      }

      // 避免 rate limit
      if (i < RUNS_PER_CASE - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // ============================================
  // 汇总统计
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 统计汇总');
  console.log('='.repeat(60));

  const categories = ['text_only', 'single_image', 'multi_image'] as const;

  for (const category of categories) {
    const categoryResults = allResults.filter(r => r.category === category && !r.error);
    
    if (categoryResults.length === 0) {
      console.log(`\n[${category}] 无有效数据`);
      continue;
    }

    const intentTimes = categoryResults.map(r => r.intentDuration);
    const compileTimes = categoryResults.filter(r => r.compileDuration !== null).map(r => r.compileDuration!);
    
    const intentStats = calculateStats(intentTimes);
    const compileStats = calculateStats(compileTimes);

    console.log(`\n📁 [${category.toUpperCase()}]`);
    console.log(`  Intent (Build 阶段):`);
    console.log(`    样本数: ${intentTimes.length}`);
    console.log(`    平均: ${intentStats.avg}ms | P50: ${intentStats.p50}ms | P90: ${intentStats.p90}ms | Max: ${intentStats.max}ms`);
    
    if (compileTimes.length > 0) {
      console.log(`  Compile (Optimize 阶段):`);
      console.log(`    样本数: ${compileTimes.length}`);
      console.log(`    平均: ${compileStats.avg}ms | P50: ${compileStats.p50}ms | P90: ${compileStats.p90}ms | Max: ${compileStats.max}ms`);
    }
  }

  // 阈值建议
  console.log('\n' + '='.repeat(60));
  console.log('💡 阈值建议 (基于 P90 + 20% Buffer)');
  console.log('='.repeat(60));

  for (const category of categories) {
    const categoryResults = allResults.filter(r => r.category === category && !r.error);
    if (categoryResults.length === 0) continue;

    const intentTimes = categoryResults.map(r => r.intentDuration);
    const intentStats = calculateStats(intentTimes);
    
    // 建议阈值: P50 作为第一阶段结束, P90 * 1.2 作为第二阶段结束
    const suggested = [
      Math.round(intentStats.p50),
      Math.round(intentStats.p90 * 1.2),
    ];

    console.log(`  ${category}: [${suggested[0]}, ${suggested[1]}]ms`);
  }

  console.log('\n✅ 测试完成');
}

main().catch(console.error);
