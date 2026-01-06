'use client';

import { toast } from 'sonner';

/**
 * 错误处理响应接口（从API返回）
 */
interface ErrorResponse {
  message: string;
  errorId?: string;
  errorType?: string;
  shouldRetry?: boolean;
  retryDelay?: number;
}

/**
 * 错误处理选项
 */
interface ErrorHandlerOptions {
  feature: string;
  onRetry?: () => void | Promise<void>;
  onFeedback?: (errorId: string) => void;
}

/**
 * ErrorHandler - 前端错误处理工具
 * 负责显示错误toast、处理重试逻辑、提供反馈入口
 */
export class ErrorHandler {
  /**
   * 处理错误显示和操作
   * @param error 错误对象或错误响应
   * @param options 处理选项
   */
  static async handle(
    error: any,
    options: ErrorHandlerOptions
  ): Promise<void> {
    const errorResponse = this.parseError(error);

    // 构建toast消息内容
    const toastMessage = this.buildToastMessage(errorResponse);

    // 显示错误toast
    toast.error(toastMessage, {
      duration: errorResponse.shouldRetry ? 5000 : 8000,
      action: errorResponse.errorId
        ? {
            label: 'Report Issue',
            onClick: () => {
              if (options.onFeedback && errorResponse.errorId) {
                options.onFeedback(errorResponse.errorId);
              }
            },
          }
        : undefined,
    });

    // 自动重试逻辑
    if (errorResponse.shouldRetry && options.onRetry) {
      const delay = errorResponse.retryDelay || 3000;

      toast.info(`Retrying in ${delay / 1000}s...`, {
        duration: delay,
      });

      setTimeout(async () => {
        try {
          await options.onRetry!();
        } catch (retryError) {
          // 重试失败，不再自动重试
          console.error('Retry failed:', retryError);
        }
      }, delay);
    }
  }

  /**
   * 解析错误对象
   * @param error 任意错误对象
   * @returns 标准化的错误响应
   */
  private static parseError(error: any): ErrorResponse {
    // 如果已经是ErrorResponse格式
    if (error.message && typeof error.message === 'string') {
      return {
        message: error.message,
        errorId: error.errorId,
        errorType: error.errorType,
        shouldRetry: error.shouldRetry || false,
        retryDelay: error.retryDelay,
      };
    }

    // 如果是Response对象
    if (error instanceof Response) {
      return {
        message: error.statusText || 'Request failed',
        shouldRetry: false,
      };
    }

    // 如果是普通Error对象
    if (error instanceof Error) {
      return {
        message: error.message,
        shouldRetry: false,
      };
    }

    // 默认错误
    return {
      message: String(error) || 'An unexpected error occurred',
      shouldRetry: false,
    };
  }

  /**
   * 构建toast消息内容
   * @param errorResponse 错误响应
   * @returns toast消息字符串
   */
  private static buildToastMessage(errorResponse: ErrorResponse): string {
    // 只显示用户消息，不显示Error ID
    // Error ID仍然保留在errorResponse中，供FeedbackModal使用
    return errorResponse.message;
  }

  /**
   * 简单的错误显示（不需要高级功能时使用）
   * @param message 错误消息
   */
  static showSimple(message: string): void {
    toast.error(message);
  }
}
