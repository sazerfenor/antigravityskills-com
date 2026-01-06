import { ErrorType } from '@/shared/models/error_report';

/**
 * 错误配置接口
 */
interface ErrorConfig {
  userMessage: string; // 用户看到的友好消息
  shouldRetry: boolean; // 是否应该重试
  retryDelay?: number; // 重试延迟（毫秒）
  maxRetries?: number; // 最大重试次数
  action?: 'redirect' | 'none'; // 执行的操作
  actionUrl?: string; // 操作URL（如重定向地址）
}

/**
 * 错误类型配置映射
 * 所有用户可见消息使用英文，语气自然、口语化
 * V2: 新增 validation, not_found, content_policy, storage, provider 类型
 */
export const ERROR_CONFIG: Record<string, ErrorConfig> = {
  [ErrorType.RATE_LIMIT]: {
    userMessage: "We're a bit busy. Please try again in a moment.",
    shouldRetry: true,
    retryDelay: 3000,
    maxRetries: 1,
  },

  insufficient_credits: {
    userMessage: "You need more credits to continue. Please top up.",
    shouldRetry: false,
    action: 'redirect',
    actionUrl: '/settings/credits',
  },

  [ErrorType.AUTH]: {
    userMessage: "For your security, please sign in again.",
    shouldRetry: false,
    action: 'redirect',
    actionUrl: '/auth/signin',
  },

  [ErrorType.PAYMENT]: {
    userMessage: "We couldn't process your payment. Please check details.",
    shouldRetry: false,
    action: 'redirect',
    actionUrl: '/settings/billing',
  },

  [ErrorType.NETWORK]: {
    userMessage: "Seems like connection is lost. Please check your internet.",
    shouldRetry: true,
    retryDelay: 2000,
    maxRetries: 2,
  },

  [ErrorType.SERVER]: {
    userMessage: "Temporary server issue. We're on it.",
    shouldRetry: false,
  },

  // V2: 新增错误类型配置
  [ErrorType.VALIDATION]: {
    userMessage: "Some input was invalid. Please check and try again.",
    shouldRetry: false,
  },

  [ErrorType.NOT_FOUND]: {
    userMessage: "The requested resource was not found.",
    shouldRetry: false,
  },

  [ErrorType.CONTENT_POLICY]: {
    userMessage: "Your content was blocked by safety filters. Please try a different prompt.",
    shouldRetry: false,
  },

  [ErrorType.STORAGE]: {
    userMessage: "Failed to save your file. Please try again.",
    shouldRetry: true,
    retryDelay: 2000,
    maxRetries: 1,
  },

  [ErrorType.PROVIDER]: {
    userMessage: "AI service encountered an issue. Please try again.",
    shouldRetry: true,
    retryDelay: 3000,
    maxRetries: 1,
  },

  [ErrorType.UNKNOWN]: {
    userMessage: "That didn't work as expected. Please refresh.",
    shouldRetry: false,
  },
};

/**
 * 获取错误配置
 * @param errorType 错误类型
 * @returns 错误配置对象
 */
export function getErrorConfig(errorType: string): ErrorConfig {
  return ERROR_CONFIG[errorType] || ERROR_CONFIG[ErrorType.UNKNOWN];
}
