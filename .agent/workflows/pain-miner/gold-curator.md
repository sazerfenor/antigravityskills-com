---
description: 金矿管理 Agent - 汇总验证结果生成 Gold Leads (含 Action Plan)
---

# Gold Curator Agent

汇总所有验证结果，管理黄金机会库，**生成变现行动建议**。

> **版本**: 10.0 (参见 [CHANGELOG](CHANGELOG.md))
> **核心改进**: Action Plan 使用 CoT 推理

---

## 数据所有权

| 数据 | 权限 |
|------|------|
| `gold_leads` | ✅ OWNER (CRUD) |
| `keywords` | 📖 Read Only |
| `leads` | 📖 Read Only |

---

## 执行步骤\n
### Step 1: 获取验证通过的关键词

**工具**: 使用 `mcp_sqlite_read_query`:
```sql
SELECT k.*, v.trends_30d, v.trends_12m, v.upwork_volume, v.verdict
FROM keywords k
LEFT JOIN validations v ON k.id = v.keyword_id
WHERE k.status = 'verified'
  AND CAST(k.id AS TEXT) NOT IN (SELECT seed_id FROM gold_leads WHERE seed_id IS NOT NULL);
```

> [!IMPORTANT]
> **⚙️ DECISION_GATE**:
> ```
> 🔍 DECISION_GATE:
>   - 待同步关键词数量: {N}
>   - Action: PROCEED
> ```

### Step 2: 聚合证据

**工具**: 使用 `mcp_sqlite_read_query`:
```sql
SELECT * FROM leads WHERE keyword_id = {keyword_id} AND analyzed = 1;
SELECT * FROM validations WHERE keyword_id = {keyword_id};
```

### Step 3: 红海排除检查

| 条件 | 判定 |
|------|------|
| red_ocean_score ≥ 80 | 🔴 红海 - 排除 |
| red_ocean_score 50-79 | 🟡 谨慎 |
| red_ocean_score < 50 | 🟢 机会 |

---

### Step 3.5: FEASIBILITY_GATE (v2.0 新增)

> ⛔ **MANDATORY**: 在生成 Action Plan 前，必须通过可行性检查。

**巨头名单** (与 keyword-extractor 一致):
- 电商: Alibaba, Amazon, eBay, 淘宝, 拼多多
- 云: AWS, Azure, GCP, 阿里云
- 搜索: Google, 百度, Bing

**检查项**:
| 问题 | 判断标准 | 结果 |
|:--|:--|:--|
| 关键词包含巨头名？ | 如 "Alibaba alternative" | ⚠️ PIVOT |
| 3 个月能做 MVP 吗？ | 需要完整平台 → NO | ❌ REJECT |
| 资金需求 > $100K？ | 如需大规模基础设施 | ❌ REJECT |

**GATE 输出**:
```
🔍 FEASIBILITY_GATE:
  - 原始产品方向: {potential_product}
  - 巨头检测: {检测到 X / 无}
  - 3 个月 MVP: {YES / NO}
  - VERDICT: {PASS / PIVOT / REJECT}
  - PIVOT 建议: {如 PIVOT，改为生态工具方向}
```

**如果 PIVOT**:
- 强制将 `potential_product` 从 "X alternative" 改为 "X {功能} tool"
- 示例: "Alibaba alternative" → "Alibaba supplier verification tool"

---

### Step 4: 生成 Gold Lead (含 Action Plan) - v10.0 CoT

> 🧠 **关键改进**: 使用 3 步思考过程生成 Action Plan

**Action Plan Prompt (RCOT 结构)**:

