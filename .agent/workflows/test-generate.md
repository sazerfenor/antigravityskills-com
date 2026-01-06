---
description: AI 测试用例生成 - 自动分析代码生成全面测试
---

# Test Generate Command

AI 驱动的测试用例生成命令。

**用法**: `/test-generate {file path or function name}`

---

## 执行流程

1. 分析目标代码结构
2. 识别测试场景 (正常流程、边界值、错误处理)
3. 生成 Given-When-Then 格式测试
4. 输出测试代码

---

## 生成策略

### 测试视角表

| 维度 | 考虑点 |
|------|--------|
| 等价类 | 有效/无效输入分类 |
| 边界值 | min, min+1, max-1, max |
| 错误处理 | null, undefined, 异常 |
| 状态转换 | 初始→中间→最终 |

### 输出格式

```typescript
describe('functionName', () => {
  // Happy path
  test('should {expected behavior} when {condition}', () => {
    // Given
    const input = ...;
    // When
    const result = functionName(input);
    // Then
    expect(result).toBe(...);
  });

  // Edge cases
  test('should handle boundary value', () => { ... });

  // Error handling
  test('should throw when invalid input', () => { ... });
});
```

---

## 示例

```
/test-generate src/utils/calculatePrice.ts
/test-generate UserRegistrationForm
/test-generate api/auth/login.ts
```
