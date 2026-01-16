/**
 * POST /api/admin/prompts/quality-filter
 *
 * Stage 3 质量过滤 API
 * 对社区 Prompts 进行质量评估，筛选出高质量资产
 *
 * 功能：
 * 1. 加载并合并原始数据 + Stage 1 分析结果
 * 2. LLM 批次评分
 * 3. 加分计算 + 去重
 * 4. 输出排序结果和报告
 *
 * 权限：admin.prompts.write
 */

import { respData, respErr } from '@/shared/lib/resp';
import { getSignUser } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
  loadAndMergeData,
  cleanData,
  evaluateAllBatches,
  assembleResults,
  deduplicateByHash,
  generateOutput,
  type QualityResult,
} from '@/shared/services/prompt-quality';

// 长时间运行任务，设置较长超时
export const maxDuration = 300; // 5 分钟

export async function POST(request: Request) {
  try {
    // 🔒 P0 Security: AuthN - 使用 getSignUser 获取真实用户
    const user = await getSignUser();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    // 🔒 P0 Security: AuthZ - RBAC 权限检查
    if (!(await hasPermission(user.id, 'admin.prompts.write'))) {
      return respErr('Forbidden: Missing admin.prompts.write permission', 403);
    }

    console.log('[QualityFilter] Starting Stage 3 Quality Filter...');
    console.log('[QualityFilter] User:', user.email);

    const startTime = Date.now();

    // Step 1: 加载并合并数据
    console.log('[QualityFilter] Step 1: Loading and merging data...');
    const merged = loadAndMergeData();

    // Step 2: 基础清洗
    console.log('[QualityFilter] Step 2: Cleaning data...');
    const cleaned = cleanData(merged);

    // Step 3: LLM 批次评分
    console.log('[QualityFilter] Step 3: LLM evaluation...');
    const llmResults = await evaluateAllBatches(cleaned, (completed, total) => {
      if (completed % 10 === 0) {
        console.log(`[QualityFilter] LLM Progress: ${completed}/${total} batches`);
      }
    });

    // Step 4: 组装结果（含加分）
    console.log('[QualityFilter] Step 4: Assembling results...');
    let results = assembleResults(cleaned, llmResults);

    // Step 5: 去重
    console.log('[QualityFilter] Step 5: Deduplicating...');
    results = deduplicateByHash(results);

    // Step 6: 输出文件
    console.log('[QualityFilter] Step 6: Generating output...');
    generateOutput(results);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[QualityFilter] Complete in ${elapsed}s`);

    // 统计摘要
    const summary = {
      total: results.length,
      distribution: {
        strong_recommend: results.filter((r) => r.recommendation === 'strong_recommend').length,
        recommend: results.filter((r) => r.recommendation === 'recommend').length,
        conditional: results.filter((r) => r.recommendation === 'conditional').length,
        low_priority: results.filter((r) => r.recommendation === 'low_priority').length,
      },
      averages: {
        total_score: (results.reduce((s, r) => s + r.total_score, 0) / results.length).toFixed(1),
        llm_score: (results.reduce((s, r) => s + r.llm_total, 0) / results.length).toFixed(1),
        bonus: (results.reduce((s, r) => s + r.bonus_total, 0) / results.length).toFixed(1),
      },
      verticals: Object.entries(
        results.reduce(
          (acc, r) => {
            acc[r.vertical] = (acc[r.vertical] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      ).sort((a, b) => b[1] - a[1]),
      requires_upload: {
        yes: results.filter((r) => r.requires_upload).length,
        no: results.filter((r) => !r.requires_upload).length,
      },
      elapsed_seconds: parseFloat(elapsed),
      top10: results.slice(0, 10).map((r) => ({
        id: r.id,
        title: r.title.substring(0, 50),
        score: r.total_score,
        seo_intent: r.seo_intent,
      })),
    };

    return respData({
      success: true,
      summary,
      outputPath: '/Users/lixuanying/Documents/GitHub/antigravityskills-com/docs/output/quality-filter/',
    });
  } catch (error: any) {
    console.error('[QualityFilter] Error:', error);
    return respErr(error.message || 'Quality filter failed');
  }
}

/**
 * GET /api/admin/prompts/quality-filter
 *
 * 获取上次运行的结果摘要
 */
export async function GET(request: Request) {
  try {
    // 🔒 P0 Security: AuthN
    const user = await getSignUser();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    // 🔒 P0 Security: AuthZ
    if (!(await hasPermission(user.id, 'admin.prompts.read'))) {
      return respErr('Forbidden: Missing admin.prompts.read permission', 403);
    }

    // 尝试读取上次的结果
    const fs = await import('fs');
    const path = await import('path');

    const outputPath = '/Users/lixuanying/Documents/GitHub/antigravityskills-com/docs/output/quality-filter/quality-filtered-prompts.json';

    if (!fs.existsSync(outputPath)) {
      return respData({
        exists: false,
        message: 'No previous results found. Run POST to execute quality filter.',
      });
    }

    const data = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as QualityResult[];

    // 返回摘要
    const summary = {
      exists: true,
      total: data.length,
      distribution: {
        strong_recommend: data.filter((r) => r.recommendation === 'strong_recommend').length,
        recommend: data.filter((r) => r.recommendation === 'recommend').length,
        conditional: data.filter((r) => r.recommendation === 'conditional').length,
        low_priority: data.filter((r) => r.recommendation === 'low_priority').length,
      },
      top10: data.slice(0, 10).map((r) => ({
        id: r.id,
        title: r.title.substring(0, 50),
        score: r.total_score,
        recommendation: r.recommendation,
      })),
    };

    return respData(summary);
  } catch (error: any) {
    console.error('[QualityFilter] GET Error:', error);
    return respErr(error.message || 'Failed to get results');
  }
}
