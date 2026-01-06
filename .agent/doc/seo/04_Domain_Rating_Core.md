# 04_Domain_Rating_Core

> **SEO Agent 说明**：当问题是「BananaPro 需要通过外链和 Digital PR 提升整体权威/DR」时调用本篇。本篇负责 Link Bait、外联战术和如何让外链真实输血到 Money Pages。
> 

# 04_Domain_Rating｜SaaS Domain Rating 增长作战地图

> 本文是 SEO Agent 知识库中围绕「Domain Rating 增长」的单点收敛文档，面向 SaaS / 工具类站点。所有内容均围绕「如何系统性提升站点 DR / Authority Score，并让这些权重真实服务业务增长」展开。与 On-Page（《01_CORE_[On-Page.md](http://On-Page.md)》）、GEO / AI 可见性（《02_CORE_GEO_[AI.md](http://AI.md)》）、Internal Linking（《03_CORE_Internal_Linking》）等主题的交叉内容，只在对 DR 增长有直接作用时保留，其余已在文末「汇总区」登记来源并弱化/删除。
> 

---

## 一、Domain Rating 增长的底层逻辑

### 1. DR 是「链接质量与结构」的综合指标

- 第三方工具（Ahrefs DR、Semrush Authority Score 等）本质上是在近似估算：
    - 你的网站从多少不同域名获得链接（Referring Domains 数量）。
    - 这些域名自身的权重和可信度。
    - 链接在页面中的位置与上下文（是否为正文上下文链接）。
    - 链接图谱的自然度（锚文本、nofollow 比例、链接速度等）。
- **关键认识**：
    - DR 高并不自动等于排名好，但**没有扎实的 DR 基础，很难在中高竞争词上稳定拿到 Top 位置**。
    - DR 增长必须与 **相关性 (Relevance)** 和 **可转化流量** 同步规划，避免「只涨分，不涨业务」。

### 2. 相关性优先于纯权重

- **TrustRank 视角**：Google 更信任「种子站点」及与之距离较近的网站。链接层级越少，信任传导越强。
- 对于 SaaS：
    - 与你所在垂直领域高度相关的行业媒体、垂直博客、开发者社区，是优先争取的外链来源。
    - **一个来自高相关行业媒体的 DR50 链接，往往比多个无关目录站 DR70 链接更有价值。**
- **链接位置 (Placement)**：
    - 正文内容中的上下文链接（Contextual Link）权重最高，且更容易被 LLM / RAG 当作「推荐依据」。
    - 页脚 / 侧边栏 / 链接墙式的 Blogroll 权重明显更低，只适合作为补充，而不是主战场。

### 3. 安全的链接速度与配置

- 观测数据表明：
    - 排名靠前的页面，其外链增长速度大致在每月 **+5% ~ +14.5%** 区间，被视为相对自然的增长曲线。
    - 新站或弱站在短时间内爆发式获得大量低质外链，容易触发 SpamBrain 等反垃圾系统关注。
- **安全策略**：
    - 以「季度级」规划链接获取目标，而非某一两周的暴冲。
    - 平衡 dofollow / nofollow、品牌词 / 部分匹配锚文本，保持链接图谱自然。
    - 把资源更多投入到**可复用、可复利的外链资产**（Link Bait 与免费工具），而不是一次性买链。

---

## 二、SaaS DR 增长的四大战场

> 从「获取什么样的链接」到「如何可持续造血」，本节是 DR 增长的战术分解层。
> 

### A. 被动引流：Link Bait 资产矩阵

Link Bait 是 DR 增长的**核心引擎**：你创建的资产足够好，其他作者和记者就「不得不」引用你。

### 1. 数据统计页 (Statistics Pages)

**目标**：成为某一领域「数据引用」的源头页面。

- 典型关键词：`[Year] [Industry] Statistics`，如 `"57 SEO Statistics for 2025"`。
- 适用场景：记者写稿、博主写长文时需要快速引用数据。

**页面骨架：**

- **H1 标题**：`[年份] [行业] Statistics: [核心结论/数据]`
- **作者与更新时间**：显眼展示 `Last Updated`，偏好当前年份。
- **摘要区 (Key Takeaways Box)**：
    - 放在首屏（fold 上方）。
    - 用 5–10 条项目符号列出最有可能被引用的「Crunchy Stats」。
- **目录导航 (Jump Links)**：
    - 按主题分组，如 "Usage Stats"、"Revenue Stats"、"Demographics" 等。
- **数据主体 (Data Body)**：
    - 每条数据包含：**结论句 + 简短解释 + 数据来源**。
    - 核心数据尽量配图（Chart / Graph），提升被引用概率。
- **引用工具 (Citation Widget，可选)**：
    - 在每条关键数据旁放置 "Copy Stat" / "Tweet this" 按钮，自动附带 `Source: [Brand]`。

**执行 Checklist：**

- [ ]  标题与正文中包含当前年份，满足「新鲜度偏好」。
- [ ]  每季度审查并替换过时数据，而不仅仅修改日期。
- [ ]  每条数据都可以追溯到权威原始来源。
- [ ]  含有图表的章节，图像数据**同时以文本或 `<table>` 形式给出**，方便 LLM 抽取。

### 2. 免费工具 (Free Tools)

**目标**：用可用性和产品力换取高质量外链与品牌曝光。

- 典型关键词：`[Keyword] Calculator / Generator / Checker / Template`。
- 特别适合 SaaS，因为你有能力让工具和付费产品相互联动。

**页面骨架：**

- **H1 标题**：`[功能名称] Tool`（例如 "Free Backlink Checker"）。
- **工具交互区**：
    - 无需注册即可体验核心功能，或提供部分免费数据。
    - 结果页自然展示 "Sign up for Pro" / "Get more data" CTA。
- **使用指南 (How-to)**：
    - 工具下方提供 500+ 字说明：如何使用、概念解释、实际场景。
- **嵌入代码区 (Embed Code Section)**：
    - 给出一段 HTML 代码，方便其他网站嵌入你的工具或结果图表。
    - 代码中包含指向工具页的 Attribution Link。
    - 若是 Widget 自动批量生成链接，建议使用 `rel="nofollow"` 降低风险；若是作者主动引用的图表或结果页，正常 dofollow 归因更自然。

**执行 Checklist：**

- [ ]  工具解决真实痛点，比竞品更简单好用。
- [ ]  面向 "Calculator / Generator / Checker / Template" 等高意图词做 SEO 优化。
- [ ]  在移动端有完整、流畅的使用体验。
- [ ]  配套信息图或图表时，提供可复制的 Embed Code，获取上下文链接。

### 3. 原创研究与行业报告 (Original Research)

**目标**：用自有数据建立内容护城河，成为高质量引用的源头。

- 数据来源：
    - SaaS 后台匿名化数据（如「分析了 100 万次 API 调用」）。
        - 公开数据源整合（Statista、财报、公开报告等）。
        - 自建问卷调查。

**落地页结构：**

- **标题**：包含 "Study" / "Research" / "Report" 等权威信号词。
- **Hero Stat**：在首屏突出 1 个最抓人的核心结论（如 "Companies using X see 37% faster onboarding"）。
- **结构**：
    - 结论先行（BLUF），再解释数据和方法论。
    - 每个主要结论配图，并在文本中给出加粗数字。
- **方法论 (Methodology)**：
    - 明确说明样本、时间区间、分析方法，增强可信度。

**执行 Checklist：**

- [ ]  围绕记者和内容作者会搜索的查询（如 "average click through rate"）设计标题与结构。
- [ ]  使用反向图片搜索，找出使用你图表却未加链接的页面，发起外联改为带链接引用。
- [ ]  提供新的数据视角，而不是简单复读行业平均值。

---

### B. 主动出击：外联与关系构建 (Active Outreach)

Link Bait 负责「造血」，主动外联负责「加速 DR 增长」。本节所有邮件模版均作为**硬资产**保留，可直接复制使用。

### 1. 死链修复 (Broken Link Building)

**逻辑**：你帮对方修复 404，顺带用你的资源替代原链接，属高价值互惠。

**SOP：**

1. 使用 Ahrefs / Semrush 找到与你主题相关页面上的 404 外链。
2. 筛出指向已倒闭的 SaaS 工具或过时文档的链接。
3. 准备一篇等价或更优的内容 / 工具页作为替代。
4. 使用下方模版发起外联。

**邮件模版：SaaS 死链替换 (The Helpful Fixer)**

> **Subject:** Regarding the broken link on [Their Page Title]
> 

> **Subject (Alternative):** Small fix for [Their Site Name]
> 

> 
> 

> Hi [First Name],
> 

> 
> 

> I was just browsing your article about **[Topic/Keyword]** and noticed a broken link in the section about **[Specific Tool/Concept]**.
> 

> 
> 

> It looks like the link to **[Dead Competitor/Resource Name]** is no longer working (it goes to a 404 page).
> 

> 
> 

> Since you’re discussing **[Topic]**, I thought you might want to replace it with our updated guide/tool: **[Your URL]**.
> 

> 
> 

> It covers similar ground but includes **[Unique Selling Point: e.g., updated 2025 data / free interactive calculator / new API documentation]**, which might be useful for your readers looking for a working alternative.
> 

> 
> 

> Thanks for maintaining such a great resource!
> 

> 
> 

> Best,
> 

> [Your Name]
> 

> [Your Title]
> 

### 2. 摩天大楼 2.0 (Skyscraper 2.0)

**逻辑**：找到已经获得大量外链的页面，打造更优版本，再联系这些链接来源。

- 核心改进方向：
    - 数据更新到最新年份。
    - 覆盖更多维度和使用场景。
    - 信息架构与视觉更清晰。

**邮件模版：摩天大楼 2.0 (The "Freshness" Pitch)**

> **Subject:** Question about your post on [Topic]
> 

> **Subject (Alternative):** New data for your [Topic] article
> 

> 
> 

> Hi [First Name],
> 

> 
> 

> I was reading your post on **[Topic]** and noticed you referenced **[Competitor's Article/Tool]**.
> 

> 
> 

> That’s a solid resource, but I noticed it hasn’t been updated since **[Year]**. A lot has changed in the **[Industry]** space since then (specifically regarding **[Specific Feature/Regulation/Trend]**).
> 

> 
> 

> We just published a completely updated guide/tool that covers these new changes: **[Your URL]**.
> 

> 
> 

> It includes:
> 

> - **[Benefit 1: e.g., Updated 2025 benchmarks]**
> 

> - **[Benefit 2: e.g., New integration capabilities]**
> 

> - **[Benefit 3: e.g., Custom visual charts]**
> 

> 
> 

> If you're updating your post soon, it might make a valuable addition for your readers looking for the current state of **[Topic]**.
> 

> 
> 

> Cheers,
> 

> [Your Name]
> 

### 3. 未链接提及转化 (Unlinked Mentions)

**逻辑**：品牌已被提及但没有链接，此时「补链」成功率极高且极其自然。

**SOP：**

1. 使用品牌监控工具（如 Semrush Brand Monitoring）搜集未带链接的品牌提及。
2. 优先筛选：
    - 高 DR 域名。
    - 文章本身已经讨论你的产品功能或使用场景。
3. 使用下方模版发起请求，强调「帮助读者」而非「帮我做 SEO」。

**邮件模版：提及转化 (The "Reader Experience" Pitch)**

> **Subject:** Thanks for mentioning [Your Company]!
> 

> **Subject (Alternative):** Quick question re: [Their Article Title]
> 

> 
> 

> Hi [First Name],
> 

> 
> 

> I recently saw your article on **[Topic]** and noticed you mentioned **[Your Company/Product Name]**. Thanks for the shoutout!
> 

> 
> 

> I noticed there isn’t a link back to our site. Would you mind adding one?
> 

> 
> 

> It would help your readers find our **[Tool/Documentation/Homepage]** directly if they want to try it out or learn more about the specific features you mentioned.
> 

> 
> 

> Here is the link for convenience: **[Your URL]**
> 

> 
> 

> Thanks again for the coverage.
> 

> 
> 

> Best,
> 

> [Your Name]
> 

---

### C. 数字公关与合作：高权重背书 (Digital PR & Partnerships)

### 1. 数字公关 (Digital PR)

- **记者外联 (Journalist Outreach)**：
    - 使用 HARO / Connectively、Qwoted、[Featured.com](http://Featured.com)、Help a B2B Writer 等平台，作为领域专家提供评论与数据。
    - 目标：在高 DR 媒体站点获得引用与链接，并长期沉淀为权威背书。
- **新闻劫持 (Newsjacking)**：
    - 当行业大事件发生（算法更新、重大宕机、安全事件），迅速产出分析与评论，成为媒体的引用来源。

### 2. SaaS 伙伴关系 (Partnership Links)

- **集成伙伴链接 (Integration Links)**：
    - 若已与 Zapier、HubSpot 等平台集成，确保在其 App Marketplace / Partner Directory 中有完整条目和指向你站点的链接。
- **证言链接 (Testimonial Link Building)**：
    - 列出你在用的 SaaS 产品，主动为其写案例或证言，对方常会在首页或案例页链接回你的站点。

---

## 三、DR 增长中的风险与边界：冲突雷达

### 1. 买链 vs 换链 (Buying vs Exchanging)

- **买链 (Buying)**：
    - Google 明确禁止，大规模购链属于高风险行为，虽然现实中仍然存在。
    - 即使是在 DR/AS 层面短期有收益，也可能带来人工惩罚与长期隐患。
    - **建议**：除非是清晰标明 Sponsored / Nofollow 的广告合作，否则避免直接购买 dofollow 链接。
- **换链 (Link Exchange)**：
    - 适度的、围绕内容相关性自然发生的换链属于中等风险区域。
    - 常见形式包括 ABC 交换（A 链 B，B 链 C）等，只要保持比例合理且内容相关，一般可接受。

### 2. Nofollow vs Dofollow

- 不必执着于 100% dofollow：
    - nofollow 链接仍然能带来实际流量与品牌曝光。
    - 在部分场景下，Google 也会把 nofollow 作为排名的「提示 (Hint)」信号之一。
- 自然健康的链接配置文件，应该包含一定比例的 nofollow 外链，尤其在 UGC 与广告环境中。

### 3. 客座文章 (Guest Posting)

- 低质量、批量的 Guest Post 群发已被明确打击。
- 对于 SaaS：
    - 仍然可以通过高质量客座文章建立作者权威与品牌认知。
    - 只在有真实受众、与你领域高度相关的站点投稿，把链接作为副产品，而非唯一目的。

---

## 四、让 DR 真正服务排名：与 On-Page / 内链 / GEO 的联动

Domain Rating 增长不是孤立目标，而是支撑整体 SEO 体系的「外层护城河」。本节聚焦于 **如何把 DR 增长转化为排名与可转化流量**。

### 1. 内链：把外部权重输送到 Money Pages

参照《03_CORE_Internal_Linking》的原则：

- 将获得大量外链的「中间人页」——如统计页、原创研究、免费工具页——视为权重中转站：
    - 在首屏和 Summary 段落，放置指向核心功能页 / Pricing / Demo 页的上下文内链。
    - 在相同主题下，通过 Topic Cluster 结构，把长尾教程和 FAQ 与销售路径连接起来。
- 确保所有关键 Money Pages（Features / Solutions / Pricing）的点击深度 ≤ 3，并从至少 1 个中间人页 + 1 个 Pillar Page 获得内链。

### 2. On-Page：让权重落在「正确形态」的页面上

- 对于「Best X tools」「X vs Y」「[Vertical] use cases」这类 DR 敏感的商业意图词，应确保：
    - 对应落地页遵循《01_CORE_[On-Page.md](http://On-Page.md)》的结构与写作规范。
    - H1 / Title / 首屏明确传达页面能解决的需求，并对齐 SERP 上主流页面形态（Listicle / Comparison / Landing Page）。
- 在 Link Bait 与外联策略中，优先支持已经 On-Page 成熟、能直接承接业务的页面，而不是仅仅给博客首页「灌分」。

### 3. GEO / AI：让高 DR 链接成为 LLM 推荐依据

- 来自高权重媒体、垂直评论站、社区的链接不仅提升 DR，也会被主流 LLM 视为「可信引用源」。
- 为与 DR 增长强相关的页面配置：
    - `Organization` / `SoftwareApplication` 等 JSON-LD 结构化数据（定义品牌与产品实体）。
        - 在评论站（G2、Capterra 等）保持高质量条目与最新评分，增加 AI 回答中的出现概率。
- 用《02_CORE_GEO_[AI.md](http://AI.md)》中的 GA4 Regex，将 AI 流量单独标记出来，评估高 DR 链接在 AI 场景下的实际回报。

---

## 五、DR 增长执行工具栈与 SOP（硬资产）

> 本节列出与 DR 增长直接相关的工具与流程类硬资产，禁止删除，仅允许位置微调或轻度措辞优化。
> 

### 1. 工具栈 SOP

- **找邮箱 (Prospecting Emails)**：
    - 使用 [**Hunter.io](http://Hunter.io) / Voila Norbert** 获取联系人邮箱，并在 Google Sheets 中批量验证有效性。
- **外联管理 (Outreach Management)**：
    - 使用 **Pitchbox / BuzzStream** 管理大规模外联、模版与 Follow-up 流程。
- **竞品外链分析 (Link Intersect)**：
    - 使用 **Ahrefs Link Intersect / Semrush Backlink Gap** 找出「链接到多个竞品但未链接到我」的站点，作为 DR 增长重点突破口。
- **记者平台 (PR Platforms)**：
    - **Connectively (HARO)**、**Qwoted**、[**Featured.com**](http://Featured.com)、**Help a B2B Writer**，用于获取高 DR 媒体引用机会。

### 2. DR 监控与复盘节奏

- **月度维度**：
    - 追踪 Referring Domains 数量、DR / Authority Score 曲线。
    - 统计新获链接按来源类型分布（媒体 / 博客 / 目录 / 评论站 / 社区）。
- **季度维度**：
    - 评估 Link Bait 资产（统计页 / 免费工具 / 原创研究）的外链贡献度。
    - 评估主动外联（Broken Link / Skyscraper / Unlinked Mentions）的转化率与投入产出比。
    - 结合 Internal Linking 与 GEO，检查高 DR 外链是否已经有效输血到 Money Pages，并对 AI 流量与排名带来实质影响。

---

## 六、汇总区（删减 / 合并 / 冲突追踪）

> 本段为来自后续文档《06_Tech_Infra》的向前增补内容：DR 增长相关的技术 SEO 决策（301 vs 302、Soft 404/410、子域 vs 子目录等）的工程级实现细节，已在《06_Tech_Infra》中给出统一技术裁决与示例配置，避免在本篇中出现重复或潜在冲突版本。
> 

> 说明：本节用于记录本轮围绕「Domain Rating 增长」重构时，被删除/弱化、被合并以及潜在冲突的原始内容，保持决策可追溯。以下内容均保留原文形式，不做二次改写。
> 

### A. 被删除或明显弱化内容汇总（原文）

1. **来源文档**：《04_Domain_Rating》（本页重构前版本）
    
    **原文片段 A1：**
    
    > 根据您提供的资料库，这是一份专为 **SaaS 工具站** 定制的《高权重外链作战地图》。所有本地 SEO（如 Yelp、GMB）和低端目录（Directories）已被剔除，重点聚焦于 **Domain Rating (DR) / Authority Score (AS)** 的增长与 **E-E-A-T** 建设。
    > 
    
    > 
    > 
    
    > ---
    > 
    
    > 
    > 
    
    > # 🗺️ SaaS 外链作战地图 (The SaaS Link Building Battle Map)
    > 
    
    **处理说明**：标题和开篇 framing 与本页最终主题高度一致，但整体被当前更聚焦于 DR 的结构所取代；核心思路已在新文档前两节中吸收整合。
    
2. **来源文档**：《04_Domain_Rating》（本页重构前版本）
    
    **原文片段 A2：**
    
    > ### 🏛️ 第一层：外链底层逻辑 (The Authority Logic)
    > 
    
    > *Agent 核心判断标准：SaaS 的链接必须建立在“数据”与“工具”的护城河之上。*
    > 
    
    > 
    > 
    
    > ### 1. 权重算法：相关性 > 纯权威度
    > 
    
    > 虽然高 DR/AS 很诱人，但在 SaaS 领域，**相关性 (Relevance)** 是核心。
    > 
    
    > - **TrustRank 原理**：Google 信任“种子站点”（如 .edu, .gov, NYTimes）。SaaS 站点的目标是缩短与这些种子站点的距离。链接层级越少，TrustRank 越高,。
    > 
    
    > - **链接位置 (Placement)**：侧边栏和页脚（Footer）的链接权重极低。只有正文内容（Contextual Links）中、且位于页面靠前位置的链接，才能传递最大的 PageRank,。
    > 
    
    **处理说明**：核心观点（相关性优先、TrustRank、Placement 重要性）已在本页「一、Domain Rating 增长的底层逻辑」中重新组织，原文在此弱化。
    
3. **来源文档**：《04_Domain_Rating》（本页重构前版本）
    
    **原文片段 A3：**
    
    > ### 2. E-E-A-T 与信任护城河
    > 
    
    > 对于 SaaS（通常属于 YMYL - Your Money Your Life 范畴），外链是建立 E-E-A-T 的关键：
    > 
    
    > - **作为代理指标**：Google 的 Gary Illyes 证实，E-E-A-T 很大程度上基于权威网站的链接和提及。
    > 
    
    > - **品牌提及 (Mentions)**：即使没有链接，权威媒体（如 Forbes, TechCrunch）的品牌提及也能作为可信度信号，甚至被 AI（如 ChatGPT）抓取作为答案来源,。
    > 
    
    **处理说明**：E-E-A-T 相关内容与 GEO/品牌建设交叉度较高，已在《02_CORE_GEO_[AI.md](http://AI.md)》中详细展开；本页保留对 DR 的直接影响，弱化对 E-E-A-T 细节的重复解释。
    
4. **来源文档**：《04_Domain_Rating》（本页重构前版本）
    
    **原文片段 A4：**
    
    > 根据您上传的资料，以下是针对 SaaS 工具站的高被引内容（Link Bait）设计规范与执行 SOP。
    > 
    
    > 
    > 
    
    > ### 1. 数据统计页模组 (Statistics Page Design)
    > 
    
    > ...（后续对页面结构、图表、Freshness 等的详细说明）
    > 
    
    **处理说明**：统计页模组的关键结构已在本页「二、A.1 数据统计页」中重组，原始冗长说明在此被吸收并局部弱化。
    
5. **来源文档**：《04_Domain_Rating》（本页重构前版本）
    
    **原文片段 A5：**
    
    > 根据《SaaS 外链作战地图》及提供的资料库，以下是针对 SaaS 场景优化的**高转化率外联邮件模版库**。
    > 
    
    > 这些模版结合了 **Broken Link Building**（死链修复）、**Skyscraper**（摩天大楼）和 **Unlinked Mentions**（未链接提及）的最佳实践，去除了客套废话，专注于价值交换。
    > 
    
    > 
    > 
    
    > ---
    > 
    
    > 
    > 
    
    > ### 1. 死链修复话术 (Broken Link Script)
    > 
    
    > ...（后续模版与解释）
    > 
    
    **处理说明**：具体邮件模版已在本页「二、B.1 / B.2 / B.3」中保留，部分解释性文字被压缩以聚焦 DR 增长场景。
    

---

### B. 被合并内容原文（多版本合并）

> 说明：以下内容在《04_Domain_Rating》与前文中有多种写法，本次重构保留信息最完整且最贴合「DR 增长」主线的一版，其余版本在此归档。
> 
1. **主题**：链接位置与权重（Placement）
- **版本 B1（来源：《04_Domain_Rating》原文）**：
    
    > 侧边栏和页脚（Footer）的链接权重极低。只有正文内容（Contextual Links）中、且位于页面靠前位置的链接，才能传递最大的 PageRank,。
    > 
- **版本 B2（来源：《03_CORE_Internal_Linking》相关段落）**：
    
    > Google 不会平均分配一个页面上的所有内链权重。正文主体中的链接、首屏、语义相关区域的链接权重最高，侧边栏/页脚/导航的链接权重次之或更低。
    > 
- **最终保留版本**：
    - 融合为本页「一、2. 相关性优先于纯权重」与 Internal Linking 文档中的统一表述，同时在本页更强调其对 DR 增长的直接影响。
1. **主题**：Link Bait 资产类型
- **版本 B3（来源：《04_Domain_Rating》原文）**：
    
    > 板块 A：被动引流 (Link Bait) —— 数据统计页、免费工具、原创研究等分散描述。
    > 
- **版本 B4（来源：《01_CORE_[On-Page.md](http://On-Page.md)》相关内容）**：
    
    > 在内容策略章节中，将统计页、原创研究、免费工具作为可获取自然外链的内容类型，但未显式指向 DR。
    > 
- **最终保留版本**：
    - 在本页「二、A. Link Bait 资产矩阵」中统一重组为三大核心资产类型，并全部围绕「DR 增长」展开，前文版本保留在各自文档，不再在本页重复。
1. **主题**：邮件模版库
- **版本 B5（来源：《04_Domain_Rating》原文）**：
    
    > 针对 Broken Link / Skyscraper / Unlinked Mentions 的邮件模版，带有较长解释性前言。
    > 
- **版本 B6（来源：其他营销文档草稿，未纳入父级 SEO 知识库）**：
    
    > 存在少量措辞略有差异但结构相同的英文外联模版。
    > 
- **最终保留版本**：
    - 在本页「二、B.1 / B.2 / B.3」保留一套结构清晰、可直接复制使用的版本，其余相近版本在本节登记为被合并内容，不再重复出现在主干文档中。

---

### C. 冲突内容及其不同版本

> 本轮在《01_CORE_[On-Page.md](http://On-Page.md)》《02_CORE_GEO_[AI.md](http://AI.md)》《03_CORE_Internal_Linking》与《04_Domain_Rating》之间，未发现关于「是否应提升 DR」「链接类型优先级」等主题上结论相反的明确冲突，多数只是粒度与视角差异：
> 

> - On-Page 文档从单页结构和内容质量出发；
> 

> - GEO 文档从 LLM / AI 引用与实体建设出发；
> 

> - Internal Linking 文档从站内结构和权重输送出发；
> 

> - 本页则从「外链获取与 DR 增长」出发，将前文可执行信息串联为一条作战链路。
> 

> 
> 

> 因此，本次未在前文插入「本段为来自后续文档的补充建议：……」类冲突批注，本文「冲突汇总」暂为空档。若后续在以下问题上产生相反观点（例如：买链在某些限定条件下是否可接受、nofollow 比例的最佳区间、免费工具是否应强制登录等），再按照以下格式补充：
> 

> 
> 

> - 来自文档：《X》的原文句子 A
> 

> - 来自文档：《Y》的原文句子 B
> 

> - 已在文档《X》对应位置插入：`本段为来自后续文档的补充建议：……`，说明新版观点的差异与适用场景。
>