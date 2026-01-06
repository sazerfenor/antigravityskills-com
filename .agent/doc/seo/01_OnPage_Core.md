# 01_OnPage_Core

> **SEO Agent 说明**：当问题是「BananaPrompts 的单个页面应该长成什么样」时优先使用本篇（结构、意图匹配、URL、Schema、基础内链位等）。
> 

# On-Page 作战地图：高排名页面的构建蓝图

**(Based on 190+ Source Documents)**

本篇聚焦「On-Page 建设」，将网页视为一个**工程系统**，而非单纯的文字堆砌。目标是为 SaaS / 工具类站点提供一套可直接落地的 On-Page 标准：从搜索意图解析 → 页面结构 → 技术实现 → 写作模板 → 执行 SOP 与检查清单。

---

## 一、搜索引擎理解逻辑 (Understanding Layer)

### 1. 意图匹配 (Search Intent) 的工程化拆解

关键词不是独立的字符串，而是用户需求的标签。构建页面前，必须基于 SERP 做 3C 分析：

- **Content Type (内容类型)**
    - **SaaS 关键区分**：
        - 搜 "Backlink Checker"，若首页几乎全是工具页 (Tools)，写 "What is a backlink checker" 的博客基本无法排上来，必须提供 **工具页 / 功能 Landing Page**。
        - 搜 "Best CRM" 时，SERP 通常是测评类 Listicle，而非某个 CRM 的产品主页。
    - 规则：**不要用产品主页硬打 "Best" 类商业意图词**，而是用列表文 / 评测文承接。
- **Content Format (内容格式)**
    - "How to..." → Step-by-step Guide（步骤教程）。
    - "Best..." → Listicle（工具/方案列表）。
    - "What is..." → Definition/Wiki 风格，适配 Snippet。
    - "Calculator / Checker / Generator" → 工具页 / 交互页。
- **Content Angle (切入角度)**
    - 审查 SERP 中反复出现的钩子：如 "Free"、"For Beginners"、"For Agencies"、"2025 Updated"。
    - 提炼出：
        - **共同点** = 你页面必须覆盖的基础角度。
        - **差异点** = 你页面的独特 USP（例如 "For Startups"、"Privacy-first"）。

### 2. 实体 (Entities) 与语义相关性

Google 更关注实体与语义网络，而非单纯关键词密度。

- **Co-occurrence (共现)**
    - 写 "SaaS Marketing" 时，若完全不提 "Churn rate"、"CAC" 等高相关实体，页面会被视为不完整。
    - On-Page 实践：通过工具做 **Content Gap / NLP 相关词** 分析，在正文与小标题中自然覆盖关键实体。
- **覆盖深度 (Subtopics)**
    - 排名前列的页面往往系统性覆盖了主题下的主流子话题。
    - On-Page 要求：为核心主题列出 5–10 个必须覆盖的子话题，在 H2/H3 层级中铺开。

### 3. SaaS 场景下的 E-E-A-T 信号

对于 SaaS（非典型 YMYL），信任度主要来自：

- **Experience（经验）**
    - 在文中展示："我们在 X 客户身上的真实实践"、"我们踩过的坑"、"内部数据截图"。
    - 对应 On-Page：正文中加入案例段落、图表、流程截图，而非纯理论堆砌。
- **Expertise（专业性）**
    - 作者署名页：职业背景、领域经验、LinkedIn 链接。
    - 对应 On-Page：
        - 文章非 "Admin" 发布。
        - 页内或页尾有「作者介绍」模块。
- **Trustworthiness（可信度）**
    - 公司地址、隐私政策、价格透明度、客户 Logo、第三方评测引用。
    - 对应 On-Page：在关键商业页面中加上信任组件（Trust Badges、证书、第三方评分）。

---

## 二、On-Page 战术板块：结构与布局 (Tactical Layer)

### 1. 板块 A：关键词情报 (Keyword Intelligence)

