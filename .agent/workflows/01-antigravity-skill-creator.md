---
description: Antigravity Skill Creator - 制作高质量 Antigravity Skill 的工作流
---

# Antigravity Skill Creator v2.0

> **核心理念**: 掌控感优先 + 自然语言审核 + 渐进式披露
> **版本**: 2.0
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
> 4. 渐进式披露: SKILL.md < 500 行 (硬性限制)，长代码移入 `scripts/`，长文档移入 `references/`

## 📚 Agent Roster

| Agent | 文件路径 | 阶段 | 说明 |
|-------|---------|------|------|
| **intent-router** | [intent-router.md](antigravity-skill-creator/intent-router.md) | Phase 0 | 入口路由 + 阶段地图展示 |
| **capability-analyzer** | [capability-analyzer.md](antigravity-skill-creator/capability-analyzer.md) | Phase 1A | REFACTOR 入口分析 |
| **design-architect** | [design-architect.md](antigravity-skill-creator/design-architect.md) | Phase 1B | CREATE 入口设计 |
| **skill-builder** | [skill-builder.md](antigravity-skill-creator/skill-builder.md) | Phase 3 | Skill 构建 |
| **skill-validator** | [skill-validator.md](antigravity-skill-creator/skill-validator.md) | Phase 4 | 质量验证 |
| **readme-generator** | [readme-generator.md](antigravity-skill-creator/readme-generator.md) | Phase 5 | README 生成 |
| **pain-point-searcher** | [pain-point-searcher.md](antigravity-skill-creator/pain-point-searcher.md) | Phase 6A | 关键词验证 + 痛点搜索 |
| **seo-field-generator** | [seo-field-generator.md](antigravity-skill-creator/seo-field-generator.md) | Phase 6B | SEO 字段生成 |
| **schema-validator** | [schema-validator.md](antigravity-skill-creator/schema-validator.md) | Phase 6B.5 | JSON Schema 验证 ⭐ NEW |
| **skill-publisher** | [skill-publisher.md](antigravity-skill-creator/skill-publisher.md) | Phase 6C | API 发布执行 |
| **publish-verifier** | [publish-verifier.md](antigravity-skill-creator/publish-verifier.md) | Phase 6D | 发布验证 |


---

## 📋 Phase 0: 入口路由 + 阶段地图

Call /intent-router

### Step 0.1: 判断意图

**INPUT**: 用户自然语言请求
**OUTPUT**: 
- `intent`: CREATE | REFACTOR
- `payload`: 提取的核心内容

**路由逻辑**:
```
如果用户输入包含 文件路径/代码块/现有 Skill 内容:
  → intent = REFACTOR → Phase 1A
如果用户输入是功能描述:
  → intent = CREATE → Phase 1B
```

### Step 0.2: 展示阶段地图 ⭐ NEW

**执行**: 向用户展示完整流程预览

```markdown
🗺️ **您的 Skill 创建之旅**

您的请求已识别为 [CREATE/REFACTOR] 模式。接下来将经过以下阶段：

1️⃣ **深度分析** → 生成 [能力报告/设计规划]
2️⃣ **您的审核** → 确认或提出修改意见
3️⃣ **Skill 构建** → 生成 SKILL.md 和资源
4️⃣ **质量验证** → 自动评分
5️⃣ **README 生成** → 使用说明
6️⃣ **落地页生成** → SEO 优化页面

预计完成时间: 约 2-3 分钟
```

**GATE**: 无法判断意图 → PAUSE，询问用户

---

## 📋 Phase 1A: 深度分析 (REFACTOR 入口)

Call /capability-analyzer

### Step 1A.1: 功能分析

**INPUT**: 现有 Skill 文件/路径
**OUTPUT**: 
- `能力报告.md` (对外发布)
- `_original` 对象 (必须透传至 Phase 3)

**_original 透传规则**:
```typescript
_original: {
  path: string;
  skill_md: string;
  structure: {
    has_scripts: boolean;
    script_files: string[];
    has_references: boolean;
    reference_files: string[];
  };
}
```

**GATE**: 解析失败 → 报错并终止

### ⏸️ CHECKPOINT 1A
> **展示**: 能力报告
> **回复**: "继续" / "修改：[建议]" / "取消"

---

## 📋 Phase 1B: 深度分析 (CREATE 入口)

Call /design-architect

### Step 1B.1: 设计规划

**INPUT**: 用户需求描述
**OUTPUT**: `设计规划.md` (对外发布)

**Trigger-First 访谈**:
1. **Trigger (WHEN)**: 什么情况下触发此 Skill？
2. **Outcome (WHAT)**: 交付物是什么？
3. **Knowledge (HOW)**: 需要加载什么外部知识？

**GATE**: Trigger 或 Outcome 未明确 → 继续追问

### ⏸️ CHECKPOINT 1B
> **展示**: 设计规划
> **回复**: "继续" / "修改：[建议]" / "取消"

---

## 📋 Phase 2: 用户审核

**迭代上限**: 最多 3 次

### 交互设计 (自然语言)

