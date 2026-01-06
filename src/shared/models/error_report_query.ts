import { desc, eq, and, ne, gte, lte, isNotNull } from 'drizzle-orm';
import { db } from '@/core/db';
import { errorReport } from '@/config/db/schema';
import {
  ErrorReport,
  ErrorReportStatus,
  ErrorFeature,
  ErrorType,
} from '@/shared/models/error_report';

/**
 * 获取错误报告列表
 * @param options 查询选项
 * @returns 错误报告列表
 */
export async function getErrorReportList(options: {
  status?: string;
  errorType?: string;
  feature?: string;
  hasFeedback?: boolean; // 是否筛选有用户反馈的错误
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  excludeClosed?: boolean; // 是否排除closed状态，默认true
}): Promise<{ errors: ErrorReport[]; total: number }> {
  const { 
    status, 
    errorType, 
    feature,
    hasFeedback,
    page = 1, 
    limit = 20, 
    startDate, 
    endDate,
    excludeClosed = true // 默认排除closed
  } = options;

  const dbConn = db();

  // 构建where条件
  const conditions = [];
  if (status) {
    conditions.push(eq(errorReport.status, status));
  } else if (excludeClosed) {
    // 如果没有指定status，且需要排除closed，则排除它
    conditions.push(ne(errorReport.status, 'closed'));
  }
  if (errorType) {
    conditions.push(eq(errorReport.errorType, errorType));
  }
  if (feature) {
    conditions.push(eq(errorReport.feature, feature));
  }
  if (hasFeedback) {
    // 筛选有用户反馈的错误
    conditions.push(isNotNull(errorReport.userFeedback));
  }
  if (startDate) {
    conditions.push(gte(errorReport.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(errorReport.createdAt, endDate));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  // 查询总数
  const totalResult = await dbConn
    .select({ count: errorReport.id })
    .from(errorReport)
    .where(whereCondition);

  // 查询列表
  const errors = await dbConn
    .select()
    .from(errorReport)
    .where(whereCondition)
    .orderBy(desc(errorReport.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    errors,
    total: totalResult.length,
  };
}

/**
 * 通过errorId获取错误详情
 * @param errorId 错误ID
 * @returns 错误报告详情
 */
export async function getErrorReportByErrorId(
  errorId: string
): Promise<ErrorReport | null> {
  const dbConn = db();

  const result = await dbConn
    .select()
    .from(errorReport)
    .where(eq(errorReport.errorId, errorId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * 更新错误报告状态
 * @param errorId 错误ID
 * @param status 新状态
 * @param resolution 解决方案说明（可选）
 * @returns 是否成功
 */
export async function updateErrorReportStatus(
  errorId: string,
  status: string,
  resolution?: string
): Promise<boolean> {
  const dbConn = db();

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === ErrorReportStatus.RESOLVED) {
    updateData.resolvedAt = new Date();
  }

  if (resolution) {
    updateData.resolution = resolution;
  }

  const result = await dbConn
    .update(errorReport)
    .set(updateData)
    .where(eq(errorReport.errorId, errorId));

  return true;
}

/**
 * 获取错误统计数据
 * @param days 统计天数
 * @returns 统计数据
 */
export async function getErrorReportStats(days: number = 7): Promise<{
  totalErrors: number;
  pendingErrors: number;
  resolvedErrors: number;
  errorsByType: Record<string, number>;
  errorsByFeature: Record<string, number>;
}> {
  const dbConn = db();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 查询所有错误
  const allErrors = await dbConn
    .select()
    .from(errorReport)
    .where(gte(errorReport.createdAt, startDate));

  // 统计
  const stats = {
    totalErrors: allErrors.length,
    pendingErrors: allErrors.filter((e) => e.status === ErrorReportStatus.PENDING)
      .length,
    resolvedErrors: allErrors.filter((e) => e.status === ErrorReportStatus.RESOLVED)
      .length,
    errorsByType: {} as Record<string, number>,
    errorsByFeature: {} as Record<string, number>,
  };

  // 按类型统计
  allErrors.forEach((error) => {
    stats.errorsByType[error.errorType] =
      (stats.errorsByType[error.errorType] || 0) + 1;
    stats.errorsByFeature[error.feature] =
      (stats.errorsByFeature[error.feature] || 0) + 1;
  });

  return stats;
}
