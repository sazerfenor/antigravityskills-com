---
description: 趋势验证 Agent - Google Trends 和 Upwork 双重验证
---

# Trend Validator Agent

通过 Google Trends 对标和 Upwork 付费需求验证关键词价值。

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `keywords` | ✅ OWNER (status 更新) | `PainMinerDB.keywords.updateStatus()` |
| `validations` | ✅ OWNER (CRUD) | `PainMinerDB.validations.*` |

### SQLite Data Access (v2.0+)

```typescript
import { PainMinerDB } from '../src/db/data-service';

// 获取待验证的关键词
const pending = PainMinerDB.keywords.listPending();

// 创建或更新 validation (V3: 包含 baseline 数据)
PainMinerDB.validations.upsert(keywordId, {
  trends30d: '2% of GPTs (Stable)',
  trends12m: '2% of GPTs (Stable)',
  upworkVolume: 'High (50+ jobs)',
  verdict: '✅ Verified Gold',
  // V3.0 新增字段
  baselineKeyword: 'GPTs',
  relativeVolumeScore: 0.02, // 2% of GPTs
});

// 更新关键词状态
PainMinerDB.keywords.updateStatus(keywordId, 'verified');
```

### V3.0 Keyword Fission (递归发现)

```typescript
// 从 Google Trends Related Queries 发现子关键词
for (const relatedKeyword of relatedQueries.rising) {
  // 创建子关键词，自动继承 depth
  const child = PainMinerDB.keywords.createChild(parentKeywordId, {
    externalId: `seed_${Date.now()}`,
    keyword: relatedKeyword.keyword,
    status: 'pending',
    discoveredFrom: 'Google Trends Rising',
  });
  console.log(`Created child keyword: ${child.keyword} (depth: ${child.depthLevel})`);
}

// 查询特定深度的关键词
const seedKeywords = PainMinerDB.keywords.listByDepth(0); // 种子
const relatedKeywords = PainMinerDB.keywords.listByDepth(1); // 一级关联
```

> [!NOTE]
> **Migration**: v2.0+ 使用 SQLite 数据库。JSON 文件已弃用。

---

## 触发条件

- `keyword_seeds` 中存在 `status ∈ [new, pending]` 的记录
- Orchestrator 调用

---

## 执行步骤

// turbo-all

### Step 1: 获取待验证关键词

使用 MCP SQLite 工具查询待验证的关键词：

```sql
-- 使用 mcp_sqlite_read_query 工具
SELECT * FROM keywords WHERE status IN ('new', 'pending') ORDER BY created_at DESC;
```

> [!IMPORTANT]
> **⚙️ DECISION GATE (必须输出)**:
> ```
> 🔍 DECISION_GATE:
>   - 待验证关键词数量: {N}
>   - 关键词列表: {kw1, kw2, ...}
>   - Should Skip: {YES/NO}
>   - Reason: {如果 N=0 则说明"无待验证关键词"，否则说明"准备验证 {N} 个关键词"}
> ```
> **禁止静默跳过**。

### Step 1.5: 强制循环包装 (MANDATORY KEYWORD LOOP)

> ⛔ **CRITICAL**: 对 Step 1 返回的**每一个**关键词，必须执行完整的 Step 2-3 验证流程。**禁止批量标记 verified**。

**循环结构** (概念 - Agent 必须理解并逐个执行):
```
待验证关键词: [kw1, kw2, kw3, ...]
已验证关键词: []
已跳过关键词: []

FOR EACH keyword IN 待验证关键词:
    执行 Step 2 (Google Trends 验证)
    执行 Step 3 (Upwork 验证)
    输出 SINGLE_KEYWORD_VALIDATION_GATE
    
    IF 验证成功:
        已验证关键词.push(keyword)
    ELSE:
        已跳过关键词.push({keyword, reason})

# 循环结束后
输出 KEYWORD_LOOP_COMPLETION_GATE
```

> [!CAUTION]
> **⛔ SINGLE_KEYWORD_VALIDATION_GATE (每个关键词验证后必须输出)**:
> ```
> 🔍 SINGLE_KEYWORD_VALIDATION:
>   - 关键词: "{keyword}" ({current_idx}/{total_count})
>   - Google Trends: {X}% of GPTs ({rising/stable/declining})
>   - Upwork/Freelance: {N} 结果 ({High/Medium/Low/None})
>   - 语义相关性: {Strong/Partial/Weak}
>   - Verdict: {verified/pending/dead}
>   - 数据完整性: {COMPLETE/INCOMPLETE}
> ```
> **如果 数据完整性 = INCOMPLETE**: 必须补充验证或标记原因

