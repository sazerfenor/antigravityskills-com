---
description: SEO/GEO 一体化优化工作流 - 从业务理解到页面验证的全链路覆盖。支持 Full Mode 和 Quick Mode。
---

# SEO/GEO 优化工作流 V4.5

> **版本**: 4.5 | **日期**: 2025-12-25
> **设计目标**: 业务驱动的 SEO + GEO 双轨优化

## 📚 Agent Roster

| Agent | 文件路径 | Phase |
|-------|---------|-------|
| **business-analyst** | [business-analyst.md](seo-optimization/business-analyst.md) | -2 |
| **keyword-researcher** | [keyword-researcher.md](seo-optimization/keyword-researcher.md) | -1 |
| **strategy-lead** | [strategy-lead.md](seo-optimization/strategy-lead.md) | 0 |
| **structure-architect** | [structure-architect.md](seo-optimization/structure-architect.md) | 1 |
| **technical-auditor** | [technical-auditor.md](seo-optimization/technical-auditor.md) | 2 |
| **seo-content-engineer** | [seo-content-engineer.md](seo-optimization/seo-content-engineer.md) | 3a |
| **geo-content-engineer** | [geo-content-engineer.md](seo-optimization/geo-content-engineer.md) | 3b |
| **page-verifier** | [page-verifier.md](seo-optimization/page-verifier.md) | 4 |

---

## 🚦 运行模式

| 模式 | 路径 | 适用场景 |
|------|------|----------|
| **Full** | -2 → -1 → 0 → 1 → 2 → 3a → 3b → 4 | 新项目/全面优化 |
| **Quick** | -1 → 0 → 1 → 2 → 3a → 3b → 4 | 已了解业务 (⚠️) |
| **Audit** | 2 → 4 | 仅技术审计 |

---

## 📋 Phase -2: 业务理解

Call /business-analyst

> [!CAUTION]
> **SEO 的第一步不是关键词，而是理解业务**

**INPUT**: website_url + user_description (可选)
**OUTPUT**: 业务理解报告

**GATE**:
- 产品一句话/ICP/USP 无法确定 → ⏸️ PAUSE 询问用户
- 信息充足 → ✅ PASS

### ⏸️ CHECKPOINT -2
> **选项**: "继续" / "补充信息"

---

## 📋 Phase -1: 关键词研究

Call /keyword-researcher

**INPUT**: 业务理解报告 + 种子词
**OUTPUT**: 关键词研究报告

**强制工具**: `browser_subagent` (Google Trends) ✅

**GATE**:
- 可行性评分 ≥ 7 → ✅ PASS
- 评分 5-6 → ⚠️ WARNING，继续但建议优化
- 评分 < 5 → ❌ REJECT，**必须**输出替代词

### ⏸️ CHECKPOINT -1
> **选项**: "继续" / "更换关键词" / "放弃"

---

## 📋 Phase 0: 策略决策

Call /strategy-lead

**INPUT**: 关键词研究报告 + 业务理解报告
**OUTPUT**: 策略决策报告

**执行**:
1. WebSearch SERP 分析
2. 3C 意图分析
3. Business Score 评估
4. Topic Cluster 定位

**GATE**: Business Score = 0 → ❌ 终止

### ⏸️ CHECKPOINT 0
> **选项**: "继续" / "调整策略"

---

## 📋 Phase 1: 信息架构

Call /structure-architect

**INPUT**: 策略决策报告 + 关键词簇
**OUTPUT**: 信息架构报告

**执行**:
1. URL 设计
2. H1-H6 层级规划
3. 内链策略

---

## 📋 Phase 2: 技术审计

Call /technical-auditor

> [!IMPORTANT]
> **强制使用 `browser_subagent` 进行实际页面检查**

**INPUT**: URL
**OUTPUT**: 技术审计报告

**执行**:
1. 浏览器抓取页面
2. Meta 标签检查 (Title 50-60, Desc 150-160)
3. Schema JSON-LD 验证
4. SSR/CSR 检查
5. CWV 预检
6. AI 爬虫配置检查

**强制工具**: `browser_subagent` ✅

### ⏸️ CHECKPOINT 2
> **选项**: "继续" / "先修复技术问题"

---

## 📋 Phase 3a: SEO 内容优化

Call /seo-content-engineer

**INPUT**: 关键词报告 + 结构报告 + 页面内容
**OUTPUT**: SEO 内容优化报告

**职责** (边界明确):
- ✅ 关键词密度和分布
- ✅ H1-H6 结构优化
- ✅ Meta 标签撰写
- ✅ 内链锚文本设计
- ❌ **不负责** Snippet/Schema/Brand (由 3b 处理)

---

## 📋 Phase 3b: GEO 内容优化

Call /geo-content-engineer

**INPUT**: 关键词报告 + 业务报告 + 页面内容
**OUTPUT**: GEO 内容优化报告

**职责** (边界明确):
- ✅ Snippet Package 设计
- ✅ FAQ/HowTo Schema
- ✅ Brand Injection
- ✅ Anti-Flattening 术语
- ❌ **不负责** 关键词密度/Meta (由 3a 处理)

---

## 📋 Phase 4: 最终验证

Call /page-verifier

**INPUT**: 已优化的页面 URL
**OUTPUT**: 验证总结报告

**执行**:
1. 浏览器实际验证 + 截图
2. PageSpeed Insights 检查
3. 索引状态确认
4. Before/After 对比

**强制工具**: `browser_subagent` ✅

---

## 📤 输出结构

```
SEO 优化报告/
├── 01_业务理解报告.md      (Phase -2)
├── 02_关键词研究报告.md    (Phase -1)
├── 03_策略决策报告.md      (Phase 0)
├── 04_信息架构报告.md      (Phase 1)
├── 05_技术审计报告.md      (Phase 2)
├── 06_SEO内容优化报告.md   (Phase 3a)
├── 07_GEO内容优化报告.md   (Phase 3b)
└── 08_验证总结报告.md      (Phase 4)
```

---

## 工具要求汇总

| Phase | Agent | WebSearch | Browser |
|-------|-------|-----------|---------|
| -2 | business-analyst | ✅ | ✅ 强制 |
| -1 | keyword-researcher | ✅ | ✅ 强制 |
| 0 | strategy-lead | ✅ 强制 | - |
| 1 | structure-architect | - | - |
| 2 | technical-auditor | - | ✅ 强制 |
| 3a | seo-content-engineer | - | - |
| 3b | geo-content-engineer | ✅ | - |
| 4 | page-verifier | ✅ | ✅ 强制 |

---

**Version**: 4.5 | **Created**: 2025-12-25