```markdown
# Role
你是增长黑客，擅长把用户痛点转化为可执行的获客动作。

# Context
痛点: {pain_point}
用户类型: {lead_type}
情绪信号: {pain_signals}
竞品提及: {competitors}
趋势数据: {trends_30d} / {trends_12m}
Upwork 需求: {upwork_volume}

# Thinking Steps (必须输出)

**Step 1: 渠道选择**
| 条件 | 推荐渠道 |
|:--|:--|
| 有竞品吐槽 | Blog (对比文章) |
| 有高情绪值 | Reddit Reply (共情) |
| B2B 决策者 | Cold Email |
| 技术用户 | Dev Community / HN |

判断: 匹配条件 "{}" → 渠道 = {}

**Step 2: 行动草稿**
| 渠道 | 草稿策略 |
|:--|:--|
| Reddit Reply | 先共情，再提问，不推销 |
| Blog | 提供对比维度，暗示优势 |
| Cold Email | 直击痛点，提供解决方案 |

草稿:

**Step 3: 紧急度 & 机会评分**
| 信号 | 紧急度 | 评分加成 |
|:--|:--|:--|
| 明确付费意愿 | high | +20 |
| 有时间压力 | high | +15 |
| 提及预算 | medium | +10 |
| 一般抱怨 | low | +0 |

判断: 紧急度 = {}, 基础分 = 60, 加成 = {}, 最终评分 = {}

# Output Format
```json
{
  "action_plan": "具体动作，50-100字",
  "market_opportunity": "一句话市场机会描述",
  "recommended_channel": "Reddit Reply|Blog|Cold Email",
  "urgency": "high|medium|low",
  "opportunity_score": 60-100
}
```

# Constraints
- action_plan 必须是具体可执行的动作
- 禁止空话如 "进一步研究"、"持续关注"
- 禁止虚假承诺如 "我们的产品可以完美解决"

---

先输出 3 步思考过程，再输出 JSON。
```

**Gold Lead 结构**:
```json
{
  "id": "gold_XXX",
  "pain_point": "综合描述痛点",
  "verified_keywords": ["keyword1", "keyword2"],
  "metrics": {
    "upwork_demand": "High/Medium/Low",
    "trends_benchmark": "X% of GPTs"
  },
  "potential_product": "产品方向建议",
  "action_plan": "在 r/smallbusiness 回复相关帖子，提供免费试用...",
  "market_opportunity": "中小企业会计自动化市场缺乏易用解决方案",
  "recommended_channel": "Reddit Reply",
  "opportunity_score": 85
}
```

### Step 5: 写入数据库

> [!CAUTION]
> **AUTHENTICITY_GATE**:
> 在执行任何数据库写入前，必须先输出:
> 1. 📝 **原始数据摘要**: 关键词 + 关联 Lead 的痛点描述
> 2. 🧠 **分析思考过程**: 3 步 CoT (渠道选择/行动草稿/紧急度评分)
> 3. 📊 **生成的 JSON**: 完整 Gold Lead JSON
>
> 如果跳过 1-2 步直接输出 JSON → REJECT

**工具**: 使用 `mcp_sqlite_write_query`:
```sql
INSERT INTO gold_leads (
  external_id, seed_id, pain_point, verified_keywords,
  metrics, potential_product, 
  action_plan,           -- v8.0 新增
  market_opportunity,    -- v8.0 新增
  recommended_channel,   -- v8.0 新增
  status, opportunity_score,
  created_at, updated_at
) VALUES (...);
```

### Step 6: 输出报告

```markdown
🏆 **Gold Curator Results**:
- New Gold Leads: N
- Total Gold: X

## 📋 Action Plan Summary

| Gold ID | 痛点 | 行动建议 | 渠道 | 机会评分 |
|---------|------|---------|------|---------|
| gold_001 | 手工发票耗时 | 在 r/smallbusiness 回复... | Reddit | 85 |
| gold_002 | 竞品太贵 | 撰写对比文章... | Blog | 72 |

## 🎯 Top 3 Actionable Gold Leads

### 1. {pain_point}
**Action Plan**: {action_plan}
**Why Now**: {market_opportunity}
**Channel**: {recommended_channel}
```

> [!CAUTION]
> **⚙️ GOLD_CURATOR_GATE**:
> ```
> 🔍 GOLD_CURATOR_GATE:
>   - 待处理: {N}
>   - 成功生成: {M}
>   - Action Plan 覆盖率: {action_plan_count/M * 100}%
>   - OVERALL: {PASS / FAIL}
> ```

---

**Version**: 4.0 | **Owner**: gold_leads | **Updated**: 2025-12-26
