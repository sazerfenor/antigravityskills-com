# Code Review Skill - 痛点分析

## 🎯 用户搜索意图解读

用户搜索 "code review" 相关工具时，核心诉求是：
1. **减少人工审查时间** - 让繁琐的代码审查更高效
2. **提高代码质量** - 在合并前捕获 Bug 和安全漏洞
3. **统一审查标准** - 消除人为因素带来的不一致

## 🔥 Reddit 用户痛点

### 痛点 1: AI 审查工具噪音太多
> "70% of AI PR comments are useless" - r/programming (283 upvotes)
> 
> 大多数 AI 审查工具每个 PR 生成 10-20 条评论，但 80% 都是噪音。

**解决方案**: 我们的 Skill 采用分级输出 (Critical 🔴 / Improvements 🟡 / Suggestions 🟢)，优先展示真正重要的问题。

### 痛点 2: 审查周期过长
> "Why do code reviews take 3-4 days on some teams and under an hour on others?" - r/programming

**解决方案**: Skill 提供结构化审查流程和清晰的输出格式，加速审查决策。

### 痛点 3: 缺乏上下文理解
> "You know when you open a PR from last week and spend 20 minutes trying to remember what the hell you were thinking?" - r/ExperiencedDevs

**解决方案**: Skill 首先 "Gather Context"，理解项目结构和约定，而不是盲目审查。

### 痛点 4: Vibe Coding 问题
> "Some seniors lack basic coding fundamentals... submitting PRs which are obviously heavily vibe-coded" - r/ExperiencedDevs

**解决方案**: Skill 检查代码质量原则 (DRY, SOLID)，帮助识别低质量代码。

## 📊 竞品分析

| 竞品 | 定位 | 我们的差异化 |
|:-----|:-----|:-------------|
| GitHub Copilot | 实时代码建议 | 我们专注审查，不是生成 |
| CodeRabbit | AI 审查服务 | 我们是 Agent Skill，可离线使用 |
| Graphite Agent | 堆叠 PR 工作流 | 我们是通用审查，不限工作流 |

## ✨ 差异化价值定位 (USP)

**Agent-native code review skill** - 不依赖外部服务，在任何 AI Agent 中运行，提供结构化、可操作的审查反馈。

## 📋 内容层级规划

1. **Hero**: 强调 "Expert code reviewer" 和 "production-ready"
2. **Quick Start**: 极简触发示例 (3 行)
3. **Capabilities**: 四大能力 (Correctness, Security, Performance, Quality)
4. **FAQ**: 针对 Reddit 痛点的直接回答