> [!CAUTION]
> **⛔ KEYWORD_LOOP_COMPLETION_GATE (循环结束后必须输出)**:
> ```
> 🔍 KEYWORD_LOOP_COMPLETION:
>   - 计划验证: {N} 个关键词
>   - 实际验证: {M} 个
>   - 跳过: {K} 个 (原因列表: ...)
>   - 验证覆盖率: {M/N * 100}%
>   - OVERALL: {PASS (覆盖率 >= 80%) / FAIL}
> ```
> **如果 OVERALL = FAIL**: ❌ 禁止进入 Step 4，返回补充验证

### Step 2: Google Trends 验证

1. 访问: `https://trends.google.com/trends/explore?q={keyword},GPTs`
2. **双时间维度分析**:
   - 近 30 天: 观察短期趋势
   - 近 12 个月: 观察长期趋势
3. **截图保存** 到 `docs/data/`
4. 记录相对于 GPTs 的百分比

> [!CAUTION]
> **诚实报告原则**: 不要美化数据！曲线平的就说"平线"。

**趋势判断标准** (v5.0 增强):
| 形态 | 判断 | 行动 |
|------|------|------|
| 热度 < 5% GPTs | 极窄利基 (Niche) | ✅ 继续验证 |
| 热度 5-20% GPTs | 健康利基 | ✅ 优先验证 |
| 热度 20-80% GPTs | 中等规模 | ⚠️ 需竞品评估 |
| 热度 >= 80% GPTs | 🔴 **红海** | ❌ 需计算 RED_OCEAN_SCORE |
| 热度 ≈ 0 且下降 | 死市场 | ❌ 跳过 |

> [!CAUTION]
> **v5.0 红海检测增强**: 当热度 >= 80% GPTs 时，必须执行 Step 2.8 红海综合评估。

### Step 2.5: Related Queries 挖掘

1. 在 Google Trends 页面中切换到 **Related queries** 区域
2. **双维度采集**:
   - 切换到 **Top** tab: 记录前 5 个关键词及其相对热度
   - 切换到 **Rising** tab: 记录前 5 个关键词及增长标签 (Breakout/%)
3. **自动添加对比词**:
   - 从 Top queries 中选择前 3 个有效词 (排除无关词如 "ai news")
   - 修改 URL 添加到对比: `?q={original},{related1},{related2},{related3},GPTs`
   - 截图保存对比图
4. **新关键词发现**:
   - 如果 Rising 中有 "Breakout" 标签的词，自动创建 `keywords` 记录
   - 设置 `status: "new"`, `discovered_from: "Google Trends Rising"`

> [!IMPORTANT]
> **v5.0 增强**: 必须将发现的关联词**立即写入** `keywords` 表。

**写入 keywords 表** (对 Top 和 Rising 词):
```sql
-- 对每个 Top query (设置 type = 'demand')
INSERT INTO keywords (
  external_id, keyword, type, status, discovered_from, parent_id, depth_level, created_at, updated_at
) VALUES (
  'seed_' || hex(randomblob(4)),
  '{related_keyword}',
  'demand',
  'pending',
  'Google Trends Top - Parent: {parent_keyword}',
  {parent_keyword_id},
  {parent_depth_level} + 1,  -- 子关键词深度 +1
  datetime('now'),
  datetime('now')
)
ON CONFLICT(keyword) DO UPDATE SET
  related_seeds = json_insert(COALESCE(related_seeds, '[]'), '$[#]', '{parent_keyword}'),
  updated_at = datetime('now');

-- 对每个 Rising Breakout 词 (高优先级)
INSERT INTO keywords (
  external_id, keyword, type, status, priority, discovered_from, parent_id, depth_level, created_at, updated_at
) VALUES (
  'seed_' || hex(randomblob(4)),
  '{breakout_keyword}',
  'demand',
  'new',
  5,  -- 高优先级
  'Google Trends Rising Breakout - Parent: {parent_keyword}',
  {parent_keyword_id},
  {parent_depth_level} + 1,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(keyword) DO UPDATE SET
  priority = 5,  -- 提升优先级
  updated_at = datetime('now');
```

