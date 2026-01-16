---
description: Workflow Master - 主脉络优先的工作流生成器 (Backbone-First Workflow Generator)
---

# Workflow Master (工作流大师)

> **核心理念**: **Backbone-First** - 先定义人类专家方法论，再设计系统结构，最后验证合规
> **版本**: 2.0 | 基于 1-workflow-gen 升级
> **适用场景**: 创建任何新的 Antigravity 工作流

## 🚫 架构约束

> [!CAUTION]
> **禁止跨工作流引用**
> 
> 本工作流及其输出的新工作流，只能引用:
> 1. 自身子文件夹中的 Agent
> 2. `.agent/workflows/common/` 中的通用 Agent
>
> 如需复用能力 → 参考代码提取模式，或放入通用文件夹

## 📚 Agent Roster

| Agent | 文件路径 | 阶段 | V3.0 变更 |
|-------|---------|------|----------|
| **health-checker** | [health-checker.md](workflow-master/health-checker.md) | Phase -2 (仅优化时) | - |
| **intent-analyzer** | [intent-analyzer.md](workflow-master/intent-analyzer.md) | Phase -1 | - |
| **rule-injector** | [rule-injector.md](workflow-master/rule-injector.md) | Phase 0 | - |
| **resource-scanner** | [resource-scanner.md](workflow-master/resource-scanner.md) | Phase 0.5 (可选) | - |
| **sop-architect** | [sop-architect.md](workflow-master/sop-architect.md) | Phase 1 | 方法论设计 |
| **logic-architect** | [logic-architect.md](workflow-master/logic-architect.md) | Phase 2 | **[MOD]** 增加 Skill 需求列 |
| **skill-mapper** | [skill-mapper.md](workflow-master/skill-mapper.md) | **Phase 2.5** | **[NEW]** Skill 映射 |
| **content-writer** | [content-writer.md](workflow-master/content-writer.md) | **Phase 3** | **[NEW]** 调用 Skill 撰写 |
| **compliance-guard** | [compliance-guard.md](workflow-master/compliance-guard.md) | Phase 4 | **[MOD]** 增加 Skill 检查 |

---

## 📋 Phase -2: 健康检查 (仅优化现有工作流时触发)

Call /health-checker

### 路由判断

```
如果用户请求是 "创建新工作流":
  → 跳过 Phase -2，直接进入 Phase -1
如果用户请求是 "优化/重构现有工作流":
  → 执行 Phase -2 健康检查
```

### Step -2.1: 健康评估

**INPUT**: 现有工作流路径 + mode (full/quick)
**OUTPUT**: 健康检查结果

**执行**:
1. 字符膨胀度检查 (权重 40%)
2. 职能冗余检测 (权重 35%)
3. 逻辑健康度扫描 (权重 25%)

**GATE**:
- 文件不存在 → REJECT
- 有 CRITICAL 问题 → 展示问题，询问用户是否继续
- 健康评分 >= 7.0 → PASS，进入 Phase -1

### ⏸️ CHECKPOINT -2
> **选项**: "继续优化" / "仅快速修复" / "放弃"

---

## 📋 Phase -1: 意图理解

Call /intent-analyzer

### Step -1.1: 提取 5 个核心要素

**INPUT**: 用户的自然语言请求 (string)
**OUTPUT**: 意图分析报告 (Markdown)

**执行**:
- 提取工作流 **名称**
- 提取核心 **目标**
- 提取 **输入/输出**
- 提取 **关键约束**
- 提取 **成功标准**

**GATE**: 如果有任何要素不清楚，必须先询问用户

### ⏸️ CHECKPOINT -1
> **回复**: "继续" 或回答澄清问题

---

## 📋 Phase 0: 规则注入

Call /rule-injector

### Step 0.1: 读取官方规则

**INPUT**: 意图分析报告 (from Phase -1)
**OUTPUT**: 官方规则原文引用 + 已知工具列表 (Markdown)

**执行**:
- Read `.agent/rules/v5.md` (必须存在)
- Read `.agent/rules/*.md` (其他领域规则)
- 提取并 **原文引用** 关键规则 (带行号)
- 提取 **已知工具列表**

**GATE**: 如果输出不包含 "原文:" 格式引用，REJECT

