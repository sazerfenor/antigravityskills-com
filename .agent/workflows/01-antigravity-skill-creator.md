---
description: Antigravity Skill Creator - 制作高质量 Antigravity Skill 的工作流
---

# Antigravity Skill Creator

> **核心理念**: Trigger-First Description + Progressive Disclosure
> **版本**: 1.0
> **适用场景**: 从零创建或重构 Antigravity Skill
> 
> **SKILL.md 三大特性**:
> - **自文档化 (Self-documenting)**: 便于阅读、审计和改进
> - **可扩展 (Extensible)**: 从文本指令到可执行代码
> - **可移植 (Portable)**: 易于编辑、版本控制和分享

## 🚫 架构约束

> [!CAUTION]
> **Antigravity Skill 硬性规范**
> 
> 1. `name`: 1-64 字符，仅限 `a-z` 和 `-`，严格 Kebab Case
> 2. `description`: 1-1024 字符，必须包含 WHEN (触发时机) 和 FOR (目标任务)
> 3. 路径: `.agent/skills/{name}/` (项目级) 或 `~/.gemini/antigravity/skills/` (全局)
> 4. 渐进式披露: SKILL.md < 5000 tokens (推荐)，长代码移入 `scripts/`，长文档移入 `references/`

## 📚 Agent Roster

| Agent | 文件路径 | 阶段 |
|-------|---------|------|
| **intent-router** | [intent-router.md](antigravity-skill-creator/intent-router.md) | Phase 0 |
| **requirement-collector** | [requirement-collector.md](antigravity-skill-creator/requirement-collector.md) | Phase 1A |
| **skill-parser** | [skill-parser.md](antigravity-skill-creator/skill-parser.md) | Phase 1B |
| **form-generator** | [form-generator.md](antigravity-skill-creator/form-generator.md) | Phase 2 |
| **skill-builder** | [skill-builder.md](antigravity-skill-creator/skill-builder.md) | Phase 3 |
| **skill-validator** | [skill-validator.md](antigravity-skill-creator/skill-validator.md) | Phase 4 |

---

## 📋 Phase 0: 入口路由

Call /intent-router

### Step 0.1: 判断意图

**INPUT**: 用户自然语言请求
**OUTPUT**: 
- `intent`: CREATE | REFACTOR
- `payload`: 提取的核心内容

**路由逻辑**:
```
如果用户输入包含 文件路径/代码块/现有 Skill 内容:
  → intent = REFACTOR → Phase 1B
如果用户输入是功能描述:
  → intent = CREATE → Phase 1A
```

**GATE**: 无法判断 → PAUSE，询问用户

---

## 📋 Phase 1A: 需求收集 (CREATE 入口)

Call /requirement-collector

### Step 1A.1: Trigger-First 访谈

**INPUT**: 用户需求描述
**OUTPUT**: 需求规格 (Markdown)

**必须提取**:
1. **Trigger (WHEN)**: 什么情况下触发此 Skill？
2. **Outcome (WHAT)**: 交付物是什么？
3. **Knowledge (HOW)**: 需要加载什么外部知识？

**GATE**: Trigger 或 Outcome 未明确 → 继续追问

### ⏸️ CHECKPOINT 1A
> **回复**: "继续" 或补充信息

---

## 📋 Phase 1B: Skill 解析 (REFACTOR 入口)

Call /skill-parser

### Step 1B.1: 合规性诊断

**INPUT**: 现有 Skill 文件/文本
**OUTPUT**: 重构行动清单 (Markdown)

**诊断维度**:
1. **name**: 是否严格 Kebab Case？
2. **description**: 是否 Trigger-First？
3. **Progressive Disclosure**: 是否有违规的长代码/长文档？

**GATE**: 解析失败 → 报错并终止

### ⏸️ CHECKPOINT 1B
> **回复**: "继续" 或 "跳过某项重构"

---

## 📋 Phase 2: 交互式表单

Call /form-generator

### Step 2.1: 生成配置表单

**INPUT**: 需求规格 (from Phase 1A) 或 重构清单 (from Phase 1B)
**OUTPUT**: Markdown 表格形式的配置表单

**表单字段**:

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| `name` | string | ✅ | Skill 标识符 (Kebab Case) |
| `description` | string | ✅ | Trigger-First 描述 |
| `has_scripts` | boolean | ❌ | 是否需要脚本目录 |
| `has_references` | boolean | ❌ | 是否需要参考文档目录 |
| `has_assets` | boolean | ❌ | 是否需要资产目录 |

### ⏸️ CHECKPOINT 2 (MANDATORY)
> **选项**:
> - **"确认"** → 进入 Phase 3
> - **"修改 [字段]"** → 更新表单，重新展示

---

## 📋 Phase 3: Skill 构建

Call /skill-builder

### Step 3.1: 创建目录结构

**INPUT**: 确认后的表单数据
**OUTPUT**: 完整的 Skill 目录

**执行**:
1. 创建 `.agent/skills/{name}/`
2. 生成 `SKILL.md` (含 Frontmatter + Body)
3. 根据配置创建 `scripts/`、`references/`、`assets/` 子目录
4. 如需脚本，生成带 `--help` 支持的 Python 模板

### SKILL.md 模板

```markdown
---
name: {name}
description: {description}
metadata:
  version: "1.0.0"
  author: "antigravity-skill-creator"
---

# {Title Case Name}

## Overview
{Brief summary}

## Protocols
1. {Protocol 1}
2. {Protocol 2}

## Usage Examples
**User**: "{example query}"
**Action**: {expected behavior}
```

---

## 📋 Phase 4: 质量验证

Call /skill-validator

### Step 4.1: 六维评分

**INPUT**: 生成的 Skill 目录
**OUTPUT**: 验证报告 (Pass/Fail + 评分)

**评分标准 (总分 10 分)**:

| 维度 | 权重 | 评分逻辑 |
|:---|:---|:---|
| **Frontmatter** | 20% | `name` 和 `description` 存在且格式正确 |
| **Name 规范** | 10% | 严格 Kebab Case |
| **Description** | 30% | 包含 WHEN + FOR，无废话 |
| **结构清晰度** | 20% | 有 Overview/Protocols，无大段代码 |
| **资源分离** | 10% | 长代码在 scripts/，长文档在 references/ |
| **安全性** | 10% | 无危险命令 (如 `rm -rf`) |

### Step 4.2: 迭代判断

```
如果 总分 < 8.0:
  如果 iteration_count < 3:
    → 返回 Phase 3，自动修正
  否则:
    → 标记 "需人工审核" 后输出
如果 总分 >= 8.0:
  → ✅ 通过
```

---

## 📋 Phase 5: 最终输出

**INPUT**: 验证通过的 Skill 目录
**OUTPUT**: 成功消息 + 路径

### Step 5.1: 输出确认

向用户展示:
1. 创建的目录路径
2. SKILL.md 内容预览
3. 下一步建议（如何测试此 Skill）

---

## ✅ 最终输出

**输出位置**: `.agent/skills/{name}/`

**目录结构**:
```
{name}/
├── SKILL.md           # 必需
├── scripts/           # 可选
├── references/        # 可选
└── assets/            # 可选
```

---

## Quality Checklist

- [ ] 意图路由正确 (Phase 0)
- [ ] Trigger + Outcome 明确 (Phase 1)
- [ ] 用户确认表单 (Phase 2)
- [ ] SKILL.md 生成完整 (Phase 3)
- [ ] 六维评分 >= 8.0 (Phase 4)
- [ ] Description 是 Trigger-First 格式
- [ ] name 是严格 Kebab Case

---

**Version**: 1.0 | **Created**: 2026-01-16