> [!CAUTION]
> **必须输出 GATE**:
> ```
> 🔍 RELATED_QUERIES_GATE:
>   - Top queries 采集: {N} 个
>   - Rising queries 采集: {M} 个
>   - Breakout 词: {列表}
>   - 写入 keywords 表: {成功/失败}
>   - 新建子关键词: {X} 个
> ```

**输出 Schema 增强**:
```json
{
  "validation": {
    "trends_30d": "...",
    "trends_12m": "...",
    "related_queries": {
      "top": [
        {"keyword": "convert to csv", "score": 100},
        {"keyword": "excel to csv", "score": 79}
      ],
      "rising": [
        {"keyword": "ai pdf parser", "growth": "Breakout"}
      ]
    },
    "comparison_keywords": ["convert to csv", "excel to csv", "csv file"],
    "keywords_created": ["convert to csv", "ai pdf parser"]
  }
}
```

### Step 2.8: 红海综合评估 (v5.0 新增) 🔴

> [!IMPORTANT]
> **触发条件**: 当 Step 2 检测到热度 >= 80% GPTs 时，必须执行此步骤。

**执行步骤**:

#### 2.8.1 Google 首页广告检测

```javascript
browser_subagent({
  Task: "Search Google for '{keyword}' and count:
         1. Number of ads at the top (before organic results)
         2. Number of ads at the bottom
         3. Total ad count
         Return: { ads_top: N, ads_bottom: M, total_ads: N+M }",
  TaskName: "Ads Detection - {keyword}",
  RecordingName: "ads_detection_{keyword}"
})
```

#### 2.8.2 Google AI Overview 检测

```javascript
browser_subagent({
  Task: "Check if Google shows AI Overview/Featured Snippet for '{keyword}':
         1. Look for 'AI Overview' card or 'Featured Snippet' box
         2. Look for Knowledge Panel on the right side
         3. Return: { ai_overview: true/false, knowledge_panel: true/false }",
  TaskName: "AI Overview Check - {keyword}",
  RecordingName: "ai_overview_{keyword}"
})
```

#### 2.8.3 竞品网站质量评估

```javascript
browser_subagent({
  Task: "For '{keyword}', evaluate the TOP 3 organic results:
         1. Open each result URL
         2. Score each on (1-10):
            - UI/UX Quality: Modern design? Mobile-friendly?
            - Feature Completeness: Does it fully solve the problem?
            - Pricing Transparency: Is pricing visible?
            - Trust Signals: Reviews, testimonials, case studies?
         3. Return: [
              { url: '...', quality: 'Strong/Weak/Outdated', scores: {...} },
              ...
            ]",
  TaskName: "Competitor Quality - {keyword}",
  RecordingName: "competitor_quality_{keyword}"
})
```

#### 2.8.4 红海综合评分计算

```javascript
const RED_OCEAN_SCORE = (
  (ads_count >= 4 ? 30 : ads_count * 7.5) +
  (ai_overview_present ? 25 : 0) +
  (trends_vs_gpts >= 100 ? 20 : trends_vs_gpts >= 80 ? 10 : 0) +
  (strong_competitors_count * 15)
);

// 判定
let verdict;
if (RED_OCEAN_SCORE >= 70) {
  verdict = 'red_ocean';      // 🔴 建议排除
} else if (RED_OCEAN_SCORE >= 40) {
  verdict = 'caution';        // 🟡 需差异化策略
} else {
  verdict = 'opportunity';    // 🟢 优先验证
}
```

**输出 Schema**:
```json
{
  "red_ocean_assessment": {
    "score": 75,
    "verdict": "red_ocean",
    "breakdown": {
      "ads_count": 4,
      "ads_score": 30,
      "ai_overview": true,
      "ai_score": 25,
      "trends_ratio": 120,
      "trends_score": 20,
      "strong_competitors": 0,
      "competitor_score": 0
    },
    "recommendation": "该关键词为红海市场，建议排除或寻找更细分的变体"
  }
}
```

> [!CAUTION]
> **写入数据库**: 必须将红海评分写入 `validations` 表的 `red_ocean_score`, `ads_count`, `ai_overview_present`, `competitor_quality`, `red_ocean_verdict` 字段。

### Step 3: 付费需求验证 (MANDATORY)

