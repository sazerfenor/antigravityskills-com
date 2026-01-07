/**
 * 批量优化所有 Cases Prompts
 * 
 * 使用方法：
 * 1. 先在浏览器登录 admin 账号
 * 2. 获取 cookie
 * 3. 运行: $env:ADMIN_COOKIE="..." ; pnpm tsx scripts/batch-optimize-cases.ts
 * 
 * 特性：
 * - 断点续传：记录进度，中断后可继续
 * - Rate limiting：每个请求间隔 2 秒
 * - 错误处理：失败的 case 记录并跳过
 */

import * as fs from 'fs';
import * as path from 'path';
import casesData from '../src/data/cases.json';

// 配置
const API_URL = 'http://localhost:3000/api/admin/cases/optimize';
const DELAY_MS = 2000; // 请求间隔
const OUTPUT_FILE = 'src/data/cases-optimized.json';
const PROGRESS_FILE = 'logs/batch-optimize-progress.json';

// Cookie
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || '';

if (!ADMIN_COOKIE) {
  console.error('❌ 错误：未设置 ADMIN_COOKIE');
  console.error('\n请按以下步骤操作：');
  console.error('1. 在浏览器访问 http://localhost:3000');
  console.error('2. 登录 Admin 账号');
  console.error('3. 打开浏览器开发者工具 → Application → Cookies');
  console.error('4. 复制所有 cookie 值');
  console.error('5. 运行: $env:ADMIN_COOKIE="better-auth.session_token=xxx" ; pnpm tsx scripts/batch-optimize-cases.ts');
  process.exit(1);
}

// 导出类型供 prompt-pipeline.ts 复用
export interface Case {
  id: string;
  title: string;
  prompt: string;
  structured?: {
    subject?: string;
    style?: string;
    technique?: string;
  };
  template?: {
    enabled: boolean;
    filled_prompt: string;
    template_prompt: string;
    variables: any[];
  };
}

export interface OptimizedCase {
  id: string;
  title: string;
  originalPrompt: string;
  optimizedPrompt: string;
  templateVersion?: {
    enabled: boolean;
    optimizedFilled: string;
    optimizedTemplate: string;
    variables: any[];
  };
  structuredExtraction?: any;
  tipsCompliance?: any;
  optimizedAt: string;
}

interface Progress {
  completed: string[];
  failed: string[];
  lastIndex: number;
}

// 辅助函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('⚠️ 无法读取进度文件，从头开始');
  }
  return { completed: [], failed: [], lastIndex: 0 };
}

function saveProgress(progress: Progress): void {
  const dir = path.dirname(PROGRESS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function loadOptimizedCases(): OptimizedCase[] {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      return data.cases || [];
    }
  } catch (e) {
    console.warn('⚠️ 无法读取已优化文件，创建新文件');
  }
  return [];
}

function saveOptimizedCases(cases: OptimizedCase[]): void {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ 
    cases,
    generatedAt: new Date().toISOString(),
    totalCount: cases.length,
  }, null, 2));
}

// 导出供 prompt-pipeline.ts 复用
export async function optimizeCase(caseItem: Case): Promise<OptimizedCase | null> {
  try {
    const body: any = {
      userPrompt: caseItem.prompt,
      referenceCaseId: caseItem.id,
      referenceCaseTitle: caseItem.title,
      referenceCaseSubject: caseItem.structured?.subject || '',
      referenceCaseStyle: caseItem.structured?.style || '',
      referenceCaseTechnique: caseItem.structured?.technique || '',
      userLanguage: 'zh',
    };

    // 如果有模板数据，传递给 API
    if (caseItem.template?.enabled) {
      body.templateData = {
        enabled: true,
        filled_prompt: caseItem.template.filled_prompt,
        template_prompt: caseItem.template.template_prompt,
        variables: caseItem.template.variables,
      };
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ADMIN_COOKIE,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const data = result.data || result;

    return {
      id: caseItem.id,
      title: caseItem.title,
      originalPrompt: caseItem.prompt,
      optimizedPrompt: data.optimizedPrompt,
      templateVersion: data.templateVersion,
      structuredExtraction: data.structuredExtraction,
      tipsCompliance: data.tipsCompliance,
      optimizedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error(`    ❌ 优化失败: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 批量优化 Cases Prompts');
  console.log('='.repeat(80));

  const cases = casesData.cases as Case[];
  console.log(`\n📊 总共 ${cases.length} 个 cases\n`);

  // 加载进度
  const progress = loadProgress();
  const optimizedCases = loadOptimizedCases();
  
  console.log(`📈 已完成: ${progress.completed.length}`);
  console.log(`❌ 已失败: ${progress.failed.length}`);
  console.log(`⏳ 待处理: ${cases.length - progress.completed.length - progress.failed.length}\n`);

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < cases.length; i++) {
    const caseItem = cases[i];
    
    // 跳过已完成的
    if (progress.completed.includes(caseItem.id)) {
      process.stdout.write(`[${i + 1}/${cases.length}] ${caseItem.id} - ⏭️ 已完成，跳过\n`);
      continue;
    }

    // 跳过已失败的（可选：重试）
    if (progress.failed.includes(caseItem.id)) {
      process.stdout.write(`[${i + 1}/${cases.length}] ${caseItem.id} - ⏭️ 之前失败，跳过\n`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${cases.length}] ${caseItem.id} - ${caseItem.title.substring(0, 30)}... `);

    const result = await optimizeCase(caseItem);

    if (result) {
      optimizedCases.push(result);
      progress.completed.push(caseItem.id);
      successCount++;
      console.log('✅');
    } else {
      progress.failed.push(caseItem.id);
      failCount++;
      console.log('❌');
    }

    // 保存进度
    progress.lastIndex = i;
    saveProgress(progress);
    saveOptimizedCases(optimizedCases);

    // Rate limiting
    if (i < cases.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(80));
  console.log('📊 批量优化完成！');
  console.log('='.repeat(80));
  console.log(`\n✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⏱️ 耗时: ${elapsed} 分钟`);
  console.log(`\n📁 输出文件: ${OUTPUT_FILE}`);
  console.log(`📁 进度文件: ${PROGRESS_FILE}`);

  // 显示示例结果
  if (optimizedCases.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('📝 示例优化结果 (第一个):');
    console.log('='.repeat(80));
    const sample = optimizedCases[0];
    console.log(`\nID: ${sample.id}`);
    console.log(`Title: ${sample.title}`);
    console.log(`\n原始 Prompt (前 200 字):`);
    console.log(sample.originalPrompt.substring(0, 200) + '...');
    console.log(`\n优化后 Prompt (前 200 字):`);
    console.log(sample.optimizedPrompt.substring(0, 200) + '...');
  }
}

// 运行
main().catch(console.error);
