# PRP: Workflow Creation Workflow (`/0-workflow_gen`)

> **适配工作流**: `/prp_gen` (PATH A)  
> **用途**: AI 实现指南 - 包含完整上下文、验证命令、参考模式
> **输出路径**: `.agent/doc/prps/` (非 `docs/`)

---

## 元信息

- **Feature Name**: Workflow Creation Workflow
- **Path Selected**: A (精益迭代)
- **Created**: 2025-12-25
- **Confidence Score**: 8/10

---

## Goal

创建一个 **工作流创建工作流** (`/0-workflow_gen`)，帮助 Agent 自动化地生成、验证和优化符合官方规则的 Antigravity Workflows。

## Why

1.  **防止幻觉**: Agent 经常"发明"不存在的工具或功能
2.  **强制规则遵守**: 12,000 字符限制容易被忽略
3.  **逻辑一致性**: 复杂工作流容易出现死循环或无退出条件
4.  **Prompt 质量**: 工作流中的 Sub-Agent 指令需要优化才能有效

## What

一个分阶段的元工作流，包含：
-   **Phase -1**: 意图理解 (**理解用户想要什么工作流，提取目标和约束**)
-   **Phase 0**: 规则注入 (读取官方规则，**强制原文引用**)
-   **Phase 1**: 逻辑架构 (验证流程无死循环，**回答 6 个必答问题**)
-   **Phase 2**: 内容撰写 (Prompt 优化)
-   **Phase 3**: 合规验证 (字符限制 + 工具存在性 + **评分迭代**)

### Success Criteria

- [ ] 生成的工作流 ≤ 12,000 字符
- [ ] 无引用不存在的工具
- [ ] 有明确的 Phase 和 Step 结构
- [ ] 包含 YAML Frontmatter
- [ ] **评分 ≥ 7.0/10 才能通过**

---

## Context (from codebase-research)

### 官方规则来源

```yaml
Primary Reference:
  file: 1/windsurf-antigravity-rules/en/doc/rules-and-workflows.md
  key_points:
    - Rules define "what" and "how to write it" (格式、禁止模式)
    - Workflows define "how to execute safely" (命令序列)
    - Workflows should NOT duplicate rules, but reference them
    - Location: .agent/workflows/*.md
```

### 现有模式 (Codebase Patterns)

```yaml
Reference Workflow 1:
  file: .agent/workflows/0-prp_gen.md
  size: 6,131 bytes
  pattern:
    - YAML Frontmatter: description, argument-hint, allowed-tools
    - Phase structure: Phase 0 → Phase 1 → ... → Phase N
    - Sub-Agent files in subdirectory: 0-prp_gen/*.md
    - Decision Gates: "PROCEED or REQUEST CLARIFICATION"

Reference Workflow 2:
  file: .agent/workflows/0-prompt_gen.md
  size: 5,920 bytes
  pattern:
    - CHECKPOINT pattern for user confirmation
    - Output directory convention: artifacts/{name}/
    - Agent roster table with file paths
    - Before/After scoring with iteration loop

Reference Agent:
  file: .agent/workflows/0-prompt_gen/prompt-engineer.md
  size: 10,850 bytes
  key_techniques:
    - Chain-of-Thought (CoT)
    - Few-Shot prompting
    - Constitutional AI for safety
    - Structured output (JSON Schema)

Existing v5 Rules:
  file: .agent/rules/v5.md
  key_points:
    - Task classification: 🟢 Lightweight / 🟡 Standard / 🔴 Critical
    - Tool usage policy (view_file, grep_search, replace_file_content)
    - Parallel execution allowed for read-only operations
```

### 已知约束 (从用户截图确认)

```yaml
Character Limit:
  source: Antigravity UI (user-provided screenshot)
  limit: 12,000 characters (Content field)
  current_example: Post Analyzer Agent = 12,610/12,000 (OVER LIMIT)

Output Path:
  correct: .agent/doc/prps/{feature-name}.md
  wrong: docs/prps/{feature-name}.md  # ← 之前的错误路径
```