- **Keyword Gap (机会挖掘)**
    - 用 Ahrefs / Semrush 做 Gap：找出「竞品有排名、本站无排名」的词。
    - On-Page 作用：反向设计新页面与现有页面的拓展段落。
- **KD 与长尾策略**
    - KD 本质是外链与竞争强度的近似估算。
    - 新站 / 弱站优先：KD < 20–30 的长尾词。
    - SaaS 高价值长尾：
        - "[竞品] alternatives"、"[竞品] vs [竞品]" → 适合对比页 / 替代方案页。
        - "[核心软件] integration" → 适合集成功能页。
- **Zero-Click 风险管理**
    - 定义类 / 简单事实类词，易被 Snippet 或 AI Overview 完全吃掉。
    - On-Page 策略：
        - 避免只做纯定义页，而是将定义嵌入更深的 **行动型内容**（教程、流程、工具）。
        - 若必须做定义页，则刻意设计 **Snippet Bait** 段落（见后文模板 B）。

### 2. 板块 B：页面解剖学 (Anatomy of a Perfect SaaS Page)

### (1) Title Tag 规范

- 长度：50–60 字符（约 600px），防止被截断。
- 关键词：前置核心关键词，避免堆砌多个不同主关键词。
- CTR 提升技巧：标题中合理使用数字、年份、括号：如 "[2025 Guide]"、"(Free & Paid)"。

**高转化 Title 公式库**：

1. 列表 + 数字 + 括号
    
    `[Number] Best [Keyword] for [Year] (Free & Paid)`
    
2. 指南 + 受众
    
    `[Keyword]: The Definitive Guide for [Audience]`
    
3. 问题 + 回答承诺
    
    `What is [Keyword]? [Benefit/Answer]`
    
4. 速度 / 效率
    
    `How to [Action] in [Timeframe] (Step-by-Step)`
    

> On-Page 注意：每个页面只绑定一个主关键词，避免在 Title 里堆满变体。
> 

### (2) H1 与首屏内容

- 页面必须有且仅有一个 H1，通常包含核心关键词。
- H1 与 Title 高度相关但可非完全一致（Title 面向 SERP，H1 面向用户阅读）。

**前 100 词法则**：

- 在页面前 100–150 个单词中，自然出现主关键词及 1–2 个核心相关实体。
- 首段完成三件事：
    1. 明确告诉读者 "你来对了地方"。
    2. 总结这篇内容将交付的结果或价值。
    3. 植入核心关键词。

示例（针对关键词 "Link Building"）略，执行时按以上规则生成即可。

### (3) 图片与多媒体优化

- 文件名：语义化命名，如 `saas-dashboard-example.png`。
- Alt 文本：
    - 描述图片内容，而非机械堆关键词。
    - 可自然包含一次关键词或实体。
- 样例：仪表盘截图、流程示意图，既服务用户，也增强实体信号。

### 3. 板块 C：站点架构与内部链接 (Site Structure & Internal Linking)

### (1) Topic Cluster 结构

- **Pillar Page (柱子页)**：覆盖宽泛主题，如 "Email Marketing"。
- **Cluster Content (簇内容)**：针对长尾子话题，如 "Best Email Subject Lines"、"Email Marketing for SaaS"。

内部链接规则：

- Pillar → Cluster：Pillar 正文或目录模块中显式列出全部 Cluster 页链接。
- Cluster → Pillar：每个 Cluster 在前 1–2 屏就链接回对应 Pillar。
- Cluster ↔ Cluster：同主题下的相关文章间，适度互链。

### (2) 内链锚文本规范

- 推荐：
    - 描述性 + 关键词丰富锚文本，如 "SaaS churn 计算公式"。
    - 在自然语境中嵌入，而非突兀插入。
- 禁止：
    - "点击这里"、"查看更多" 等空洞锚文本。
    - 所有内链都使用一模一样的精确匹配关键词（易被视为过度优化）。
    - 单段中过多链接稀释权重。

