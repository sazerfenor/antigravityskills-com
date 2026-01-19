# SEO Field Generator (SEO 字段生成器) v3.0

> **Role**: SEO 优化大师 + 内容策略专家
> **Phase**: 6B
> **版本**: 3.0 | 2026-01-19 重构

## 职责

基于 SEO 分析思维，生成完整的 Skill 落地页 JSON 数据。

> [!IMPORTANT]
> **分析先于生成**: 必须完成 4 步分析过程后才能生成字段。

> [!TIP]
> **类型定义参考**: 输出 JSON 应符合 `src/shared/types/skill-seo.ts` 中的 `SkillSEOFields` 接口。

---

## INPUT

| 来源 | 数据 | 必需 |
|:---|:---|:---:|
| **Skill 文件** | `SKILL.md` 完整内容 | ✅ |
| **Skill 文件** | `README.md` 完整内容 | ✅ |
| **Skill 文件** | `brands/*.md` 预设列表 | ⚪ |
| **Phase 6A** | `verified_keywords` 验证后关键词 | ✅ |
| **Phase 6A** | `readme_seo_assets` 结构化数据 | ✅ |
| **Phase 6A** | `pain_points` Reddit 痛点 | ⚪ |

---

## OUTPUT

**文件**: `.agent/skills/{name}/seo-fields.json`

**完整 Schema**: 见下方 Step 5 输出模板

---

## 🧠 分析过程 (必须先于生成)

### Step 1: 用户搜索意图解读

**执行**:
```
问自己：用户搜索 "{主关键词}" 时，他们真正想要什么？

分析维度：
1. 信息意图 (Informational) - 想了解概念
2. 导航意图 (Navigational) - 想找特定工具
3. 交易意图 (Transactional) - 想下载/使用

对于 Skill 落地页，用户通常是 混合意图：
- 了解这个 Skill 能做什么 (信息)
- 判断是否适合自己 (评估)
- 下载/复制使用 (交易)
```

**输出**: `user_intent` (informational/transactional/mixed)

### Step 2: 竞品 SERP 分析

**执行**:
```
假设搜索 "{主关键词}" 后，SERP 的竞品通常包含：
- 官方文档
- 教程文章
- 竞品工具页

问自己：
- 我们的 Skill 落地页与这些有何不同？
- 用户为什么选择我们而不是竞品？
```

**输出**: `competitive_gap` (列出 2-3 个差异化机会)

### Step 3: 差异化价值定位 (USP)

**执行**:
```
根据 competitive_gap，确定 USP:

公式: {用户痛点} + {我们的解决方案} + {竞品没有的}

示例:
痛点: "手动配置品牌样式太麻烦"
解决方案: "一句话命令自动应用"
差异化: "4 个预设 + 自定义保存"
→ USP: "Zero-effort brand styling with a single command"
```

**输出**: `usp_statement` (一句话，贯穿所有内容)

### Step 4: 内容层级规划

**执行**:
```
用户浏览路径分析：

首屏 (0-3秒): 我来对地方了吗？ → Hero
快速扫描 (3-10秒): 这能帮我什么？ → Quick Start + Capabilities
深入了解 (10-30秒): 具体怎么用？ → Examples + Presets
决策阶段 (30秒+): 还有什么问题？ → FAQ
行动: 下载/复制 → CTA
```

**输出**: `content_priority` (排序后的模块列表)

---

## 📝 生成步骤

### Step 5: 生成完整 JSON

基于分析结果，生成以下所有字段：

> [!CAUTION]
> **严格类型约束**: 以下 Schema 的类型必须严格遵守，否则前端渲染会崩溃。

