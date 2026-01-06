import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getErrorReportList, getErrorReportStats } from '@/shared/models/error_report_query';
import { ErrorReportStatus, ErrorType, ErrorFeature } from '@/shared/models/error_report';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { StatusDropdown } from '@/shared/components/admin/StatusDropdown';

/**
 * Admin页面 - 错误报告列表
 */
export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: { 
    status?: string; 
    type?: string; 
    feature?: string;
    hasFeedback?: string;
    page?: string;
  };
}) {
  // 验证权限
  const user = await getUserInfo();
  if (!user) {
    redirect('/auth/signin');
  }

  const canViewErrors = await hasPermission(user.id, 'admin.errors.read');
  if (!canViewErrors) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You don't have permission to view error reports.</p>
      </div>
    );
  }

  // 获取查询参数
  const status = searchParams.status;
  const errorType = searchParams.type;
  const feature = searchParams.feature;
  const hasFeedback = searchParams.hasFeedback === 'true';
  const page = parseInt(searchParams.page || '1');
  const limit = 20;

  // 判断是否需要排除closed（如果明确选择了closed，则不排除）
  const excludeClosed = status !== 'closed';

  // 获取错误列表
  const { errors, total } = await getErrorReportList({
    status,
    errorType,
    feature,
    hasFeedback,
    page,
    limit,
    excludeClosed,
  });

  // 获取统计数据
  const stats = await getErrorReportStats();

  // 构建查询字符串的辅助函数
  const buildQueryString = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Error Reports</h1>
        <p className="text-gray-600 mt-2">Monitor and manage application errors</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Errors (7 days)</div>
          <div className="text-2xl font-bold mt-1">{stats.totalErrors}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold mt-1 text-orange-600">
            {stats.pendingErrors}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Resolved</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {stats.resolvedErrors}
          </div>
        </div>
      </div>

      {/* 多层筛选器 */}
      <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        {/* 状态筛选 */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status:</label>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/errors${buildQueryString({ type: errorType, feature })}`}>
              <Button variant={!status ? 'default' : 'outline'} size="sm">
                All
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status: 'pending', type: errorType, feature })}`}>
              <Button variant={status === 'pending' ? 'default' : 'outline'} size="sm">
                Pending
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status: 'investigating', type: errorType, feature })}`}>
              <Button variant={status === 'investigating' ? 'default' : 'outline'} size="sm">
                Investigating
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status: 'resolved', type: errorType, feature })}`}>
              <Button variant={status === 'resolved' ? 'default' : 'outline'} size="sm">
                Resolved
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status: 'closed', type: errorType, feature })}`}>
              <Button variant={status === 'closed' ? 'default' : 'outline'} size="sm">
                Closed
              </Button>
            </Link>
          </div>
        </div>

        {/* 错误类型筛选 */}
        <div>
          <label className="text-sm font-medium mb-2 block">Error Type:</label>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/errors${buildQueryString({ status, feature })}`}>
              <Button variant={!errorType ? 'default' : 'outline'} size="sm">
                All Types
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: 'rate_limit', feature })}`}>
              <Button variant={errorType === 'rate_limit' ? 'default' : 'outline'} size="sm">
                Rate Limit
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: 'auth', feature })}`}>
              <Button variant={errorType === 'auth' ? 'default' : 'outline'} size="sm">
                Auth
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: 'payment', feature })}`}>
              <Button variant={errorType === 'payment' ? 'default' : 'outline'} size="sm">
                Payment
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: 'network', feature })}`}>
              <Button variant={errorType === 'network' ? 'default' : 'outline'} size="sm">
                Network
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: 'server', feature })}`}>
              <Button variant={errorType === 'server' ? 'default' : 'outline'} size="sm">
                Server
              </Button>
            </Link>
          </div>
        </div>

        {/* 功能筛选 */}
        <div>
          <label className="text-sm font-medium mb-2 block">Feature:</label>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType })}`}>
              <Button variant={!feature ? 'default' : 'outline'} size="sm">
                All Features
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType, feature: 'image_generation' })}`}>
              <Button variant={feature === 'image_generation' ? 'default' : 'outline'} size="sm">
                Image Gen
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType, feature: 'music_generation' })}`}>
              <Button variant={feature === 'music_generation' ? 'default' : 'outline'} size="sm">
                Music Gen
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType, feature: 'chat' })}`}>
              <Button variant={feature === 'chat' ? 'default' : 'outline'} size="sm">
                Chat
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType, feature: 'payment' })}`}>
              <Button variant={feature === 'payment' ? 'default' : 'outline'} size="sm">
                Payment
              </Button>
            </Link>
          </div>
        </div>

        {/* 反馈筛选 */}
        <div>
          <label className="text-sm font-medium mb-2 block">User Feedback:</label>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType, feature })}`}>
              <Button variant={!searchParams.hasFeedback ? 'default' : 'outline'} size="sm">
                All
              </Button>
            </Link>
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType, feature, hasFeedback: 'true' })}`}>
              <Button variant={searchParams.hasFeedback === 'true' ? 'default' : 'outline'} size="sm">
                Has Feedback
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 错误列表表格 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Error ID</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No error reports found
                </TableCell>
              </TableRow>
            ) : (
              errors.map((error) => (
                <TableRow key={error.id}>
                  <TableCell>
                    <code className="text-xs">{error.errorId}</code>
                  </TableCell>
                  <TableCell>
                    {new Date(error.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {error.userEmail || error.userId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{error.feature}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{error.errorType}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusDropdown
                      errorId={error.errorId}
                      currentStatus={error.status}
                    />
                  </TableCell>
                  <TableCell>
                    {error.userFeedback ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/errors/${error.errorId}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {total > limit && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType, feature, page: String(page - 1) })}`}>
              <Button variant="outline" size="sm">
                Previous
              </Button>
            </Link>
          )}
          <div className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {Math.ceil(total / limit)}
          </div>
          {page < Math.ceil(total / limit) && (
            <Link href={`/admin/errors${buildQueryString({ status, type: errorType, feature, page: String(page + 1) })}`}>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
