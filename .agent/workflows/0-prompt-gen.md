---
description: Prompt 生成与优化工作流 - 上下文驱动，变更可追溯，效果可对比
---

# Prompt Generation Workflow

> **核心理念**: 先分类意图，再分析上下文，再生成优化，最后验证效果
> **适用场景**: 图片生成 Prompt、视频生成 Prompt、SEO 内容 Prompt、系统 Prompt

## 🚦 适用条件

**触发本工作流**:
- 用户请求涉及 Prompt 创建、优化或诊断
- 目标是生成可执行的 Prompt 文本

**不适用** (应使用其他工作流):
- 纯代码生成 → `/1-feature-dev`
- 文档撰写 → 直接编写
- 工作流创建 → `/1-workflow-gen`

## 🔁 Handover Convention

| 方向 | 内容 |
|------|------|
| **上游** | 用户请求 或 PRD 文档 |
| **输出** | `Prompt_Spec.md` + `New_Prompt.md` + `Audit_Report.md` |
| **下游** | `/1-cpo-builder` (可选输入 `Prompt_Spec.md`) |

## 📚 Agent Roster

| Agent | 文件路径 | 阶段 |
|-------|---------|------|
| **intent-classifier** | [intent-classifier.md](prompt-gen/intent-classifier.md) | Phase -1 |
| **context-analyzer** | [context-analyzer.md](prompt-gen/context-analyzer.md) | Phase 1A |
| **document-analyzer** | [document-analyzer.md](prompt-gen/document-analyzer.md) | Phase 1B/1C |
| **requirement-interviewer** | [requirement-interviewer.md](prompt-gen/requirement-interviewer.md) | Phase 1D |
| **prompt-writer** | [prompt-writer.md](prompt-gen/prompt-writer.md) | Phase 2 (场景 B/D) |
| **prompt-refiner** | [prompt-refiner.md](prompt-gen/prompt-refiner.md) | Phase 2 (场景 A/C) |
| **llm-evaluation** | [llm-evaluation.md](prompt-gen/llm-evaluation.md) | Phase 3 |

---

## 📁 输出目录

**`prompt_name` 来源**: Phase -1 意图分类时确定 (从用户请求或代码路径推断)

```
artifacts/{prompt_name}/
├── Context_Report.md     # Phase 1A
├── Requirement_Spec.md   # Phase 1B/1D
├── Diagnosis_Report.md   # Phase 1C
├── Change_Log.md         # Phase 2
├── New_Prompt.md         # Phase 2
├── Audit_Report.md       # Phase 3
└── Prompt_Spec.md        # Phase 4 (给 CPO Builder)
```

---

## 📋 Phase -1: 意图分类

Call /intent-classifier

**INPUT**: 用户自然语言请求
**OUTPUT**: 
- `意图分类报告` (Markdown)
- `scene`: 场景类型 (A/B/C/D)
- `prompt_name`: 用于输出目录命名

### Step -1.1: 判断场景类型

| 场景 | 触发条件 | 走向 |
|------|---------|------|
| A | 用户提供代码路径或已有 Prompt | Phase 1A |
| B | 用户提供 PRD/文档，无现有 Prompt | Phase 1B |
| C | 用户提供 Prompt 草稿，要求诊断 | Phase 1C |
| D | 用户只有口头需求 | Phase 1D |

**GATE**:
- 置信度 != High → PAUSE，询问用户确认
- 有需澄清项 → PAUSE，先解决澄清问题

### ⏸️ CHECKPOINT -1
> **选项**: "继续" / "修改场景" / "终止"

---

## 📋 Phase 1A: 代码考古

Call /context-analyzer

**INPUT**: 
- 代码路径 (用户提供)
- `意图分类报告` (from Phase -1)
- `scene` = A
**OUTPUT**: 
- `Context_Report.md`
- `scene`: A (透传)

### Step 1A.1: 定位 Prompt
```bash
grep -rn "You are" src/ --include="*.ts" --include="*.tsx"
```

### Step 1A.2: 分析 6 问题
| 问题 | 说明 |
|------|------|
| 上游输入 | 调用函数传了什么参数？ |
| 输入格式 | 纯文本？JSON？ |
| 处理目标 | 转换成什么？ |
| 输出格式 | 返回什么格式？ |
| 下游消费 | 谁接收输出？ |
| 业务目的 | 用户价值是什么？ |

**GATE**: 6 问题有任一无法回答 → WARNING 标注

### ⏸️ CHECKPOINT 1A
> **选项**: "继续" / "修改" / "终止"

---

## 📋 Phase 1B: 文档分析

Call /document-analyzer (分析模式)

**INPUT**: 
- PRD/需求文档路径 (用户提供)
- `意图分类报告` (from Phase -1)
- `scene` = B
**OUTPUT**: 
- `Requirement_Spec.md`
- `scene`: B (透传)

### Step 1B.1: 回答 5 问题
| 问题 | 必填 | 缺失处理 |
|------|------|---------|
| 目标明确？ | ✅ | REJECT |
| 输入定义？ | ✅ | REJECT |
| 输出定义？ | ⚠️ | WARNING |
| 边界清晰？ | ⚠️ | WARNING |
| 质量可衡量？ | ⚠️ | WARNING |