### ⏸️ CHECKPOINT 0
> **回复**: "继续" 或指出遗漏

---

## 📋 Phase 0.5: 资源参考 (可选)

Call /resource-scanner

**INPUT**: 意图分析报告 (from Phase -1)
**OUTPUT**: 资源参考报告 (Markdown)

### 跳过条件
```
如果用户明确说 "快速创建" 或 "不需要参考":
  → 跳过 Phase 0.5，直接进入 Phase 1
```

### ⏸️ CHECKPOINT 0.5
> **选项**: "继续" / "查看详情" / "跳过"

---

## 📋 Phase 1: 方法论设计 (SOP) ⭐ V2.0 NEW

Call /sop-architect

> [!IMPORTANT]
> **Backbone-First 核心阶段**
> 
> 在设计任何 Agent 之前，先回答：**"一个人类专家会如何完成这件事？"**

### Step 1.1: 强制多维发散

**INPUT**: 意图分析报告 + 官方规则上下文 (from Phase -1, 0)
**OUTPUT**: SOP 蓝图 (Markdown)

**执行 4 步思考框架**:
1. **角色发散**: 战略师/执行者/审计员/新手 各自的第一步是什么？
2. **阶段发散**: 从需求到交付，完整路径是什么？
3. **边界审查**: 最常遗漏/画蛇添足的是什么？
4. **自我质疑**: 是否在推测？是否过于理想化/简化？

**GATE**:
- ❌ REJECT: 跳过任意思考步骤
- ❌ REJECT: SOP 步骤 <3 或 >10
- ⏸️ PAUSE: 有 2+ 个 `[🔍 需验证]` 标注 → **询问用户是否提供领域知识**
- ⏸️ PAUSE: 领域不熟悉 → **主动承认，建议调研**

### ⏸️ CHECKPOINT 1
> **检查点**: 确认 SOP 蓝图覆盖完整，没有遗漏关键步骤
> **回复**: "继续" 或 "补充 [具体内容]"

---

## 📋 Phase 2: 系统架构 (Logic) ⭐ V2.0 MODIFIED

Call /logic-architect

> [!IMPORTANT]
> **系统工程师角色**
> 
> 你 **不发明方法论**，只负责将 SOP 映射为可执行的工作流结构。

### Step 2.1: SOP 到系统映射

**INPUT**: SOP 蓝图 (from Phase 1)
**OUTPUT**: 
- Workflow Blueprint (Mermaid 流程图 + 映射表)
- **skill_requirements**: 每个 Agent 是否需要 Skill 的清单 ⭐ V3.0 NEW

**执行**:
1. **SOP 步骤分类**: 每个 SOP Step 是否需要 Agent？
2. **Phase 边界划分**: 合并/拆分为 Phase
3. **INPUT/OUTPUT 链条验证**: 回答原有 6 个问题
4. **SOP 对齐检查**: 确保结构忠实反映 SOP

**GATE**:
- ❌ REJECT: 未完成 4 步映射框架
- ❌ REJECT: 有 SOP 步骤在工作流中完全没有对应
- ⏸️ PAUSE: SOP 对齐检查有 ⚠️ → 必须先解决

### ⏸️ CHECKPOINT 2
> **检查点**: 确认逻辑架构对齐 SOP、无死循环、无冗余
> **回复**: "继续" 或指出问题

---

## 📋 Phase 2.5: Skill 映射 ⭐ V3.0 NEW

Call [skill-mapper](workflow-master/skill-mapper.md)

### 跳过条件

```
如果 skill_requirements 全为 false (无 Skill 需求):
  → 跳过 Phase 2.5，直接进入 Phase 3
```

### Step 2.5.1: Skill 发现与匹配

**INPUT**: 
- Workflow Blueprint (from Phase 2)
- skill_requirements (from Phase 2)

**OUTPUT**: 
- skill_mapping (匹配结果 + 生成计划)

**执行**:
1. 扫描 `.agent/skills/` 获取可用 Skill
2. 匹配 skill_requirements 中需要 Skill 的项
3. 如无匹配 → 调用 antigravity-skill-creator Skill 生成