---

## Implementation Blueprint

### 工作流结构设计

```yaml
Main Workflow:
  path: .agent/workflows/0-workflow_gen.md
  frontmatter:
    description: 工作流创建工作流 - 生成、验证、优化符合官方规则的工作流
    argument-hint: [workflow name and purpose]

Sub-Agent Directory:
  path: .agent/workflows/0-workflow_gen/
  files:
    - intent-analyzer.md   # Phase -1: 理解用户意图
    - rule-injector.md     # Phase 0: 读取并注入官方规则
    - logic-architect.md   # Phase 1: 逻辑验证 (6 个必答问题)
    - compliance-guard.md  # Phase 3: 字符/工具验证 + 评分
```

### Phase 详细设计

```yaml
Phase -1 - 意图理解 (必须先理解再执行):
  agent: intent-analyzer
  input: User's raw request (natural language)
  
  **必须提取的 5 个要素**:
    1. **工作流名称**: 用户想创建什么工作流? (e.g., "代码审查工作流")
    2. **核心目标**: 这个工作流要达成什么? (e.g., "自动化代码审查并输出报告")
    3. **输入/输出**: 工作流接收什么? 产出什么?
    4. **关键约束**: 有没有特殊限制? (e.g., "只能用 Python", "不能联网")
    5. **成功标准**: 怎么判断工作流成功了?
  
  output_format: |
    ## 意图分析报告
    
    ### 工作流基本信息
    - **名称**: [提取的名称]
    - **目标**: [一句话描述]
    
    ### 输入输出
    - **输入**: [描述输入]
    - **输出**: [描述输出]
    
    ### 约束条件
    - [约束 1]
    - [约束 2]
    
    ### 成功标准
    - [标准 1]
    - [标准 2]
    
    ### 不确定/需澄清
    - [问题 1]?
    - [问题 2]?
    
  GATE: |
    ❌ REJECT 如果 5 个要素没有全部提取
    ⏸️ 如果有 "不确定/需澄清" 项目，必须先询问用户

### ⏸️ CHECKPOINT -1
> **检查点**: 确认意图理解正确，无歧义
> **回复**: "继续" 或回答澄清问题

---

Phase 0 - 规则注入 (强制原文引用):
  agent: rule-injector
  input: User's workflow request
  actions:
    - Read 1/windsurf-antigravity-rules/en/doc/rules-and-workflows.md
    - Read .agent/rules/v5.md
    - **MANDATORY**: Extract and QUOTE key constraints with line numbers
  output_format: |
    ## 官方规则原文引用 (防幻觉)
    
    ### 规则 1: 字符限制
    > 原文: "Content field limit: 12,000 characters" (来源: UI screenshot)
    
    ### 规则 2: Workflow vs Rule 区分
    > 原文: "Workflows define 'how to execute safely'" (来源: rules-and-workflows.md L35)
    
    ### 已知工具列表 (从系统 prompt 提取)
    - view_file, grep_search, run_command, write_to_file, replace_file_content...
    
  GATE: |
    ❌ REJECT 如果输出不包含 "原文:" 引用格式
    ❌ REJECT 如果没有工具列表

### ⏸️ CHECKPOINT 0
> **检查点**: 确认规则引用正确，工具列表完整
> **回复**: "继续" 或指出遗漏

---

Phase 1 - 逻辑架构 (6 个必答问题):
  agent: logic-architect
  input: User request + Official Rules Context
  
  **必须回答的 6 个问题** (参考 /0-prompt_gen 的上下文分析):
    1. **每个 Phase 的 INPUT 是什么?** (上游依赖)
    2. **每个 Phase 的 OUTPUT 是什么?** (产出物)
    3. **OUTPUT 满足下一个 Phase 的 INPUT 吗?** (链式完整性)
    4. **有没有条件分支? 每个分支都有退出吗?** (无死循环)
    5. **有没有重复的 Step?** (冗余检测)
    6. **Agent 看到指令会不会有歧义?** (Prompt 清晰度)
  
  output_format: |
    ## Workflow Blueprint
    
    ### 流程图
    ```mermaid
    flowchart TD
      P0[Phase 0: 规则注入] --> P1[Phase 1: 逻辑设计]
      P1 --> G1{用户批准?}
      G1 -->|Yes| P2[Phase 2: 内容撰写]
      G1 -->|No| P1
      P2 --> P3[Phase 3: 合规验证]
      P3 --> G2{评分 >= 7?}
      G2 -->|Yes| Done[完成]
      G2 -->|No| P2
    ```
    
    ### 6 个问题回答
    | 问题 | 回答 |
    |------|------|
    | 1. Phase 0 INPUT | 用户的工作流需求描述 |
    | 1. Phase 0 OUTPUT | 官方规则原文 + 工具列表 |
    | ... | ... |
    | 5. 冗余检测 | 无冗余 / 发现冗余: [具体说明] |
    | 6. 歧义检测 | 无歧义 / 发现歧义: [具体说明] |
    
  GATE: |
    ❌ REJECT 如果 6 个问题没有全部回答
    ❌ REJECT 如果发现冗余或歧义但未修正

### ⏸️ CHECKPOINT 1
> **检查点**: 确认逻辑架构无死循环、无冗余、无歧义
> **回复**: "继续" 或指出问题

---

Phase 2 - 内容撰写:
  agent: /prompt-engineer (existing, no new file needed)
  input: Approved Blueprint
  actions:
    - Convert Blueprint to Markdown
    - Apply Prompt Optimization:
      - Clear Role definition for each Sub-Agent
      - Explicit Input/Output for each Step
      - Chain-of-Thought where needed
    - Add YAML Frontmatter
  constraint: Target < 10,000 chars (2k buffer for future edits)
  output: Draft workflow file (.agent/workflows/0-{name}.md)

### ⏸️ CHECKPOINT 2
> **检查点**: 确认 Prompt 质量 (Role/Input/Output 明确)
> **回复**: "继续" 或指出问题

---

Phase 3 - 合规验证 + 评分:
  agent: compliance-guard
  input: Draft workflow file
  
  **验证检查**:
    - Run "wc -c" to check character count
    - IF > 12,000: REJECT, request compression
    - Regex check for forbidden patterns:
      - "cd " in run_command (use Cwd instead)
      - Embedded images without artifacts logic
    - Verify YAML Frontmatter is valid
  
  **评分维度** (总分 10):
    | 维度 | 权重 | 评判标准 |
    |------|------|----------|
    | 规则遵守度 | 30% | 是否引用了官方规则原文? |
    | 逻辑清晰度 | 25% | 6 个问题是否全部回答? 无死循环? |
    | Prompt 质量 | 25% | Sub-Agent 指令是否有 Role/Input/Output? |
    | 字符效率 | 20% | 是否 < 10,000 chars? (留 buffer) |
  
  **迭代机制**:
    - 如果总分 < 7.0 → 返回 Phase 2 修改
    - 最多 3 轮迭代
    - 3 轮后仍 < 7.0 → 标记 "需人工审核" 后输出
  
  output: |
    ## 合规验证报告
    
    ### 字符统计
    - 当前: X chars / 12,000 limit
    - 状态: ✅ PASS / ❌ OVER LIMIT
    
    ### 评分
    | 维度 | 得分 | 说明 |
    |------|------|------|
    | 规则遵守度 | X/3 | ... |
    | 逻辑清晰度 | X/2.5 | ... |
    | Prompt 质量 | X/2.5 | ... |
    | 字符效率 | X/2 | ... |
    | **总分** | **X/10** | PASS (>=7) / FAIL |
    
    ### 迭代状态
    - 当前轮次: 1/3
    - 需要修改: [具体建议] 或 "无"
```