> ⛔ **CRITICAL**: 此步骤不可跳过。没有付费需求验证的关键词不能标记为 verified。

> [!CAUTION]
> **⛔ PRE_UPWORK_CHECK (Step 3 开始前必须输出)**:
> ```
> 🔍 PRE_UPWORK_CHECK:
>   - 当前关键词: "{keyword}"
>   - Google Trends 验证状态: {已完成/未完成}
>   - 如果未完成: ❌ 返回 Step 2
>   - 开始 Upwork 验证: ✅
> ```

> ⚠️ **不直接访问 Upwork** - 使用 Google 搜索绕过 Cloudflare

**搜索方法**:
```
Google 搜索: site:upwork.com OR site:freelancer.com OR site:guru.com "{keyword}" jobs
时间限制: 近一年 (tbs=qdr:y)
```

**执行步骤**:
1. 访问: `https://www.google.com/search?q=site:upwork.com+OR+site:freelancer.com+"{keyword}"+jobs&tbs=qdr:y`
2. 记录搜索结果数量 ("约 X 个结果")
3. 提取前 5 个结果的标题和摘要

> [!CAUTION]
> **⛔ UPWORK_VALIDATION_GATE (Step 3 完成后必须输出)**:
> ```
> 🔍 UPWORK_VALIDATION:
>   - 搜索查询: "{query}"
>   - 结果数量: {N}
>   - 语义相关: {relevant_count}/{total_count} ({High/Medium/Low/None})
>   - 数据来源: {google_site_search}
>   - 验证状态: {COMPLETE/SKIPPED}
>   - 跳过原因 (如有): {reason}
> ```
> **如果 验证状态 = SKIPPED 且无合理原因**: 关键词状态标记为 `pending` 而非 `verified`

### Step 3.5: 语义相关性分析 (LLM)

> 🎯 **核心步骤**: 使用 LLM 判断搜索结果是否真正与痛点相关

**Prompt**:
```markdown
You are a B2B Demand Validation Analyst. Determine if these job postings are TRULY relevant to the pain point.

# Input
- **Target Keyword**: {{keyword}}
- **Original Pain Point**: {{pain_point_summary}}
- **Search Results**:
{{#each results}}
  - Title: {{this.title}}
  - Snippet: {{this.snippet}}
{{/each}}

# Classification Rules
| Signal | Classification |
|--------|---------------|
| "Build app/tool/automation for..." | ✅ RELEVANT |
| "Automate my workflow..." | ✅ RELEVANT |
| "Need software that can..." | ✅ RELEVANT |
| "Need accountant/CPA to..." | ❌ NOT RELEVANT (hiring person) |
| "Looking for tutor/teacher..." | ❌ NOT RELEVANT (education) |
| "Data entry job..." | ❌ NOT RELEVANT (manual labor) |

# Output (JSON)
{
  "analysis": [{"title": "...", "is_relevant": boolean, "reason": "..."}],
  "summary": {
    "relevant_count": number,
    "total_count": number,
    "relevance_rate": number,
    "verdict": "High" | "Medium" | "Low" | "None"
  }
}
```

**Verdict 阈值**:
| relevance_rate | verdict |
|----------------|---------|
| ≥ 0.6 | High |
| ≥ 0.3 | Medium |
| ≥ 0.1 | Low |
| < 0.1 | None |

**输出格式**:
```json
{
  "upwork_volume": "High (100+ results via Google)",
  "semantic_relevance": "Medium (3/5 relevant)",
  "platform_source": "google_site_search",
  "validation_confidence": "Medium"
}
```

### Step 3.6: 语义校验 (基于 Google Site Search 结果)

> [!IMPORTANT]
> **v5.0 变更**: 不再直接访问 Upwork，使用 Step 3.5 的 Google Site Search 结果进行语义验证。

1. **读取原始痛点上下文**:
   - 从 `leads` 表中获取关联帖子的 `pain_point_summary`
   - 从 `keywords` 表中获取 `discovered_from` 字段

2. **语义匹配评估** (基于 Step 3.5 搜索结果):
   - 使用 Step 3.5 已采集的搜索结果摘要
   - **不需要**点击进入职位详情页

3. **语义匹配评分**:

| 匹配信号 | 权重 |
|---------|------|
| 搜索结果标题包含原始痛点关键词 | +3 |
| 目标用户群一致 (SMB vs Enterprise) | +2 |
| 需求类型匹配 (automation/tool vs manual labor) | +2 |

