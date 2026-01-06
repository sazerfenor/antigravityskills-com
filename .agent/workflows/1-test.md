---
description: 独立测试工作流 - 支持通用测试自动化和严格 TDD 模式
---

# Test Workflow

智能测试生成和执行，支持通用测试自动化和严格 TDD (Red-Green-Refactor) 模式。

> **推荐模型**: Gemini (快速测试) / Opus 4.5 (TDD 模式)
> **请务必全程使用中文回答。**

---

## 📚 Agent 引用

| Agent | 文件路径 | 触发场景 |
|-------|---------|---------|
| **test-automator** | [test-automator.md](test/test-automator.md) | **默认**: 通用测试自动化 |
| **tdd-orchestrator** | [tdd-orchestrator.md](test/tdd-orchestrator.md) | 严格 TDD 模式 (`--tdd` 参数) |
| **ui-tester** | [ui-tester.md](test/ui-tester.md) | UI 功能浏览器验证 |
| **test-generate** | [test-generate.md](test/test-generate.md) | 测试代码生成回退 |

---

## ⛔ HALT Protocol

| 条件 | 动作 |
|:--|:--|
| 无测试文件且无法生成 | 输出 `⚠️ FALLBACK` 转 UI 验证 |
| npm test 失败 | 输出 `❌ TEST_FAILED` + 失败列表 |
| browser_subagent 失败 | 输出 `❌ BROWSER_ERROR` + 原因 |

---

## 执行步骤

// turbo-all

### Step 0: 模式选择

确定测试模式：

| 参数 | 模式 | 使用 Agent |
|------|------|-----------|
| (无) | 通用测试 | `test-automator` |
| `--tdd` | 严格 TDD | `tdd-orchestrator` |
| `--ui` | UI 验证 | `ui-tester` |

### Step 0.5: 功能类型检测

> ⛔ **MANDATORY**: 必须判断测试目标类型并输出 GATE。

| 特征关键词 | 类型 | 验证方式 |
|-----------|------|---------|
| component, page, button, form, modal, 页面, 组件, 点击, 渲染, UI | **UI 功能** | **必须使用 browser_subagent** |
| function, service, api, util, 函数, 接口, workflow, .md | **代码功能** | 运行测试代码 |

**如果不确定**：默认按 UI 功能处理（宁可过度验证）。

> [!IMPORTANT]
> **⚙️ TYPE_GATE (必须输出)**:
> ```
> 🔍 TYPE_GATE:
>   - 测试目标: {目标描述}
>   - 功能类型: {UI功能/代码功能}
>   - 验证方式: {browser_subagent/npm test/自定义脚本}
>   - 依据: {命中的关键词或判断理由}
> ```
> **禁止跳过类型判断。**

### Step 1: 测试文件检测

> ⛔ **MANDATORY**: 必须执行文件搜索命令。**禁止只做静态分析就结束！**

// turbo
```bash
find ./src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | head -10
```

> [!IMPORTANT]
> **⚙️ DETECTION_GATE (必须输出)**:
> ```
> 🔍 DETECTION_GATE:
>   - 测试文件数量: {N}
>   - 文件列表: {file1, file2, ...} 或 "无"
>   - 回退方案: {A: 生成测试 / B: 浏览器验证 / C: 运行现有测试}
>   - Should Skip: NO (禁止跳过)
> ```
> **禁止静默跳过。**

### Step 1.5: 回退决策

**如果未找到测试文件** → **不得只做静态分析**，必须选择：
- **选项 A**: 调用 `/test-generate` 生成测试代码，然后运行
- **选项 B**: 如果是 UI 功能，直接使用 browser_subagent 验证

> [!IMPORTANT]
> **⚙️ FALLBACK_GATE (仅当无测试文件时输出)**:
> ```
> 🔄 FALLBACK_GATE:
>   - 选择方案: {A/B}
>   - 理由: {为什么选择此方案}
>   - 下一步: {具体执行动作}
> ```

### Step 2: 加载对应 Agent

根据 Step 0, 0.5, 1 的判断，调用对应 Agent：

- 通用测试 (有测试文件) → Call /test-automator
- TDD 模式 → Call /tdd-orchestrator
- UI 功能 (无测试文件) → Call /ui-tester
- 需要生成测试 → Call /test-generate 然后 /test-automator

> [!IMPORTANT]
> **⚙️ AGENT_GATE (必须输出)**:
> ```
> 🤖 AGENT_GATE:
>   - 选择 Agent: {agent_name}
>   - 调用理由: {依据 Step 0-1.5 的判断}
> ```

### Step 3: 执行测试/验证

> ⛔ **MANDATORY**: 必须实际执行测试命令或浏览器验证。**禁止用"代码审查通过"替代！**

**代码功能测试**:
// turbo
```bash
npm test 2>&1 | head -50
```

**UI 功能验证**:
使用 browser_subagent 执行：
- 打开目标页面 URL
- 执行验收标准中的操作流程
- 截图/录像记录关键状态

> [!IMPORTANT]
> **⚙️ EXECUTION_GATE (必须输出)**:
> ```
> 🧪 EXECUTION_GATE:
>   - 执行方式: {npm test / browser_subagent / 自定义脚本}
>   - 命令/任务: {具体命令或任务描述}
>   - 状态: {PASS/FAIL/ERROR}
>   - 输出摘要: {关键输出，最多 5 行}
> ```
> **禁止无执行证据就结束。**

### Step 4: 生成报告

> [!IMPORTANT]
> **⚙️ REPORT_GATE (必须输出)**:
> ```
> 📊 REPORT_GATE:
>   - 测试通过: {YES/NO}
>   - 覆盖率: {N% 或 "N/A"}
>   - UI 验证: {PASS/SKIP/FAIL}
>   - 证据路径: {录像/截图路径 或 "终端输出"}
> ```

---

## 输出格式

```markdown
# 🧪 测试报告

**测试目标**: {function/component}
**测试模式**: {通用/TDD/UI}
**功能类型**: {代码功能/UI功能}
**日期**: {date}

## GATE 输出汇总

| GATE | 状态 |
|------|------|
| TYPE_GATE | ✅ 已输出 |
| DETECTION_GATE | ✅ 已输出 |
| EXECUTION_GATE | ✅ 已输出 |
| REPORT_GATE | ✅ 已输出 |

## 测试方式

| 方式 | 状态 |
|------|------|
| 现有测试文件 | ✅ 找到 / ⚠️ 未找到 |
| 测试生成 | ✅ 已生成 / ⏭️ 跳过 |
| 浏览器验证 | ✅ 已执行 / ⏭️ 不适用 |

## 执行证据

```
{终端输出或浏览器验证结果}
```

## 结论

- [{x/ }] 所有测试通过 (代码级)
- [{x/ }] UI 验证通过 (浏览器级)
- [{x/ }] 所有 GATE 已输出
```

---

**Version**: 3.0 | **Updated**: 2025-12-24 | **新增**: GATE 强制输出 + HALT Protocol