**GATE**:
- ❌ REJECT: 目录无法访问
- ⏸️ PAUSE: 有"需生成"项 → 确认后生成
- ✅ PASS: 匹配完成

### ⏸️ CHECKPOINT 2.5
> **回复**: "继续" 或 "调整匹配"

---

## 📋 Phase 3: 内容撰写 ⭐ V3.0 重写

Call [content-writer](workflow-master/content-writer.md)

> [!IMPORTANT]
> **Prompt 工程专家**
>
> 调用 `prompt-engineering` Skill，撰写即审核。

### Step 3.0: 预检与备份

**执行**:
1. 如覆盖现有工作流，先备份到 `.agent/workflows/.backup/`
2. 初始化 `iteration_count = 1`

### Step 3.1: 调用 Skill 撰写

**INPUT**: 
- Workflow Blueprint (from Phase 2)
- skill_mapping (from Phase 2.5)
- `iteration_count`: 当前迭代轮次
- `improvement_hints` (from Phase 4，仅迭代时)

**OUTPUT**: 
- 草稿工作流文件 (`.agent/workflows/.draft/{name}.md`)
- 草稿 Sub-Agent (`.agent/workflows/.draft/{name}/*.md`)

**约束**: **每个文件**目标 < 10,000 chars (留 2k buffer)

### ⏸️ CHECKPOINT 3
> **回复**: "继续" 或指出问题

---

## 📋 Phase 4: 合规验证

Call /compliance-guard

**INPUT**: 草稿工作流文件 (from Phase 3)
**OUTPUT**: 合规验证报告 (通过/失败)

### Step 4.1: 字符检查
每个文件必须 < 12,000 chars

### Step 4.2: 5 维度评分 ⭐ V2.0 NEW

| 维度 | 权重 | V2.0 变更 |
|------|------|----------|
| SOP 对齐度 | **25%** | **[NEW]** |
| 规则遵守度 | 25% | - |
| 逻辑清晰度 | 20% | - |
| Prompt 质量 | 20% | - |
| 字符效率 | 10% | 降权 |

### Step 4.3: 迭代判断
```
如果 总分 < 7.0:
  如果 iteration_count < 3:
    → 返回 Phase 3，iteration_count += 1
  否则:
    → 标记 "需人工审核 (已迭代 3 次)" 后输出
如果 总分 >= 7.0:
  → ✅ 通过，进入 Phase 5
```

---

## 📋 Phase 5: 人工审核 (MANDATORY - 不可跳过)

**INPUT**: 草稿工作流文件 + 合规验证报告
**OUTPUT**: 审核决策 (应用 / 修改 / 放弃)

### ⏸️ CHECKPOINT 5 (MANDATORY)
> **选项**:
> - **"应用"** → 移动草稿到正式目录，继续到 Phase 6
> - **"修改"** → 返回 Phase 3
> - **"放弃"** → 删除草稿，结束

---

## 📋 Phase 6: 草稿应用与清理

**INPUT**: 审核通过的草稿工作流
**OUTPUT**: 正式工作流文件

### Step 6.1: 移动草稿到正式目录
### Step 6.2: 清理草稿目录
### Step 6.3: 完成确认

---

## ✅ 最终输出

**输出位置**: `.agent/workflows/{name}.md` (主文件) + `.agent/workflows/{name}/*.md` (Sub-Agents)

---

## Quality Checklist

- [ ] (优化时) 健康检查完成 (Phase -2)
- [ ] 5 个意图要素全部提取 (Phase -1)
- [ ] 官方规则有原文引用 (Phase 0)
- [ ] (可选) 资源参考完成 (Phase 0.5)
- [ ] **SOP 蓝图完整，无 `[🔍 需验证]` 未解决 (Phase 1)** ⭐
- [ ] **工作流结构对齐 SOP (Phase 2)** ⭐
- [ ] 每个 Agent 有 Role/Input/Output (Phase 3)
- [ ] 每个文件字符 < 12,000 (Phase 4)
- [ ] 评分 >= 7.0/10 (Phase 4)
- [ ] **人工审核通过 (Phase 5)**
- [ ] YAML Frontmatter 有效

---

**Version**: 2.0 | **Created**: 2025-12-25 | **Changes**: Backbone-First Architecture (SOP Architect + Modified Logic Architect)