---

## 三、On-Page 技术代码库 (Technical Layer · SaaS Edition)

以下内容为硬资产，禁止删除，只允许位置微调与轻微措辞修改。

### 1. 结构化数据 Schema 模板 (JSON-LD)

> 部署位置：`<head>` 或 `<body>` 中的 `<script type="application/ld+json">` 块。
> 

### 1.1 Organization Schema（用于首页）

```
<script type="application/ld+json">
{
  "@context": "[https://schema.org](https://schema.org)",
  "@type": "Organization",
  "name": "YourSaaSName",
  "url": "[https://www.yoursaas.com](https://www.yoursaas.com)",
  "logo": "[https://www.yoursaas.com/logo.png](https://www.yoursaas.com/logo.png)",
  "sameAs": [
    "[https://www.facebook.com/yoursaas](https://www.facebook.com/yoursaas)",
    "[https://twitter.com/yoursaas](https://twitter.com/yoursaas)",
    "[https://www.linkedin.com/company/yoursaas](https://www.linkedin.com/company/yoursaas)"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-555-555-5555",
    "contactType": "customer service",
    "areaServed": ["US", "CA", "GB"],
    "availableLanguage": "en"
  }
}
</script>
```

### 1.2 Product Schema（用于定价页 / 功能落地页）

```
<script type="application/ld+json">
{
  "@context": "[https://schema.org/](https://schema.org/)",
  "@type": "Product",
  "name": "SaaS Tool Name",
  "image": "[https://www.yoursaas.com/product-image.jpg](https://www.yoursaas.com/product-image.jpg)",
  "description": "Enterprise-grade SEO automation platform for agencies.",
  "brand": {
    "@type": "Brand",
    "name": "YourSaaSName"
  },
  "offers": {
    "@type": "Offer",
    "url": "[https://www.yoursaas.com/pricing](https://www.yoursaas.com/pricing)",
    "priceCurrency": "USD",
    "price": "99.00",
    "priceValidUntil": "2025-12-31",
    "availability": "[https://schema.org/InStock](https://schema.org/InStock)"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "1250"
  }
}
</script>
```

### 1.3 Article / BlogPosting Schema（用于博客文章）

```
<script type="application/ld+json">
{
  "@context": "[https://schema.org](https://schema.org)",
  "@type": "BlogPosting",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "[https://www.yoursaas.com/blog/topic-slug](https://www.yoursaas.com/blog/topic-slug)"
  },
  "headline": "Target Keyword: The Comprehensive Guide",
  "image": [
    "[https://www.yoursaas.com/blog/images/hero-1x1.jpg](https://www.yoursaas.com/blog/images/hero-1x1.jpg)",
    "[https://www.yoursaas.com/blog/images/hero-16x9.jpg](https://www.yoursaas.com/blog/images/hero-16x9.jpg)"
   ],
  "datePublished": "2024-05-10T08:00:00+08:00",
  "dateModified": "2025-01-12T09:20:00+08:00",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "[https://www.yoursaas.com/author/profile](https://www.yoursaas.com/author/profile)"
  },
  "publisher": {
    "@type": "Organization",
    "name": "YourSaaSName",
    "logo": {
      "@type": "ImageObject",
      "url": "[https://www.yoursaas.com/logo.png](https://www.yoursaas.com/logo.png)"
    }
  }
}
</script>
```

### 1.4 FAQPage Schema（用于功能页 / 定价页底部 FAQ）

```
<script type="application/ld+json">
{
  "@context": "[https://schema.org](https://schema.org)",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Does your tool integrate with Slack?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Yes, we offer native integration with Slack, Microsoft Teams, and Zoom."
    }
  }, {
    "@type": "Question",
    "name": "Is there a free trial?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "We offer a 14-day free trial on all plans. No credit card required."
    }
  }]
}
</script>
```

---

### 2. HTML 标签与索引控制规范

### 2.1 Canonical 标签 (权威链接)

