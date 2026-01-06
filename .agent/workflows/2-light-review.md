---
description: 快速代码审查工作流 - 1 分钟内识别阻碍合并的问题
---

# Light Code Review Workflow

对小改动进行快速 Code Review，1 分钟内指出问题或直接通过。

> **来源**: 基于 `.agent/rules/light_review_prompt.md`
> **推荐模型**: Haiku 4.5 (快速审查)
> **请全程使用中文回答。**

---

## 适用条件

本工作流适用于以下场景：
- ✅ 修改 < 100 行
- ✅ 不涉及安全敏感区域 (如 `src/core/auth/*`)
- ✅ 不涉及性能关键路径
- ✅ 不涉及数据库 Schema 变更

> ⚠️ 若不满足以上条件，请使用 `/2-deep-review` 进行完整审查。

---

## 📚 Agent 调用

Call /basic-reviewer

---

## 必查 (3 点)

1. **逻辑漏洞**：空指针风险 (`user?.id` vs `user.id`)、未处理的 Promise 异常
2. **代码异味**：魔法数字、模糊命名 (如 `data1`, `temp`)
3. **安全隐患**：明显的 XSS/注入风险

---

## 执行步骤

### Step 1: 确定审查范围

```bash
git diff --name-only HEAD~1
git diff --stat HEAD~1
```

### Step 2: 快速扫描

```bash
# 检查未处理的 Promise
grep -rn "\.then(" {修改的文件} | grep -v ".catch"

# 检查可选链
grep -rn "\\.id" {修改的文件} | grep -v "?\\."
```

### Step 3: [可选] 架构快查 (融合自 diet103)

**触发条件**: 修改涉及 `src/shared/services/` 或 `src/app/api/` 

```bash
# 检查 Controller 是否直接调用 Repository
grep -rn "Repository" src/app/api/ | head -5

# 检查 Service 层是否处理 HTTP
grep -rn "Request\|Response" src/shared/services/ | head -5
```

### Step 4: 输出结论

---

## 输出格式

### 没问题

```markdown
✅ **LGTM** (Looks Good To Me)

审查范围: {文件列表}
```

### 有问题

```markdown
⚠️ **NEEDS_CHANGES**

### Issue #1
- **位置**: `{path}` L{line}
- **问题**: {一句话描述}
- **修复**:
  ```{language}
  // ❌ 当前
  {bad_code}
  
  // ✅ 建议
  {good_code}
  ```
```

---

## 相关文件

- 深度审查：`.agent/workflows/2-deep-review.md`
- 原版 Prompt：`.agent/rules/light_review_prompt.md`

---

**Version**: 1.0 | **Created**: 2025-12-21 | **Source**: DeepCodeReview_Rules/light_review_prompt.md
