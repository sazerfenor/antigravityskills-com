---
description: 深度代码审查工作流 - CTO 视角的六维度全面审核 (架构/UIUX/安全/性能/SEO/无障碍)
---

# Deep Code Review Workflow

对代码进行深度全面审核，类似 CTO 视角的代码体检。

> **推荐模型**: Opus 4.5 Thinking (深度分析)
> **请务必全程使用中文回答。**

---

## 📚 Agent 与规范引用

### Agents (5 个)

| Agent | 文件路径 | 负责维度 |
|-------|---------|---------|
| **security-auditor** | [deep-review/security-auditor.md](deep-review/security-auditor.md) | 安全审计 |
| **code-reviewer** | [deep-review/code-reviewer.md](deep-review/code-reviewer.md) | 架构与逻辑 |
| **performance-engineer** | [deep-review/performance-engineer.md](deep-review/performance-engineer.md) | 性能检查 |
| **technical-seo-auditor** | [deep-review/technical-seo-auditor.md](deep-review/technical-seo-auditor.md) | SEO 审计 |
| **accessibility-auditor** | [deep-review/accessibility-auditor.md](deep-review/accessibility-auditor.md) | 无障碍审计 |

### 规范文件 (必读)

| 维度 | 规范文件路径 |
|-----|-------------|
| UI/UX | `.agent/rules/UIUX_Guidelines.md` |
| 安全 | `.agent/rules/Security_Guidelines.md` |
| 性能 | `.agent/rules/Performance_Guidelines.md` |
| SEO | `.agent/doc/seo/06_Tech_Infra_Core.md` (技术 SEO) |

> ⚠️ **规范优先级**: 当 Agent 知识与 DeepCodeReview_Rules 冲突时，**以 DeepCodeReview_Rules 为最高准则**。
> ⚠️ **审查前，请先阅读以上 3 份规范文件。**

---

## 审查维度

### 1. 架构与逻辑 (基础层) - 已增强

Call /code-reviewer (已融合 diet103 架构审查能力)

- **对比依据**：代码分层 (`src/shared/services` = 业务逻辑，`src/app/api` = 控制层)
- **分层架构验证** (融合自 diet103):
  - Routes → Controllers → Services → Repositories 分层是否正确
  - Controller 不应直接调用 Repository，Service 不应处理 HTTP
  - 共享类型使用 `/src/shared/` 正确性
- 审查扩展性和可维护性
- 检查边界情况 (Edge cases) 和状态管理
- Clean Code 原则和 SOLID 模式
- **输出**: 包含重构建议表（若发现结构性问题）

### 2. UI/UX 合规性

- **对比依据**：`UIUX_Guidelines.md`
- 检查颜色、间距、组件变体是否符合规范
- 验证 A11y：按钮有 aria-label、对比度 ≥ 4.5:1
- CBDS 禁止清单检查：
  - ❌ `border-yellow-500` → ✅ `border-primary`
  - ❌ `hover:scale-105` → ✅ `hover:scale-102`
  - ❌ `bg-gray-900` → ✅ `bg-card`

### 3. 安全审计

Call /security-auditor

- **对比依据**：`Security_Guidelines.md`
- 检查 XSS、IDOR、鉴权缺失
- OWASP Top 10 检查
- 使用规范中的 **审查命令速查** 扫描代码：
  ```bash
  grep -rn "dangerouslySetInnerHTML" src/
  grep -rn "eval(" src/
  grep -rn "JSON.parse" src/ | head -20
  ```

### 4. 性能检查

Call /performance-engineer

- **对比依据**：`Performance_Guidelines.md`
- 检查 LCP/CLS 问题、Bundle 膨胀
- N+1 查询问题检测
- 使用规范中的 **审查命令速查** 扫描代码

### 5. SEO 审计

Call /technical-seo-auditor

- **对比依据**：`.agent/doc/seo/*.md`
- JS 渲染机制 (SSR/CSR)
- Canonical 标签正确性
- Schema JSON-LD 验证
- Core Web Vitals (LCP/CLS/INP)
- 使用规范中的 **审查命令速查** 扫描代码：
  ```bash
  grep -rn "canonical" src/ | head -20
  grep -rn "application/ld+json" src/ | head -20
  grep -rn "<h1" src/ | wc -l
  ```

### 6. 无障碍审计 (新增)

Call /accessibility-auditor

- **对比依据**：WCAG 2.2 标准
- POUR 四原则检查：可感知、可操作、可理解、健壮性
- 键盘可访问性验证
- Focus 管理与 Skip Link
- ARIA 正确性
- 使用规范中的 **审查命令速查** 扫描代码：
  ```bash
  grep -rn "<img" src/ | grep -v "alt="
  grep -rn "onClick" src/ | grep -v "aria-label" | head -20
  grep -rn "tabindex=\"-" src/ | head -20
  ```

---

## 执行步骤

// turbo-all

### Step 1: 确定审查范围

```bash
git diff --name-only HEAD~1
git diff --stat HEAD~1
```

### Step 2: 读取规范文件

1. 读取 `.agent/rules/UIUX_Guidelines.md`
2. 读取 `.agent/rules/Security_Guidelines.md`
3. 读取 `.agent/rules/Performance_Guidelines.md`

### Step 3: 五维度审核

按照上述 5 个维度逐一检查：
1. 架构与逻辑
2. UI/UX 合规性
3. 安全审计
4. 性能检查
5. SEO 审计

### Step 4: 生成审查报告

---

## 输出格式

```markdown
# 🔍 深度代码审查报告

**审查对象**: {文件列表或功能描述}
**审查日期**: {日期}

## 总体摘要

| 维度 | 状态 | 问题数 |
|-----|------|-------|
| 架构 | ✅/❌ | {n} |
| UI/UX | ✅/❌ | {n} |
| 安全 | ✅/❌ | {n} |
| 性能 | ✅/❌ | {n} |
| SEO | ✅/❌ | {n} |

**总体结论**: APPROVED / NEEDS_CHANGES / REJECTED

---

## 详细发现

### 1. 架构与逻辑

#### 🔴 [严重] {问题标题}
- **位置**: `{path}` L{line}
- **问题描述**: {描述}
- **违规规范**: `{规范文件名}#{章节}`
- **修复方案**:
  ```{language}
  // ❌ 问题代码
  {bad_code}
  
  // ✅ 建议修复
  {good_code}
  ```

#### 🟡 [警告] {问题标题}
- ...

#### 🟢 [建议] {问题标题}
- ...

### 2. UI/UX 合规性
(同上格式)

### 3. 安全审计
(同上格式)

### 4. 性能检查
(同上格式)

### 5. SEO 审计
(同上格式)

---

## 修复优先级

| 优先级 | 问题 | 建议时限 |
|-------|------|---------|
| P0 (阻塞) | {问题} | 立即修复 |
| P1 (高) | {问题} | 本迭代内 |
| P2 (中) | {问题} | 下迭代 |
| P3 (低) | {问题} | 可选 |
```

---

## 相关文件

- 规范目录：`.agent/rules/`
- Agent 目录：`.agent/workflows/deep-review/`

---

**Version**: 1.0 | **Created**: 2025-12-21 | **Source**: DeepCodeReview_Rules/prompt.md
