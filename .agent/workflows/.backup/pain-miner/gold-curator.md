---
description: 金矿管理 Agent - 汇总验证结果生成 Gold Leads
---

# Gold Curator Agent

汇总所有验证结果，管理黄金机会库。

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `gold_leads` | ✅ OWNER (CRUD) | `PainMinerDB.goldLeads.*` |
| `keywords` | 📖 Read Only | `PainMinerDB.keywords.listVerified()` |
| `leads` | 📖 Read Only | `PainMinerDB.leads.getAnalyzed()` |

### SQLite Data Access (v2.0+)

```typescript
import { PainMinerDB } from '../../../pain-miner-dashboard/src/core/db/data-service';

// 获取所有已验证的关键词（带 validation 信息）
const verified = PainMinerDB.goldLeads.aggregateFromVerified();

// 创建 gold lead 并关联源 leads
const goldLead = PainMinerDB.goldLeads.createWithSources(
  {
    externalId: 'gold_XXX',
    painPoint: '...',
    verifiedKeywords: ['Receipt OCR'],
    status: 'curated',
  },
  [leadId1, leadId2]
);

// 获取统计信息
const stats = PainMinerDB.stats.getCounts();
```

> [!NOTE]
> **Migration**: v2.0+ 使用 SQLite 数据库。JSON 文件已弃用。

---

## 触发条件

- `keyword_seeds` 中存在 `status = "verified"` 且未同步到 gold 的记录
- Orchestrator 调用

---

## ⛔ HALT Protocol

本 Agent 在以下情况 **必须 HALT 或 SKIP**:

| 条件 | 动作 |
|:--|:--|
| 无已验证关键词 | 输出 `⏭️ SKIPPED` + 原因 |
| 数据库写入失败 | 输出 `❌ DB_ERROR` + 原因 |
| 关联 Leads 查询失败 | 输出 `⚠️ WARNING` + 继续 (低置信度) |

**HALT/SKIP 输出格式** (必须遵守):
```
❌ WORKFLOW_HALTED / ⏭️ SKIPPED
Agent: gold-curator
Step: {step_number}
Reason: {原因}
Recoverable: {YES/NO}
Suggested Action: {建议动作}
```

> 🚫 **禁止静默跳过或继续**。

---

## 执行步骤

// turbo-all

### Step 1: 获取验证通过的关键词

使用 MCP SQLite 工具查询已验证但未同步到 gold 的关键词：

```sql
-- 使用 mcp_sqlite_read_query 工具
SELECT k.*, v.trends_30d, v.trends_12m, v.upwork_volume, v.verdict
FROM keywords k
LEFT JOIN validations v ON k.id = v.keyword_id
WHERE k.status = 'verified'
  AND CAST(k.id AS TEXT) NOT IN (SELECT seed_id FROM gold_leads WHERE seed_id IS NOT NULL);
```

> [!IMPORTANT]
> **⚙️ DECISION GATE (必须输出)**:
> ```
> 🔍 DECISION_GATE:
>   - 待同步关键词数量: {N}
>   - 关键词列表: {keyword1, keyword2, ...}
>   - Action: PROCEED  # ⛔ 禁止 SKIP
>   - Fallback: {如果 N=0 → 对现有 Gold Leads 执行质量审计}
> ```
> **⛔ 禁止跳过**: 如果无新的 verified 关键词，必须对现有 Gold Leads 执行质量审计并更新评分。

### Step 2: 聚合证据

从数据库聚合相关证据：

```sql
-- 获取关联的 leads (帖子数据)
SELECT * FROM leads WHERE keyword_id = {keyword_id} AND analysis_status = 'analyzed';

-- 获取验证数据
SELECT * FROM validations WHERE keyword_id = {keyword_id};
```

### Step 3: 红海排除检查 (MANDATORY)

对每个待同步关键词，检查是否属于红海市场：

```sql
-- 检查红海评分
SELECT v.red_ocean_score, v.ads_count, v.ai_overview_present, v.competitor_quality
FROM validations v WHERE v.keyword_id = {keyword_id};
```

**红海判定规则**:
| 条件 | 判定 |
|------|------|
| red_ocean_score ≥ 80 | 🔴 红海 - 排除出 Gold Leads |
| red_ocean_score 50-79 | 🟡 谨慎 - 标记 warning |
| red_ocean_score < 50 | 🟢 机会 - 继续生成 |

> [!CAUTION]
> **⛔ RED_OCEAN_GATE (必须输出)**:
> ```
> 🔍 RED_OCEAN_GATE:
>   - 检查关键词数: {N}
>   - 红海排除: {M} 个 (keyword1, keyword2)
>   - 谨慎标记: {K} 个
>   - 正常通过: {L} 个
> ```

---

### Step 4: 生成 Gold Lead

```json
{
  "id": "gold_XXX",
  "seed_id": "seed_XXX",
  "pain_point": "综合描述痛点",
  "verified_keywords": ["keyword1", "keyword2"],
  "metrics": {
    "upwork_demand": "High/Medium/Low",
    "trends_benchmark": "X% of GPTs",
    "pain_level": "Emotional/High Friction/Low"
  },
  "potential_product": "产品方向建议",
  "evidence_sources": [
    "lead_001",
    "lead_002"
  ],
  "discovered_at": "2025-12-23"
}
```

### Step 5: 写入数据库

使用 MCP SQLite 工具插入 Gold Lead 及关联数据：

