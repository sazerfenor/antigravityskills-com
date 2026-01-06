import { NextResponse } from 'next/server';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { updateErrorReportStatus } from '@/shared/models/error_report_query';

/**
 * PATCH /api/admin/errors/[errorId]
 * 更新错误报告状态
 */
export async function PATCH(
  req: Request,
  { params }: { params: { errorId: string } }
) {
  try {
    // 验证权限
    const user = await getUserInfo();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManageErrors = await hasPermission(user.id, 'admin.errors.write');
    if (!canManageErrors) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { status, resolution } = await req.json() as any;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // 更新错误状态
    await updateErrorReportStatus(params.errorId, status, resolution);

    return NextResponse.json({
      success: true,
      message: 'Error status updated successfully',
    });
  } catch (error: any) {
    console.error('Error status update failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
