/**
 * 重置所有错误状态的 prompts，准备重新运行
 */

import * as fs from 'fs';

const progressFile = 'logs/pipeline-progress-prompts-input.json';

async function resetErrors() {
  console.log('='.repeat(60));
  console.log('🔄 重置错误状态的 Prompts');
  console.log('='.repeat(60));

  const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));

  let resetCount = 0;
  const errorTypes: Record<string, number> = {};

  for (const [promptId, p] of Object.entries(progress.prompts) as [string, any][]) {
    const isError =
      p.step1_intent === 'error' ||
      p.step2_compile === 'error' ||
      p.step3_generate === 'error' ||
      p.step4_post === 'error' ||
      p.step5_seo === 'error';

    if (isError) {
      // 统计错误类型
      const errorStep = p.error?.split(':')[0] || 'Unknown';
      errorTypes[errorStep] = (errorTypes[errorStep] || 0) + 1;

      // 重置所有步骤
      p.step1_intent = 'pending';
      p.step2_compile = 'pending';
      p.step3_generate = 'pending';
      p.step4_post = 'pending';
      p.step5_seo = 'pending';

      // 清除中间结果
      delete p.schema;
      delete p.extractedRatio;
      delete p.promptNative;
      delete p.promptEnglish;
      delete p.promptHighlights;
      delete p.detectedLang;
      delete p.aiTaskId;
      delete p.imageUrl;
      delete p.postId;
      delete p.error;

      resetCount++;
    }
  }

  console.log(`\n📊 错误类型分布:`);
  for (const [type, count] of Object.entries(errorTypes)) {
    console.log(`   ${type}: ${count}`);
  }

  console.log(`\n✅ 已重置 ${resetCount} 个错误状态的 prompts`);

  // 保存进度文件
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  console.log(`💾 已保存进度文件`);

  // 统计当前状态
  let pending = 0;
  let done = 0;
  let error = 0;

  for (const p of Object.values(progress.prompts) as any[]) {
    if (p.step5_seo === 'done') done++;
    else if (p.step1_intent === 'pending') pending++;
    else if (
      p.step1_intent === 'error' ||
      p.step2_compile === 'error' ||
      p.step3_generate === 'error' ||
      p.step4_post === 'error' ||
      p.step5_seo === 'error'
    )
      error++;
  }

  console.log(`\n📊 当前进度状态:`);
  console.log(`   ✅ 完成: ${done}`);
  console.log(`   ⏳ 待处理: ${pending}`);
  console.log(`   ❌ 错误: ${error}`);
}

resetErrors().catch(console.error);
