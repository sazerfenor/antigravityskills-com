import { db } from '@/core/db';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

/**
 * 提取 3 个真实测试用例：
 * 1. 超短内容（手动创建）
 * 2. 超长 Prompt（从数据库提取）
 * 3. 带图片的测试用例（从数据库提取）
 */

async function extractTestCases() {
  console.log('📦 开始提取测试用例...\n');

  // 用例 1: 超短内容（手动创建）
  const case1 = {
    id: 'test_case_1_short',
    name: '超短内容',
    description: '测试最小输入场景的拓展是否合理',
    input: {
      userInput: 'cute cat',
      images: [],
    },
    expectedBehavior: {
      stage1: '生成字段帮助描述细节（颜色、姿态、背景），不过度猜测',
      stage2: '忠实反映用户原始意图，强调 "cute" 和 "cat"',
      stage3: 'SEO 围绕猫咪主题，避免无关内容',
    },
  };

  console.log('✅ 用例 1（超短内容）已创建');
  console.log(`   输入: "${case1.input.userInput}"\n`);

  // 用例 2: 超长 Prompt（从数据库提取）
  console.log('🔍 查询最长的 prompt...');
  const longestPrompt = await db().all(
    sql`SELECT id, title, prompt, category, subcategory
        FROM community_post
        WHERE prompt IS NOT NULL AND LENGTH(prompt) > 50
        ORDER BY LENGTH(prompt) DESC
        LIMIT 1`
  );

  if (longestPrompt.length === 0) {
    throw new Error('数据库中没有任何 prompt 数据');
  }

  const case2 = {
    id: 'test_case_2_long',
    name: '超长 Prompt',
    description: '测试表单是否丢失用户原本的意图',
    input: {
      userInput: longestPrompt[0].prompt || '',
      images: [],
    },
    dbRecord: longestPrompt[0],
    expectedBehavior: {
      stage1: '表单保留所有关键信息，不能"缩没了"用户的详细描述',
      stage2: '忠实反映用户所有原始意图',
      stage3: 'SEO 准确反映 prompt 主题',
    },
  };

  console.log('✅ 用例 2（超长 Prompt）已提取');
  console.log(`   原始输入长度: ${case2.input.userInput.length} 字符`);
  console.log(`   记录 ID: ${case2.dbRecord.id}\n`);

  // 用例 3: 带图片的测试用例（冲突检测）
  console.log('📸 创建带图片的冲突检测用例...');
  const case3 = {
    id: 'test_case_3_image',
    name: '带图片的测试用例（冲突检测）',
    description: '测试能否正确读出图片，识别图片与文本冲突',
    input: {
      userInput: 'portrait of a bearded Western woman with long blonde hair',
      images: ['https://media.nanobananaultra.com/ai/image/reference/253e6c75f16470e71077ea5943a47883.webp'],
    },
    dbRecord: null,
    actualImageContent: '东亚无胡须男性照片',
    expectedBehavior: {
      stage1: '正确读取图片内容（东亚男性、无胡须），识别与文本的冲突（描述是西方女性、有胡须），生成 subject_identity 让用户选择',
      stage2: '强调用户图片的原始内容（东亚男性），而非错误的文本描述',
      stage3: 'SEO 与用户生成的图片关联（东亚男性肖像），不基于错误的文本描述',
    },
  };

  console.log('✅ 用例 3（带图片）已创建');
  console.log(`   用户输入: "${case3.input.userInput}"`);
  console.log(`   实际图片内容: ${case3.actualImageContent}`);
  console.log(`   冲突: 文本描述与图片内容完全相反\n`);

  // 保存用例数据
  const outputDir = path.join(process.cwd(), 'tests/prompts/ab-testing/config');
  await fs.mkdir(outputDir, { recursive: true });

  const testCases = {
    case1,
    case2,
    case3,
  };

  await fs.writeFile(
    path.join(outputDir, 'extracted-test-cases.json'),
    JSON.stringify(testCases, null, 2),
    'utf-8'
  );

  console.log('\n💾 测试用例已保存到: tests/prompts/ab-testing/config/extracted-test-cases.json');
  console.log('\n📊 提取完成！共 3 个测试用例：');
  console.log('  1. 超短内容: "cute cat"');
  console.log(`  2. 超长 Prompt: ${case2.input.userInput.substring(0, 50)}... (${case2.input.userInput.length} 字符)`);
  console.log(`  3. 带图片（冲突检测）: 图片是东亚男性，描述是西方女性`);

  return testCases;
}

// 执行脚本
extractTestCases()
  .then(() => {
    console.log('\n✨ 所有测试用例提取完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 提取失败:', error);
    process.exit(1);
  });
