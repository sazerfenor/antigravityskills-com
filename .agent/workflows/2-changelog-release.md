---
description: Changelog 发布工作流 - 以 Kai 的独立开发者视角，站在用户价值角度撰写版本更新日志
---

# Changelog Release Workflow

> **核心理念**: Building in Public - 以真实开发者人格，用户价值导向，亲切友好地沟通每一次更新
> **适用场景**: 每周/每次功能发布时，生成标准化的 Changelog

## 👤 开发者人设：Kai

> [!IMPORTANT]
> **Kai 是 Banana Prompts 的独立开发者**
> 
> - 名字: **Kai** (中性名，适合国际化)
> - 风格: 真诚、平等、有同理心、略带幽默
> - 语气: 第一人称 "I"，像朋友分享而非官方公告
> - 签名: `— Kai, Solo Dev @ Banana Prompts 🍌`

### Kai 的写作原则

| ✅ DO | ❌ DON'T |
|-------|---------|
| "I've been thinking about..." | "We are pleased to announce..." |
| "You asked for this, so I built it" | "New feature added" |
| "Honestly, this took longer than expected" | "After careful consideration..." |
| 承认困难和挑战 | 假装一切完美 |
| 解释 WHY 做这个功能 | 只罗列 WHAT |

---

## 📚 Agent Roster

| Agent | 文件路径 | 阶段 |
|-------|---------|------|
| **diff-researcher** | [diff-researcher.md](changelog-release/diff-researcher.md) | Phase 1 |
| **user-value-translator** | [user-value-translator.md](changelog-release/user-value-translator.md) | Phase 2 |
| **kai-writer** | [kai-writer.md](changelog-release/kai-writer.md) | Phase 3 |

---

## 📋 Phase 1: 差异调研

Call /diff-researcher

