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
import { PainMinerDB } from '../src/db/data-service';

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

### Step 2: 聚合证据

从数据库聚合相关证据：

```sql
-- 获取关联的 leads (帖子数据)
SELECT * FROM leads WHERE keyword_id = {keyword_id} AND analysis_status = 'analyzed';

-- 获取验证数据
SELECT * FROM validations WHERE keyword_id = {keyword_id};
```

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

```markdown
🏆 **Gold Curator Results**:
- New Gold Leads: N
- Updated Leads: M
- Total Gold: X

### Gold Lead Summary
| ID | Pain Point | Potential Product |
|----|------------|-------------------|
| gold_XXX | ... | ... |
```

---

## Gold 评分标准

| 维度 | 权重 | 评分规则 |
|------|------|---------|
| Upwork 需求 | 40% | High=10, Medium=6, Low=3 |
| Trends 指标 | 30% | >10%=10, 5-10%=7, <5%=4 |
| 情绪强度 | 30% | Emotional=10, High=7, Low=4 |

---

**Version**: 2.0 | **Owner**: gold_leads (SQLite)