**规则**：使用绝对 URL，自引用为默认策略。

- 场景 A：标准内容页（防止 `?utm=` 等参数导致重复）

```
<!-- 在页面 [https://www.yoursaas.com/features/reporting](https://www.yoursaas.com/features/reporting) 上 -->
<link rel="canonical" href="[https://www.yoursaas.com/features/reporting](https://www.yoursaas.com/features/reporting)" />
```

- 场景 B：带排序 / 过滤的列表页（如模板库、集成列表）

```
<!-- 当前页面: [https://www.yoursaas.com/templates?sort=popular&category=marketing](https://www.yoursaas.com/templates?sort=popular&category=marketing) -->
<!-- Canonical 应指向: -->
<link rel="canonical" href="[https://www.yoursaas.com/templates](https://www.yoursaas.com/templates)" />
```

### 2.2 Meta Robots（索引与抓取控制）

典型 noindex 页面：

- 登录页 (Login)
- 注册页 (Sign-up)
- 内部搜索结果页
- 付款成功 / 谢谢页 (Thank You Page)

示例：

```
<meta name="robots" content="noindex, follow">
```

说明：`noindex` 阻止页面进入索引，`follow` 允许继续抓取页面上的链接。

---

### 3. URL 构造工程 (URL Construction)

### 3.1 层级与路径

