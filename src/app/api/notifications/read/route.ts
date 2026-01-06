import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { markAsRead } from '@/shared/services/notification';

/**
 * POST /api/notifications/read
 * 标记通知已读（单条或全部）
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const { notificationId } = await request.json() as any;

    await markAsRead(user.id, notificationId);

    return respData({ success: true });
  } catch (error: any) {
    console.error('[POST Mark Read] Error:', error);
    return respErr(error.message);
  }
}
