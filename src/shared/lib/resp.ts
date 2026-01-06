export function respData(data: any) {
  return respJson(0, 'ok', data || []);
}

export function respOk() {
  return respJson(0, 'ok', null);
}

export function respErr(message: string, status?: number) {
  const json = { code: -1, message, data: null };
  return Response.json(json, { status: status || 400 });
}

/**
 * 返回带有完整元数据的错误响应
 * 用于与 ErrorHandler 配合，支持自动重试和反馈
 */
export function respErrWithMeta(errorMeta: {
  message: string;
  errorId?: string;
  errorType?: string;
  shouldRetry?: boolean;
  retryDelay?: number;
}, status?: number) {
  const json = {
    code: -1,
    message: errorMeta.message,
    data: {
      errorId: errorMeta.errorId,
      errorType: errorMeta.errorType,
      shouldRetry: errorMeta.shouldRetry || false,
      retryDelay: errorMeta.retryDelay,
    },
  };
  return Response.json(json, { status: status || 400 });
}

export function respJson(code: number, message: string, data?: any) {
  const json = {
    code: code,
    message: message,
    data: data ?? null, // 确保 data 字段始终存在
  };

  return Response.json(json);
}