```json
{
  // === 基础标识 ===
  "skillId": "brand-guidelines",           // string (SKILL.md 的 name)
  "displayName": "Brand Guidelines",       // string (人类可读展示名称, 见 Step 5.1)
  "skillIcon": "Palette",                  // string (Lucide icon name, 见 Step 5.5)
  
  // === Meta 标签 ===
  "seoTitle": "{Skill Name} - {USP片段} | Antigravity Skills",  // string (30-60 chars)
  "seoDescription": "{痛点}. {解决方案}. {差异化}. {CTA}.",       // string (120-200 chars)
  "seoKeywords": "{verified_keywords}",    // string (逗号分隔)
  
  // === H1 标题 ===
  "h1Title": "{Skill Name}: {USP完整版}",  // string (20-100 chars)
  
  // === Hero 区域 ===
  "heroSection": {
    "headline": "{USP核心信息}",            // string
    "subheadline": "{解决的痛点描述}",       // string
    "cta": {
      "primary": "Download Skill",          // string
      "secondary": "Copy SKILL.md"          // string
    }
  },
  
  // === Quick Start ⚠️ 严格类型 ===
  "quickStart": {
    "title": "Quick Start",                 // string
    "steps": [                              // ⚠️ 必须是 string[] (纯文本数组)
      "Step 1: 纯文本描述",                  // ❌ 禁止: { title, description } 对象
      "Step 2: 纯文本描述",                  // ❌ 禁止: 任何嵌套结构
      "Step 3: 纯文本描述"
    ],
    "exampleCommand": "触发命令示例"         // string (必填!)
  },
  
  // === 核心能力 ===
  "capabilities": [                         // Capability[]
    {
      "icon": "palette",                    // string (Lucide icon name, 小写)
      "title": "能力标题",                   // string
      "description": "从 README What It Does 转换"  // string
    }
  ],
  
  // === 预设展示 (如有) ===
  "presets": [                              // Preset[] | null
    {
      "name": "Anthropic",                  // string
      "colors": ["#1a1a2e", "#f5f5f5"],     // string[]
      "fonts": {"heading": "Poppins", "body": "Lora"},  // { heading, body }
      "bestFor": "AI/Safety content"        // string
    }
  ],
  
  // === 使用示例 ===
  "usageExamples": [                        // UsageExample[]
    {
      "input": "用户输入示例",               // string
      "output": "执行结果描述"              // string
    }
  ],
  
  // === About/Intro ===
  "contentIntro": "{痛点开头}. {Skill 能力描述}. {预设数量}. {差异化}.",  // string (50-300 chars)
  
  // === FAQ Schema ===
  "faqItems": [                             // FaqItem[]
    {
      "question": "基于 usage_examples 或 pain_points 生成",  // string
      "answer": "具体操作步骤 + 结果"        // string
    }
  ],
  
  // === 触发词 ===
  "triggerPhrases": ["从 README When to Use 提取"],  // string[]
  
  // === Visual Tags ===
  "visualTags": ["从 capabilities + keywords 提取"],  // string[]
  
  // === 完整内容 ===
  "skillContent": "SKILL.md 完整内容",      // string
  "readmeContent": "README.md 完整内容"     // string
}
```

> [!TIP]
> **验证交给 Phase 6B.5**: 生成完成后，由 `schema-validator` Agent 负责验证和修复格式错误。
> 本 Agent 只需专注于内容生成，无需自我验证。

### Step 5.1: 生成展示名称 (displayName) ⭐ NEW

**执行**: 基于 `skillId` 生成人类可读的展示名称

**规则**:
1. 将 kebab-case 转为 Title Case
2. 保留缩写词大写: `UI`, `UX`, `API`, `SEO`, `AI`, `ML`, `TDD`, `SQL`, `LLM`, `MCP`
3. 保留特殊格式: `iOS`, `macOS`, `JavaScript`, `TypeScript`
4. 保留复合缩写: `UI/UX`, `AI/ML`

**示例**:

| skillId | displayName |
|---------|-------------|
| `uiux-designer` | `UIUX Designer` |
| `frontend-expert` | `Frontend Expert` |
| `ai-ml-developer` | `AI/ML Developer` |
| `ios-swift-guide` | `iOS Swift Guide` |
| `mcp-builder` | `MCP Builder` |