**评分判断**:
- ≥ 5/7: `semantic_match: "Strong"`
- 3-4/7: `semantic_match: "Partial"` (添加警告)
- < 3/7: `semantic_match: "Weak"` (建议更换关键词)

4. **输出 Schema**:
```json
{
  "validation": {
    "upwork_volume": "High (110+ results via Google)",
    "semantic_analysis": {
      "match_score": 5,
      "match_level": "Strong",
      "source": "google_site_search",
      "sampled_snippets": [
        "Title: Build automation script for...",
        "Title: Need Python tool to..."
      ]
    }
  }
}
```

### Step 3.7: V3 Commercial Intent Prompt (语义验证)

> [!TIP]
> **V3 增强**: 使用 LLM 语义分析替代硬编码规则，提高验证准确性。

**Prompt 模板**:
```markdown
You are a Commercial Intent Analyst. Your goal is to determine if a Freelance Job Listing represents a "Paying Customer" for a specific Pain Point.

# Input Data
- **Target Pain Point**: {{pain_point_summary}} (e.g., "Manual data entry in Excel for CPA exams")
- **Job Listing**:
  - Title: {{job_title}}
  - Description: {{job_description}}
  - Budget: {{job_budget}}
  - Skills: {{job_skills}}

# Analysis Instructions (Chain of Thought)
1. **Analyze the Job Goal**: What is the client trying to achieve? Is it related to the Pain Point?
2. **Evaluate Willingness**: Is the budget realistic? (e.g., $5 is spam, $100+ is real).
3. **Semantic Match**:
   - STRONG match: Client explicitly asks for a solution to the pain point (e.g., "Need script to automate Excel entry").
   - WEAK match: Client just mentions keywords but in a different context (e.g., "Need Excel tutor").
   - NO match: Completely unrelated.

# Output Schema (JSON)
{
  "match_score": number, // 0-10. 0=Irrelevant, 10=Perfect Match
  "intent_level": "High" | "Medium" | "Low" | "Spam",
  "budget_health": "Healthy" | "Lowball" | "Unknown",
  "reasoning": "string" // Max 1 sentence explaining the score
}
```

### Step 4: 综合判断

| 条件 | 新 Status |
|------|-----------|
| Trends ≥ 5% + Upwork 有 + Semantic Strong | `verified` |
| Trends ≥ 5% + Upwork 有 + Semantic Partial | `verified` (⚠️ 需人工复核) |
| Trends ≥ 5% + Upwork 有 + Semantic Weak | `pending` (关键词偏移) |
| Trends < 5% + Upwork 有 | `verified` (Niche) |
| Trends = 0 + Upwork 无 | `dead` |
| 数据不完整 | `pending` |

### Step 5: 更新数据库

使用 MCP SQLite 工具写入验证结果：

```sql
-- 1. 插入或更新 validations 表 (使用 mcp_sqlite_write_query)
INSERT INTO validations (
  keyword_id, trends_30d, trends_12m, upwork_volume,
  sample_jobs, related_queries, verdict, updated_at
)
VALUES (
  {keyword_id},
  '2% of GPTs (Stable)',
  '2% of GPTs (Stable)',
  'High (50+ jobs)',
  '{"match_score": 5, "match_level": "Strong", "warning": "..."}',
  '{"top": [...], "rising": [...]}',
  '✅ Verified Gold',
  datetime('now')
)
ON CONFLICT(keyword_id) DO UPDATE SET
  trends_30d = excluded.trends_30d,
  trends_12m = excluded.trends_12m,
  upwork_volume = excluded.upwork_volume,
  sample_jobs = excluded.sample_jobs,
  related_queries = excluded.related_queries,
  verdict = excluded.verdict,
  updated_at = excluded.updated_at;

-- 2. 更新 keywords 表状态
UPDATE keywords SET status = 'verified', updated_at = datetime('now') WHERE id = {keyword_id};
```

### Step 6: 输出报告

```markdown
📊 **Trend Validation Results**:
- Keyword: {keyword}
- Trends (30d): X% of GPTs
- Trends (12m): X% of GPTs
- Upwork: N jobs
- **Verdict**: {verified/dead/pending}
```

---

**Version**: 2.0 | **Owner**: keyword_seeds.validation