### Task List (修订版)

```yaml
Task 0:
  action: CREATE
  file: .agent/workflows/0-workflow_gen/intent-analyzer.md
  details: |
    Agent persona for understanding user intent BEFORE any workflow design.
    MUST extract 5 elements: Name, Goal, Input/Output, Constraints, Success Criteria.
    MUST ask clarifying questions if anything is unclear.
  reference: /0-prp_gen's preflight-prp-enhanced.md (similar clarification role)

Task 1:
  action: CREATE
  file: .agent/workflows/0-workflow_gen.md
  details: Main workflow orchestrator (Phases -1 to 3) with CHECKPOINTs
  reference: .agent/workflows/0-prp_gen.md (structure) + 0-prompt_gen.md (CHECKPOINT pattern)

Task 2:
  action: CREATE
  file: .agent/workflows/0-workflow_gen/rule-injector.md
  details: |
    Agent persona for reading and QUOTING official rules.
    MUST output "原文:" format with line numbers.
    MUST extract known tools list.
  reference: .agent/workflows/0-prompt_gen/context-analyzer.md

Task 3:
  action: CREATE
  file: .agent/workflows/0-workflow_gen/logic-architect.md
  details: |
    Agent persona for DAG/State Machine logic verification.
    MUST answer 6 mandatory questions.
    MUST detect redundancy and ambiguity.
  reference: NEW - based on /0-prompt_gen's "6 个必须搞清楚的问题" pattern

Task 4:
  action: CREATE
  file: .agent/workflows/0-workflow_gen/compliance-guard.md
  details: |
    Agent persona for strict rule enforcement + scoring.
    MUST score on 4 dimensions (10-point scale).
    MUST implement iteration loop (max 3 rounds).
  reference: /0-prompt_gen's Before/After scoring pattern
```

