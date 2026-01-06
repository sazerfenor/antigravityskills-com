/**
 * 统一 API Response 类型定义
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 类型守卫：检查对象是否包含指定属性
 */
export function hasRequiredFields<T extends string>(
  obj: unknown,
  ...fields: T[]
): obj is Record<T, unknown> {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  return fields.every(field => field in obj);
}

/**
 * 安全地解析 API Response
 */
export function parseApiResponse<T = any>(data: unknown): ApiResponse<T> {
  if (!hasRequiredFields(data, 'code', 'message', 'data')) {
    throw new Error('Invalid API response format');
  }
  return data as ApiResponse<T>;
}

/**
 * 断言对象包含指定的属性
 */
export function assertHasFields<T extends string>(
  obj: unknown,
  ...fields: T[]
): asserts obj is Record<T, unknown> {
  if (!hasRequiredFields(obj, ...fields)) {
    throw new Error(`Object missing required fields: ${fields.join(', ')}`);
  }
}
