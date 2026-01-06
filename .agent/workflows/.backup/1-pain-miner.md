---
description: 深潜挖掘 B2B 痛点 - 多维数据交叉验证商业机会 (Reddit/Trends/Upwork)
---

# Pain Miner Orchestrator

协调 5 个专属 Agent 完成痛点挖掘流程。

> **架构**: 多 Agent 协调系统 (v6.0)

---

## 🌐 Language Protocol

| 场景 | 语言 |
|:--|:--|
| 执行报告 | **中文** (强制) |
| 数据库字段值 | 英文 |
| 日志输出 | 中文 |

> [!CAUTION]
> 本工作流产出的 **执行报告** 必须使用 **中文**。
> 如果检测到英文标题/内容，应自动翻译后输出。

---

## 使用方法

| 命令 | 说明 |
|------|------|
| `/pain-miner` | 主入口，显示状态后询问你想执行的操作 |

---

## Agent 清单

| Agent | 职责 | 数据所有权 |
|-------|------|-----------|
| [domain-explorer](pain-miner/domain-explorer.md) | 领域探索、Subreddit 发现 | `domains`, `complaint_library` |
| [subreddit-miner](pain-miner/subreddit-miner.md) | 社区深挖、帖子收集 | `subreddits` |
| [post-analyzer](pain-miner/post-analyzer.md) | 帖子分析、痛点提取 | `leads` (Analysis Only) |
| [keyword-extractor](pain-miner/keyword-extractor.md) | 关键词提取、SEO 策略 | `keywords`, `lead_keywords` |
| [trend-validator](pain-miner/trend-validator.md) | Trends/Upwork 验证 | `validations` |
| [gold-curator](pain-miner/gold-curator.md) | 最终验证、金矿管理 | `gold_leads` |

---

## 数据文件

| 文件 | 路径 |
|------|------|
| 数据库 | `pain-miner-dashboard/pain-miner.db` (SQLite) |
| 主要表 | `domains`, `subreddits`, `keywords`, `leads`, `gold_leads` |
| 调研日志 | `pain-miner-dashboard/docs/data/research_log.md` |

---

## 执行 SLA (最低工作量要求)

> ⛔ **MANDATORY**: 每个 Agent 必须达成以下最低标准，否则禁止进入下一个 Agent。

| Agent | 最低执行标准 | 计算方式 |
|-------|------------|--------|
| Domain Explorer | 至少搜索 2 个抖怨词 | 如果搜索结果 < 2 则 FAIL |
| Subreddit Miner | 处理所有 new Subreddit | 100% 或写明具体原因 |
| Post Analyzer | MIN(5, 未分析总数) | 最少 5 个或全部 |
| Keyword Extractor | 提取 2+ 竞品词 | 必须从高分 Lead 生成竞品词 |
| Trend Validator | 处理所有 new/pending 关键词 | 100% 或写明具体原因 |
| Gold Curator | 处理所有 verified 关键词 | 100% 或写明具体原因 |

> [!CAUTION]
> **⛔ SLA_GATE (每个 Agent 完成后必须输出)**:
> ```
> 🔍 SLA_GATE:
>   - Agent: {Agent 名称}
>   - 要求数量: {N}
>   - 实际处理: {M}
>   - 完成率: {M/N * 100}%
>   - OVERALL: {PASS (达标) / FAIL (未达标)}
> ```
> **如果 OVERALL = FAIL**: ⛔ 禁止进入下一个 Agent，返回继续处理未完成项

---

## 禁止词列表 (报告中不得出现)

| 禁止词 | 原因 |
|--------|------|
| `simulated` | 表示模拟数据，非真实执行 |
| `demo` | 表示演示数据 |
| `模拟` | 中文模拟标记 |
| `placeholder` | 占位符残留 |
| `TODO` | 未完成标记 |

---

## 执行流程

// turbo-all

### Step 1: 检查数据库状态

查询 SQLite 数据库状态并输出:

```sql
-- 使用 mcp_sqlite_read_query 工具
SELECT status, COUNT(*) FROM subreddits GROUP BY status;
SELECT status, COUNT(*) FROM keywords GROUP BY status;
SELECT COUNT(*) FROM leads WHERE analyzed = 0;
SELECT COUNT(*) FROM gold_leads;
```

输出当前状态:

```markdown
📊 **DB Status**:
- Subreddits: X new / Y mined / Z verified
- Keywords: X new / Y pending / Z verified
- Leads: X unanalyzed
- Gold Leads: X total
```

### Step 2: 执行完整流程

> ⚡ **直接执行**: 无需询问，自动按顺序执行全部 6 个 Agent。

按顺序执行:

1. **Domain Explorer** (探索新领域)
   - 执行 `domain-explorer.md` 的 Step 1-6
   - 完成后继续下一步
   
2. **Subreddit Miner** (挖掘帖子)
   - 执行 `subreddit-miner.md` 的 Step 1-6
   - 完成后继续下一步
   
3. **Post Analyzer** (分析痛点)
   - 执行 `post-analyzer.md` 的 Step 1-5
   - 完成后继续下一步

4. **Keyword Extractor** (提取关键词) [New v6.3]
   - 执行 `keyword-extractor.md` 的 Step 1-4
   - 必须确保 `competitor keywords` 生成
   - 完成后继续下一步
   
5. **Trend Validator** (验证趋势)
   - 执行 `trend-validator.md` 的 Step 1-6
   - 完成后继续下一步
   
6. **Gold Curator** (汇总金矿)
   - 执行 `gold-curator.md` 的 Step 1-6
   - 完成后输出最终报告

---

### Step 3: 生成执行报告 (强制)

> ⛔ **MANDATORY**: 本步骤包含 6 个子步骤 (3.1-3.6)，**全部必须按顺序执行，禁止跳过任何一个**。

## ✅ DO (必须做)
- 每个 Agent 章节输出 GATE 结构
- 使用 `browser_subagent` 获取真实数据
- 从数据库读取已有记录
- 错误时输出 ERROR_HANDLED 并说明原因
- 全部使用**中文**

## ❌ DON'T (避免做)
- 跳过步骤时不输出原因 → 无法追溯
- 用占位符 `{xxx}` 替代真实数据 → 报告失去价值
- 推测未查询的结果 → 误导决策
- 使用英文写报告 → 违反语言协议

---

**📋 通用 GATE 模板** (适用于所有 Agent):
```
🔍 GATE:
  - Data: {查询结果数或摘要}
  - Evidence: {SQL 语句或截图路径}
  - Decision: {PROCEED}  # ⛔ 禁止 SKIP
  - Confidence: {HIGH/LOW}
```

---

**⏸️ PRE-GENERATION CHECK (必须执行)**:
```
- [ ] 已从数据库读取了 leads/gold_leads 数据
- [ ] 每个 Agent 部分都有 GATE 输出
- [ ] 无占位符 `{...}` 残留
- [ ] 全部使用中文
```

---

### Step 3.1: 报告数据一致性验证 (MANDATORY)

> ⛔ **CRITICAL**: 在生成报告前，必须验证执行数据与报告内容一致。

#### 2.95.1: 强制 SQL 查询 (必须实际执行)

```sql
-- 1. 本轮新增 Subreddits
SELECT COUNT(*) as new_subreddits FROM subreddits 
WHERE created_at > datetime('now', '-1 hour');

-- 2. 本轮新增 Leads
SELECT COUNT(*) as new_leads FROM leads 
WHERE created_at > datetime('now', '-1 hour');

-- 3. 本轮分析的 Leads
SELECT COUNT(*) as analyzed_leads FROM leads 
WHERE analyzed = 1 AND updated_at > datetime('now', '-1 hour');

-- 4. 本轮验证的 Keywords
SELECT COUNT(*) as verified_keywords FROM keywords 
WHERE status = 'verified' AND updated_at > datetime('now', '-1 hour');

-- 5. 本轮新增 Gold Leads
SELECT COUNT(*) as new_gold_leads FROM gold_leads 
WHERE created_at > datetime('now', '-1 hour');
```

