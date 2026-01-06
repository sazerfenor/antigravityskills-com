/**
 * POST /api/admin/cases/sync-to-kv
 * 将语义向量数据同步到 Cloudflare Workers KV
 * 
 * 请求体：
 * - action: 'sync' - 需要附带 embeddings 数据
 * - action: 'clear' - 清空 KV
 * - action: 'status' - 查询状态
 * 
 * @module api/admin/cases/sync-to-kv
 */

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { 
  putCase, 
  putIndexMeta, 
  getIndexMeta, 
  listCases, 
  clearAllCases,
  type CaseKVData 
} from '@/shared/lib/cases-kv';

// 语义向量数据类型
interface EmbeddingData {
  model: string;
  dimensions: number;
  generatedAt: string;
  totalCases: number;
  embeddings: Array<{
    id: string;
    title: string;
    semanticText: string;
    vector: number[];
    payload: any;
    metadata: {
      hasImageUpload: boolean;
      keywords: string[];
    };
  }>;
}

/**
 * POST /api/admin/cases/sync-to-kv
 */
export async function POST(request: Request) {
  try {
    // 验证管理员权限
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const body = await request.json() as { 
      action?: string;
      data?: EmbeddingData;
    };
    const action = body.action || 'sync';

    switch (action) {
      case 'status':
        return await handleStatus();
      case 'clear':
        return await handleClear();
      case 'sync':
        if (!body.data) {
          return respErr('Missing embeddings data. Please provide "data" field with embeddings.');
        }
        return await handleSync(body.data);
      default:
        return respErr(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('[Sync to KV] Error:', error);
    return respErr(error.message);
  }
}

/**
 * 获取 KV 状态
 */
async function handleStatus() {
  const meta = await getIndexMeta();
  const cases = await listCases();
  
  return respData({
    indexMeta: meta,
    totalCases: cases.length,
    cases: cases.map(c => ({
      id: c.id,
      title: c.metadata.title,
      hasImageUpload: c.metadata.hasImageUpload,
    })),
  });
}

/**
 * 清空所有 Case 数据
 */
async function handleClear() {
  const deletedCount = await clearAllCases();
  return respData({
    success: true,
    deletedCount,
    message: `Cleared ${deletedCount} cases from KV`,
  });
}

/**
 * 同步语义向量到 KV
 */
async function handleSync(data: EmbeddingData) {
  console.log(`[Sync to KV] Syncing ${data.totalCases} cases...`);

  let successCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const embedding of data.embeddings) {
    try {
      const kvData: CaseKVData = {
        id: embedding.id,
        title: embedding.title,
        semanticText: embedding.semanticText,
        vector: embedding.vector,
        payload: embedding.payload,
        metadata: {
          title: embedding.title,
          hasImageUpload: embedding.metadata.hasImageUpload,
          keywords: embedding.metadata.keywords,
          updatedAt: new Date().toISOString(),
        },
      };

      await putCase(kvData);
      successCount++;
      console.log(`[Sync to KV] ✅ ${embedding.id}: ${embedding.title}`);
    } catch (error: any) {
      console.error(`[Sync to KV] ❌ ${embedding.id}: ${error.message}`);
      errors.push({ id: embedding.id, error: error.message });
    }
  }

  // 更新索引元数据
  await putIndexMeta({
    version: '1.0.0',
    totalCases: successCount,
    model: data.model,
    dimensions: data.dimensions,
    updatedAt: new Date().toISOString(),
  });

  console.log(`[Sync to KV] Completed. Success: ${successCount}, Failed: ${errors.length}`);

  return respData({
    success: true,
    totalCases: data.totalCases,
    successCount,
    errorCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
    model: data.model,
    dimensions: data.dimensions,
  });
}

/**
 * GET /api/admin/cases/sync-to-kv
 * 获取 KV 状态
 */
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    return await handleStatus();
  } catch (error: any) {
    console.error('[Sync to KV] Error:', error);
    return respErr(error.message);
  }
}
