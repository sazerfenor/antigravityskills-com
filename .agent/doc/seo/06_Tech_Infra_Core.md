# 06_Tech_Infra_Core

> **SEO Agent 说明**：当问题是「BananaPro 的技术 SEO 基建是否拖后腿」时调用本篇（SSR/渲染、状态码、重定向、robots、sitemap、CWV、参数 URL 策略等）。本篇不讨论写什么内容，只讨论站点底层。
> 

# SaaS 技术基建作战地图 (SaaS Technical Infrastructure Battle Map)

这份文档基于你提供的资料，逆向工程了针对 SaaS 工具站的技术 SEO 架构。SaaS 站点通常面临大量动态 JS 内容、复杂的参数化 URL 和高频率的功能迭代，因此本方案聚焦于 **渲染稳定性、爬取效率与架构健壮性**，作为「Technical Infrastructure」主题下的技术实施蓝本。

---

### 🏛️ 第一层：SaaS 技术底层逻辑 (The Technical Core)

针对 SaaS 及其常见的单页应用 (SPA) 架构，Technical Infrastructure 层面的核心技术方向包括：

### 1. JavaScript 渲染机制 (SSR over CSR)

SaaS 工具站常由 React/Vue/Angular 驱动。虽然 Google 声称能处理 JS，但存在“两波索引”延迟（爬取 HTML → 队列 → 渲染 JS）。

- **推荐方案**：使用 **服务端渲染 (SSR)** 或 **静态站点生成 (SSG)**，确保关键内容在 HTML 初始响应中即对爬虫可见，显著提升 LCP 和索引速度。
- **备选方案**：使用 **动态渲染 (Dynamic Rendering)**。对真实用户展示 CSR，对 `Googlebot` 等爬虫返回预渲染静态 HTML。适合作为复杂 JS 站点的折中方案，但不宜长期依赖。
- **关键检查**：确保标题、导航、主要文本等核心内容不依赖 `onclick`／滚动等交互事件触发加载，因为 Googlebot **不会执行交互行为**。

### 2. 爬取预算管理 (Crawl Budget Efficiency)

对于拥有大量 programmatic 页面（如数据生成的数千个落地页）的 SaaS，需在基础设施层面主动管理爬取成本：

- **爬取成本**：JavaScript 执行（XHR 请求）极其消耗爬取预算。
- **控制手段**：通过 `robots.txt` 屏蔽低价值参数 URL（例如筛选器、排序参数），防止 Google 陷入无限参数组合 URL 陷阱。
- **清理**：及时修复 Soft 404（内容为空但返回 200）、过长的重定向链，避免浪费爬取预算。

### 3. 移动优先 (Mobile-First)

Google 已全面执行移动优先索引，Technical Infrastructure 必须保证：

- **内容一致性**：移动端 HTML 必须包含与桌面端相同的核心内容、结构化数据和元标签。为了 UX 折叠菜单或隐藏部分内容可以接受，只要 HTML 源码中存在且无需额外交互即可加载。
- **响应式设计**：优先使用响应式布局而非独立 `m.` 子域，避免复杂的重定向和 canonical 标注错误。

---

### 🗺️ 第二层：战术板块划分 (Technical Clusters)

本层将 Technical Infrastructure 拆分为若干可执行的技术板块，覆盖索引控制、性能优化、站点架构与 Schema 配置。

### 板块 A：索引与控制 (Indexability)

- **Robots.txt**：用于告诉搜索引擎「**不要爬取什么**」。典型实践：
    - 阻止 `/app/`、`/admin/`、`/login/`、`/dashboard/` 等登录后后台页面。
    - 阻止 `/search` 等内部搜索结果页，防止无限 URL。
    - 不要试图通过 robots.txt 来「删除已收录页面」，否则会出现 “Indexed, though blocked by robots.txt”。
- **Meta Robots**：使用 `noindex` 处理 SaaS 的「空状态」页、伪静态聚合页或低质量 programmatic 页。
    - 注意：若页面在 `robots.txt` 中被屏蔽，Google 看不到 HTML 中的 `noindex`，页面可能仍会留在索引中。
- **Canonical**：SaaS 常由于 URL 参数（追踪 ID、会话 ID、排序过滤）产生重复内容。
    - 在所有页面（包括自身）设置 `rel="canonical"` 指向**绝对路径的纯净 URL**。
    - 在参数页中，canonical 指回不带参数的主 URL，用于聚合权重。

