/**
 * 自动提取 baseline Prompt 到独立文件
 *
 * 从源代码中提取当前的 Prompt，保存到 baseline/ 目录
 */

import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(__dirname, '..');
const BASELINE_DIR = path.join(BASE_DIR, 'prompts/baseline');

// 确保目录存在
if (!fs.existsSync(BASELINE_DIR)) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
}

// 提取函数：从源代码中提取 Prompt 常量
function extractPrompt(filePath: string, varName: string): string {
  const source = fs.readFileSync(filePath, 'utf-8');

  // 匹配 const INTENT_ANALYZER_PROMPT = `...`;
  const regex = new RegExp(`const ${varName} = \`([\\s\\S]*?)\`;`, 'm');
  const match = source.match(regex);

  if (!match) {
    throw new Error(`找不到 ${varName} in ${filePath}`);
  }

  return match[1];
}

console.log('🔍 正在提取 baseline Prompt...\n');

// 1. Intent Analyzer Prompt
console.log('📝 提取 BASE_INTENT_ANALYZER_PROMPT...');
const intentAnalyzerPath = path.join(__dirname, '../../../src/shared/services/intent-analyzer.ts');
const intentAnalyzerPrompt = extractPrompt(intentAnalyzerPath, 'BASE_INTENT_ANALYZER_PROMPT');
fs.writeFileSync(
  path.join(BASELINE_DIR, 'intent-analyzer.txt'),
  intentAnalyzerPrompt,
  'utf-8'
);
console.log(`  ✅ 已保存到 baseline/intent-analyzer.txt (${intentAnalyzerPrompt.length} 字符)`);

// 2. Field Generator Prompt
console.log('📝 提取 BASE_FIELD_GENERATOR_PROMPT...');
const fieldGeneratorPrompt = extractPrompt(intentAnalyzerPath, 'BASE_FIELD_GENERATOR_PROMPT');
fs.writeFileSync(
  path.join(BASELINE_DIR, 'field-generator.txt'),
  fieldGeneratorPrompt,
  'utf-8'
);
console.log(`  ✅ 已保存到 baseline/field-generator.txt (${fieldGeneratorPrompt.length} 字符)`);

// 3. Compiler Prompt
console.log('📝 提取 BASE_COMPILER_PROMPT_TEMPLATE...');
const compilerPath = path.join(__dirname, '../../../src/shared/services/compiler.ts');
const compilerPrompt = extractPrompt(compilerPath, 'BASE_COMPILER_PROMPT_TEMPLATE');
fs.writeFileSync(
  path.join(BASELINE_DIR, 'compiler.txt'),
  compilerPrompt,
  'utf-8'
);
console.log(`  ✅ 已保存到 baseline/compiler.txt (${compilerPrompt.length} 字符)`);

// 4. Scene Addons
console.log('📝 提取 Scene Addon Prompts...');
const sceneAddons = [
  'SCENE_PHOTOGRAPHY_ADDON',
  'SCENE_GRAPHIC_DESIGN_ADDON',
  'SCENE_ILLUSTRATION_ADDON',
  'SCENE_INFOGRAPHIC_ADDON',
];

for (const addonName of sceneAddons) {
  try {
    const addonPrompt = extractPrompt(compilerPath, addonName);
    const fileName = addonName.toLowerCase().replace(/_/g, '-').replace('scene-', 'scene-') + '.txt';
    fs.writeFileSync(
      path.join(BASELINE_DIR, fileName),
      addonPrompt,
      'utf-8'
    );
    console.log(`  ✅ 已保存到 baseline/${fileName} (${addonPrompt.length} 字符)`);
  } catch (e: any) {
    console.log(`  ⚠️  ${addonName} 未找到，跳过`);
  }
}

console.log('\n✅ baseline Prompt 提取完成！');
console.log(`📁 保存位置: ${BASELINE_DIR}`);