---

## Integration Points

```yaml
Directory Structure:
  create: .agent/workflows/0-workflow_gen/
  
Output Path Convention:
  PRPs: .agent/doc/prps/{feature-name}.md   # ← 正确路径
  Tasks: .agent/doc/tasks/{feature-name}.md # ← 正确路径
  NOT: docs/prps/ (这是错误路径)

Workflow Registry:
  No explicit registry needed - Antigravity auto-discovers from .agent/workflows/

Dependencies:
  - Existing /prompt-engineer workflow (for Phase 2 content writing)
  - Existing rules files (v5.md, rules-and-workflows.md)
```

---

## Validation Loop

### Level 1: 字符限制检查

```bash
# 检查生成的工作流文件字符数
wc -c .agent/workflows/0-workflow_gen.md
# 期望: < 12000
```

### Level 2: 工作流可调用性

```bash
# 验证 Antigravity 能识别该工作流
ls -la .agent/workflows/ | grep "0-workflow_gen"
```

### Level 3: 评分验证

```bash
# 确认最终评分 >= 7.0
grep -A 10 "总分" .agent/doc/prps/workflow-creation-workflow.md
```

---

## Final Checklist

- [ ] 主工作流 ≤ 12,000 字符
- [ ] Sub-Agent 文件均存在
- [ ] YAML Frontmatter 有效
- [ ] 所有引用的工具确实存在 (来自 Phase 0 工具列表)
- [ ] Phase 之间有明确的 CHECKPOINT
- [ ] **5 个意图要素全部提取 (Phase -1)**
- [ ] 6 个必答问题全部回答 (Phase 1)
- [ ] **评分 ≥ 7.0/10**
- [ ] **输出路径为 .agent/doc/prps/** (非 docs/)

---

## Anti-Patterns

- ❌ 不要在工作流中重复定义规则（应引用 rules/*.md）
- ❌ 不要使用 "cd" 命令（使用 `Cwd` 参数）
- ❌ 不要嵌入图片（除非通过 artifacts 逻辑）
- ❌ 不要创建无退出条件的循环
- ❌ 不要引用"幻觉工具"（如 `read_mind`, `magic_fix`）
- ❌ **不要把 PRP 输出到 docs/ 目录**（应使用 .agent/doc/）
- ❌ 不要概括规则（应原文引用，带行号）
