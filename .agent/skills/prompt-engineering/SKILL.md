---
name: prompt-engineering
description: Use when writing prompts for LLMs, agents, or sub-agents. Covers few-shot learning, chain-of-thought, system prompt design, and persuasion principles for effective agent communication.
metadata:
  version: "1.0.0"
  author: "antigravity-skill-creator"
  source: "claude-plugins/prompt-engineering"
---

# Prompt Engineering

Advanced prompt engineering techniques to maximize LLM performance, reliability, and controllability.

## Overview

This skill provides patterns and best practices for:
- **Few-Shot Learning**: Teaching models through examples
- **Chain-of-Thought**: Step-by-step reasoning
- **System Prompt Design**: Persistent behavior configuration
- **Persuasion Principles**: Psychology-backed agent communication

## Core Patterns

### 1. Few-Shot Learning

Teach the model by showing 2-5 input-output examples instead of explaining rules.

```markdown
Extract key information from support tickets:

Input: "My login doesn't work and I keep getting error 403"
Output: {"issue": "authentication", "error_code": "403", "priority": "high"}

Now process: "{user_input}"
```

### 2. Chain-of-Thought

Add "Let's think step by step" or include reasoning traces for complex problems.

```markdown
Analyze this bug report. Think step by step:
1. What is the expected behavior?
2. What is the actual behavior?
3. What changed recently?
4. What is the most likely root cause?
```

### 3. Progressive Disclosure

Start simple, add complexity only when needed:

| Level | Example |
|-------|---------|
| **L1** | "Summarize this article" |
| **L2** | "Summarize in 3 bullet points" |
| **L3** | "Identify main findings, then summarize each" |
| **L4** | Include 2-3 example summaries |

### 4. Instruction Hierarchy

```
[System Context] → [Task Instruction] → [Examples] → [Input Data] → [Output Format]
```

## Key Principles

### Concise is Key

The context window is shared. Only add context the model doesn't already have:
- "Does Claude really need this explanation?"
- "Can I assume Claude knows this?"
- "Does this paragraph justify its token cost?"

### Degrees of Freedom

| Freedom | When to Use | Example |
|---------|-------------|---------|
| **High** | Multiple valid approaches | Code review guidelines |
| **Medium** | Preferred pattern exists | Script templates |
| **Low** | Operations are fragile | Database migrations |

## Persuasion Principles

For discipline-enforcing prompts, use:

| Principle | How to Apply |
|-----------|--------------|
| **Authority** | "YOU MUST", "Never", "No exceptions" |
| **Commitment** | Require announcements, explicit choices |
| **Scarcity** | "Before proceeding", "Immediately after" |
| **Social Proof** | "Every time", "X without Y = failure" |

> See [persuasion-principles.md](references/persuasion-principles.md) for full details.

## Best Practices

1. **Be Specific**: Vague prompts produce inconsistent results
2. **Show, Don't Tell**: Examples > descriptions
3. **Test Extensively**: Diverse, representative inputs
4. **Iterate Rapidly**: Small changes can have large impacts
5. **Version Control**: Treat prompts as code

## Common Pitfalls

- ❌ Over-engineering before trying simple prompts
- ❌ Examples that don't match target task
- ❌ Exceeding token limits with excessive examples
- ❌ Ambiguous instructions
- ❌ Ignoring edge cases

## ⚠️ 资源加载规则 (MANDATORY)

> [!CAUTION]
> 执行 Prompt 任务前，**必须**根据任务类型读取对应资源。跳过此步骤 = 任务失败。

| 任务类型 | 必须立即读取 |
|---------|-------------|
| 撰写 Agent/Sub-Agent Prompt | `references/agent-prompting.md` |
| 增强 Prompt 服从性/纪律性 | `references/persuasion-principles.md` |
| 使用专家角色定义 | `references/domain-expert-presets.md` |
| 需要 CoT/Few-Shot 深度模式 | `references/core-capabilities.md` |

**执行协议**:
1. 识别当前任务类型
2. **立即读取**对应资源文件 (使用 `view_file`)
3. 应用资源中的模式
4. 在输出中报告: "我读取了 [X]，应用了 [Y 技术]"

---

## References

详细文档 (按上述规则按需加载):
- [Core Capabilities](references/core-capabilities.md) - Few-Shot, CoT, 模板系统
- [Agent Prompting Best Practices](references/agent-prompting.md) - Agent Prompt 编写
- [Persuasion Principles](references/persuasion-principles.md) - 7 大说服原则
- [Domain Expert Presets](references/domain-expert-presets.md) - 69 个专家角色模板

