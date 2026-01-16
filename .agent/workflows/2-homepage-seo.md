---
description: 主页 On-Page SEO 建设工作流 - 从关键词策略到 SEO 施工规格的完整流程
---

# Homepage On-Page SEO Builder

> **版本**: 2.1 | **适用**: SaaS/工具类产品主页
> **预期产出**: SEO 施工规格文档 + 前端建议 + 链接策略

## ⚡ 执行策略

> [!IMPORTANT]
> **快速失败原则**
> 
> - `browser_subagent` 超时 **30 秒**立即回退到项目代码
> - 任何工具失败都有备选方案
> - 不要无限重试

**并行优先**: Phase 0 的用户询问、search_web、Reddit 可并行执行

## 🚦 适用条件

**触发本工作流**:
- 需要为主页（Homepage）进行 SEO 优化
- 新产品上线前的主页 SEO 规划
- 现有主页 SEO 改版

**不适用**:
- 博客文章 SEO → 使用 `/1-seo-optimization`
- 产品内页 SEO → 使用 `/1-seo-optimization`

## 📚 Agent Roster

| Agent | 文件路径 | 阶段 |
|-------|---------|------|
| **keyword-strategy** | [keyword-strategy.md](homepage-seo/keyword-strategy.md) | Phase 0 |
| **user-insight-miner** | [user-insight-miner.md](homepage-seo/user-insight-miner.md) | Phase 1 |
| **page-auditor** | [page-auditor.md](homepage-seo/page-auditor.md) | Phase 2 |
| **seo-spec-designer** | [seo-spec-designer.md](homepage-seo/seo-spec-designer.md) | Phase 3 |
| **frontend-advisor** | [frontend-advisor.md](homepage-seo/frontend-advisor.md) | Phase 4 |
| **link-strategist** | [link-strategist.md](homepage-seo/link-strategist.md) | Phase 5 |

---

## 📁 输出目录

```
artifacts/homepage-seo/
├── 01_keyword_strategy.md    # Phase 0 (含 keywords + business_brief)
├── 02_user_persona.md        # Phase 1
├── 03_page_audit.md          # Phase 2
├── 04_seo_spec.md            # Phase 3
├── 05_frontend_spec.md       # Phase 4
└── 06_link_strategy.md       # Phase 5
```

---

## 📋 Phase 0: 关键词策略与商业摘要

Call /keyword-strategy

> **V2.0 变更**: 合并原 Phase 0 (keyword-confirmer) + Phase 1 (business-brief-builder)

**INPUT**: 用户请求 + 项目 URL (可选)
**OUTPUT**: `01_keyword_strategy.md`
- keywords (主词 + 长尾词 + 提问词)
- business_brief (产品定义 + USP + ICP)

**执行 5 步骤**:
1. **项目深度调研**: 用户询问 + `browser_subagent` 访问
2. **关键词市场调研**: `search_web` + Reddit MCP
3. **提议关键词候选**: 向用户呈现 2-3 个候选
4. **用户确认**: 等待用户选择并生成完整矩阵
5. **输出合并产物**: keywords + business_brief

**工具使用**:
- `browser_subagent` (必选): 访问项目 URL
- `search_web` (必选): 关键词市场调研
- Reddit MCP (可选): 用户语言调研

### ⏸️ CHECKPOINT 0
> **必须**: 用户确认关键词列表
> **选项**: "确认" / "修改" / "放弃"

---

## 📋 Phase 1: 用户需求挖掘

Call /user-insight-miner

**INPUT**:
- `keywords` (from Phase 0)
- `business_brief` (from Phase 0)

**OUTPUT**: `02_user_persona.md`
- TOP 痛点排名 (≥3 个，含原文引用)
- 用户类型细分
- 内容吸引策略

**执行**:
1. 使用 Reddit MCP 搜索:
   - `search_reddit`: 关键词搜索
   - `browse_subreddit`: 相关社区
   - `get_post_details`: 高赞帖子详情
