import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/core/rbac/permission';
import { recallBatch } from '@/shared/services/notification';

/**
 * POST /api/admin/notifications/[batchId]/recall
 * 撤回批次通知
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized');
    }

    const hasPerm = await hasPermission(user.id, 'admin.notifications.write');
    if (!hasPerm) {
      return respErr('No permission');
    }

    const { batchId } = await params;

    if (!batchId) {
      return respErr('Batch ID is required');
    }

    const affectedCount = await recallBatch(batchId);

    return respData({ success: true, affectedCount });
  } catch (error: any) {
    console.error('[POST Admin Notifications Recall] Error:', error);
    return respErr(error.message);
  }
}
