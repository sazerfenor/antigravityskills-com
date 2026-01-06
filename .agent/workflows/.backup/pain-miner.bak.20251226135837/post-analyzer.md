---
description: 帖子分析 Agent - 提取痛点和需求词
---

# Post Analyzer Agent

深度分析帖子内容，提取痛点和需求词，智能去重。

---

## 数据所有权

| 数据 | 权限 | 说明 |
|------|------|------|
| `leads` | ✅ OWNER | 分析结果、评分更新 |
| `competitors` | 📝 延伸写入 | 发现时写入 |
| `feature_gaps` | 📝 延伸写入 | 发现时写入 |

---

## 触发条件

- `raw_leads` 中存在 `analyzed = false` 的记录
- Orchestrator 调用

---

## 执行步骤

// turbo-all

### Step 1: 获取待分析帖子

查询 SQLite `leads` 表中未分析的记录 (按价值排序):
```sql
-- ✅ 新查询 (按价值排序，优先高评论/高赞帖子)
SELECT * FROM leads 
WHERE analyzed = 0 
ORDER BY comments_count DESC, upvotes DESC, created_at DESC 
LIMIT 10;
```

> [!IMPORTANT]
> **⚙️ DECISION GATE (必须输出)**:
> ```
> 🔍 DECISION_GATE:
>   - 待分析 Lead 数量: {N}
>   - Lead 列表: {id1, id2, ...}
>   - Action: PROCEED  # ⛔ 禁止 SKIP
>   - Fallback: {如果 N=0 → 分析最近 5 个 analyzed Lead 的深层关联}
> ```
> **⛔ 禁止跳过**: 如果无未分析 Lead，必须对已分析 Lead 执行深层关联分析。

### Step 1.5: 强制循环 (MANDATORY)

> ⛔ 对 Step 1 返回的**每一个** Lead 执行 Step 2-4。

**循环保护**: `MAX_LEADS = 20`

```javascript
for (const lead of allLeads.slice(0, MAX_LEADS)) {
  await executeStep2_DeepScan(lead);
  await executeStep3_Update(lead);
}
```

> [!IMPORTANT]
> **⚙️ LOOP_PROGRESS_GATE (每个 Lead 必须输出)**:
> ```
> 🔁 LOOP_PROGRESS:
>   - 当前 Lead: #{lead.id} - {lead.title} ({current_index}/{total_count})
>   - 痛点摘要: {pain_point_summary}
>   - 评分: R={relevance}/P={pain}/E={emotion}
> ```
> **禁止跳过任何 Lead。禁止合并分析多个 Lead。**

### Step 1.6: 分析覆盖率强制验证

> ⛔ **CRITICAL**: 本轮执行必须满足最低分析数量，否则阻断后续步骤。

**最低分析数量计算**:
```
minimum_analysis_count = MAX(3, FLOOR(total_unanalyzed * 0.3))

# 示例:
# 如果有 13 条未分析 → MIN = MAX(3, 4) = 4
# 如果有 5 条未分析 → MIN = MAX(3, 1) = 3
# 如果有 2 条未分析 → MIN = MAX(3, 0) = 3 (但实际只有 2 条，则分析全部)
```

> [!CAUTION]
> **⛔ ANALYSIS_PROGRESS_GATE (每分析完一条必须输出)**:
> ```
> 🔁 ANALYSIS_PROGRESS:
>   - 已分析: {current_count}/{minimum_required}
>   - 当前 Lead: #{id} - {title}
>   - 评分: R={relevance}/P={pain}/E={emotion}
>   - 剩余配额: {minimum_required - current_count}
> ```

> [!CAUTION]
> **⛔ ANALYSIS_COVERAGE_GATE (所有分析完成后必须输出)**:
> ```
> 🔍 ANALYSIS_COVERAGE:
>   - 本轮待分析总数: {N}
>   - 最低要求: {minimum_required}
>   - 实际分析: {M}
>   - 覆盖率: {M/N * 100}%
>   - 最低要求达成: {YES (M >= minimum_required) / NO}
>   - OVERALL: {PASS / FAIL}
> ```
> 
> **⛔ 阻断规则**:
> - 如果 `M < minimum_required` 且 `N >= 3` → OVERALL = FAIL
> - 如果 OVERALL = FAIL:
>   ```
>   ❌ EXECUTION_BLOCKED:
>     - Agent: Post Analyzer
>     - 原因: 分析数量不足 (实际 {M} / 要求 {minimum_required})
>     - 动作: 禁止调用下一个 Agent，返回 Step 1.5 继续分析
>   ```
> - **"Simulated for Demo" 不是有效的分析记录**
> - **每个 Lead 必须有真实的 browser_subagent 访问记录**

### Step 2: 深度扫描帖子 (强制浏览器 + 滚动)

