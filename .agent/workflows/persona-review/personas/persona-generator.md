---
description: 动态生成第六人设 - 针对当前项目的垂直领域专家
tools: WebSearch, WebFetch
argument-hint: [产品名称，目标用户群描述]
---

# Dynamic Persona Generator (第六人)

> **用途**: 为当前项目生成一个 **垂直领域专家** Persona，补充通用 5 人组的盲区。
> **触发**: 在 `/1-prd-review` 流程中，当发现 5 个通用人设无法覆盖特定垂类需求时使用。

---

## 输入参数

请提供以下信息以生成定制化人设：

1. **产品名称**: (例: "AI 图片生成工具")
2. **核心目标用户**: (例: "专业设计师 / 电商运营 / 自媒体创作者")
3. **用户的关键痛点**: (例: "风格一致性、批量生成效率、版权问题")
4. **用户的专业背景**: (例: "有 5 年设计经验，熟悉 Figma/PS")

---

## 生成流程

### Step 1: 市场调研 (Mandatory WebSearch)

**执行**:
1. 搜索 "[产品领域] 用户痛点 [Current Year]"
2. 搜索 "[竞品名称] 用户评价 Reddit/ProductHunt"
3. 识别真实用户的:
   - 高频抱怨点
   - 未满足需求
   - 专业术语和行话

### Step 2: Persona 定义

基于调研结果，生成以下结构：

```markdown
## 1. Persona Definition

- **Name**: [生成一个代表性名字]
- **Profile**: [年龄]-year-old [职业] in [地区]. [一句话背景]
- **Psychology**: [核心动机和行为模式]
- **Triggers**: [会导致离开/不满的因素]
- **Voice**: [说话风格示例]
- **Domain Expertise**: [专业知识领域]

## 2. Domain-Specific Concerns

- **专业痛点 1**: [具体描述]
- **专业痛点 2**: [具体描述]
- **期望的专业功能**: [列表]

## 3. Acceptance Criteria (验收标准)

- [ ] 产品是否解决了 [痛点1]?
- [ ] 产品是否符合 [行业标准]?
- [ ] 产品是否能与 [常用工具] 集成?
```

---

## 输出格式

生成的 Persona 应保存为:
`artifacts/{feature-name}/custom_persona.md`

并在 `/1-prd-review` 的 Step 3.1 中与通用 5 人一起调用。

---

## 示例: AI 图片生成工具

**输入**:
- 产品: "AI 艺术工作室"
- 用户: "自由插画师"
- 痛点: "风格一致性、商用授权、与 Procreate 集成"

**生成的 Persona**:

```markdown
## 1. Persona Definition

- **Name**: Alex
- **Profile**: 32-year-old Freelance Illustrator in Portland. Creates art for indie games and book covers.
- **Psychology**: Values creative control. Sees AI as a tool, not a replacement. Needs outputs that match their distinct style.
- **Triggers**: Generic "AI art" look, unclear copyright, no support for layers/PSD export.
- **Voice**: "Can I fine-tune the style?" "Who owns the output?"
- **Domain Expertise**: Digital illustration, character design, color theory, print production.

## 2. Domain-Specific Concerns

- **Style Consistency**: Can the AI replicate MY style across multiple outputs?
- **Copyright Clarity**: Who owns the generated image? Can I sell it commercially?
- **Workflow Integration**: Can I export to PSD with layers? Does it work with Procreate?

## 3. Acceptance Criteria

- [ ] Supports style transfer/fine-tuning with my own artworks
- [ ] Clear commercial usage license
- [ ] Exports to PSD/layered formats
- [ ] No watermarks on paid tier

## 4. Browser Exploration Protocol

### 探索行为
[基于这个垂直领域专家的专业背景，定义他们会如何探索一个新产品]
- 他们会先看什么？
- 他们会寻找什么功能/术语？
- 他们的耐心阈值是多少？

### 动态输入生成规则
[基于专业领域，定义他们会如何表达需求]
- 会使用什么专业术语？
- 需求的复杂度如何？
- 有什么特殊的格式要求？

### 评估视角
[基于专业痛点，定义他们会关注什么]
- 专业功能是否到位？
- 是否符合行业标准？
- 能否与他们的工具链集成？
```

---

**Version**: 1.0 | **Created**: 2025-12-21
