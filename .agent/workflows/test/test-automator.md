---
description: 测试自动化执行 Agent - 强制执行测试命令并输出 GATE 证据
---

# Test Automator Agent

执行测试自动化，确保代码质量。**必须**实际运行测试命令。

> **触发条件**: `/1-test` 默认模式 (无参数) 且存在测试文件
> **核心原则**: 必须执行，必须输出证据

---

## ⛔ HALT Protocol

| 条件 | 动作 |
|:--|:--|
| package.json 无 test script | 输出 `⚠️ NO_TEST_SCRIPT` → 转 `/test-generate` |
| npm test 失败 | 输出 `❌ TEST_FAILED` + 失败列表 |
| 覆盖率 < 60% | 输出 `⚠️ LOW_COVERAGE` + 建议 |
| 测试超时 (> 5min) | 输出 `⏱️ TIMEOUT` → 终止 |

---

## 数据所有权

| 数据 | 权限 |
|------|------|
| package.json | 📖 Read Only |
| *.test.ts / *.test.tsx | 📖 Read Only |
| 终端输出 | ✅ 采集并输出 |

---

## 执行步骤

// turbo-all

### Step 1: 检测测试环境

// turbo
```bash
# 检查 package.json 是否有 test script
grep -q '"test"' package.json && echo "HAS_TEST_SCRIPT" || echo "NO_TEST_SCRIPT"

# 检查测试框架
grep -E '"vitest"|"jest"|"mocha"' package.json | head -1
```

> [!IMPORTANT]
> **⚙️ ENV_GATE (必须输出)**:
> ```
> 🔍 ENV_GATE:
>   - package.json 存在: {YES/NO}
>   - test script 存在: {YES/NO}
>   - 测试框架: {vitest/jest/mocha/none}
>   - 下一步: {运行测试/生成测试/转 UI 验证/HALT}
> ```
> **如果 test script 不存在，必须 HALT 或转其他 Agent。**

### Step 2: 执行测试

> ⛔ **MANDATORY**: 必须执行 `npm test` 或等效命令。**禁止跳过。**

// turbo
```bash
npm test 2>&1 | head -50
```

> [!IMPORTANT]
> **⚙️ EXECUTION_GATE (必须输出)**:
> ```
> 🧪 EXECUTION_GATE:
>   - 命令: {npm test / npm run test:unit / npx vitest}
>   - Exit Code: {0/1/其他}
>   - 状态: {PASS/FAIL}
>   - 通过数/总数: {passed}/{total}
>   - 输出摘要: 
>     {前3行关键输出}
>     ...
>     {后3行关键输出}
> ```
> **禁止无输出就结束。**

### Step 3: 覆盖率检查 (可选)

如果有 `test:coverage` script:

// turbo
```bash
npm run test:coverage 2>&1 | tail -20
```

> [!IMPORTANT]
> **⚙️ COVERAGE_GATE (如执行则必须输出)**:
> ```
> 📊 COVERAGE_GATE:
>   - 行覆盖率: {N}%
>   - 分支覆盖率: {M}%
>   - 达标: {YES (>=80%) / NO}
> ```

### Step 4: 生成报告

**必须使用以下格式生成报告**:

```markdown
# 🧪 测试报告 (test-automator)

**测试目标**: {项目或模块名}
**执行时间**: {date}

## GATE 汇总

| GATE | 状态 | 关键信息 |
|------|------|---------|
| ENV_GATE | ✅ | test script: {YES/NO} |
| EXECUTION_GATE | ✅/{❌} | {PASS/FAIL} |
| COVERAGE_GATE | ✅/⏭️ | {N}% / 跳过 |

## 执行证据

```
{终端输出，最多 20 行}
```

## 失败用例 (如有)

| 用例 | 错误信息 |
|------|---------|
| {test_name} | {error_message} |

## 结论

- [{x/ }] 测试实际执行 (非静态分析)
- [{x/ }] 所有测试通过
- [{x/ }] 覆盖率达标 (如检查)
```

---

**Version**: 2.0 | **Updated**: 2025-12-24 | **新增**: GATE 强制输出 + HALT Protocol
