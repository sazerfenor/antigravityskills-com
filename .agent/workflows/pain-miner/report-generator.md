---
description: 报告生成 Agent - 汇总执行结果生成最终报告
---

# Report Generator Agent

汇总所有 Agent 执行结果，验证数据一致性，生成最终报告。

> **版本**: 10.0 (参见 [CHANGELOG](CHANGELOG.md))
> **核心约束**: 强制中文报告 + Gate 嵌入模板

---

## 🚫 禁止事项 (Strict Constraints)

> [!CAUTION]
> **违反以下任一条，报告无效**

1. **禁止英文报告**: 除数据库字段值 (如 `status: verified`) 外，所有描述性文字必须使用**中文**。
2. **禁止跳过 Gate**: 必须在报告中输出 `DATA_INTEGRITY_GATE`、`GATE_PRESERVATION_CHECK`、`BANNED_WORDS_GATE`。
3. **禁止模板外格式**: 必须严格按照定义的模板结构生成，不得自创格式。

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

## 执行步骤\n
### Step 1: 数据一致性验证

> ⛔ **MANDATORY**: 在生成报告前，必须验证数据一致性。

**工具**: 使用 `mcp_sqlite_read_query` 执行以下查询:
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
> **⛔ DATA_INTEGRITY_GATE (v2.1 强化)**:
> ```
> 🔍 DATA_INTEGRITY_GATE:
>   ┌─────────────┬──────────────┬──────────────┬─────────┬─────────────┐
>   │ 数据类型    │ Agent 上报   │ 数据库实际   │ 一致性  │ 修正动作    │
>   ├─────────────┼──────────────┼──────────────┼─────────┼─────────────┤
>   │ Subreddits  │ {agent_n}    │ {db_n}       │ ✅/❌   │ 采用 DB 值  │
>   │ Leads       │ {agent_n}    │ {db_n}       │ ✅/❌   │ 采用 DB 值  │
>   │ Keywords    │ {agent_n}    │ {db_n}       │ ✅/❌   │ 采用 DB 值  │
>   │ Gold Leads  │ {agent_n}    │ {db_n}       │ ✅/❌   │ 采用 DB 值  │
>   └─────────────┴──────────────┴──────────────┴─────────┴─────────────┘
>   OVERALL: {PASS / CORRECTED / FAIL}
> ```
> **如果有任何不一致**: 报告必须使用 DB 数据，并在章节中标注 `⚠️ 数据已修正`

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

**报告模板** (必须严格遵循):
```markdown
# Pain Miner 执行报告
**执行时间**: {timestamp}
**执行模式**: 🚀 完整流程 (Run N)

---

## ⚙️ 数据验证 (必须输出)

### DATA_INTEGRITY_GATE
{Step 1 的完整 Gate 输出，包含表格}

### GATE_PRESERVATION_CHECK
{Step 2 的完整 Gate 输出}

### BANNED_WORDS_GATE
{禁止词扫描结果}

---

## 📊 数据库状态变更
| 表 | 执行前 | 执行后 | 变更 |
|---|---|---|---|
| subreddits | {before} new | {after} new | +{delta} |
| leads | {before} 未分析 | {after} 未分析 | +{delta} |
| keywords | {before} new | {after} new | +{delta} |
| gold_leads | {before} 总计 | {after} 总计 | +{delta} |

---

## 🔍 领域探索 (Domain Explorer)
- **搜索策略**: {中文描述使用的关键词类型}
- **发现社区**: {中文列表}
- **新增数量**: {N} 个

## ⛏️ 社区挖掘 (Subreddit Miner)
- **处理社区**: {中文列表}
- **采集模式**: {API / Browser}
- **采集帖子**: {N} 条
- **处理率**: {M/N * 100}%

## 📖 帖子分析 (Post Analyzer)
- **分析数量**: {N} 条
- **高价值占比**: {X}%
- **TOP 痛点**:
  1. {Lead #X}: {中文痛点描述} (评分: X/10)
  2. ...

## 🧠 关键词提取 (Keyword Extractor)
- **新增关键词**: {N} 个
- **类型分布**: 需求词 {X} / 竞品词 {Y} / 功能词 {Z}

## 📈 趋势验证 (Trends Validator)
- **验证数量**: {N} 个
- **验证状态**: {成功 X / 失败 Y}
- **Breakout 词**: {中文列表或"无"}

## 💼 需求验证 (Demand Validator)
- **验证数量**: {N} 个
- **高需求**: {中文列表}

## 🏆 金矿汇总 (Gold Curator)
| 机会 | 痛点 | 用户类型 | 行动建议 | 渠道 | 评分 |
|------|------|----------|----------|------|------|
| {gold_id} | {中文痛点} | {founder/developer/...} | {中文建议} | {渠道} | {分数} |

---

## 💡 下一步建议
1. {基于 Gold Leads 的中文建议}
2. {基于 Breakout 词的中文建议}

---
*由 Pain Miner Orchestrator v9.1 生成*
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