- SaaS 功能页：
    - ✅ [`example.com/features/keyword-research`](http://example.com/features/keyword-research)
    - ❌ [`example.com/products/software/tools/keyword-research`](http://example.com/products/software/tools/keyword-research)
- 博客文章：
    - ✅ [`example.com/blog/seo-guide`](http://example.com/blog/seo-guide)
    - ✅ [`example.com/blog/seo/guide`](http://example.com/blog/seo/guide)（内容量巨大时再分目录）
    - ❌ [`example.com/blog/2025/10/24/category/seo-guide-for-beginners`](http://example.com/blog/2025/10/24/category/seo-guide-for-beginners)

### 3.2 命名规则

1. 分隔符：仅使用连字符 `-`，禁止下划线 `_`。
2. 大小写：统一小写。
3. 关键词：保留核心语义词，剔除虚词，如 `a/the/and/for`。

示例：

- 标题："The Ultimate Guide to Project Management for Enterprise"
- URL Slug：`/project-management-enterprise`

---

## 四、内容架构与写作模组 (Content Layer · SaaS SEO)

### 1. 3C 模型执行 SOP

> 目标：在动笔之前，通过 SERP 逆向推导页面形态与信息架构。
> 

**执行步骤**：

1. 在隐身模式中搜索目标关键词（如 "CRM software"、"how to track keywords"）。
2. 扫描 Top 3–5 个自然排名结果，记录：
    - C1：内容类型（产品页 / 博客 / 工具 / 对比页）。
    - C2：内容格式（How-to、Listicle、Comparison、Tool）。
    - C3：内容切入角度（Free、For SMB、2025 Updated 等）。
3. 基于 3C 结果，决定：
    - 本页是写 **工具 / 产品页**，还是 **文章**？
    - 是做 **列表**、**指南** 还是 **对比**？
    - 标题和首屏如何嵌入主流 Angle + 自身 USP？

### 2. SaaS 写作 HTML 骨架模板

### 模板 A：SaaS 工具列表文 (Best Tools Listicle)

> 适用："Best X for Y" 等商业意图关键词。
> 

```
# H1: [Number] Best [Tool Category] for [Target Audience] in [Year]

## Intro
* Hook：痛点陈述 (APP: Agree, Promise, Preview)。
* Trust：为什么信我们？(测试了多少工具 / 作者背景)。
* Filter：这篇文章适合谁 (SaaS / Enterprise / Agencies)。
* Table of Contents：跳转目录。

## H2: [Your Tool Name] （如果是自家产品，可优先排在前面）
* Screenshot：界面截图。
* The Pitch：为什么它是同类中最适合的？
* Key Features：功能要点列表。
* Pricing：清晰标明价格或区间。
* CTA Button："Try for Free"。

## H2: [Competitor Tool Name]
* What is it：一句话定义。
* Best for：[Use Case] (如 Best for Enterprise)。
* H3: Pros & Cons：优劣列表或表格。
* H3: Key Features：关键功能。
* H3: Pricing：大致价格层级。

## H2: How to Choose the Right [Tool Category]
* 重点考虑因素：价格、集成、学习成本、支持等。

## Conclusion
* Summary Table：汇总对比表。
* Final Recommendation：最终推荐。
* CTA：引导试用或 Demo。
```

### 模板 B：定义 / Wiki 型页面 (Expanded Definition)

> 适用："What is X"、概念类信息意图；可用作 Snippet Bait。
> 

```
# H1: What is [Concept]? [Optional: Definition + Examples]

## Intro
* Hook：说明这个概念为什么对业务重要。

## H2: What is [Concept]? （Snippet Bait）
* <p> 段落 40–60 词，直接给出客观定义："X is Y that..."。

## H2: Why is [Concept] Important?
* 2–4 条业务收益点。

## H2: Types of [Concept] / Examples of [Concept]
* 使用无序 / 有序列表，让 Google 便于提取。

## H2: How to Calculate/Execute [Concept]
* 步骤式说明（Step-by-step）。

## Conclusion
* 链接到更进阶的指南或功能页（内部链接）。
```

---

## 五、AI 辅助写作与人工编辑 SOP (AI Workflow Layer)

> 目标：利用 AI 提升效率，同时通过人工确保 E-E-A-T 与信息增益。
> 

### 1. AI + Human 协同流程

```
graph TD
    Start[AI 阶段: 初稿生成] --> A[生成大纲/初稿]
    A --> B[人类介入]

    B --> C{E-E-A-T 检查}
    C -->|Experience| D[添加第一人称故事/内部数据]
    C -->|Expertise| E[加入专家观点/权威引用]
    C -->|Trust| F[核实事实/去除幻觉]

    D & E & F --> G[优化语气与结构]
    G --> End[发布]
```

### 2. AI 内容编辑检查清单

- **AI 负责**：
    - 标题 / 小标题头脑风暴。
    - 定义段落、背景解释、摘要等基础内容。
- **人工负责**：
    - Experience：
        - [ ]  是否加入 "我/我们" 的真实使用经历？
        - [ ]  是否有截图、图表、视频等不可伪造证据？
        - [ ]  是否包含失败案例与反思？
    - Expertise：
        - [ ]  是否引用内部专家 / 行业权威的观点？
        - [ ]  是否链接到原始研究 / 数据源？
    - Originality / Information Gain：
        - [ ]  是否提供竞品文章未覆盖的独特视角或数据？
        - [ ]  是否删除了 AI 生成的空话、重复与陈词滥调？
    - Fact Check：
        - [ ]  统计数字、年份、实体关系是否经过人工验证？

---

## 六、On-Page 冲突认知与常见误区 (Conflict Radar)

### 1. 字数是否是排名因素？

- 结论：字数**本身不是**直接排名信号。
- On-Page 要求：页面长度由「需要覆盖的子话题数量」决定，而不是反过来为了凑字而加水。

### 2. 关键词密度是否重要？

- 传统意义上的 "3% 关键词密度" 已过时。
- 应关注：
    - 关键词出现的关键位置（Title、H1、前 100 词、小标题）。
    - 与主题高度相关的实体与变体是否覆盖完整。

### 3. AI 内容是否会被惩罚？

- 搜索引擎惩罚的是 **低质量内容**，而非 "是否由 AI 生成"。
- On-Page 侧重：
    - 页面是否满足搜索意图？
    - 是否提供信息增益？
    - 是否具备可验证的经验与数据？

### 4. Meta Description 的作用

- 不直接作为排名因子，但会影响 CTR。
- 即使 Google 经常重写，只要：
    - 描述与页面内容高度吻合。
    - 包含关键词与明确承诺（例如收益、对象、年份）。
    - 用户更可能点击你的结果，从而间接提升表现。

## 七、On-Page 执行检查清单 (Execution Checklist)

### 1. URL & 技术层

- [ ]  URL 简短、全小写、使用连字符，包含主关键词。
- [ ]  重要页面距离首页点击 ≤ 3 次。
- [ ]  存在自引用 Canonical 标签，参数页 Canonical 指向主页。
- [ ]  适当页面设置 `noindex, follow`（登录、搜索、谢谢页等）。
- [ ]  页面配置了至少 1 类合适的 Schema（Organization / Product / Article / FAQPage）。

### 2. 内容与结构层

- [ ]  已基于 3C 模型明确该页的 **Page Type & Format**。
- [ ]  Title 控制在 50–60 字符，并使用高转化公式之一。
- [ ]  存在唯一 H1，且与 Title 在语义上高度一致。
- [ ]  目标关键词在前 100–150 词内自然出现。
- [ ]  结构清晰，最多使用到 H3 层级，无杂乱嵌套。
- [ ]  涵盖了该主题下至少 5–10 个核心子话题。

### 3. 内链与体验层

- [ ]  文中包含 2–3 个指向站内高相关页面的上下文内链。
- [ ]  使用描述性、关键词自然融入的锚文本，而非 "点击这里"。
- [ ]  视情况添加 1–2 个权威外链（原始研究、标准文档等）。
- [ ]  移动端可读性良好：字体大小、行高、无遮挡正文的弹窗。

### 4. E-E-A-T 与 AI 协作层

- [ ]  页面包含作者信息或企业背书模块。
- [ ]  至少有 1–2 段来自实际经验的故事 / 案例 / 数据。
- [ ]  AI 生成内容已通过人工进行事实核查与去水化处理。

> 本段为来自后续文档《06_Tech_Infra》的向前增补内容：补充了针对 SaaS 技术基建层的 SSR/爬取预算/状态码等更工程化的实施细节，可作为本篇 On-Page 规范在 Technical Infrastructure 侧的配套执行手册。
> 

> 用于发布前核对单页是否达到 On-Page 基线标准。
> 

### 1. URL & 技术层

- [ ]  URL 简短、全小写、使用连字符，包含主关键词。
- [ ]  重要页面距离首页点击 ≤ 3 次。
- [ ]  存在自引用 Canonical 标签，参数页 Canonical 指向主页。
- [ ]  适当页面设置 `noindex, follow`（登录、搜索、谢谢页等）。
- [ ]  页面配置了至少 1 类合适的 Schema（Organization / Product / Article / FAQPage）。

### 2. 内容与结构层

- [ ]  已基于 3C 模型明确该页的 **Page Type & Format**。
- [ ]  Title 控制在 50–60 字符，并使用高转化公式之一。
- [ ]  存在唯一 H1，且与 Title 在语义上高度一致。
- [ ]  目标关键词在前 100–150 词内自然出现。
- [ ]  结构清晰，最多使用到 H3 层级，无杂乱嵌套。
- [ ]  涵盖了该主题下至少 5–10 个核心子话题。

### 3. 内链与体验层

- [ ]  文中包含 2–3 个指向站内高相关页面的上下文内链。
- [ ]  使用描述性、关键词自然融入的锚文本，而非 "点击这里"。
- [ ]  视情况添加 1–2 个权威外链（原始研究、标准文档等）。
- [ ]  移动端可读性良好：字体大小、行高、无遮挡正文的弹窗。

### 4. E-E-A-T 与 AI 协作层

- [ ]  页面包含作者信息或企业背书模块。
- [ ]  至少有 1–2 段来自实际经验的故事 / 案例 / 数据。
- [ ]  AI 生成内容已通过人工进行事实核查与去水化处理。

---