2. 使用 `search_web` 补充搜索
3. 提炼痛点，必须有原文引用

**GATE**: 至少找到 3 个有引用的痛点

### ⏸️ CHECKPOINT 1
> **选项**: "继续" / "需要更多调研"

---

## 📋 Phase 2: 现有页面审计

Call /page-auditor

**INPUT**: `homepage_url`
**OUTPUT**: `03_page_audit.md`

**执行 11 项技术检查**:
| # | 检查项 | 规格 |
|---|--------|------|
| 1 | Title Tag | 50-60 chars，前置关键词 |
| 2 | Meta Description | 150-160 chars，含 CTA |
| 3 | H1 | 唯一，与 Title 语义一致 |
| 4 | Canonical | 自引用绝对路径 |
| 5 | HTTPS | 全站强制 |
| 6 | robots meta | index, follow |
| 7 | 移动优先 | 响应式 |
| 8 | JS 渲染 | 关键内容在 HTML 可见 |
| 9 | Core Web Vitals | LCP < 2.5s |
| 10 | URL 结构 | 简短、小写 |
| 11 | sitemap.xml | 主页包含 |

**Skill**: 加载 `google-official-seo-guide`

### ⏸️ CHECKPOINT 2 (自动通过)

---

## 📋 Phase 3: SEO 规范设计

Call /seo-spec-designer

**INPUT**:
- `keywords` + `business_brief` (from Phase 0)
- `user_persona` (from Phase 1)
- `audit_report` (from Phase 2)

**OUTPUT**: `04_seo_spec.md`
- Title Tag (草稿)
- Meta Description (草稿)
- H1-H6 结构
- Schema JSON-LD (Organization + SoftwareApplication + FAQPage)
- 关键词布局计划
- GEO 优化清单

**Skill**: 加载 `google-official-seo-guide`

### ⏸️ CHECKPOINT 3
> **必须**: 用户确认 SEO 施工规格
> **选项**: "确认" / "修改" / "放弃"

---

## 📋 Phase 4: 前端设计建议

Call /frontend-advisor

**INPUT**:
- `seo_spec` (from Phase 3)
- `business_brief` (from Phase 0)

**OUTPUT**: `05_frontend_spec.md`
- 视觉风格定义
- 信息层次规划
- CTA 布局
- 响应式要点

**Skill**: 加载 `frontend-design`

### ⏸️ CHECKPOINT 4 (自动通过)

---

## 📋 Phase 5: 链接策略

Call /link-strategist

**INPUT**:
- `seo_spec` (from Phase 3)
- 项目结构

**OUTPUT**: `06_link_strategy.md`
- 内链拓扑 (主页 → 核心页面)
- 法律页面清单
- 外链引子策略

### ⏸️ CHECKPOINT 5 (最终输出)

---

## ✅ 最终输出

**主交付物**: `artifacts/homepage-seo/04_seo_spec.md`

**完整交付物**:
1. `01_keyword_strategy.md` - 关键词矩阵 + 商业摘要 ⭐
2. `02_user_persona.md` - 用户画像
3. `03_page_audit.md` - 现有页面审计
4. `04_seo_spec.md` - **SEO 施工规格** ⭐
5. `05_frontend_spec.md` - 前端设计规格
6. `06_link_strategy.md` - 链接策略

---

## Quality Checklist

- [ ] 用户确认主打关键词 (Phase 0)
- [ ] Business Brief 包含一句话价值描述 (Phase 0)
- [ ] 至少 3 个有引用的用户痛点 (Phase 1)
- [ ] 11 项技术检查完成 (Phase 2)
- [ ] 用户确认 SEO 施工规格 (Phase 3)
- [ ] Schema 包含 Organization + SoftwareApplication + FAQPage
- [ ] 关键词密度 >= 3%
- [ ] 内链深度 <= 3

---

**Version**: 2.0 | **Created**: 2026-01-16 | **Changes**: 合并 Phase 0+1 为 keyword-strategy