```sql
-- 1. 插入 gold_leads (使用 mcp_sqlite_write_query)
INSERT INTO gold_leads (
  external_id, seed_id, pain_point, verified_keywords,
  metrics,
  potential_product, status, created_at, updated_at
) VALUES (
  'gold_' || hex(randomblob(4)),
  '{keyword_id}',
  '{pain_point}',
  '{"keywords": ["keyword1", "keyword2"]}',
  '{"upwork_demand": "High", "trends_benchmark": "5% of GPTs", "pain_level": "Emotional"}',
  '{potential_product}',
  'curated',
  datetime('now'),
  datetime('now')
);

-- 2. 关联 evidence sources (需要先获取刚插入的 gold_lead id)
-- 假设上一步返回了 last_insert_rowid 或通过 external_id 查询
INSERT INTO gold_lead_sources (gold_lead_id, lead_id, created_at)
VALUES 
  ((SELECT id FROM gold_leads WHERE external_id = '...'), {lead_id_1}, datetime('now')),
  ((SELECT id FROM gold_leads WHERE external_id = '...'), {lead_id_2}, datetime('now'));
```

### Step 6: 输出报告

> [!IMPORTANT]
> **ID 一致性要求**: 报告中必须使用数据库 `id` 和 `external_id`，不使用序号。

**查询新创建的 Gold Leads**:
```sql
SELECT id, external_id, pain_point, potential_product, opportunity_score
FROM gold_leads 
WHERE created_at > datetime('now', '-1 hour')
ORDER BY id DESC;
```

**输出格式**:
```markdown
🏆 **Gold Curator Results**:
- New Gold Leads: N
- Updated Leads: M
- Total Gold: X

### Gold Lead Summary
| DB ID | External ID | Pain Point | Potential Product | Score |
|-------|-------------|------------|-------------------|-------|
| 22 | gold_plc_doc | ... | ... | 85 |
```

> [!CAUTION]
> **⛔ GOLD_CURATOR_GATE (必须输出)**:
> ```
> 🔍 GOLD_CURATOR_GATE:
>   - 待处理 verified 关键词: {N}
>   - 成功生成 Gold Lead: {M}
>   - 红海排除: {K}
>   - 完成率: {(M+K)/N * 100}%
>   - 数据库写入: {成功/失败}
>   - OVERALL: {PASS / FAIL}
> ```
> 
> **⛔ 阻断规则**:
> - 如果 `完成率 < 100%` → OVERALL = FAIL
> - 如果 OVERALL = FAIL:
>   ```
>   ❌ EXECUTION_BLOCKED:
>     - Agent: Gold Curator
>     - 原因: 未处理所有 verified 关键词 ({N-M-K} 个未处理)
>     - 动作: 返回 Step 1 继续处理
>   ```
> - **禁止只处理部分关键词就生成报告**

---

## v2.0 Opportunity Score 评分体系 ⭐

### 计算公式

```
Opportunity_Score = (
    demand_score × 0.35 +
    market_score × 0.25 +
    timing_score × 0.20 +
    competition_score × 0.20
) × statistical_confidence
```

### 各维度评分规则

| 维度 | 数据来源 | 计算逻辑 | 权重 |
|------|---------|---------|------|
| **demand_score** | leads.relevance_score + roi_weight | `AVG(relevance) × 10 + AVG(roi_weight) × 12` | 35% |
| **market_score** | validations.upwork_volume + trends | Upwork High=100, Medium=60, Low=30 | 25% |
| **timing_score** | validations.trends_30d | Rising=100, Stable=50, Declining=20 | 20% |
| **competition_score** | leads.competitor_analysis | `100 - (竞品数 × 15)`, 有不满=+20 | 20% |

### 置信度系数

```
statistical_confidence = min(1, sqrt(sample_size / 20))

| 样本量 | 置信度 | 判定 |
|--------|--------|------|
| < 5 | 0.3 | ⚠️ 极不可靠 |
| 5-10 | 0.6 | 🟡 初步验证 |
| 10-20 | 0.8 | 🟢 可信 |
| > 20 | 1.0 | ✅ 高置信 |
```

### Step 4 增强: 计算 Opportunity Score

在生成 Gold Lead 前，执行评分计算：
```sql
-- 聚合关联 leads 的评分
SELECT 
  COUNT(*) as sample_size,
  AVG(relevance_score) as avg_relevance,
  AVG(roi_weight) as avg_roi,
  AVG(pain_score) as avg_pain
FROM leads 
WHERE keyword_id = {keyword_id} AND analyzed = 1;
```

### Step 5 增强: 写入评分字段

```sql
INSERT INTO gold_leads (
  external_id, seed_id, pain_point, verified_keywords,
  metrics, potential_product, status,
  -- v2.0 评分字段
  opportunity_score, demand_score, market_score,
  timing_score, competition_score,
  statistical_confidence, sample_size, scoring_breakdown,
  created_at, updated_at
) VALUES (
  'gold_' || hex(randomblob(4)),
  '{keyword_id}',
  '{pain_point}',
  '{verified_keywords_json}',
  '{metrics_json}',
  '{potential_product}',
  'curated',
  -- 计算后的评分值
  {opportunity_score},
  {demand_score},
  {market_score},
  {timing_score},
  {competition_score},
  {statistical_confidence},
  {sample_size},
  '{scoring_breakdown_json}',
  datetime('now'),
  datetime('now')
);
```

---

**Version**: 3.2 | **Owner**: gold_leads (SQLite + Opportunity Score) | **Updated**: 2025-12-25