> [!CAUTION]
> **⛔ DATA_INTEGRITY_GATE (必须输出)**:
> ```
> 🔍 DATA_INTEGRITY_GATE:
>   ┌─────────────────────┬──────────────┬──────────────┬─────────┐
>   │ 数据类型            │ 执行记录数   │ 数据库实际数 │ 一致性  │
>   ├─────────────────────┼──────────────┼──────────────┼─────────┤
>   │ 新增 Subreddits     │ {执行时记录} │ {SQL 查询}   │ ✅/❌   │
>   │ 新增 Leads          │ {执行时记录} │ {SQL 查询}   │ ✅/❌   │
>   │ 已分析 Leads        │ {执行时记录} │ {SQL 查询}   │ ✅/❌   │
>   │ 已验证 Keywords     │ {执行时记录} │ {SQL 查询}   │ ✅/❌   │
>   │ 新增 Gold Leads     │ {执行时记录} │ {SQL 查询}   │ ✅/❌   │
>   └─────────────────────┴──────────────┴──────────────┴─────────┘
>   
>   OVERALL: {PASS (全部 ✅) / FAIL (任意 ❌)}
> ```
> **如果 OVERALL = FAIL**: 以数据库数据为准修正报告

---

### Step 3.2: GATE 输出保留检查 (MANDATORY)

**必须保留的 GATE 列表**:
| Agent | GATE 名称 |
|-------|----------|
| Domain Explorer | DECISION_GATE |
| Subreddit Miner | DECISION_GATE + LOOP_PROGRESS + SUBREDDIT_LOOP_COMPLETION_GATE |
| Post Analyzer | DECISION_GATE + ANALYSIS_PROGRESS_GATE + ANALYSIS_COVERAGE_GATE |
| Trend Validator | SINGLE_KEYWORD_VALIDATION_GATE + KEYWORD_LOOP_COMPLETION_GATE + UPWORK_VALIDATION_GATE |
| Gold Curator | GATE |

> [!CAUTION]
> **⛔ GATE_PRESERVATION_CHECK (必须输出)**:
> ```
> 🔍 GATE_PRESERVATION_CHECK:
>   - Domain Explorer GATE: {保留/遗漏}
>   - Subreddit Miner GATE: {N/N 个保留}
>   - Post Analyzer GATE: {M/M 个保留}
>   - Trend Validator GATE: {K/K 个保留}
>   - Gold Curator GATE: {保留/遗漏}
>   
>   遗漏的 GATE: {列表，如无则写 "无"}
>   OVERALL: {PASS / FAIL}
> ```
> **如果有遗漏**: 返回补充后再生成报告

---

### Step 3.3: 报告写入前最终验证 (MANDATORY)

> ⛔ **CRITICAL**: 写入文件前的最后一道关卡

> [!CAUTION]
> **⛔ FINAL_REPORT_VERIFICATION (必须在 write_to_file 前输出)**:
> ```
> 🔍 FINAL_REPORT_VERIFICATION:
>   
>   前置 GATE 检查:
>   - DATA_INTEGRITY_GATE: {PASS/未执行}
>   - GATE_PRESERVATION_CHECK: {PASS/未执行}
>   - REPORT_STRUCTURE_GATE: {PASS/未执行}
>   
>   数据完整性:
>   - 报告 leads 数 = 数据库数: {YES/NO}
>   - 报告 keywords 数 = 数据库数: {YES/NO}
>   - 报告 gold_leads 数 = 数据库数: {YES/NO}
>   
>   格式检查:
>   - 表格数量: {N} (≥6: ✅/❌)
>   - 占位符残留: {无/有}
>   - 语言: {中文/混合}
>   
>   FINAL VERDICT: {APPROVED / BLOCKED}
> ```
> 
> **如果 FINAL VERDICT = BLOCKED**: ❌ 禁止执行 write_to_file，返回修复

---

### Step 3.4: 报告结构 GATE (MANDATORY)

> ⛔ **在输出最终报告之前，必须先输出以下检查清单**:

```
🔍 REPORT_STRUCTURE_GATE:
  - 包含 Domain Explorer 章节 + 实际搜索 Query: [ ]
  - 包含 Subreddit Miner 章节 + 提取的帖子表格: [ ]
  - 包含 Post Analyzer 评分明细表格: [ ]
  - 包含 Trend Validator 验证结果表格: [ ]
  - 包含 Gold Curator 详情表格: [ ]
  - 表格数量 >= 6: [计数: __]
  - 语言 = 中文: [ ]
  - 无占位符 `{xxx}` 残留: [ ]
  - 无禁止词 (simulated/demo/模拟/TODO): [ ]  # ⛔ 新增
  
  OVERALL: [PASS/FAIL]
```

⛔ **如果 OVERALL = FAIL**: 返回修正后再生成报告。禁止跳过此检查。

---

> ⛔ **MANDATORY**: 必须按以下模板生成**中文**报告。

**报告路径**: `pain-miner-dashboard/docs/reports/pain-miner-run-{YYYY-MM-DD}-runN.md`

**生成指令 (Chain of Thought) - 必须逐步执行并显示中间结果**:

> ⛔ 每个步骤必须输出结果后才能进入下一步。禁止跳过。

**Step A: 从 execution_logs 查询本轮执行记录**
```sql
SELECT * FROM execution_logs WHERE run_id = 'runN' ORDER BY created_at;
```

**Step B: 从数据库提取本轮新增数据**
```sql
-- 获取本轮新增的 leads
SELECT id, title, upvotes, relevance_score, pain_score, emotion_score 
FROM leads WHERE created_at > datetime('now', '-1 hour');

-- 获取本轮创建的 keywords
SELECT keyword, type, discovered_from 
FROM keywords WHERE created_at > datetime('now', '-1 hour');

-- 获取本轮创建的 gold_leads
SELECT pain_point, potential_product, opportunity_score 
FROM gold_leads WHERE created_at > datetime('now', '-1 hour');
```

**Step C: 按模板填充** (每个 {{占位符}} 必须替换为真实数据)

**Step D: 验证 REPORT_STRUCTURE_GATE**

检查所有必须字段是否已填写。

---