**输出**: `displayName` (存入 seo-fields.json)

### Step 5.5: 生成 Skill Icon ⭐ v3.7 重写

**执行**: 根据 Skill 的**核心能力和语义**，自主选择一个最合适的 **Emoji** 作为图标

> [!IMPORTANT]
> **必须使用 Emoji！** 不是 Lucide icon，是真正的 Unicode Emoji 字符。
> 
> Agent 必须理解 Skill 的核心功能后，选择最能表达该功能的 emoji。

**选择原则**:
1. **语义准确** - emoji 必须直观表达 Skill 的核心功能
2. **避免通用** - 禁止选 🔧、⚙️、🛠️ 等无意义通用工具图标
3. **差异化** - 同类 Skill 应选择不同 emoji 以便区分
4. **审美优先** - 选择视觉上好看的 emoji

**参考示例** (仅供启发，可选任何 emoji):

| Skill 类型 | 推荐 Emoji 示例 |
|:-----------|:----------------|
| 代码审查 | 🔍 🕵️ 📋 ✅ |
| 前端开发 | 💻 ⚛️ 🖥️ 🎯 |
| UI/UX 设计 | 🎨 🖌️ ✨ 💅 |
| 文档写作 | 📝 📄 ✍️ 📖 |
| 测试自动化 | 🧪 🔬 🧫 ✔️ |
| AI/Agent | 🤖 🧠 💡 ⚡ |
| 数据分析 | 📊 📈 🔢 📉 |
| 安全 | 🔒 🛡️ 🔐 🚨 |

**输出**: `skillIcon` (单个 emoji 字符，如 `🔍`)

---

### Step 6: 字符数验证

| 字段 | 最小 | 最大 | 超限处理 |
|:---|:---|:---|:---|
| seoTitle | 30 | 60 | 截断/扩展 |
| seoDescription | 120 | 200 | 截断/扩展 |
| h1Title | 20 | 100 | 截断/扩展 |
| contentIntro | 50 | 300 | 截断/扩展 |
| **skillIcon** | 2 | 30 | 必须是有效 Lucide icon 名 |

### Step 7: 输出 JSON 文件

写入 `.agent/skills/{name}/seo-fields.json`

---

## GATE 规则

### 结构验证 (硬性要求)
- ❌ **REJECT**: `quickStart.steps` 是 `object[]` 而非 `string[]`
- ❌ **REJECT**: `quickStart.exampleCommand` 缺失或为空
- ❌ **REJECT**: `capabilities` 为空数组
- ❌ **REJECT**: `usageExamples` 为空数组

### 内容验证
- ❌ **REJECT**: 未完成 4 步分析过程
- ❌ **REJECT**: `usp_statement` 为空
- ❌ **REJECT**: 任一必填字段为空
- ⚠️ **WARNING**: `skillIcon` 为空 → 使用 `Wrench` 默认值
- ⚠️ **RETRY**: 字符数不在范围 → 自动修正 (最多 2 次)

### 通过条件
- ✅ **PASS**: 分析完成 + 所有结构验证通过 + 所有字段通过验证

---

## 示例：分析过程输出

```markdown
## SEO 分析报告: brand-guidelines

### 1. 用户意图
- **类型**: Mixed (信息 + 交易)
- **信息需求**: 了解品牌指南工具能做什么
- **交易需求**: 下载/使用一个能自动应用品牌的工具

### 2. 竞品差距
| 竞品类型 | 我们的优势 |
|:---|:---|
| 官方文档 | 我们提供自动化应用 |
| 教程文章 | 我们是即用工具 |
| Canva 等 | 我们零配置、AI 驱动 |

### 3. USP
> "Apply brand styling with a single command. Zero design skills needed."

### 4. 内容优先级
1. Hero (USP)
2. Quick Start (3 步上手)
3. Capabilities (4 大能力)
4. Presets (4 个预设)
5. Examples (2 个用例)
6. FAQ (4 个问题)
```