### ⏸️ CHECKPOINT 1B
> **选项**: "继续" / "修改" / "终止"

---

## 📋 Phase 1C: 问题诊断

Call /document-analyzer (诊断模式)

**INPUT**: 
- Prompt 草稿 (用户提供)
- `意图分类报告` (from Phase -1)
- `scene` = C
**OUTPUT**: 
- `Diagnosis_Report.md`
- `scene`: C (透传)

### Step 1C.1: 诊断 5 维度
- 目标清晰度
- 输入处理
- 输出格式
- 边界处理
- 技术适配

### Step 1C.2: 生成改进建议表
| # | 问题 | 原文 | 建议改为 | 理由 |
|---|------|------|---------|------|

### ⏸️ CHECKPOINT 1C
> **选项**: 
> - **"仅输出诊断报告"** → 输出 `Diagnosis_Report.md`，**流程结束**
> - **"继续生成 Prompt"** → Phase 2

---

## 📋 Phase 1D: 需求访谈

Call /requirement-interviewer

**INPUT**: 
- 用户口头描述
- `意图分类报告` (from Phase -1)
- `scene` = D
**OUTPUT**: 
- `Requirement_Spec.md`
- `scene`: D (透传)

### Step 1D.1: 结构化访谈
获取: 目标、输入、输出、边界、质量标准

**GATE**: 目标/输入/输出 任一未获得 → 继续访谈

### ⏸️ CHECKPOINT 1D
> **选项**: "继续" / "修改" / "终止"

---

## 📋 Phase 2: Prompt 生成

### 初始化

**首次进入时**: `iteration_count = 1`

### 场景路由

```
如果 scene = A 或 C:
  → Call /prompt-refiner (优化现有 Prompt)
如果 scene = B 或 D:
  → Call /prompt-writer (从零生成 Prompt)
```

**INPUT**: 
- **prompt-refiner**: `Context_Report.md` 或 `Diagnosis_Report.md` + 现有 Prompt + `scene` (from Phase 1) + `iteration_count`
  - (如果 iteration_count > 1): `improvement_hints` from `Audit_Report.md`
- **prompt-writer**: `Requirement_Spec.md` + `scene` (from Phase 1) + `iteration_count`
  - (如果 iteration_count > 1): `improvement_hints` from `Audit_Report.md`

**OUTPUT**: `Change_Log.md` + `New_Prompt.md` + `iteration_count`

### Step 2.2: 记录变更
```markdown
## 改动 N (轮次 X)
- **位置**: [行号]
- **原文**: `...`
- **改为**: `...`
- **理由**: ...
```

### ⏸️ CHECKPOINT 2
> **选项**: "继续" / "修改" / "终止"

---

## 📋 Phase 3: 效果验证

Call /llm-evaluation

**INPUT**: Phase 2 的输出
**OUTPUT**: `Audit_Report.md`

### Step 3.1: 评分维度
| 场景 | 维度 |
|------|------|
| 图片 Prompt | 清晰度 + 可执行性 + 美学控制 + 独特性 |
| 视频 Prompt | 动态描述 + 镜头语言 + 情绪引导 + 技术可行 |
| SEO Prompt | 关键词覆盖 + 可读性 + 结构 + 原创性 |
| 系统 Prompt | 任务清晰 + 输出格式 + 边界处理 + 安全性 |

### Step 3.2: 迭代判断
```
如果 总分 < 7.0:
  如果 iteration < 3:
    → 返回 Phase 2, iteration += 1
    → 传递 improvement_hints = Audit_Report.md 的 "改进建议" 部分
  否则:
    → 进入 Phase 4 (标注"已达最大迭代")
如果 总分 >= 7.0:
  → 进入 Phase 4
```

### ⏸️ CHECKPOINT 3
> **选项**: "继续" / "强制通过" / "手动调整"

---

## 📋 Phase 4: 人工审核 (MANDATORY)

**INPUT**: 草稿 + 验证报告
**OUTPUT**: 审核决策

### Step 4.1: 呈现审核材料
- 最终 Prompt 全文
- 评分结果
- 变更记录摘要

### ⏸️ CHECKPOINT 4 (不可跳过)
> **选项**:
> - **"应用"** → 输出最终文件
> - **"修改"** → 返回 Phase 2
> - **"放弃"** → 结束

---

## ✅ 最终输出

### 完整流程 (Phase 4 结束)

**主交付物**: 
- `Audit_Report.md` - 内部审核报告
- `Prompt_Spec.md` - **给 CPO Builder 的汇总文件** (复制 New_Prompt.md + 评分摘要)

```markdown
# Prompt 改进审核报告

## 1. 上下文摘要
## 2. 变更清单
## 3. 效果对比
## 4. 最终 Prompt
## 5. 待确认
- [ ] 变更逻辑是否合理？
- [ ] 案例覆盖是否充分？
- [ ] 是否可应用到生产？
```

### Phase 1C 提前结束 (仅诊断)

如果用户在 CHECKPOINT 1C 选择 **"仅输出诊断报告"**：

主交付物: `Diagnosis_Report.md` (无需进入 Phase 2-4)

---

**Version**: 2.3 | **Updated**: 2025-12-25 | 完整修复: INPUT/OUTPUT 链条、变量透传、初始化、结束路径、适用条件、prompt_name 来源