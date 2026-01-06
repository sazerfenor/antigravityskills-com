/**
 * POST /api/admin/cases/sync-v2
 * 
 * 将本地 V2 数据同步到 Cloudflare Workers KV
 * 
 * 特性：
 * - 安全鉴权 (Admin only / Secret Key)
 * - 分批写入 (防止 Rate Limit)
 * - 原子索引更新 (数据先写，索引最后)
 * 
 * @module api/admin/cases/sync-v2
 */

import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserInfo } from '@/shared/models/user';
import { hasRole } from '@/shared/services/rbac';
import { respData, respErr } from '@/shared/lib/resp';

// 直接导入 V2 数据
import vectorDataV2 from '@/data/cases-v2-with-vectors.json';

// ==================== Auth ====================

/** Admin Secret Key (用于脚本调用) */
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'banana-admin-2024';

/**
 * 验证管理员权限
 * 支持两种方式：
 * 1. Session 登录 + Admin 角色
 * 2. x-admin-secret header (脚本用)
 */
async function checkAdminAuth(request: Request): Promise<{ authorized: boolean; method: string }> {
  // 方式一：检查 Secret Key
  const secretHeader = request.headers.get('x-admin-secret');
  if (secretHeader === ADMIN_SECRET) {
    return { authorized: true, method: 'secret-key' };
  }

  // 方式二：检查 Session + RBAC
  try {
    const user = await getUserInfo();
    if (!user) {
      return { authorized: false, method: 'no-session' };
    }

    // 检查 isAdmin 字段
    if ((user as any).isAdmin === true) {
      return { authorized: true, method: 'isAdmin-field' };
    }

    // 检查 RBAC admin 角色
    const isAdmin = await hasRole(user.id, 'admin');
    if (isAdmin) {
      return { authorized: true, method: 'rbac-admin' };
    }

    return { authorized: false, method: 'not-admin' };
  } catch (error) {
    console.error('[Sync V2] Auth error:', error);
    return { authorized: false, method: 'auth-error' };
  }
}


// ==================== Types ====================

interface CaseV2Data {
  id: string;
  title: string;
  version: '2.0';
  category: string;
  origin_prompt: string;
  template_payload: {
    template: string;
    default_subject: string;
    placeholder_type: string;
  };
  semantic_search_text: string;
  constraints: {
    requires_image_upload: boolean;
    original_aspect_ratio?: string;
    model_hint?: string;
    output_type?: string;
  };
  tags: {
    style: string[];
    atmosphere: string[];
    technique: string[];
    composition: string[];
    intent: string[];
  };
  vector: number[];
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  etl_metadata?: {
    confidence: number;
    needs_review: boolean;
    review_reason?: string;
    processed_at: string;
  };
}

interface V2InputData {
  model: string;
  dimensions: number;
  generatedAt: string;
  totalCases: number;
  cases: CaseV2Data[];
}

