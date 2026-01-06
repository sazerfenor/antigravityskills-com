---
description: SEO 知识库索引 - 告诉 Agent 在哪里找什么
---

# SEO 知识库索引

## 快速定位表

| 你要查的内容 | 文件 | 关键章节 |
|-------------|------|----------|
| Title/Description 长度 | `01_fundamentals.md` | `#organize-your-site` |
| 如何让 Google 发现页面 | `01_fundamentals.md` | `#help-google-find-your-content` |
| E-E-A-T 内容质量 | `01_fundamentals.md` | `#helpful-content` |
| robots.txt 配置 | `02_crawling.md` | `#robots-txt` |
| 爬取预算优化 | `02_crawling.md` | `#crawl-budget` |
| Sitemap 配置 | `02_crawling.md` | `#sitemap` |
| Canonical 标签 | `03_indexing.md` | `#canonical-urls` |
| noindex/nofollow | `03_indexing.md` | `#robots-meta-tags` |
| 搜索结果展示元素 | `04_appearance.md` | `#visual-elements` |
| Rich Results 类型 | `04_appearance.md` | `#rich-results` |
| VideoObject Schema | `05_structured_data.md` | `#VideoObject` |
| BroadcastEvent (直播) | `05_structured_data.md` | `#LIVE-Badge` |
| Clip (视频章节) | `05_structured_data.md` | `#Key-Moments` |
| FAQ Schema | `05_structured_data.md` | `#FAQPage` |
| HowTo Schema | `05_structured_data.md` | `#HowTo` |
| JavaScript 渲染 | `06_javascript_seo.md` | `#how-google-processes-javascript` |
| SPA SEO | `06_javascript_seo.md` | `#spa-seo` |
| hreflang 配置 | `07_international.md` | `#hreflang` |
| 多语言 SEO | `07_international.md` | `#multilingual` |
| 垃圾内容政策 | `08_spam_policy.md` | 全文 |
| Link Spam | `08_spam_policy.md` | `#link-spam` |

## 知识文件清单

| 文件 | 覆盖主题 | 来源 |
|------|---------|------|
| `01_fundamentals.md` | 搜索基础、SEO 入门、E-E-A-T | fundamentals.md |
| `02_crawling.md` | 爬虫、robots.txt、Sitemap | crawling.md |
| `03_indexing.md` | 索引、canonical、noindex | indexing.md |
| `04_appearance.md` | 搜索结果展示、Rich Results | appearance.md |
| `05_structured_data.md` | JSON-LD 模板、Schema 类型 | specialty.md |
| `06_javascript_seo.md` | SPA SEO、渲染问题 | fundamentals.md (提取) |
| `07_international.md` | hreflang、多语言 SEO | specialty.md (提取) |
| `08_spam_policy.md` | 垃圾内容定义、处罚机制 | other.md |

## 使用规则

> [!CAUTION]
> **强制查阅规则**
> 
> 1. SEO Agent 在做任何判断前，**必须**先查阅相关知识文件
> 2. 每条建议/判断**必须**标注 `[依据: 文件#章节]`
> 3. 如果知识库中没有相关内容，**必须**标注 `[🔍 需验证]`
> 4. **禁止**基于训练数据"脑补" SEO 规则

## 知识库路径

```
.agent/knowledge/seo/
├── 01_fundamentals.md
├── 02_crawling.md
├── 03_indexing.md
├── 04_appearance.md
├── 05_structured_data.md
├── 06_javascript_seo.md
├── 07_international.md
└── 08_spam_policy.md
```