**报告模板 (必须精确遵循以下结构)**:
```markdown
# Pain Miner 执行报告
**执行时间**: {从系统获取当前时间}
**执行模式**: 🚀 完整流程 (Run N)

---

## 📊 数据库初始状态
| 表 | 状态 |
|---|---|
| subreddits | {实际数值} |
| keywords | {实际数值} |
| leads | {实际数值} 未分析 |
| gold_leads | {实际数值} 总计 |

---

## 🔍 Domain Explorer
**执行状态**: {✅ 完成 / ⏭️ 跳过 (原因)}

**使用的抱怨词**:
- `{keyword_1}` (priority: N)
- `{keyword_2}` (priority: N)

**实际执行的搜索查询**:
`{复制粘贴实际发送给 browser_subagent 的 query}`

**发现的 Subreddits**:
| 名称 | 命中数 | B2B 评估 | 状态 |
|-----|-------|---------|------|
| {从数据库读取} | {hit_count} | {是否符合 B2B} | {status} |

---

## ⛏️ Subreddit Miner
**执行状态**: ✅ 完成

**挖掘详情**:
| Subreddit | 搜索策略 | 结果数 | 使用的 Query |
|-----------|---------|-------|-------------|
| {name} | Precision/Action/Intent | {N} | `{actual_query}` |

**提取的帖子** (前 5 个):
| # | 标题 | 发布日期 | Upvotes | URL |
|---|------|---------|---------|-----|
| 1 | {title} | {post_date} | {upvotes} | [🔗]({source_url}) |

---

## 📖 Post Analyzer
**执行状态**: ✅ 完成

**评分明细** (所有已分析帖子):
| ID | 标题 | 痛点摘要 | 相关性 | 痛点 | 情绪 |
|----|------|---------|--------|------|------|
| {id} | {title} | {summary} | {relevance}/10 | {pain}/10 | {emotion}/10 |

> [!IMPORTANT]
> **v5.0 必须输出**: 所有已分析的帖子都必须列出，不可省略。

**高价值 Leads** (relevance >= 7):
- Lead #{id}: {pain_point_summary}

**提取的关键词** (v5.0 多维度发散):
| 类型 | 关键词 | 来源 Lead |
|------|--------|----------|
| 问题表述 | {keyword} | #{lead_id} |
| 解决方案 | {keyword} | #{lead_id} |
| 竞品替代 | {keyword} | #{lead_id} |

**发现的竞品**:
| 竞品名称 | 情感倾向 | 提及次数 | 功能缺口 |
|---------|---------|---------|---------|
| {tool_name} | {positive/negative/neutral} | {N} | {feature_gaps} |

---

## 📈 Trend Validator
**执行状态**: ✅ 完成

**验证详情**:
| 关键词 | Trends vs GPTs | 趋势方向 | Upwork 结果 | 语义相关 | Verdict |
|-------|---------------|---------|------------|---------|---------|
| {keyword} | {X}% | {rising/stable/declining} | {N} | {High/Medium/Low} | {verified/pending/dead} |

**Related Queries 发现** (v5.0 新增):
| 来源词 | Top Queries | Rising Queries | Breakout |
|--------|------------|---------------|----------|
| {parent} | {top_list} | {rising_list} | {breakout_list} |

**红海评估** (v5.0 新增):
| 关键词 | 广告数 | AI Overview | 强竞品数 | 红海评分 | 判定 |
|-------|-------|------------|---------|---------|------|
| {keyword} | {ads_count} | {yes/no} | {N} | {score}/100 | {🟢opportunity/🟡caution/🔴red_ocean} |

---

## 🏆 Gold Curator
**执行状态**: ✅ 完成

**Gold Leads 详情**:
| # | 痛点 | 产品方向 | 机会评分 | 置信度 | 样本量 |
|---|------|---------|---------|---------|----|
| 1 | {pain_point} | {potential_product} | {opportunity_score}/100 | {confidence} | {sample_size} |

**排除的红海词** (v5.0 新增):
| 关键词 | 红海评分 | 排除原因 |
|-------|---------|---------|
| {keyword} | {score}/100 | {reason} |

---

## 📝 数据变更摘要
| 表 | 新增 | 更新 |
|---|-----|-----|
| subreddits | +{N} | +{M} |
| leads | +{N} | +{M} (analyzed) |
| keywords | +{N} | +{M} |
| competitors | +{N} | +{M} |
| gold_leads | +{N} | - |

---

## 💡 下一步建议
1. {基于 Gold Leads 的具体建议}
2. {基于 Trend Validation 的下一步}
3. {需要进一步验证的 Breakout 词}
```

---

### Step 3.5: 报告模板填充 (MANDATORY)

> ⛔ **MANDATORY**: 按模板生成报告，所有 `{占位符}` 必须替换为真实数据。

(报告模板在上方 Step 3.4 后)

---

### Step 3.6: Post-Check 验证 (MANDATORY)

在写入报告文件前，执行以下检查：

**🔍 POST-CHECK**:
```
✅ 验证清单:
- [ ] 每个 Agent 章节都有 GATE 输出？
- [ ] 无占位符 `{xxx}` 残留？
- [ ] 语言 = 中文？
- [ ] 表格数量 >= 6？
- [ ] 每个错误都有 ERROR_HANDLED 记录？
```

**如果任一检查失败**: 返回修复后再输出。

---

## 协调规则

> [!IMPORTANT]
> **单一职责**: Orchestrator 只负责调度，不执行任何具体的数据操作。

> [!TIP]
> **平台健康监控**: 当连续 3 次 Upwork 被 Cloudflare 拦截时，
> 自动在输出中提示切换到备用平台或调整挖掘策略。

- ❌ 不直接写入数据库 (只读查询权限)
- ❌ 不执行 web 搜索
- ✅ 只通过 mcp_sqlite_read_query 查询状态
- ✅ 调用其他 Agent (执行其步骤)
- ✅ 汇总并输出结果

---

**Version**: 6.3 | **Type**: Orchestrator | **Updated**: 2025-12-25