**INPUT**: 
- 线上版本 URL (默认: https://bananaprompts.info/)
- 本地版本 URL (默认: http://localhost:3000)

**OUTPUT**: 差异调研报告 (Markdown)

### Step 1.1: Git 提交分析

**执行**:
```bash
git log --oneline -30 --since="<上次发布日期>"
```

### Step 1.2: 浏览器对比

**执行**:
1. 打开线上版本，截图关键页面 (Homepage, Generator, 新功能页)
2. 打开本地版本，截图相同页面
3. 对比差异，列出变更点

### Step 1.3: 功能分类

**输出格式**:
```markdown
## 🆕 新功能 (New Features)
- [ ] 功能名 | 相关文件 | 用户影响

## ⚡ 改进 (Improvements)
- [ ] 改进点 | 性能提升/体验优化

## 🐛 修复 (Bug Fixes)
- [ ] Bug 描述 | 修复方式

## 🧰 幕后 (Behind the Scenes)
- [ ] 技术改进 | 用户不可见但重要
```

**GATE**:
- ❌ REJECT: 没有发现任何变更
- ✅ PASS: 至少有 1 个变更点

### ⏸️ CHECKPOINT 1
> **回复**: "继续" 或 "补充 [遗漏的功能]"

---

## 📋 Phase 2: 用户价值翻译

Call /user-value-translator

**INPUT**: 差异调研报告 (from Phase 1)
**OUTPUT**: 用户价值清单 (Markdown)

### Step 2.1: 技术语言 → 用户语言

**转换模板**:
```
技术描述: [xxx]
↓
用户视角: 
- 这解决了什么问题？
- 对用户的具体好处是什么？
- 用一句话说清楚价值
```

**示例**:
| 技术描述 | 用户价值 |
|---------|---------|
| "新增 Primary Intent Anchoring 机制" | "你的核心创意不再被 AI 遗忘" |
| "优化 WebSocket 连接池" | "生成速度提升 30%，等待更短" |
| "修复评论删除 API" | "你现在可以正常删除自己的评论了" |

### Step 2.2: 标注用户反馈来源

**执行**:
- 检查哪些功能是源自用户反馈/Discord/评论区
- 标注 `💬 Inspired by User Feedback`

### Step 2.3: 优先级排序

**规则**:
1. 用户价值最高的功能放最前
2. 来自用户反馈的功能优先展示
3. Bug 修复按影响面排序

**GATE**:
- ⚠️ WARNING: 如果有技术描述无法翻译为用户价值，标注 "[需人工补充]"
- ✅ PASS: 所有功能都有用户价值描述

### ⏸️ CHECKPOINT 2
> **回复**: "继续" 或 "修改 [具体条目]"

---

## 📋 Phase 3: Kai 撰写

Call /kai-writer

**INPUT**: 用户价值清单 (from Phase 2)
**OUTPUT**: Changelog MDX 文件

### Step 3.1: 选择开场 Hook

**Kai 的开场模板库**:
```markdown
A) "Hey there! I'm Kai, the solo developer behind Banana Prompts."

B) "Hey friends! It's been a busy week in the Banana lab 🍌"

C) "Hey! Quick update from me — I've been heads-down building something I think you'll love."

D) "Alright, real talk: [承认一个挑战]. So I fixed it."
```

### Step 3.2: 填充内容模板

**MDX Frontmatter**:
```yaml
---
title: "[动词短语]: [用户视角的价值]"
slug: "[日期]-[关键词]"
version: "V[x.x]"
publishedAt: [YYYY-MM-DD]
tags: [new, improved, fixed] # 选择适用的
isFromFeedback: [true/false]
summary: "[一句话摘要]"
image: "/images/changelog/[slug].png"
relatedLinks:
  - label: "[行动号召]"
    url: "[相关页面]"
---
```

**正文结构**:
```markdown
## 👋 A Note from Kai

[开场 Hook + 这次更新的核心理念]

---

## 🆕 What's New

### 1. [功能名] [emoji]

[用户价值描述]

**Before:** [旧体验]
**After:** [新体验]

> 💬 **Inspired by User Feedback**  
> "[引用用户原话或痛点描述]"

---

## ⚡ Improvements
[列表形式]

---

## 🐛 Bug Fixes
[列表形式]

---

## 🧰 Behind the Scenes
[列表形式]

---

## 🔮 What's Next?

[下一步计划 + 鼓励用户反馈]

---

*[温暖的结束语]* 🍌💛

— Kai, Solo Dev @ Banana Prompts
```

### Step 3.3: Emoji 使用指南

| 场景 | 推荐 Emoji |
|------|-----------|
| 新功能标题 | 🆕 🚀 ✨ 🎉 |
| 改进 | ⚡ 🔧 📈 💪 |
| Bug 修复 | 🐛 🩹 ✅ |
| 幕后工作 | 🧰 🔨 ⚙️ |
| 未来计划 | 🔮 🗺️ 💭 |
| 用户反馈 | 💬 👂 ❤️ |
| 功能相关 | 根据内容选择 (📷 🎨 🧠 📱 etc.) |
| 签名 | 🍌 💛 |

### Step 3.4: 保存文件

**文件路径**: `content/changelog/[YYYY-MM-DD]-[slug].mdx`

**GATE**:
- ❌ REJECT: 缺少 Frontmatter 必填字段
- ❌ REJECT: 没有 "Kai" 人格体现
- ⚠️ WARNING: 正文少于 500 字符
- ✅ PASS: 结构完整，人格一致

---

## 📋 Phase 4: 人工审核 (MANDATORY)

**INPUT**: Changelog MDX 文件
**OUTPUT**: 审核决策

### ⏸️ CHECKPOINT 4 (不可跳过)
> **检查点**: 人工审核 Changelog 内容
> **选项**:
> - **"发布"** → 完成
> - **"修改"** → 返回 Phase 3
> - **"放弃"** → 删除文件

---

## ✅ 最终输出

**主输出**: `content/changelog/[YYYY-MM-DD]-[slug].mdx`

**可选产出**:
- 截图/GIF 存放: `public/images/changelog/`
- 调研报告: `artifacts/changelog/[date]-研究报告.md`

---

## Quality Checklist

- [ ] Git 提交和浏览器差异调研完成 (Phase 1)
- [ ] 技术语言已翻译为用户价值 (Phase 2)
- [ ] 以 Kai 人格撰写完成 (Phase 3)
- [ ] Frontmatter 字段完整 (Phase 3)
- [ ] 包含合适的 Emoji (Phase 3)
- [ ] **人工审核通过 (Phase 4)**

---

**Version**: 1.0 | **Created**: 2026-01-03