> ⛔ **MANDATORY**: 必须使用 `browser_subagent` 并执行滚动操作。**禁止模拟数据或跳过**。

**执行** (对每个未分析的 lead):

#### Step 2.1: 打开帖子
```
browser_subagent({
  Task: "Navigate to {lead.source_url} and wait for page to fully load",
  TaskName: "Open Post - {lead.title}",
  RecordingName: "post_open_{lead.id}"
})
```

#### Step 2.2: 滚动加载评论 (必做！)
> 🚨 **不可跳过**: 必须执行滚动操作才能获取评论！

```
browser_subagent({
  Task: "Scroll down the page to load all comments:
         1. Scroll down (Dy: 1000)
         2. Wait 1 second
         3. Repeat 5 times total
         4. Click 'load more comments' / 'more replies' if present
         5. Report how many comments are now visible",
  TaskName: "Scroll and Load Comments",
  RecordingName: "post_scroll_{lead.id}"
})
```

#### Step 2.3: 提取数据
```
browser_subagent({
  Task: "Extract from the now fully-loaded page:
         - Post title and body (first 500 chars)
         - Upvotes count (exact number)
         - Top 20 comments with their upvotes and author
         - Author username and flair
         Return as structured JSON",
  TaskName: "Extract Post Data",
  RecordingName: "post_extract_{lead.id}"
})
```

> 🚫 **HALT CONDITIONS**:
> - 如果帖子无法访问 → 标记 `access_status: 'blocked'` 并跳过此帖子
> - 如果 browser_subagent 完全失败 → **HALT**
> **禁止编造帖子内容。禁止使用假评论。**

**最低数据要求**:
| 字段 | 最低要求 |
|------|---------|
| upvotes | 必须从页面获取真实数字 |
| comments | 至少读取 5 条真实评论 |
| title | 必须匹配页面标题 |

### Step 2.5: 深层信号扫描

在滚动后的完整页面中，重点搜索以下高价值信号：

| 信号类型 | 搜索模式 | 价值等级 |
|---------|---------|---------|
| 付费意愿 | "I pay for", "would pay", "hiring someone" | 🔥 最高 |
| 工具推荐 | 具体产品名称 (DocuClipper, TableSense 等) | 🔥 高 |
| 时间成本 | "hours", "days", "weeks to enter" | 🧱 中 |
| 情绪爆发 | "nightmare", "losing my mind", "hate" | 🔥 高 |

> [!TIP]
> **优先提取**: 包含多个高价值信号的评论应优先记录到 `evidence` 字段。

### Step 2.6: 作者信息提取

从帖子页面提取作者信息：

| 字段 | 说明 |
|-----|------|
| `username` | Reddit 用户名 |
| `role` | 从 flair 推断 (CPA/Bookkeeper/Developer/unknown) |
| `account_age` | 账号年龄 (如可获取) |

> [!NOTE]
> 作者身份有助于判断痛点的专业性和可信度。

### Step 2.7: 评论循环采集 (Top 10)

对高赞评论按点赞数排序，采集前 10 条：

| 字段 | 说明 |
|-----|------|
| `content` | 评论文本 (截取前 500 字符) |
| `upvotes` | 点赞数 |
| `author_role` | 评论者角色 (从 flair 推断) |
| `sentiment` | 情感倾向 (positive/negative/neutral) |

> [!CAUTION]
> **采集上限**: 只采集 Top 10 高赞评论，避免信息过载。

### Step 2.8: 竞品提取器 (v5.0 增强写入)

扫描评论中的产品/工具提及：

**识别模式**:
- "I use [ProductName]"
- "[ProductName] works great / sucks / doesn't support"
- "$X/mo" 或 "$X/year" 价格模式

**输出**:
| 字段 | 说明 |
|-----|------|
| `tools_mentioned[]` | 产品名称列表 |
| `sentiment` | positive/negative/neutral |
| `price_mentioned` | 价格信息 (如有) |

> [!IMPORTANT]
> **v5.0 增强**: 必须将竞品信息写入 `competitors` 和 `feature_gaps` 表。

**写入 competitors 表**:
```sql
-- 对每个发现的工具名称
INSERT INTO competitors (
  external_id, name, normalized_name, sentiment_score, mention_count, status, created_at, updated_at
) VALUES (
  'comp_' || hex(randomblob(4)),
  '{tool_name}',
  lower(replace('{tool_name}', ' ', '')),  -- 标准化
  CASE WHEN sentiment = 'negative' THEN -1 WHEN sentiment = 'positive' THEN 1 ELSE 0 END,
  1,
  'pending',
  datetime('now'),
  datetime('now')
)
ON CONFLICT(name) DO UPDATE SET
  mention_count = mention_count + 1,
  sentiment_score = (sentiment_score * mention_count + excluded.sentiment_score) / (mention_count + 1),
  updated_at = datetime('now');
```

