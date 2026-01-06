import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission, PERMISSIONS } from '@/core/rbac/permission';
import {
  sendToUsers,
  recallBatch,
  getAdminNotificationHistory,
} from '@/shared/services/notification';

/**
 * GET /api/admin/notifications
 * 获取管理员发送历史
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const hasPerm = await hasPermission(user.id, 'admin.notifications.read');
    if (!hasPerm) {
      return respErr('No permission');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getAdminNotificationHistory(page, limit);
    return respData(result);
  } catch (error: any) {
    console.error('[GET Admin Notifications] Error:', error);
    return respErr(error.message);
  }
}

/**
 * POST /api/admin/notifications
 * 发送通知
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const hasPerm = await hasPermission(user.id, 'admin.notifications.write');
    if (!hasPerm) {
      return respErr('No permission');
    }

    const body = await request.json() as any;
    const { userIds, userFilter, message, link } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return respErr('Message is required');
    }

    const result = await sendToUsers({
      userIds,
      userFilter,
      message: message.trim(),
      link,
    });

    return respData(result);
  } catch (error: any) {
    console.error('[POST Admin Notifications] Error:', error);
    return respErr(error.message);
  }
}