```markdown
📋 **您的 Skill [能力报告/设计规划] 已准备好**

请查看上方报告，您可以：
- 回复 **"继续"** → 开始构建 Skill
- 回复 **"修改：[您的建议]"** → 例如「修改：增加 XX 能力」
- 回复 **"取消"** → 放弃此次创建

💡 任何想法都可以直接说，无需选择 A 或 B
```

### 迭代控制

```
如果 iteration_count >= 3:
  → 提示 "已达到最大迭代次数，建议继续或取消"
  → 仍允许继续修改，但不再主动邀请
如果用户回复 "修改":
  → 返回 Phase 1A/1B，iteration_count += 1
如果用户回复 "继续":
  → 进入 Phase 3
```

---

## 📋 Phase 3: Skill 构建

Call /skill-builder

### Step 3.1: 创建目录结构

**INPUT**: 
- 确认后的报告数据
- `_original` (仅 REFACTOR 模式)
**OUTPUT**: 完整的 Skill 目录

**执行**:
1. 创建 `.agent/skills/{name}/`
2. 生成 `SKILL.md` (含 Frontmatter + Body)
3. 根据配置创建 `scripts/`、`references/`、`assets/` 子目录
4. REFACTOR 模式: 原样复制 `_original` 中的资源文件

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
| **安全性** | 10% | 无危险命令 |

### Step 4.2: 迭代判断

```
如果 总分 < 8.0:
  如果 iteration_count < 3:
    → 返回 Phase 3，自动修正
  否则:
    → 标记 "需人工审核" 后输出
如果 总分 >= 8.0:
  → ✅ 通过，进入 Phase 5
```

---

## 📋 Phase 5: README 生成

Call /readme-generator

**INPUT**: 验证通过的 Skill 目录
**OUTPUT**: `{skill}/README.md`

**README 结构**:
```markdown
# {Skill Title}

## 🚀 Quick Start
## ✨ What It Does
## 🔧 How It Works
## 🔔 When to Use
## 📝 Examples
```

---

## ⏸️ CHECKPOINT 5.5: SEO 发布计划确认 (MANDATORY) ⭐ v3.3

> [!IMPORTANT]
> **先规划后执行**: Agent 必须先提取关键词、生成搜索计划，然后等待用户确认后再执行。

### Step 5.5.1: 提取关键词

**执行**:
1. 从 `SKILL.md` 的 `description` 提取核心动词/名词
2. 从 `README.md` 的 "When to Use" 提取触发关键词
3. 从 `README.md` 的 "What It Does" 提取能力词

**输出**: `extracted_keywords[]`

### Step 5.5.2: 生成搜索计划

**执行**: 基于 `extracted_keywords`，动态生成搜索计划

```typescript
interface SearchPlan {
  web_searches: { query: string; purpose: string }[];
  reddit_searches: { query: string; subreddits: string[] }[];
  estimated_time: string;
}
```

### Step 5.5.3: 展示计划并等待确认

**展示内容**:

```markdown
✅ **Skill 核心工作已完成！**

📄 **已完成**:
- SKILL.md (评分 {score}/10)
- README.md

🔍 **提取到的关键词**:
`{keyword1}`, `{keyword2}`, `{keyword3}`...

🌐 **SEO 搜索计划**:

| # | 类型 | Query | 目的 |
|:--|:-----|:------|:-----|
| 1 | Web | "{query1}" | {purpose1} |
| 2 | Web | "{query2}" | {purpose2} |
| 3 | Reddit | "{query3}" | r/{sub1}, r/{sub2} |
| ... | ... | ... | ... |

预计需要 {estimated_time}。
```

**回复选项**:
- **"继续"** → 按计划执行 Phase 6A-6D
- **"调整: [修改建议]"** → 例如「调整: 增加 Python 相关搜索」
- **"跳过 SEO"** → 仅保留本地 Skill 文件，结束
- **"稍后发布"** → 结束，告知用户手动发布命令

**GATE**:
- 用户回复 "继续" → 进入 Phase 6A，使用确认后的 `SearchPlan`
- 用户回复 "调整" → 修改 `SearchPlan`，重新展示
- 用户回复 "跳过/稍后" → 结束工作流

---

## 📋 Phase 6: SEO 发布 ⭐ v3.3

> [!IMPORTANT]
> **基于确认的计划执行**: Phase 6A 必须使用 CHECKPOINT 5.5 确认后的 `SearchPlan`

### Phase 6A: 关键词研究 + 痛点搜索

Call /pain-point-searcher

**INPUT**: README 内容 (全部章节)
**OUTPUT**: 
- `关键词验证报告` (内部)
- `痛点分析.md` (传递给 6B)
- `readme_seo_assets` (传递给 6B) ⭐ v2.2

**执行**:
1. 🔴 **强制**: 调用 `search_web` 验证主关键词
2. 🟢 可选: 调用 Reddit MCP 搜索用户痛点
3. 🟢 **提取 README 核心能力/示例** ⭐ v2.2

**GATE**:
- search_web 失败 → 使用 README 关键词继续
- Reddit MCP 失败 → fallback_mode = true

---

### Phase 6B: SEO 分析 + 字段生成 ⭐ v3.0 重构

