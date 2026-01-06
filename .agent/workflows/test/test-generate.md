---
description: 测试代码生成 Agent - 当无现有测试文件时生成测试代码
---

# Test Generate Agent

当项目无现有测试文件时，生成测试代码骨架。

> **触发条件**: `/1-test` Step 1.5 回退方案 A
> **核心原则**: 生成可运行的测试，不只是模板

---

## ⛔ HALT Protocol

| 条件 | 动作 |
|:--|:--|
| 无法确定测试框架 | 输出 `⚠️ UNKNOWN_FRAMEWORK` → 询问用户 |
| 目标文件不存在 | 输出 `❌ TARGET_NOT_FOUND` → HALT |
| 生成的测试无法运行 | 输出 `❌ SYNTAX_ERROR` → 修复重试 |

---

## 执行步骤

// turbo-all

### Step 1: 确定测试框架

// turbo
```bash
# 检测 package.json 中的测试框架
grep -E '"vitest"|"jest"|"mocha"' package.json | head -1
```

> [!IMPORTANT]
> **⚙️ FRAMEWORK_GATE (必须输出)**:
> ```
> 🔍 FRAMEWORK_GATE:
>   - 检测到框架: {vitest/jest/mocha/none}
>   - 推荐框架: {vitest (默认)}
>   - 需要安装: {YES/NO}
> ```

**如果 none**:
// turbo
```bash
npm install -D vitest
```

### Step 2: 确定测试目标

分析需要测试的文件/函数：

> [!IMPORTANT]
> **⚙️ TARGET_GATE (必须输出)**:
> ```
> 🎯 TARGET_GATE:
>   - 目标文件: {path/to/file.ts}
>   - 目标函数/组件: {function_name or ComponentName}
>   - 测试类型: {unit/integration/e2e}
> ```

### Step 3: 生成测试代码

使用 Given-When-Then 格式生成测试：

**Vitest 模板**:
```typescript
import { describe, it, expect } from 'vitest';
import { targetFunction } from '../path/to/module';

describe('targetFunction', () => {
  it('should [expected behavior] given [precondition]', () => {
    // Given
    const input = { /* test data */ };
    
    // When
    const result = targetFunction(input);
    
    // Then
    expect(result).toEqual(/* expected */);
  });

  it('should handle edge case: [description]', () => {
    // Given
    const edgeCaseInput = { /* edge case data */ };
    
    // When
    const result = targetFunction(edgeCaseInput);
    
    // Then
    expect(result).toEqual(/* expected */);
  });
});
```

**Jest 模板**:
```typescript
import { targetFunction } from '../path/to/module';

describe('targetFunction', () => {
  test('should [expected behavior] given [precondition]', () => {
    // Given
    const input = { /* test data */ };
    
    // When
    const result = targetFunction(input);
    
    // Then
    expect(result).toEqual(/* expected */);
  });
});
```

> [!IMPORTANT]
> **⚙️ GENERATION_GATE (必须输出)**:
> ```
> 📝 GENERATION_GATE:
>   - 生成文件: {path/to/file.test.ts}
>   - 测试用例数: {N}
>   - 用例列表:
>     1. {test_name_1}
>     2. {test_name_2}
> ```

### Step 4: 验证生成的测试可运行

// turbo
```bash
npm test -- --run {test_file_path}
```

> [!IMPORTANT]
> **⚙️ VERIFY_GATE (必须输出)**:
> ```
> ✅ VERIFY_GATE:
>   - 语法检查: {PASS/FAIL}
>   - 运行结果: {PASS/FAIL/ERROR}
>   - 下一步: {返回 test-automator 继续 / 修复错误}
> ```

---

## 输出格式

生成的测试文件应遵循以下命名约定：
- `{source_file}.test.ts` (与源文件同目录)
- 或 `__tests__/{source_file}.test.ts` (集中管理)

---

**Version**: 1.0 | **Created**: 2025-12-24
