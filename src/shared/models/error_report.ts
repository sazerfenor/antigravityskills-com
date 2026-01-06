import { errorReport } from '@/config/db/schema';

// 错误类型枚举
export enum ErrorType {
  RATE_LIMIT = 'rate_limit',
  AUTH = 'auth',
  PAYMENT = 'payment',
  NETWORK = 'network',
  SERVER = 'server',
  UNKNOWN = 'unknown',
  // V2: 新增更细粒度的错误类型
  VALIDATION = 'validation',         // 参数校验失败
  NOT_FOUND = 'not_found',           // 资源不存在
  CONTENT_POLICY = 'content_policy', // AI 内容安全策略
  STORAGE = 'storage',               // 存储操作失败
  PROVIDER = 'provider',             // 外部服务商错误
}

// 错误报告状态枚举
export enum ErrorReportStatus {
  PENDING = 'pending',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

// 功能模块枚举
export enum ErrorFeature {
  IMAGE_GENERATION = 'image_generation',
  MUSIC_GENERATION = 'music_generation',
  CHAT = 'chat',
  PAYMENT = 'payment',
  UPLOAD = 'upload',
}

// 创建错误报告的接口
export interface NewErrorReport {
  id: string;
  errorId: string;
  userId: string;
  userEmail?: string;
  feature: string;
  errorType: string;
  statusCode?: number;
  provider?: string;
  model?: string;
  userMessage: string;
  technicalMessage: string;
  stackTrace?: string;
  apiResponse?: string;
  requestParams?: string;
  status?: string;
}

// 错误上下文接口（用于ErrorLogger）
export interface ErrorContext {
  feature: string;
  provider?: string;
  model?: string;
  userId: string;
  userEmail?: string;
  requestParams?: Record<string, any>;
  locale?: string;
}

// 从schema推断的完整ErrorReport类型
export type ErrorReport = typeof errorReport.$inferSelect;
export type InsertErrorReport = typeof errorReport.$inferInsert;