### 板块 B：性能优化 (Performance & Core Web Vitals)

Technical Infrastructure 必须对 CWV 提供兜底能力：

- **LCP (Largest Contentful Paint)**：通常是首页 Hero Image 或主要 H1 区域。
    - 在 `<head>` 中预加载关键资源 (`<link rel="preload">`)。
    - **不要**对首屏 LCP 元素使用 `loading="lazy"`。
    - 使用 CDN 分发静态资源，缩短 TTFB 与资源下载时间。
- **CLS (Cumulative Layout Shift)**：防止横幅、图片、字体加载导致布局抖动。
    - 为图片/视频容器预留 `width` 和 `height` 或使用 CSS Aspect Ratio。
    - 自定义字体使用 `font-display: optional` 或 `swap`，配合预加载，降低布局偏移。
- **INP (Interaction to Next Paint)**：衡量交互响应速度。
    - 拆分长任务，减少主线程阻塞，优化复杂 JS 执行路径。
    - 延迟加载非关键脚本，避免三方脚本阻塞首次交互。

### 板块 C：架构与状态码 (Architecture & Status Codes)

- **重定向策略**：
    - 永久移动使用 301（传递 PageRank），避免 A→B→C 链式跳转，应改为 A→C。
- **404 vs 410**：
    - 对于彻底删除且无替代的旧功能页面，使用 `410 Gone` 能更快触发 Google 移除索引。
- **孤岛页面 (Orphan Pages)**：
    - 大量营销 Landing Page 容易在架构演进中变成孤岛。通过 Sitemap 与内链策略（见 Internal Linking 文档）保证仍在站点图谱中被发现与传权。

### 板块 D：结构化数据 (Structured Data)

Technical Infrastructure 需提供统一的 Schema 输出能力（通常在后端模板或中间层实现）：

- 使用 JSON-LD 格式嵌入以下 Schema 类型：
    - `Organization`：用于首页，建立品牌实体。
    - `Product` / `SoftwareApplication`：用于核心功能页，暴露评分、价格等商业属性。
    - `Review`：增加 SERP 星级展示与信任度。
    - `BreadcrumbList`：显式暴露站点层级结构，提升点击率与可理解性。

---

### 📦 第三层：技术资产清单 (The Asset Inventory)

本层列出 Technical Infrastructure 侧的**硬资产**：代码片段、配置样例与 SOP，后续文档重构中不得删除，仅允许重排或轻度措辞调整。

### 1. 核心代码片段 (Snippets)

**A. .htaccess 301 重定向（强制 HTTPS & 统一域名）**

*适用于 Apache 服务器，SaaS 必须全站 HTTPS。*

```
RewriteEngine On
# 强制 HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ [https://%{HTTP_HOST}%{REQUEST_URI}](https://%{HTTP_HOST}%{REQUEST_URI}) [L,R=301]

# 强制 non-www (根据偏好选择)
RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
RewriteRule ^(.*)$ [https://%1/$1](https://%1/$1) [L,R=301]
```

> 若偏好强制跳转到 `www`，可使用下文「服务器配置」小节中的选项 B。
> 

**B. 标准 Canonical 标签（防参数重复）**

*部署位置：所有 HTML 页面的 `<head>` 中。*

```
<!-- 即使是当前页面，也要指向自身绝对路径，去除 ?sessionid=xyz 等参数 -->
<link rel="canonical" href="[https://www.yoursaas.com/features/analytics](https://www.yoursaas.com/features/analytics)" />
```

**C. Meta Robots 防索引配置**

*用于 Staging 环境、Admin 后台、PPC 落地页等不应进入索引的页面。*

```
<!-- 禁止索引，但允许爬虫跟踪链接以发现其他页面 -->
<meta name="robots" content="noindex, follow">
```

**D. Organization Schema (JSON-LD)**

*用于首页，帮助构建 Knowledge Graph。*

```
<script type="application/ld+json">
{
  "@context": "[https://schema.org](https://schema.org)",
  "@type": "Organization",
  "name": "Your SaaS Name",
  "url": "[https://www.yoursaas.com](https://www.yoursaas.com)",
  "logo": "[https://www.yoursaas.com/logo.png](https://www.yoursaas.com/logo.png)",
  "sameAs": [
    "[https://www.linkedin.com/company/yoursaas](https://www.linkedin.com/company/yoursaas)",
    "[https://twitter.com/yoursaas](https://twitter.com/yoursaas)"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-555-1212",
    "contactType": "customer service"
  }
}
</script>
```

