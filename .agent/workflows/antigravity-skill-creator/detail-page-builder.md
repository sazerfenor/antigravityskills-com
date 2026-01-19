# Detail Page Builder (详情页构建器)

> **Role**: SEO 专家 + 前端开发
> **Phase**: 6B

## 职责

生成 SEO 友好的 Skill 落地页，包含完整的 SEO 校验和优化。

---

## INPUT

- 能力报告 / 设计规划 (Phase 1)
- README (Phase 5)
- 痛点分析 + 关键词验证 (Phase 6A) **或** fallback_mode=true

---

## OUTPUT

- `src/pages/skills/{name}.astro`
- `src/data/skills/{name}.json` (结构化数据)

---

## 执行步骤

### Step 1: 关键词布局检查 🆕

**必须确保**:
- 主关键词出现在 H1
- 主关键词出现在首段 (前 100 词)
- 主关键词出现在 URL slug

```markdown
## 关键词布局检查

| 位置 | 要求 | 状态 |
|------|------|------|
| H1 | 包含主关键词 | ✅/❌ |
| 首段 | 前 100 词包含主关键词 | ✅/❌ |
| URL | slug 包含主关键词 | ✅/❌ |
| Meta Title | 包含主关键词 | ✅/❌ |
| Meta Description | 包含主关键词 | ✅/❌ |
```

### Step 2: Meta 标签校验 🆕

**强制校验**:
- **Title**: 50-60 字符
- **Description**: 150-160 字符

```markdown
## Meta 标签校验

| 标签 | 内容 | 字符数 | 状态 |
|------|------|-------|------|
| Title | {title} | {count} | ✅ 50-60 / ❌ 超限 |
| Description | {desc} | {count} | ✅ 150-160 / ❌ 超限 |
```

**如超限**:
- 自动截断并优化
- 保留主关键词

### Step 3: Schema Markup 生成

**必须包含**:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{Skill Name}",
  "description": "{validated description}",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "Antigravity Skills"
  }
}
```

### Step 4: FAQ Schema 生成 🆕

基于痛点生成 FAQ (如有痛点分析):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{痛点问题}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Skill 如何解决} (40-60 词)"
      }
    }
  ]
}
```

**FAQ 生成规则**:
- 每个痛点转化为一个 FAQ
- 答案控制在 40-60 词
- 答案首句包含主关键词

---

## Fallback 模式处理

```
如果 fallback_mode = true:
  → 使用 README 中的 "When to Use" 作为痛点描述
  → 使用 SKILL.md description 作为 SEO description
  → Hero 文案使用通用模板
  → 跳过 FAQ Schema (无痛点数据)
  → 验证 Meta 字符数后生成
```

---

## SEO 元素

### Meta Tags

```html
<title>{Skill Name} - Antigravity Skill | {category}</title>
<!-- 校验: 50-60 字符 -->

<meta name="description" content="{pain-optimized description}">
<!-- 校验: 150-160 字符 -->

<meta name="keywords" content="{verified_keywords}">
<link rel="canonical" href="https://antigravityskills.com/skills/{name}">
```

### SEO 最佳实践检查清单 🆕

- [ ] Title 包含主关键词且 50-60 字符
- [ ] Description 包含主关键词且 150-160 字符
- [ ] H1 包含主关键词且全页唯一
- [ ] URL slug 是 kebab-case 且包含主关键词
- [ ] 有 canonical URL
- [ ] 有 SoftwareApplication Schema
- [ ] 有 FAQ Schema (如有痛点)

---

## 落地页结构

### 1. Hero Section

**有痛点分析时**:
```markdown
# {一句话痛点共鸣} ← 必须包含主关键词

{解决方案描述，首段必须包含主关键词}

[Get Started] [View on GitHub]
```

**Fallback 模式**:
```markdown
# {Skill Title} ← 直接使用 Skill 名称

{description from SKILL.md}

[Get Started] [View on GitHub]
```

### 2. Features Section

```markdown
## What It Does ← 建议 H2 包含主关键词变体

- ✨ **{能力 1}**: {描述} → 解决 {痛点 1}
- ✨ **{能力 2}**: {描述} → 解决 {痛点 2}
```

### 3. How It Works

```markdown
## How to Use {Skill Name} ← H2 包含品牌词

1. {Step 1}
2. {Step 2}
3. {Step 3}
```

### 4. FAQ Section (仅有痛点分析时) 🆕

```markdown
## Frequently Asked Questions

### {痛点问题 1}?
{40-60 词答案，首句包含主关键词}

### {痛点问题 2}?
{40-60 词答案}
```

### 5. Testimonials (仅有痛点分析时)

```markdown
## Real User Problems We Solve

> "{Reddit quote}"
> — r/{subreddit} user
```

### 6. CTA Section

```markdown
## Ready to Get Started with {Skill Name}?

[Install Now] [Read Documentation]
```

---

## 输出模板 (Astro)

```astro
---
import Layout from '../../layouts/Layout.astro';
import { skillData } from '../../data/skills/{name}.json';

// SEO 校验
const title = `${skillData.name} - Antigravity Skill`;
const description = skillData.seoDescription;

// 字符数校验
if (title.length < 50 || title.length > 60) {
  console.warn(`Title length: ${title.length}, should be 50-60`);
}
if (description.length < 150 || description.length > 160) {
  console.warn(`Description length: ${description.length}, should be 150-160`);
}
---

<Layout title={title} description={description}>
  <script type="application/ld+json" set:html={JSON.stringify(skillData.schema)} />
  
  <main>
    <!-- Hero with H1 containing keyword -->
    <section class="hero">
      <h1>{skillData.headline}</h1>
      <p>{skillData.subheadline}</p>
    </section>

    <!-- Features -->
    <section class="features">
      <h2>What {skillData.name} Does</h2>
      <!-- ... -->
    </section>

    <!-- FAQ with Schema (conditional) -->
    {skillData.faq && (
      <section class="faq">
        <h2>Frequently Asked Questions</h2>
        {skillData.faq.map(item => (
          <details>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
    )}

    <!-- CTA -->
    <section class="cta">
      <h2>Ready to Get Started with {skillData.name}?</h2>
      <a href="#install">Install Now</a>
    </section>
  </main>
</Layout>
```

---

## GATE 规则

- ❌ **REJECT**: 如果 README 不存在
- ❌ **REJECT**: 如果 Meta Title > 70 字符 (严重超限)
- ⚠️ **WARNING**: 如果 Meta 字符数不在最佳范围
- ✅ **PASS**: 完成落地页生成 + SEO 校验通过
