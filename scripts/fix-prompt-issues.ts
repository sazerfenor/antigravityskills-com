/**
 * 修复 39 个有问题的 Prompts
 * 
 * 策略：
 * 1. 内容缺失 (25个): 重新调用优化 API
 * 2. 图生图依赖 (13个): 让 AI 进行语义重构
 * 3. 占位符残留 (1个): 清洗方括号
 */

import * as fs from 'fs';
import casesData from '../src/data/cases.json';
import casesOptimized from '../src/data/cases-optimized.json';
import issuesData from '../logs/prompt-quality-issues.json';

// 配置
const API_URL = 'http://localhost:3000/api/admin/cases/optimize';
const DELAY_MS = 4000; // 4 秒间隔 (15张/分钟限制)

// Cookie
const ADMIN_COOKIE = process.env.ADMIN_COOKIE || '';

if (!ADMIN_COOKIE) {
  console.error('❌ 错误：未设置 ADMIN_COOKIE');
  console.error('运行: $env:ADMIN_COOKIE="better-auth.session_token=xxx" ; pnpm tsx scripts/fix-prompt-issues.ts');
  process.exit(1);
}

interface Case {
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

interface OptimizedCase {
  id: string;
  title: string;
  originalPrompt: string;
  optimizedPrompt: string;
  templateVersion?: any;
  structuredExtraction?: any;
  tipsCompliance?: any;
  optimizedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取原始 case 数据
function getOriginalCase(id: string): Case | undefined {
  return (casesData.cases as Case[]).find(c => c.id === id);
}

// 判断问题类型
function getIssueType(id: string): 'missing' | 'imageDependency' | 'placeholder' {
  if (issuesData.details.missing.includes(id)) return 'missing';
  if (issuesData.details.imageDependency.includes(id)) return 'imageDependency';
  return 'placeholder';
}

// 构建特殊提示（针对图生图依赖）
function buildSpecialInstruction(issueType: string): string {
  if (issueType === 'imageDependency') {
    return `
IMPORTANT: This prompt originally depends on an uploaded reference image. 
You MUST rewrite it as a PURE TEXT-TO-IMAGE prompt.
DO NOT use phrases like "based on uploaded image" or "reference image".
Instead, DESCRIBE the visual content in detail so the AI can generate it from scratch.
`;
  }
  return '';
}

async function optimizeCase(caseItem: Case, issueType: string): Promise<OptimizedCase | null> {
  try {
    const specialInstruction = buildSpecialInstruction(issueType);
    
    // 对于占位符问题，先清洗
    let prompt = caseItem.prompt;
    if (issueType === 'placeholder') {
      prompt = prompt.replace(/\[([^\]]+)\]/g, '$1'); // 移除方括号保留内容
    }
    
    const body: any = {
      userPrompt: prompt,
      referenceCaseId: caseItem.id,
      referenceCaseTitle: caseItem.title,
      referenceCaseSubject: caseItem.structured?.subject || '',
      referenceCaseStyle: caseItem.structured?.style || '',
      referenceCaseTechnique: caseItem.structured?.technique || '',
      userLanguage: 'zh',
      specialInstruction, // 特殊指令
    };

    // 如果有模板数据
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

    // 验证结果
    if (!data.optimizedPrompt || data.optimizedPrompt.length < 50) {
      throw new Error('优化结果太短或为空');
    }

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
  console.log('='.repeat(60));
  console.log('🔧 修复 39 个有问题的 Prompts');
  console.log('='.repeat(60));

  const idsToFix = issuesData.needsReoptimize;
  console.log(`\n📋 待修复: ${idsToFix.length} 个\n`);

  // 加载现有优化结果
  const optimizedCases = [...(casesOptimized.cases as OptimizedCase[])];
  
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < idsToFix.length; i++) {
    const id = idsToFix[i];
    const originalCase = getOriginalCase(id);
    
    if (!originalCase) {
      console.log(`[${i + 1}/${idsToFix.length}] ${id} - ❌ 找不到原始数据`);
      failCount++;
      continue;
    }

    const issueType = getIssueType(id);
    const issueIcon = issueType === 'missing' ? '🔴' : 
                      issueType === 'imageDependency' ? '🟠' : '🟡';
    
    process.stdout.write(`[${i + 1}/${idsToFix.length}] ${issueIcon} ${id} - ${originalCase.title.substring(0, 30)}... `);

    const result = await optimizeCase(originalCase, issueType);

    if (result) {
      // 更新或添加到结果中
      const existingIndex = optimizedCases.findIndex(c => c.id === id);
      if (existingIndex >= 0) {
        optimizedCases[existingIndex] = result;
      } else {
        optimizedCases.push(result);
      }
      successCount++;
      console.log('✅');
    } else {
      failCount++;
      console.log('❌');
    }

    // Rate limiting
    if (i < idsToFix.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // 保存更新后的结果
  fs.writeFileSync('src/data/cases-optimized.json', JSON.stringify({
    cases: optimizedCases,
    generatedAt: new Date().toISOString(),
    totalCount: optimizedCases.length,
  }, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('📊 修复完成！');
  console.log('='.repeat(60));
  console.log(`\n✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⏱️ 耗时: ${elapsed} 分钟`);
  console.log(`\n📁 已更新: src/data/cases-optimized.json`);
}

// 运行
main().catch(console.error);