### 2. 关键技术 SOP (Standard Operating Procedures)

**SaaS 迁移 / 改版技术 Checklist**

用于域名迁移、路径重构或大规模改版时的 Technical Infrastructure 基线流程：

1. **Benchmarking**：记录当前的关键词排名、自然流量、页面速度指标（CWV）。
2. **Staging Audit**：在测试环境运行 Site Audit，确保 `noindex` 标签存在（防止测试站被收录），并在正式上线前移除。
3. **Redirect Map**：准备旧 URL → 新 URL 的 301 映射表，并在服务器层统一配置。
4. **Go-Live Check**：
    - 移除全站密码保护 / `noindex`。
    - 更新 `robots.txt` 允许爬取新结构。
    - 更新 XML Sitemap 并提交 GSC。
    - 验证 Canonical 标签已指向新域名 / 新路径结构。
    - 全链路测试关键转化路径（注册、支付、集成配置等）。

---

### ⚔️ 第四层：技术冲突雷达 (Tech Conflict Radar)

本层梳理 Technical Infrastructure 决策中的典型冲突点，并给出偏向 SEO / Technical Infra 的裁决标准。

### 1. 子域名 ([app.domain.com](http://app.domain.com)) vs 子目录 ([domain.com/blog](http://domain.com/blog))

