/**
 * Admin ETL Confirm API
 * 
 * POST /api/admin/etl/confirm
 * 
 * 场景: 管理员检查无误（或微调后），点"入库"
 * 逻辑: 生成 Embedding 并存入 KV
 * 
 * @module src/app/api/admin/etl/confirm/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { VectorStorageService } from '@/shared/services/vector-storage.service';
import type { CaseV2Draft } from '@/shared/services/etl-processor.service';

// ==================== Types ====================

interface ConfirmRequest {
  /** 审核后的 Case 数据 */
  draft: CaseV2Draft;
  
  /** 可选的缩略图 URL */
  thumbnail?: string;
  
  /** 可选的作者 */
  author?: string;
}

// ==================== Handler ====================

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求
    const body = await request.json() as ConfirmRequest;
    
    if (!body.draft || !body.draft.semantic_search_text) {
      return NextResponse.json(
        { success: false, error: 'draft with semantic_search_text is required' },
        { status: 400 }
      );
    }

    // 2. 获取 KV
    const { env } = getCloudflareContext();
    if (!env.CASES_KV) {
      return NextResponse.json(
        { success: false, error: 'CASES_KV not available' },
        { status: 500 }
      );
    }

    // 3. 初始化存储服务
    const storageService = new VectorStorageService();
    storageService.setKV(env.CASES_KV);

    // 4. 生成向量并构建完整记录
    console.log('[ETL Confirm] Generating embedding for:', body.draft.id);
    const finalRecord = await storageService.finalize(body.draft, {
      thumbnail: body.thumbnail,
      author: body.author,
    });

    // 5. 存入 KV
    console.log('[ETL Confirm] Saving to KV:', finalRecord.id);
    const saveResult = await storageService.save(finalRecord);

    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error },
        { status: 500 }
      );
    }

    // 6. 返回成功
    return NextResponse.json({
      success: true,
      id: saveResult.id,
      category: finalRecord.category,
      vectorDimensions: finalRecord.vector.length,
    });

  } catch (error: any) {
    console.error('[ETL Confirm] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
