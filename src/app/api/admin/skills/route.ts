/**
 * GET /api/admin/skills
 * 获取 Skills 列表（管理后台）
 */

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getAllAntigravitySkills } from '@/shared/models/antigravity_skill';

export async function GET(request: Request) {
  try {
    // 1. 权限检查
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || undefined;

    const offset = (page - 1) * limit;

    // 3. 获取数据
    const { skills, total } = await getAllAntigravitySkills({
      limit,
      offset,
      status,
    });

    return respData({
      skills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    console.error('[API] admin/skills error:', e);
    return respErr(e.message || 'Internal server error', 500);
  }
}
