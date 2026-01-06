import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { deleteNotification } from '@/shared/services/notification';

/**
 * DELETE /api/notifications/[id]
 * 删除单条通知
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const { id } = await params;

    await deleteNotification(user.id, id);

    return respData({ success: true });
  } catch (error: any) {
    console.error('[DELETE Notification] Error:', error);
    return respErr(error.message);
  }
}
