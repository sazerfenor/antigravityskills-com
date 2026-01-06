---
description: 报告生成 Agent - 汇总执行结果生成最终报告
---

# Report Generator Agent

汇总所有 Agent 执行结果，验证数据一致性，生成最终报告。

> **v2.0 新增**: 从主文件提取，专注报告生成和验证。

---

## 数据所有权

| 数据 | 权限 | 说明 |
|------|------|------|
| 报告文件 | ✅ OWNER | 生成 `pain-miner-run-*.md` |
| 所有表 | 📖 Read Only | 只读查询汇总数据 |

---

## 输入规格

```yaml
INPUT:
  run_id: string                   # 本轮执行 ID
  execution_results:               # 6 个 Agent 的执行结果
    domain_explorer: object
    subreddit_miner: object
    post_analyzer: object
    keyword_extractor: object
    trends_validator: object
    demand_validator: object
    gold_curator: object
```

---

## 输出规格

```yaml
OUTPUT:
  report_path: string              # 报告文件路径
  validation_result: object        # 验证结果
    data_integrity: PASS | FAIL
    gate_preservation: PASS | FAIL
    structure_check: PASS | FAIL
```

---

## 执行步骤

// turbo-all

### Step 1: 数据一致性验证

> ⛔ **MANDATORY**: 在生成报告前，必须验证数据一致性。

```sql
-- 本轮新增数据
SELECT COUNT(*) as new_subreddits FROM subreddits 
WHERE created_at > datetime('now', '-1 hour');

SELECT COUNT(*) as new_leads FROM leads 
WHERE created_at > datetime('now', '-1 hour');

SELECT COUNT(*) as analyzed_leads FROM leads 
WHERE analyzed = 1 AND updated_at > datetime('now', '-1 hour');

SELECT COUNT(*) as verified_keywords FROM keywords 
WHERE status = 'verified' AND updated_at > datetime('now', '-1 hour');

SELECT COUNT(*) as new_gold_leads FROM gold_leads 
WHERE created_at > datetime('now', '-1 hour');
```

> [!CAUTION]
> **⛔ DATA_INTEGRITY_GATE**:
> ```
> 🔍 DATA_INTEGRITY_GATE:
>   ┌─────────────┬──────────────┬──────────────┬─────────┐
>   │ 数据类型    │ 执行记录数   │ 数据库实际数 │ 一致性  │
>   ├─────────────┼──────────────┼──────────────┼─────────┤
>   │ Subreddits  │ {执行时}     │ {SQL 查询}   │ ✅/❌   │
>   │ Leads       │ {执行时}     │ {SQL 查询}   │ ✅/❌   │
>   │ Keywords    │ {执行时}     │ {SQL 查询}   │ ✅/❌   │
>   │ Gold Leads  │ {执行时}     │ {SQL 查询}   │ ✅/❌   │
>   └─────────────┴──────────────┴──────────────┴─────────┘
>   OVERALL: {PASS / FAIL}
> ```
> **如果 FAIL**: 以数据库数据为准修正

### Step 2: GATE 保留检查

检查所有 Agent 的 GATE 输出是否保留：

| Agent | 必须保留的 GATE |
|-------|----------------|
| Domain Explorer | DECISION_GATE |
| Subreddit Miner | DECISION_GATE, LOOP_PROGRESS |
| Post Analyzer | DECISION_GATE, ANALYSIS_COVERAGE |
| Trends Validator | RELATED_QUERIES_GATE |
| Demand Validator | SEMANTIC_MATCH_GATE |
| Gold Curator | GOLD_CURATOR_GATE |

> [!CAUTION]
> **⛔ GATE_PRESERVATION_CHECK**:
> ```
> 🔍 GATE_PRESERVATION_CHECK:
>   - Domain Explorer: {保留/遗漏}
>   - Subreddit Miner: {N/N 个保留}
>   - Post Analyzer: {M/M 个保留}
>   - Trends Validator: {保留/遗漏}
>   - Demand Validator: {保留/遗漏}
>   - Gold Curator: {保留/遗漏}
>   OVERALL: {PASS / FAIL}
> ```

### Step 3: 报告结构验证

```
🔍 REPORT_STRUCTURE_GATE:
  - Domain Explorer 章节: [ ]
  - Subreddit Miner 章节: [ ]
  - Post Analyzer 评分表格: [ ]
  - Trends Validator 验证表格: [ ]
  - Demand Validator 验证表格: [ ]
  - Gold Curator 详情表格: [ ]
  - 表格数量 >= 6: [计数: __]
  - 语言 = 中文: [ ]
  - 无占位符残留: [ ]
  OVERALL: [PASS/FAIL]
```

### Step 4: 生成报告

**报告路径**: `pain-miner-dashboard/docs/reports/pain-miner-run-{YYYY-MM-DD}-run{N}.md`

**报告模板**:
```markdown
# Pain Miner 执行报告
**执行时间**: {timestamp}
**执行模式**: 🚀 完整流程 (Run N)

---

## 📊 数据库初始状态
| 表 | 状态 |
|---|---|
| subreddits | {N} new / {M} verified |
| keywords | {N} new / {M} verified |
| leads | {N} 未分析 |
| gold_leads | {N} 总计 |

---

## 🔍 Domain Explorer
{从 execution_results 提取}

## ⛏️ Subreddit Miner
{从 execution_results 提取}

## 📖 Post Analyzer
{从 execution_results 提取}

## 🧠 Keyword Extractor
{从 execution_results 提取}

## 📈 Trends Validator
{从 execution_results 提取}

## 💼 Demand Validator
{从 execution_results 提取}

## 🏆 Gold Curator
{从 execution_results 提取}

---

## 📝 数据变更摘要
| 表 | 新增 | 更新 |
|---|-----|-----|
| subreddits | +{N} | +{M} |
| leads | +{N} | +{M} |
| keywords | +{N} | +{M} |
| gold_leads | +{N} | - |

---

## 💡 下一步建议
1. {基于 Gold Leads 的建议}
2. {基于 Breakout 词的建议}
```

### Step 5: 最终验证

> ⛔ **在 write_to_file 前必须输出**:

```
🔍 FINAL_REPORT_VERIFICATION:
  前置 GATE 检查:
  - DATA_INTEGRITY_GATE: {PASS/FAIL}
  - GATE_PRESERVATION_CHECK: {PASS/FAIL}
  - REPORT_STRUCTURE_GATE: {PASS/FAIL}
  
  FINAL VERDICT: {APPROVED / BLOCKED}
```

**如果 BLOCKED**: ❌ 禁止 write_to_file，返回修复

### Step 6: 写入报告

使用 `write_to_file` 写入最终报告。

---

## 禁止词列表

报告中不得出现：
- `simulated`, `demo`, `模拟`, `placeholder`, `TODO`

---

**Version**: 2.0 | **Type**: Report Generator | **Updated**: 2025-12-26