**写入 feature_gaps 表** (如有功能抱怨):
```sql
INSERT INTO feature_gaps (competitor_id, missing_feature_name, evidence_lead_ids, mention_count, created_at, updated_at)
VALUES (
  (SELECT id FROM competitors WHERE name = '{tool_name}'),
  '{feature_request}',
  json_array({lead_id}),
  1,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(competitor_id, missing_feature_name) DO UPDATE SET
  mention_count = mention_count + 1,
  evidence_lead_ids = json_insert(evidence_lead_ids, '$[#]', {lead_id}),
  updated_at = datetime('now');
```

### Step 2.9: 功能需求提取器

识别用户明确的功能请求：

**识别模式**:
- "I wish it could..."
- "Would be great if..."
- "Need a tool that..."
- "[Tool] doesn't support..."
- "Looking for a way to..."

**输出**: `feature_requests_extracted[]` 数组

> [!TIP]
> 功能需求是产品设计的黄金信号，应优先提取。

### Step 3: 更新数据

1. **更新** `leads` 表 (标记已分析并写入结果 + v2.0 评分):
   ```sql
   UPDATE leads 
   SET 
     analyzed = 1,
     analyzed_at = CURRENT_TIMESTAMP,
     pain_point_summary = ?,
     evidence = ?, -- Store as JSON string
     emotional_level = ?,
     competitor_analysis = ?, -- Store as JSON string
     feature_requests_extracted = ?, -- Store as JSON string
     -- v2.0 评分字段
     relevance_score = ?,
     emotion_score = ?,
     pain_score = ?,
     roi_weight = ?,
     lead_type = ?,
     tags = ?, -- JSON array
     scoring_justification = ?
   WHERE id = ?;
   ```

2. **追加** `research_log.md` (中英双语):
   ```markdown
   ### Post N: [Title](url)
   **中文摘要**: 一句话概括痛点。
   
   - **Time**: 2023-11 (Active/Old)
   - **Pain Point**: English description
   - **Evidence**: *"Original quote"*
   - **Competitors**: DocuClipper (+), Dext (-)
   - **Feature Requests**: 手写识别, 批量导入
   - **Status**: 🔥 High
   ```

### Step 3.5: 收敛检查点 (MANDATORY) ⭐ v7.0 NEW

> ⛔ **CRITICAL**: 无论分析多少帖子，必须输出 TOP 5 高置信度痛点。

**收敛算法**:
```javascript
const allAnalyzed = await mcp_sqlite_read_query(`
  SELECT id, pain_point_summary, 
         (relevance_score + pain_score + emotion_score) as total_score,
         relevance_score, pain_score, emotion_score
  FROM leads 
  WHERE analyzed = 1 
  ORDER BY total_score DESC 
  LIMIT 20
`);

// 强制输出 TOP 5
const topPainPoints = allAnalyzed.slice(0, 5).map((lead, i) => ({
  rank: i + 1,
  id: lead.id,
  summary: lead.pain_point_summary,
  total_score: lead.total_score,
  confidence: lead.total_score >= 24 ? 'High' : 
              lead.total_score >= 18 ? 'Medium' : 'Low'
}));
```

> [!CAUTION]
> **⛔ CONVERGENCE_GATE (必须输出)**:
> ```
> 🔍 CONVERGENCE_GATE:
>   ┌───┬────────────────────────┬───────┬────────────┐
>   │ # │ 痛点摘要              │ 总分  │ 置信度     │
>   ├───┼────────────────────────┼───────┼────────────┤
>   │ 1 │ {summary_1}           │ 27/30 │ High       │
>   │ 2 │ {summary_2}           │ 25/30 │ High       │
>   │ 3 │ {summary_3}           │ 22/30 │ Medium     │
>   │ 4 │ {summary_4}           │ 20/30 │ Medium     │
>   │ 5 │ {summary_5}           │ 18/30 │ Medium     │
>   └───┴────────────────────────┴───────┴────────────┘
>   
>   本轮分析总数: {N}
>   收敛率: {5/N × 100}%
>   下游传递: TOP 5 痛点 → keyword-extractor
> ```
> **如果 TOP 5 中 High 置信度 < 2 个**: ⚠️ 标记 `LOW_QUALITY_WARNING`

---

### Step 4: 输出报告

```markdown
🔬 **Post Analysis Results**:
- Analyzed: N posts
- High Value Leads Found: X (Score >= 24)
- TOP 5 Convergence: ✅
- Feature Requests: W
```

> ✅ **Agent 完成** - Orchestrator 将自动执行下一步: `keyword-extractor`

---

**Version**: 2.1 | **Owner**: post_analyzer | **Updated**: 2025-12-26