- **冲突**：开发者倾向于用子域名隔离 SaaS 应用与营销站（博客 / 文档），SEO 更偏向子目录聚合权重。
- **裁决**：在可行情况下，**子目录 (Subfolder) 优先**。
    - 搜索引擎常将子域名（如 [`blog.saas.com`](http://blog.saas.com)）视为独立站点，指向子域名的外链难以完全回流主域。
    - 将博客、案例研究等内容置于 [`domain.com/blog`](http://domain.com/blog) 下，可以将其累积权重直接计入主域 Domain Authority。
- **缓解策略（必须使用子域名时）**：
    - 在 Technical Infrastructure 层统一配置 HSTS (`includeSubdomains`)，强制所有子域 HTTPS，并向搜索引擎表明这些页面属于同一站点集合。
    - 在 GSC 中使用 **Domain Property** 验证 http/https、www/non-www 及子域，统一管理索引与报表。

### 2. 301 vs 302 重定向

- **冲突**：工程实践中常随手使用默认 302 作为临时重定向。
- **裁决**：**默认使用 301**，仅在真正短期场景（维护、A/B 测试）使用 302。
    - 长期存在的 302 可能被搜索引擎视作 301，但过程不确定且有时间成本。
    - 301 明确传递 PageRank，应尽可能长期保留，不要随意撤销历史重定向链路。

### 3. JS 渲染：完全信任 Google vs 预渲染

- **冲突**：Google 声称可以渲染 JS，前端团队倾向于直接使用 CSR 无预渲染。
- **裁决**：**不要完全依赖 CSR**。
    - JS 渲染极耗资源，可能导致索引延迟或渲染超时。
    - 对于首页、功能页、定价页等核心营销页面，必须确保关键文本、链接与 Canonical 在初始 HTML 中就存在，或采用 SSR/SSG。
    - 不要在 `robots.txt` 中屏蔽 `.js` 或 `.css`，否则搜索引擎无法正确渲染页面布局与功能。

### 4. 参数化 URL 处理

- **冲突**：SaaS 大量产生 `?sort=date`、`?filter=active` 等参数 URL，既有 UX 需求，又有爬取与重复内容风险。
- **裁决**：采用 **Canonical + robots 策略组合**：
    - 首选：在参数页使用 Canonical 指向主 URL，聚合权重。
    - 次选（预算吃紧时）：在 `robots.txt` 中屏蔽极端庞大的参数 URL 模式（例如使用通配符），以节省爬取预算，但需谨慎，因为被 `Disallow` 的 URL 无法向下传递权重。

---

### 🛠️ 第五层：服务器与协议配置 (Server & Protocol Configuration)

### 1. 服务器配置 (.htaccess)

**部署位置**：网站根目录（Apache 服务器）。

### 修复 Mixed Content (混合内容)

通过 CSP 头自动将所有不安全的 HTTP 请求升级为 HTTPS，解决常见混合内容告警：

```
<IfModule mod_headers.c>
    Header always set Content-Security-Policy "upgrade-insecure-requests"
</IfModule>
```

### 强制 HTTPS 重定向

将所有流量 301 重定向到 HTTPS 版本：

```
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ [https://%{HTTP_HOST}%{REQUEST_URI}](https://%{HTTP_HOST}%{REQUEST_URI}) [L,R=301]
```

### 强制 URL 规范化 (www vs non-www)

SaaS 站通常偏好 non-www 保持简洁，但无论选择哪一侧，都必须在服务器层面保持一致（避免重复内容与信号分散）。二选一：

**选项 A：强制跳转到 non-www（推荐）**

```
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
RewriteRule ^(.*)$ [https://%1/$1](https://%1/$1) [L,R=301]
```

**选项 B：强制跳转到 www**

```
RewriteEngine On
RewriteCond %{HTTP_HOST} !^www\. [NC]
RewriteRule ^(.*)$ [https://www.%{HTTP_HOST}/$1](https://www.%{HTTP_HOST}/$1) [L,R=301]
```

### 2. SaaS 专用 Robots.txt（技术基础版）

**部署位置**：[`https://your-saas-domain.com/robots.txt`](https://your-saas-domain.com/robots.txt)` 根目录。此配置屏蔽后台与内部搜索，显式放行 JS/CSS 资源：

```
User-agent: *
# 屏蔽 SaaS 后台与敏感目录
Disallow: /admin/
Disallow: /login/
Disallow: /dashboard/
Disallow: /staging/

# 屏蔽内部搜索结果页 (防止无限 URL 陷阱)
Disallow: /search/
Disallow: /*?q=

# 显式放行资源文件，确保 Google 能渲染 JS 驱动的页面
Allow: .js
Allow: .css
Allow: /assets/
Allow: /wp-content/uploads/

# 指定 Sitemap 位置
Sitemap: [https://www.your-saas-domain.com/sitemap.xml](https://www.your-saas-domain.com/sitemap.xml)
```

> GEO / AI 爬虫白名单（如 GPTBot, Claude-Web 等）的更细配置在《02_CORE_GEO_[AI.md](http://AI.md)》中维护，此处仅保留技术 SEO 视角的基础 robots 配置示例。
> 

### 3. Canonical 防御体系与 X-Robots-Tag

### 参数化 URL 的自指 Canonical

**部署位置**：所有 HTML 页面的 `<head>` 区域。

**作用**：告知搜索引擎忽略参数，将权重集中到主 URL。

```
<!-- 即使在 [https://www.saas.com/pricing?currency=usd?sort=price](https://www.saas.com/pricing?currency=usd?sort=price) 页面上，也必须指向不带参数的版本 -->
<link rel="canonical" href="[https://www.saas.com/pricing](https://www.saas.com/pricing)" />
```

### X-Robots-Tag 处理非 HTML 文件（如 PDF）

**部署位置**：服务器配置文件（`.htaccess` 或 Nginx `.conf`）。

**作用**：防止产品手册、白皮书 PDF 等被索引，节省爬取预算，更好地集中信号在 HTML 页面上。推荐使用 HTTP Header 而非 robots.txt：

**Apache (.htaccess)：**

```
<Files ~ "\.pdf$">
    Header set X-Robots-Tag "noindex, nofollow"
</Files>
```

**Nginx (.conf)：**

```
location ~* \.pdf$ {
    add_header X-Robots-Tag "noindex, nofollow";
}
```

---

### 🔍 第六层：JS 渲染调试与 CWV 优化 SOP (JS Rendering & CWV Playbook)

本层给出围绕 JS 渲染与 CWV 的 Technical Infrastructure 级 SOP，帮助工程团队在迭代中系统性排查问题。

### 1. JS 渲染调试 SOP (JS Rendering Debugging Protocols)

针对 SaaS SPA 或强依赖动态加载的页面，必须对比 **原始 HTML (Raw HTML)** 与 **渲染后 DOM (Rendered DOM)**：

### 🛠️ 调试工具清单

- **Chrome DevTools**：对比 "View Page Source"（原始源码）与 "Inspect"（渲染后 DOM）。
- **Google Search Console (GSC)**：使用 "URL Inspection" → "Test Live URL"，查看 Google 实际抓取与渲染的 HTML。
- **Ahrefs SEO Toolbar / Site Audit**：开启 JS 渲染，对比 HTML 与 Rendered HTML 的标签差异。

### 🕵️‍♂️ 关键标签检查清单 (Critical Tag Checklist)

1. **Meta Robots（索引指令）**
    - 风险：JS 可能覆盖原始 HTML 中的 robots 指令。
    - 搜索引擎倾向采纳**最严格**指令：
        - 原始 HTML 是 `index`，JS 渲染后变为 `noindex` → 结果为 `noindex`。
        - 原始 HTML 是 `noindex`，即便 JS 改回 `index`，依然不会索引，甚至可能不进入渲染阶段。
    - 检查点：原始 HTML 中**不要**残留测试环境用的 `noindex` 标签。
2. **Canonical Tags（规范标签）**
    - 风险：JS 误插入第二个 Canonical，或未正确更新后端模板生成的默认标签。
    - 若同时存在两个 Canonical，搜索引擎可能忽略全部，或任意选择其一，导致信号失真。
    - 检查点：JS 应**更新/替换**现有 Canonical，而不是追加新的标签。
3. **Title & Meta Description**
    - 风险：单一前端模板导致所有页面 Title 相同，后续由 JS 再覆盖。
    - 搜索引擎会处理 JS 更新后的 Title，但用户端可能看到标题“闪烁”。
    - 检查点：在 GSC 的 Rendered HTML 中确认最终 Title 唯一且与页面内容匹配。

### 2. 核心网页指标 (CWV) 修复代码库

### ⚡ LCP (最大内容绘制) 优化

**目标**：让首页 Hero Image 或关键截图在 JS 执行前即可加载。

**代码 1：预加载关键图片 (Preload Hero Image)**

*将以下代码置于 `<head>` 顶部：*

```
<!-- 基础预加载 -->
<link rel="preload" as="image" href="hero-image.jpg">

<!-- 响应式图片预加载 (针对不同设备加载不同尺寸) -->
<link rel="preload" as="image" href="hero-image.jpg"
      imagesrcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1600.jpg 1600w"
      imagesizes="50vw">
```

**代码 2：提升资源优先级 (Fetch Priority)**

```
<img src="hero-dashboard.jpg" alt="SaaS Dashboard Interface" fetchpriority="high">
```

> **禁忌**：不要对首屏 LCP 图片使用 `loading="lazy"`，否则会显著拖累 LCP。
> 

### 📐 CLS (累积布局偏移) 优化

**目标**：为动态内容预留空间，防止布局抖动。

**代码 1：显式指定宽高 (Explicit Width & Height)**

```
<!-- 必须在 img 标签中明确写出 width 和 height -->
<img src="chart-preview.jpg" width="640" height="360" alt="Analytics Chart">
```

**代码 2：字体加载优化 (Font Display)**

```
@font-face {
  font-family: 'MySaaSFont';
  src: url('my-saas-font.woff2') format('woff2');
  font-display: optional; /* 超时则使用后备字体，避免布局反复切换 */
}

<link rel="preload" href="my-saas-font.woff2" as="font" type="font/woff2" crossorigin>
```

### 🖱️ INP (交互到下一次绘制) & FID 优化

**目标**：减少 JS 主线程阻塞，保障关键交互响应时间。

- **策略 1：延迟加载非关键 JS（Defer/Async）**

```
<!-- Async：并行下载，下载完立即执行，适用于独立统计脚本等 -->
<script src="analytics.js" async></script>

<!-- Defer：并行下载，HTML 解析完成后再执行，推荐用于依赖 DOM 的主业务脚本 -->
<script src="app-bundle.js" defer></script>
```

- **策略 2：代码拆分 (Code Splitting)**
    - 将大型应用拆为多个懒加载模块，只在需要时加载对应功能 JS。
    - 使用 `requestIdleCallback` 或分段 `setTimeout` 将非关键任务错峰执行。
- **策略 3：使用 Web Workers**
    - 将数据处理、复杂计算等重任务迁移到 Web Worker，释放主线程用于 UI 与交互。

---

### 🧱 第七层：SaaS Schema 实施标准 (Schema Implementation for SaaS)

本层为 Technical Infrastructure 提供 SaaS 常用 Schema 模板，服务产品识别与文档层级展示。

### A. SoftwareApplication Schema (SaaS 核心)

*适用于 SaaS 首页或核心功能页。*

```
<script type="application/ld+json">
{
  "@context": "[https://schema.org](https://schema.org)",
  "@type": "SoftwareApplication",
  "name": "Your SaaS Product Name",
  "operatingSystem": "Web-based, Windows, macOS, Android, iOS",
  "applicationCategory": "BusinessApplication",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1250"
  },
  "offers": {
    "@type": "Offer",
    "price": "29.00",
    "priceCurrency": "USD",
    "availability": "[https://schema.org/InStock](https://schema.org/InStock)"
  },
  "description": "Short description of your SaaS tool capabilities.",
  "author": {
    "@type": "Organization",
    "name": "Your Company Name"
  }
}
</script>
```

> `applicationCategory` 可根据实际改为 `DesignApplication`、`FinanceApplication` 等，Technical Infrastructure 层可通过配置驱动该字段。
> 

### B. BreadcrumbList Schema (文档层级优化)

*适用于多层级 Docs / API 文档等页面，用于在 SERP 显示 `Home > Docs > API > v2` 之类路径。*

```
<script type="application/ld+json">
{
  "@context": "[https://schema.org](https://schema.org)",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Home",
    "item": "[https://www.yoursaas.com/](https://www.yoursaas.com/)"
  },{
    "@type": "ListItem",
    "position": 2,
    "name": "Documentation",
    "item": "[https://www.yoursaas.com/docs/](https://www.yoursaas.com/docs/)"
  },{
    "@type": "ListItem",
    "position": 3,
    "name": "API Reference",
    "item": "[https://www.yoursaas.com/docs/api/](https://www.yoursaas.com/docs/api/)"
  }]
}
</script>
```

---

### 📚 第八层：汇总区（删减 / 合并 / 冲突追踪）

> 本节用于记录围绕「Technical Infrastructure」主题在本次重构中涉及的删减、合并与冲突情况，所有条目均保持原文形式或接近原文，仅做必要标注。当前版本以 06_Tech_Infra 为主线，与前文 01–05 号文档（On-Page, GEO, Internal_Linking, Domain_Rating, Vertical_Strategy）在技术层面未发现需要插入显式冲突批注的句子级矛盾，因此 A/B 为占位，后续有真正发生变更时可继续填充。
> 

### A. 被删除或明显弱化内容汇总（原文）

> 本轮重构中，06_Tech_Infra 原文几乎全部围绕 Technical Infrastructure，仅对个别轻微措辞与段落承接做了调整，未删除与技术主题相关的实质内容；也未出现需要从本篇迁移回前文的长段落。因此本小节当前为空，占位如下：
> 
- （占位）如后续版本删除或明显弱化与 Technical Infrastructure 较弱相关的说明性文字（且不属于代码 / 配置 / SOP / 模板类硬资产），请在此按「来源文档 + 原文片段」格式登记。

### B. 被合并内容原文（多版本合并）

> 本轮比对 01–05 号文档与 06_Tech_Infra 时，发现跨文档存在多处对同一技术概念的解释（如 301 vs 302、子域 vs 子目录、Soft 404 处理等），但均属于**同向补充**，信息并无冲突。本篇在保持硬资产（代码、SOP）完整的前提下，主要通过精简说明文字来避免啰嗦重复，因此不涉及「多个版本合并为单一版本并放弃其余版本」的强合并场景。故暂按占位处理：
> 
- （占位示例）若未来在 01_CORE_On-Page 与 06_Tech_Infra 中对「Canonical 使用规范」进行版本合并，需在此列出：
    - 原版本 A（来自文档《01_CORE_[On-Page.md](http://On-Page.md)》的 Canonical 说明段落原文）。
    - 原版本 B（来自《06_Tech_Infra》旧版本的 Canonical 说明段落原文）。
    - 标明最终保留版本所在文档与位置。

### C. 冲突内容及其不同版本

> 按「结论 / 观点不一致即视为冲突」的标准，本轮对 01–05 与 06 之间进行句子级对比时：
> 

> - 关于子域 vs 子目录、301 vs 302、Soft 404 处理、JS 渲染等议题，所有文档给出的结论方向一致，仅在粒度与场景举例上有差异；
> 

> - 未发现「前文认为 A 更优，而本篇认为 B 更优」这类需要显式标记的冲突。
> 

> 
> 

> 因此：
> 

> - 未在 01–05 号前文中插入形如「本段为来自后续文档的补充建议：……」的批注行；
> 

> - 本小节暂不列出具体冲突案例，以下为未来发生冲突时的填充模版：
> 

> 
> 

> - 示例占位：
> 

> - 来自文档《X》的原文句子 A：……
> 

> - 来自文档《06_Tech_Infra》的原文句子 B：……
> 

> - 已在文档《X》对应位置插入：`本段为来自后续文档《06_Tech_Infra》的补充建议：……`，说明新版架构对原规则的调整或限定适用场景。
>