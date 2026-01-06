---
description: 关键词提取 Agent - SEO 策略与竞品发散
---

# Keyword Extractor Agent

> **Context Hygiene**: 本 Agent 使用纯净上下文 (无浏览器噪音)，专注于从痛点反推搜索行为。
> **Role**: SEO Strategist (SEO 策略师)

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `keywords` | ✅ OWNER (Create) | `PainMinerDB.keywords.create()` |
| `leads` | 🔍 READ | `SELECT ... FROM leads WHERE status = 'analyzed'` |
| `lead_keywords` | ✅ OWNER (Create) | `INSERT INTO lead_keywords ...` |

---

## 触发条件

- `post-analyzer` 完成分析，产生 `analyzed = 1` 的 Lead
- Orchestrator 显式调用

---

## 执行步骤

// turbo-all

### Step 1: 获取高价值已分析 Lead

查询 SQLite 获取尚未进行关键词提取的高分 Lead:
```sql
SELECT id, pain_point_summary, evidence, competitor_analysis
FROM leads
WHERE analyzed = 1
  AND (keyword_extraction_status IS NULL OR keyword_extraction_status != 'completed')
  AND (score_relevance >= 4 OR score_pain >= 4)
ORDER BY created_at DESC
LIMIT 5;
```

> [!NOTE]
> 只处理高价值 Lead，避免浪费 Token 在低质量内容上。

### Step 2: 关键词策略发散 (SEO Strategy)

> ⛔ **MANDATORY LOOP**: 对每个 Lead 独立执行以下 Prompt。

**Role**: Senior SEO Strategist specialized in B2B SaaS.

**Task**: Reverse-engineer the Google Search History of the user who wrote this pain point.

**Input Pain**: "{pain_point_summary}"
**Evidence Example**: "{evidence_snippet}"

**Thinking Process (CoT)**:
1. **User Persona**: Who is this person? (e.g., Frustrated Accountant, Overwhelmed Founder)
2. **Intent Analysis**: What are they trying to solve RIGHT NOW? 
3. **Search Journey Simulation**:
   - **Awareness Phase**: When they first feel the pain. (e.g., "why is data entry so slow")
   - **Solution Phase**: When looking for tools. (e.g., "ocr receipt software", "automate expenses")
   - **Decision Phase**: When comparing options. (e.g., "Expensify vs Dext", "QuickBooks alternative")
4. **Competitor Mapping**:
   - Identify anchors mentioned: "{competitors_mentioned}"
   - Recall direct B2B competitors.
   - Generate "Alternative" and "Vs" keywords.

**Output Requirement (JSON)**:
```json
{
  "journey_analysis": "One sentence summary of user intent",
  "keywords": [
    {"term": "interview fraud detection", "type": "problem", "phase": "awareness"},
    {"term": "identity verification api", "type": "solution", "phase": "solution"},
    {"term": "Checkr competitor", "type": "competitor", "phase": "decision"},
    {"term": "HireRight alternative", "type": "competitor", "phase": "decision"}
  ]
}
```

> [!CAUTION]
> **⛔ COMPETITOR_MANDATE (强制执行)**:
> 必须生成至少 **2 个** 竞品相关词 (Alternative/Competitor/Vs)。
> 如果 Input 中提到产品 X，**必须** 生成 "X alternative"。

### Step 3: 批量入库 (Atomic Transaction)

对每个 Lead 的关键词执行入库：

```sql
BEGIN TRANSACTION;

-- 1. 标记 Lead 提取完成
UPDATE leads SET keyword_extraction_status = 'completed' WHERE id = {lead_id};

-- 2. 循环插入关键词 (伪代码逻辑)
-- FOR each keyword in keywords:
   -- Check exact match existence
   INSERT OR IGNORE INTO keywords (
     external_id, keyword, type, status, discovered_from, created_at, updated_at
   ) VALUES (
     'seed_' || hex(randomblob(4)),
     '{keyword.term}',
     '{keyword.type}', -- problem/solution/competitor
     'new',
     'Keyword Extractor - Lead #{lead_id}',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
   );

   -- Link to Lead
   INSERT INTO lead_keywords (lead_id, keyword_id, created_at)
   VALUES (
     {lead_id}, 
     (SELECT id FROM keywords WHERE keyword = '{keyword.term}'), 
     CURRENT_TIMESTAMP
   );

COMMIT;
```

### Step 4: 输出报告

```markdown
🧠 **Keyword Strategy Results**:
- Processed Leads: N
- Total Keywords Generated: X
- **Competitor Keywords**: Y (Key metric!)
- Sample Strategy:
  - Lead #{id}: "{pain_summary}"
  - Strategy: "From {Awareness} to {Decision}"
  - Top Keywords: "term1", "term2"
```

> [!IMPORTANT]
> **GATE**: `Competitor Keywords` count must be > 0 if N > 0.
> If 0, **FAIL** and retry with explicit competitor prompt.

---

**Version**: 1.0 | **Owner**: keyword_seeds | **Created**: 2025-12-25
