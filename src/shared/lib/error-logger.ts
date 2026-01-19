import { nanoid } from 'nanoid';
import { db } from '@/core/db';
import { errorReport } from '@/config/db/schema';
import {
  ErrorContext,
  ErrorType,
  InsertErrorReport,
} from '@/shared/models/error_report';
import { generateErrorId } from './error-id-generator';
import { getErrorConfig } from './error-config';

/**
 * 简化版 logError 函数
 * 兼容旧调用方式，内部调用 ErrorLogger.log
 */
export async function logError(
  error: any,
  context?: { context?: string; [key: string]: any }
): Promise<void> {
  try {
    await ErrorLogger.log({
      error,
      context: {
        feature: context?.context || 'unknown',
        userId: 'system', // 简化版不要求 userId，使用默认值
        requestParams: context,
      },
    });
  } catch (e) {
    // 日志记录失败不应该影响主流程
    console.error('[logError] Failed to log error:', e);
  }
}

/**
 * ErrorLogger - 后端错误日志服务
 * 负责将错误记录到数据库并返回结构化错误信息
 */
export class ErrorLogger {
  /**
   * 记录错误到数据库
   * @param params 错误参数
   * @returns 创建的错误报告
   */
  static async log(params: {
    error: any;
    context: ErrorContext;
  }): Promise<{
    errorId: string;
    userMessage: string;
    errorType: string;
    shouldRetry: boolean;
    retryDelay?: number;
  }> {
    const { error, context } = params;

    // 生成唯一错误ID
    const errorId = generateErrorId();

    // 分类错误类型
    const errorType = this.classifyError(error);

    // 获取错误配置
    const config = getErrorConfig(errorType);

    // 准备插入数据库的记录
    const errorData: InsertErrorReport = {
      id: nanoid(),
      errorId,
      userId: context.userId,
      userEmail: context.userEmail,
      feature: context.feature,
      errorType,
      statusCode: error.statusCode || error.status,
      provider: context.provider,
      model: context.model,
      userMessage: config.userMessage,
      technicalMessage: error.message || String(error),
      stackTrace: error.stack,
      apiResponse: this.extractApiResponse(error),
      requestParams: this.sanitizeParams(context.requestParams),
      status: 'pending',
    };

    try {
      // 插入数据库
      const dbConn = db();
      await dbConn.insert(errorReport).values(errorData);
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
      // 如果数据库记录失败，仍然返回错误信息，不阻塞主流程
    }

    // 返回错误信息
    return {
      errorId,
      userMessage: config.userMessage,
      errorType,
      shouldRetry: config.shouldRetry,
      retryDelay: config.retryDelay,
    };
  }

  /**
   * 分类错误类型
   * V2: 增强版本，支持更多错误类型识别
   * @param error 错误对象
   * @returns 错误类型
   */
  private static classifyError(error: any): string {
    const statusCode = error.statusCode || error.status;
    const message = (error.message || '').toLowerCase();

    // 1. 状态码优先判断
    if (statusCode) {
      if (statusCode === 429) return ErrorType.RATE_LIMIT;
      if (statusCode === 401 || statusCode === 403) return ErrorType.AUTH;
      if (statusCode === 404) return ErrorType.NOT_FOUND;
      if (statusCode >= 500) return ErrorType.SERVER;
      if (statusCode === 400) {
        // 400 需要进一步分析消息内容
        if (message.includes('credit') || message.includes('balance')) {
          return 'insufficient_credits';
        }
        if (message.includes('safety') || message.includes('blocked') || message.includes('content')) {
          return ErrorType.CONTENT_POLICY;
        }
        return ErrorType.VALIDATION;
      }
      if (statusCode === 402) return 'insufficient_credits';
    }

    // 2. 消息关键词匹配 (优先级从高到低)

    // 认证相关
    if (message.includes('no auth') ||
        message.includes('please sign in') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('no permission')) {
      return ErrorType.AUTH;
    }

    // 内容安全策略 (AI Provider)
    if (message.includes('safety') ||
        message.includes('blocked') ||
        message.includes('content policy') ||
        message.includes('flagged') ||
        message.includes('harm_category')) {
      return ErrorType.CONTENT_POLICY;
    }

    // 资源不存在
    if (message.includes('not found') ||
        message.includes('not exist') ||
        (message.includes('no ') && message.includes('found'))) {
      return ErrorType.NOT_FOUND;
    }

    // 参数校验
    if (message.includes('invalid') ||
        message.includes('validation') ||
        message.includes('required') ||
        message.includes('must be')) {
      return ErrorType.VALIDATION;
    }

    // 积分不足
    if (message.includes('credit') || message.includes('balance') || message.includes('insufficient')) {
      return 'insufficient_credits';
    }

    // 网络问题
    if (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('fetch failed') ||
        message.includes('connection')) {
      return ErrorType.NETWORK;
    }

    // 存储问题
    if (message.includes('upload') ||
        message.includes('storage') ||
        message.includes('s3') ||
        message.includes('r2')) {
      return ErrorType.STORAGE;
    }

    // AI Provider 错误
    if (message.includes('gemini') ||
        message.includes('replicate') ||
        message.includes('provider') ||
        message.includes('generation failed') ||
        message.includes('ai ')) {
      return ErrorType.PROVIDER;
    }

    // 默认未知错误
    return ErrorType.UNKNOWN;
  }

  /**
   * 提取API响应信息
   * @param error 错误对象
   * @returns API响应JSON字符串或undefined
   */
  private static extractApiResponse(error: any): string | undefined {
    if (error.response) {
      try {
        return JSON.stringify(error.response);
      } catch {
        return String(error.response);
      }
    }
    return undefined;
  }

  /**
   * 脱敏请求参数
   * 移除敏感信息如API密钥、密码等
   * @param params 原始参数
   * @returns 脱敏后的JSON字符串或undefined
   */
  private static sanitizeParams(
    params?: Record<string, any>
  ): string | undefined {
    if (!params) return undefined;

    const sanitized = { ...params };

    // 敏感字段列表
    const sensitiveKeys = [
      'apiKey',
      'api_key',
      'password',
      'token',
      'secret',
      'authorization',
      'auth',
      'key',
    ];

    // 递归脱敏函数
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result: any = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
          result[key] = '***REDACTED***';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    try {
      const sanitizedObj = sanitizeObject(sanitized);
      return JSON.stringify(sanitizedObj);
    } catch {
      return undefined;
    }
  }
}
