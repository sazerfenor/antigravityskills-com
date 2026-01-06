import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getUnreadCount } from '@/shared/services/notification';

/**
 * GET /api/notifications/unread-count
 * 获取当前用户的未读通知数
 */
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const count = await getUnreadCount(user.id);
    return respData({ count });
  } catch (error: any) {
    console.error('[GET Unread Count] Error:', error);
    return respErr(error.message);
  }
}
