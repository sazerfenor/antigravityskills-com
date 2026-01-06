import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getErrorReportByErrorId } from '@/shared/models/error_report_query';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ErrorStatusUpdater } from '@/shared/components/admin/ErrorStatusUpdater';
import { ReplyViaEmailButton } from '@/shared/components/admin/ReplyViaEmailButton';

/**
 * 错误详情页面
 */
export default async function ErrorDetailPage({
  params,
}: {
  params: { errorId: string };
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
      </div>
    );
  }

  // 获取错误详情
  const error = await getErrorReportByErrorId(params.errorId);
  if (!error) {
    notFound();
  }

  return (
    <div className="container py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/errors">
          <Button variant="ghost" size="sm">
            ← Back to List
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* 头部信息 */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">Error Report</h1>
            <Badge>{error.status}</Badge>
          </div>
          <p className="text-gray-600">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {error.errorId}
            </code>
          </p>
        </div>

        {/* 基本信息 */}
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Time</dt>
              <dd className="mt-1">
                {new Date(error.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User</dt>
              <dd className="mt-1">{error.userEmail || error.userId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Feature</dt>
              <dd className="mt-1">
                <Badge variant="outline">{error.feature}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Error Type</dt>
              <dd className="mt-1">
                <Badge variant="secondary">{error.errorType}</Badge>
              </dd>
            </div>
            {error.provider && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Provider</dt>
                <dd className="mt-1">{error.provider}</dd>
              </div>
            )}
            {error.model && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Model</dt>
                <dd className="mt-1">{error.model}</dd>
              </div>
            )}
            {error.statusCode && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Status Code
                </dt>
                <dd className="mt-1">{error.statusCode}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* User看到的消息 */}
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">User Message</h2>
          <p className="text-gray-700">{error.userMessage}</p>
        </div>

        {/* 用户反馈 */}
        {error.userFeedback && (
          <div className="rounded-lg border p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold">User Feedback</h2>
              {error.userEmail && (
                <ReplyViaEmailButton
                  userEmail={error.userEmail}
                  errorId={error.errorId}
                  userFeedback={error.userFeedback}
                />
              )}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {error.userFeedback}
            </p>
            {error.feedbackAt && (
              <p className="text-sm text-gray-500 mt-2">
                Submitted: {new Date(error.feedbackAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* 技术详情 */}
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Technical Details</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Error Message
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                {error.technicalMessage}
              </pre>
            </div>

            {error.stackTrace && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Stack Trace
                </h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto max-h-64">
                  {error.stackTrace}
                </pre>
              </div>
            )}

            {error.apiResponse && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  API Response
                </h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto max-h-64">
                  {error.apiResponse}
                </pre>
              </div>
            )}

            {error.requestParams && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Request Parameters
                </h3>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(JSON.parse(error.requestParams), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 解决方案 */}
        {error.resolution && (
          <div className="rounded-lg border p-6 bg-green-50 dark:bg-green-950">
            <h2 className="text-lg font-semibold mb-2">Resolution</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {error.resolution}
            </p>
            {error.resolvedAt && (
              <p className="text-sm text-gray-500 mt-2">
                Resolved: {new Date(error.resolvedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* 状态更新 */}
        <ErrorStatusUpdater
          errorId={error.errorId}
          currentStatus={error.status}
          currentResolution={error.resolution}
        />
      </div>
    </div>
  );
}
