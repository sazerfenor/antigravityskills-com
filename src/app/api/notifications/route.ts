import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getNotifications } from '@/shared/services/notification';

/**
 * GET /api/notifications
 * 获取当前用户的通知列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getNotifications(user.id, page, limit);
    return respData(result);
  } catch (error: any) {
    console.error('[GET Notifications] Error:', error);
    return respErr(error.message);
  }
}
