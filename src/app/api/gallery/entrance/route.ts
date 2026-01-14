/**
 * Gallery Entrance API
 *
 * GET /api/gallery/entrance
 *
 * 返回首页 Gallery 入口组件所需的数据：
 * - categories: 分类列表（含 count 和 coverImage）
 * - trending: 热门趋势列表
 *
 * 公开 API，无需认证
 */

import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getGalleryEntranceData } from '@/shared/services/gallery-entrance';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const data = await getGalleryEntranceData();

    // 添加缓存头：60秒 stale-while-revalidate
    const response = respData(data);
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );

    return response;
  } catch (error: unknown) {
    console.error('[API] /api/gallery/entrance error:', error);
    return respErr(
      error instanceof Error ? error.message : 'Failed to fetch gallery data'
    );
  }
}