Call /seo-field-generator

> [!IMPORTANT]
> **分析先于生成**: Agent 必须完成 4 步 SEO 分析后才能生成字段

**INPUT**: 
- SKILL.md, README.md 完整内容
- brands/*.md 预设列表 (如有)
- 验证后的关键词 (from 6A)
- `readme_seo_assets` (from 6A)
- 痛点分析 (from 6A，可选)

**分析过程** (必须输出):
1. 用户搜索意图解读 → `user_intent`
2. 竞品 SERP 分析 → `competitive_gap`
3. 差异化价值定位 → `usp_statement`
4. 内容层级规划 → `content_priority`

**OUTPUT**: 完整 SEO JSON (含 17 个字段)

```typescript
interface SkillSEOFields {
  // 基础标识 (3) ⭐ v3.5 displayName NEW
  skillId: string;
  displayName: string;  // 人类可读展示名称
  skillIcon: string;    // Lucide icon name
  // Meta + H1 (4)
  seoTitle, seoDescription, seoKeywords, h1Title: string;
  // 新增模块 (8)
  heroSection: HeroSection;
  quickStart: QuickStart;
  capabilities: Capability[];
  presets?: Preset[];
  usageExamples: UsageExample[];
  triggerPhrases: string[];
  skillContent: string;
  readmeContent: string;
  // 现有字段 (3)
  contentIntro, faqItems, visualTags: any;
}
```

**GATE**: 
- 未完成分析过程 → REJECT
- `usp_statement` 为空 → REJECT
- `skillIcon` 为空 → WARNING (使用 Wrench 默认)
- 字符数不符 → 自动修正 (最多 2 次)

---

### Phase 6B.5: Schema 验证 ⭐ v2.0 NEW

Call /schema-validator

> [!IMPORTANT]
> **职责分离**: SEO Field Generator 负责内容生成，Schema Validator 负责格式正确性。

**INPUT**: 
- `.agent/skills/{name}/seo-fields.json` (from 6B)

**执行**:
1. 验证必填字段存在
2. 自动修复字段名错误 (如 `title` → `headline`)
3. 验证类型正确 (如 `quickStart.steps` 必须是 `string[]`)
4. 修复 `skillIcon` 格式

**OUTPUT**: 
- ✅ PASS: 验证通过的 JSON (可能已自动修复)
- ❌ REJECT: 错误报告，需返回 Phase 6B

**GATE**:
- 可自动修复的错误 → 修复后 PASS
- 无法修复的错误 → REJECT，返回 Phase 6B

---

### Phase 6C: 发布执行

Call /skill-publisher

> [!IMPORTANT]
> **必须先读取** `skill-publisher.md` 获取完整执行指令，不得仅依赖本节描述。

**INPUT**: 
- skillId (即 SKILL.md 的 `name` 字段)
- SEO 字段 JSON (from 6B，已保存为 `seo-fields.json`)

**OUTPUT**: 
- postId
- seoSlug
- url

**执行**: 
```bash
pnpm skill:publish .agent/skills/{skill-name}/seo-fields.json
```

> [!TIP]
> 脚本会自动处理 Skill 注册和发布，无需手动调用 API。

**GATE**:
- ❌ SEO 验证失败 → 返回 6B 修正
- ⚠️ Skill 未注册 → 脚本自动从 SKILL.md 注册
- ❌ 发布失败 → 记录错误，人工介入

---

### Phase 6D: 发布验证

Call /publish-verifier

**INPUT**: seoSlug, url (from 6C)
**OUTPUT**: 验证报告

**验证项**:
- [ ] URL 返回 200
- [ ] `<title>` 匹配 seoTitle
- [ ] `<h1>` 匹配 h1Title
- [ ] FAQ Schema 正确注入

**GATE**: 任一验证失败 → 标记警告，人工确认

---

## ✅ 最终输出

**输出位置**: `.agent/skills/{name}/`

**目录结构**:
```
{name}/
├── SKILL.md           # 必需
├── README.md          # 必需
├── scripts/           # 可选
├── references/        # 可选
└── assets/            # 可选
```

**额外产出**:
- 发布到 `/skills/{seoSlug}` (动态路由)

---

## Quality Checklist

- [ ] 阶段地图已展示 (Phase 0)
- [ ] 用户自然语言审核通过 (Phase 2)
- [ ] SKILL.md 生成完整 (Phase 3)
- [ ] 六维评分 >= 8.0 (Phase 4)
- [ ] README.md 生成 (Phase 5)
- [ ] **search_web 关键词验证 (Phase 6A)** ⭐
- [ ] **SEO 字段通过字符数检查 (Phase 6B)** ⭐
- [ ] **API 发布成功 (Phase 6C)** ⭐
- [ ] **页面验证通过 (Phase 6D)** ⭐
- [ ] Description 是 Trigger-First 格式
- [ ] name 是严格 Kebab Case

---

**Version**: 3.5 | **Updated**: 2026-01-20 | **Changes**: 添加 `displayName` 字段生成 (Phase 6B Step 5.1)，优化数据流避免前端 kebab→Title 转换
