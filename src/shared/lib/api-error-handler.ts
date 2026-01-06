import { ErrorLogger } from './error-logger';
import { respErrWithMeta } from './resp';
import { getUserInfo } from '@/shared/models/user';
import type { ErrorFeature } from '@/shared/models/error_report';

/**
 * API 错误处理选项
 */
interface ErrorHandlerOptions {
  /** 功能模块标识 */
  feature: ErrorFeature | string;
  /** 可选：提供额外的上下文信息 */
  provider?: string;
  model?: string;
  requestParams?: Record<string, unknown>;
}

/**
 * 统一的 API 错误处理函数
 *
 * 自动完成以下工作：
 * 1. 获取当前用户信息（如果有）
 * 2. 使用 ErrorLogger 记录错误到数据库
 * 3. 返回结构化的错误响应
 *
 * @example
 * ```typescript
 * } catch (e: any) {
 *   return handleApiError(e, { feature: ErrorFeature.IMAGE_GENERATION });
 * }
 * ```
 *
 * @example
 * ```typescript
 * } catch (e: any) {
 *   return handleApiError(e, {
 *     feature: 'payment',
 *     provider: 'stripe',
 *     requestParams: { orderId },
 *   });
 * }
 * ```
 */
export const handleApiError = async (
  error: unknown,
  options: ErrorHandlerOptions
): Promise<Response> => {
  // 安全地获取用户信息
  const user = await getUserInfo().catch(() => null);

  // 使用 ErrorLogger 记录错误
  const errorReport = await ErrorLogger.log({
    error,
    context: {
      feature: options.feature,
      userId: user?.id || 'anonymous',
      userEmail: user?.email || undefined,
      provider: options.provider,
      model: options.model,
      requestParams: options.requestParams,
    },
  });

  // 返回结构化错误响应
  return respErrWithMeta({
    message: errorReport.userMessage,
    errorId: errorReport.errorId,
    errorType: errorReport.errorType,
    shouldRetry: errorReport.shouldRetry,
    retryDelay: errorReport.retryDelay,
  });
};
