/**
 * Admin ETL Preview API
 * 
 * POST /api/admin/etl/preview
 * 
 * 场景: 管理员粘贴一段网上的 Prompt，点"解析"
 * 返回: 清洗后的 CaseV2 草稿（分类、模板、搜索词）
 * 
 * @module src/app/api/admin/etl/preview/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { EtlProcessorService } from '@/shared/services/etl-processor.service';

// ==================== Types ====================

interface PreviewRequest {
  raw_prompt: string;
  id?: string;
  title?: string;
  source_url?: string;
}

// ==================== Handler ====================

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求
    const body = await request.json() as PreviewRequest;
    
    if (!body.raw_prompt || typeof body.raw_prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'raw_prompt is required' },
        { status: 400 }
      );
    }

    if (body.raw_prompt.length > 50000) {
      return NextResponse.json(
        { success: false, error: 'Prompt too long (max 50000 chars)' },
        { status: 400 }
      );
    }

    // 2. 调用 ETL 服务进行清洗
    const etlService = new EtlProcessorService();
    const result = await etlService.execute({
      raw_prompt: body.raw_prompt,
      id: body.id,
      title: body.title,
      source_url: body.source_url,
    });

    // 3. 返回结果
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      draft: result.draft,
      warnings: result.warnings,
    });

  } catch (error: any) {
    console.error('[ETL Preview] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
