import { z, ZodSchema } from 'zod';
import { respErr } from './resp';

/**
 * 校验 Request Body 的结果类型
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: Response };

/**
 * 统一的 API 请求参数校验函数
 * 
 * @description
 * 解析请求体并使用 Zod Schema 校验，失败时返回格式化的错误响应。
 * 这是消除 `as any` 类型断言、防止恶意数据注入的核心工具。
 * 
 * @example
 * ```typescript
 * const validation = await validateRequest(request, aiGenerateSchema);
 * if (!validation.success) {
 *   return validation.response;
 * }
 * const { provider, prompt } = validation.data;
 * ```
 */
export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      // 格式化 Zod 错误信息，让前端知道是哪个字段填错了
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'root',
        message: issue.message,
        code: issue.code,
      }));

      const errorMessage = errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');

      console.warn('[Validation] Failed:', errors);

      return {
        success: false,
        response: respErr(`Validation failed: ${errorMessage}`),
      };
    }

    return { success: true, data: result.data };
  } catch (e) {
    console.warn('[Validation] Invalid JSON:', e);
    return {
      success: false,
      response: respErr('Invalid JSON body'),
    };
  }
}