interface V2KVEntry {
  id: string;
  title: string;
  version: '2.0';
  category: string;
  semanticText: string;
  vector: number[];
  payload: {
    template_payload: CaseV2Data['template_payload'];
    constraints: CaseV2Data['constraints'];
    tags: CaseV2Data['tags'];
    origin_prompt: string;
    thumbnail: string;
  };
  metadata: {
    category: string;
    requires_image_upload: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface V2IndexMeta {
  version: '2.0';
  model: string;
  dimensions: number;
  totalCases: number;
  generatedAt: string;
  syncedAt: string;
  ids: string[];
  categories: {
    VISUAL: string[];
    EDITING: string[];
    LAYOUT: string[];
    UTILITY: string[];
  };
}

// ==================== Config ====================

/** 每批处理数量 */
const BATCH_SIZE = 20;

/** 批次间隔 (ms) - 防止 Rate Limit */
const BATCH_DELAY = 100;

// ==================== Utils ====================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 将 CaseV2Data 转换为 KV 存储格式
 */
function toKVEntry(c: CaseV2Data): V2KVEntry {
  return {
    id: c.id,
    title: c.title,
    version: '2.0',
    category: c.category,
    semanticText: c.semantic_search_text,
    vector: c.vector,
    payload: {
      template_payload: c.template_payload,
      constraints: c.constraints,
      tags: c.tags,
      origin_prompt: c.origin_prompt,
      thumbnail: c.thumbnail,
    },
    metadata: {
      category: c.category,
      requires_image_upload: c.constraints.requires_image_upload,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    },
  };
}

// ==================== Handlers ====================

/**
 * POST /api/admin/cases/sync-v2
 * 
 * Body:
 * - action: 'sync' | 'status' | 'clear'
 * - data?: V2InputData (可选，不传则使用内置数据)
 */
export async function POST(request: Request) {
  try {
    // 1. 安全鉴权
    const authResult = await checkAdminAuth(request);
    if (!authResult.authorized) {
      console.warn('[Sync V2] Unauthorized access attempt:', authResult.method);
      return respErr(`Unauthorized. Admin access required. (${authResult.method})`);
    }
    console.log('[Sync V2] Auth passed via:', authResult.method);

    // 2. 获取 KV
    const { env } = getCloudflareContext();
    if (!env.CASES_KV) {
      return respErr('CASES_KV namespace not available');
    }
    const kv = env.CASES_KV;

    // 3. 解析请求
    const body = await request.json() as {
      action?: 'sync' | 'status' | 'clear';
      data?: V2InputData;
    };
    const action = body.action || 'sync';

    switch (action) {
      case 'status':
        return await handleStatus(kv);
      case 'clear':
        return await handleClear(kv);
      case 'sync':
        const data = body.data || (vectorDataV2 as V2InputData);
        return await handleSync(kv, data);
      default:
        return respErr(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('[Sync V2] Error:', error);
    return respErr(error.message);
  }
}

/**
 * 查询 V2 KV 状态
 */
async function handleStatus(kv: KVNamespace) {
  // 获取索引
  const indexMeta = await kv.get<V2IndexMeta>('index-v2', 'json');
  
  // 统计 V2 keys
  const list = await kv.list({ prefix: 'case-v2:' });
  
  return respData({
    indexMeta,
    totalV2Cases: list.keys.length,
    sampleKeys: list.keys.slice(0, 5).map(k => k.name),
  });
}

/**
 * 清空 V2 数据
 */
async function handleClear(kv: KVNamespace) {
  console.log('[Sync V2] Clearing V2 data...');
  
  // 获取所有 V2 keys
  let cursor: string | undefined;
  let deletedCount = 0;
  const keysToDelete: string[] = [];
  
  do {
    const list = await kv.list({ prefix: 'case-v2:', cursor });
    keysToDelete.push(...list.keys.map(k => k.name));
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  
  // 分批删除
  for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
    const batch = keysToDelete.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(key => kv.delete(key)));
    deletedCount += batch.length;
    
    if (i + BATCH_SIZE < keysToDelete.length) {
      await sleep(BATCH_DELAY);
    }
  }
  
  // 删除索引
  await kv.delete('index-v2');
  
  console.log(`[Sync V2] Cleared ${deletedCount} V2 cases`);
  
  return respData({
    success: true,
    deletedCount,
    message: `Cleared ${deletedCount} V2 cases from KV`,
  });
}

/**
 * 同步 V2 数据到 KV
 * 
 * 策略：
 * 1. 分批写入 case-v2:{id}
 * 2. 最后更新 index-v2
 */
async function handleSync(kv: KVNamespace, data: V2InputData) {
  console.log('[Sync V2] Starting sync...');
  console.log(`  Total cases: ${data.totalCases}`);
  console.log(`  Model: ${data.model}`);
  console.log(`  Dimensions: ${data.dimensions}`);

  // 验证维度
  if (data.dimensions !== 768) {
    console.warn(`[Sync V2] Warning: Expected 768 dims, got ${data.dimensions}`);
  }

  const ids: string[] = [];
  const categories = {
    VISUAL: [] as string[],
    EDITING: [] as string[],
    LAYOUT: [] as string[],
    UTILITY: [] as string[],
  };
  
  let successCount = 0;
  const errors: Array<{ id: string; error: string }> = [];
  const startTime = Date.now();

  // 分批写入
  const totalBatches = Math.ceil(data.cases.length / BATCH_SIZE);
  
  for (let i = 0; i < data.cases.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = data.cases.slice(i, i + BATCH_SIZE);
    
    console.log(`[Sync V2] Processing batch ${batchNum}/${totalBatches}...`);
    
    // 并发写入这一批
    const batchResults = await Promise.allSettled(
      batch.map(async (c) => {
        const key = `case-v2:${c.id}`;
        const kvEntry = toKVEntry(c);
        
        await kv.put(key, JSON.stringify(kvEntry), {
          metadata: kvEntry.metadata,
        });
        
        return c;
      })
    );
    
    // 统计结果
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const caseData = batch[j];
      
      if (result.status === 'fulfilled') {
        ids.push(caseData.id);
        successCount++;
        
        // 分类统计
        const cat = caseData.category as keyof typeof categories;
        if (categories[cat]) {
          categories[cat].push(caseData.id);
        }
      } else {
        errors.push({
          id: caseData.id,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }
    
    // 批次间休眠 (防止 Rate Limit)
    if (i + BATCH_SIZE < data.cases.length) {
      await sleep(BATCH_DELAY);
    }
  }

  // 原子更新索引 (最后一步)
  console.log('[Sync V2] Updating index...');
  
  const indexMeta: V2IndexMeta = {
    version: '2.0',
    model: data.model,
    dimensions: data.dimensions,
    totalCases: successCount,
    generatedAt: data.generatedAt,
    syncedAt: new Date().toISOString(),
    ids,
    categories,
  };
  
  await kv.put('index-v2', JSON.stringify(indexMeta));

  const duration = Date.now() - startTime;
  console.log(`[Sync V2] Completed in ${duration}ms`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errors.length}`);

  return respData({
    success: true,
    mode: 'overwrite',
    totalCases: data.totalCases,
    syncedCount: successCount,
    errorCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
    model: data.model,
    dimensions: data.dimensions,
    durationMs: duration,
    categories: {
      VISUAL: categories.VISUAL.length,
      EDITING: categories.EDITING.length,
      LAYOUT: categories.LAYOUT.length,
      UTILITY: categories.UTILITY.length,
    },
  });
}

/**
 * GET /api/admin/cases/sync-v2
 * 获取 V2 KV 状态
 */
export async function GET(request: Request) {
  try {
    // 鉴权
    const authResult = await checkAdminAuth(request);
    if (!authResult.authorized) {
      return respErr(`Unauthorized. Admin access required. (${authResult.method})`);
    }

    const { env } = getCloudflareContext();
    if (!env.CASES_KV) {
      return respErr('CASES_KV namespace not available');
    }

    return await handleStatus(env.CASES_KV);
  } catch (error: any) {
    console.error('[Sync V2] Error:', error);
    return respErr(error.message);
  }
}
