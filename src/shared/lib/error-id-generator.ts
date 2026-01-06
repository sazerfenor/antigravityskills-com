/**
 * 错误ID生成器
 * 生成格式: ER-YYYYMMDD-XXXX
 * 示例: ER-20241201-A3F2
 */

/**
 * 生成唯一的错误追踪ID
 * @returns 格式化的错误ID，如 "ER-20241201-A3F2"
 */
export function generateErrorId(): string {
  // 获取当前日期 YYYYMMDD
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  // 排除易混淆的字符: I, L, O, 0, 1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  let randomCode = '';
  for (let i = 0; i < 4; i++) {
    randomCode += chars[Math.floor(Math.random() * chars.length)];
  }

  return `ER-${date}-${randomCode}`;
}

/**
 * 验证错误ID格式是否正确
 * @param errorId 要验证的错误ID
 * @returns 是否为有效格式
 */
export function isValidErrorId(errorId: string): boolean {
  const pattern = /^ER-\d{8}-[A-Z2-9]{4}$/;
  return pattern.test(errorId);
}
