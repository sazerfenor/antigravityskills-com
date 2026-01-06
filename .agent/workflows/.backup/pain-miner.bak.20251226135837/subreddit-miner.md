---
description: 社区深挖 Agent - 在指定 Subreddit 中收集帖子
---

# Subreddit Miner Agent

在指定 Subreddit 中使用抱怨词搜索，收集原始帖子数据。

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `subreddits` | ✅ OWNER (CRUD) | `PainMinerDB.subreddits.*` |
| `leads` | 📝 Create Only | `PainMinerDB.leads.create()` |

### SQLite Data Access (v2.0+)

```typescript
import { PainMinerDB } from '../../../pain-miner-dashboard/src/core/db/data-service';

// 获取待挖掘的 subreddits
const pendingSubs = PainMinerDB.subreddits.list()
  .filter(s => s.status === 'pending');

// 创建新 lead
const lead = PainMinerDB.leads.create({
  externalId: 'lead_XXX',
  subredditId: subreddit.id,
  sourceUrl: '...',
  analyzed: false,
});

// 更新 subreddit 已挖掘帖子数
PainMinerDB.subreddits.incrementPostsMined(subredditId, 10);
```

> [!NOTE]
> **Migration**: v2.0+ 使用 SQLite 数据库。JSON 文件已弃用。

---

## 触发条件

- `subreddits` 表中存在 `status = "new"` 的记录
- Orchestrator 调用

---

## 执行步骤

// turbo-all

### Step 1: 获取目标

1. 查询 SQLite `subreddits` 表获取目标:
   ```sql
   SELECT * FROM subreddits WHERE status = 'new' ORDER BY created_at DESC LIMIT 5;
   ```
2. 查询 SQLite `complaint_keywords` 表获取搜索词:
   ```sql
   SELECT ck.keyword FROM complaint_keywords ck
   JOIN complaint_categories cc ON ck.category_id = cc.id
   WHERE cc.type = 'general' AND cc.priority >= 4;
   ```

> [!IMPORTANT]
> **⚙️ DECISION GATE (必须输出)**:
> ```
> 🔍 DECISION_GATE:
>   - 待挖掘 Subreddit 数量: {N}
>   - Subreddit 列表: {name1, name2, ...}
>   - Action: PROCEED  # ⛔ 禁止 SKIP
>   - Fallback: {如果 N=0 → 切换到已验证 Subreddit 深度挖掘模式}
> ```
> **⛔ 禁止跳过**: 如果无 new Subreddit，必须选择 1-2 个 verified Subreddit 进行深度挖掘。

### Step 1.5: 强制循环包装 (MANDATORY LOOP)

> ⛔ **CRITICAL**: 对 Step 1 返回的**每一个** Subreddit，必须执行 Step 2-5。**禁止只处理部分 Subreddit**。

**循环结构**:
```javascript
const allSubreddits = await mcp_sqlite_read_query("SELECT * FROM subreddits WHERE status = 'new'");

// ⛔ 禁止: 只处理第一个
// ❌ const subreddit = allSubreddits[0]; 

// ✅ 强制循环处理所有
for (const subreddit of allSubreddits) {
  await executeStep2_Search(subreddit);
  await executeStep3_CollectPosts(subreddit);
  await executeStep4_CreateLeads(subreddit);
  await executeStep5_UpdateStatus(subreddit);
}
```

> [!IMPORTANT]
> **⚙️ LOOP_PROGRESS_GATE (每个 Subreddit 必须输出)**:
> ```
> 🔁 LOOP_PROGRESS:
>   - 当前 Subreddit: {name} ({current_index}/{total_count})
>   - 帖子发现: {N}
>   - Leads 创建: {M}
> ```
> **禁止跳过任何 Subreddit。禁止合并挖掘多个 Subreddit。**



### Step 2: 执行搜索 (痛点三连方)

> ⛔ **MANDATORY**: 所有查询**必须**包含时间过滤器 `after:2025-01-01`。

采用 **Parallel Strategy** 确保结果最大化 (v5.0 改进)：

> [!IMPORTANT]
> **v5.0 变更**: 从 Fallback 策略改为**并行执行 + 合并去重**，确保挖掘更多帖子。

1. **Precision Query** (情绪痛点): 
   `site:reddit.com/r/{subreddit} "{complaint_keyword}" (nightmare OR hell OR unbearable) after:2025-01-01`
2. **Action Query** (过程痛点):
   `site:reddit.com/r/{subreddit} "{complaint_keyword}" (tedious OR boring OR manual) after:2025-01-01`
3. **Intent Query** (寻找方案):
   `site:reddit.com/r/{subreddit} "best tool for" "{complaint_keyword}" after:2025-01-01`

> [!IMPORTANT]
> **⚙️ TIME_FILTER_GATE** (必须输出):
> ```
> 🔍 TIME_FILTER_GATE:
>   - 使用的查询: {完整查询字符串}
>   - 包含时间过滤: {YES/NO}
>   - 时间限制: {after:2025-01-01}
>   - 结果数量: {N}
> ```
> **如果查询不包含 `after:` 参数**: ❌ 拒绝执行，重新添加

**执行逻辑** (v5.0 并行策略):
```javascript
// 并行执行所有 3 种搜索
const results = await Promise.all([
  browser_subagent({
    Task: "Execute Precision Query (MUST include 'after:2025-01-01'). Extract all post URLs.",
    TaskName: "Precision Search - {subreddit}",
    RecordingName: "miner_precision_{subreddit}"
  }),
  browser_subagent({
    Task: "Execute Action Query (MUST include 'after:2025-01-01'). Extract all post URLs.",
    TaskName: "Action Search - {subreddit}",
    RecordingName: "miner_action_{subreddit}"
  }),
  browser_subagent({
    Task: "Execute Intent Query (MUST include 'after:2025-01-01'). Extract all post URLs.",
    TaskName: "Intent Search - {subreddit}",
    RecordingName: "miner_intent_{subreddit}"
  })
]);

// 合并去重 (按 URL 去重)
const allPosts = [...results[0].posts, ...results[1].posts, ...results[2].posts];
const uniquePosts = [...new Map(allPosts.map(p => [p.url, p])).values()];

// 按 upvotes 排序，取 Top 10
const topPosts = uniquePosts.sort((a, b) => b.upvotes - a.upvotes).slice(0, 10);

return { 
  status: 'success', 
  total_found: allPosts.length,
  unique_count: uniquePosts.length,
  posts: topPosts
};
```

> [!CAUTION]
> **最小输出要求**: 合并后至少 5 个帖子。如不足，在报告中标记 `⚠️ LOW_YIELD`。

> 🚫 **HALT CONDITIONS**:
> - 三种策略**合并后**仍 < 3 条结果 → **HALT**
> - CAPTCHA 无法绕过 → **HALT**


### Step 3: 收集帖子详情 (强制浏览器)

> ⛔ **MANDATORY**: 对每个搜索结果，必须使用 `browser_subagent` 访问并提取详情，**包括发布日期**。

**执行** (对每个帖子 URL):
```
browser_subagent({
  Task: "Navigate to {post_url}
         1. Wait for page load
         2. Extract: title, upvotes, comments_count, post_body (first 500 chars)
         3. ⭐ Extract post_date: 查找 'Posted by u/xxx • X months/years ago' 或页面时间戳
         4. Calculate freshness:
            - < 1 year: 'fresh'
            - 1-2 years: 'medium'
            - > 2 years: 'stale' (应被过滤，如果存在请标记警告)
         5. Return structured data including post_date and freshness",
  TaskName: "Post Detail - {post_title}",
  RecordingName: "post_{lead_id}"
})
```

> [!WARNING]
> **时效性检查**: 如果提取的帖子 > 2 年 (freshness = 'stale')，在报告中标记 ⚠️ 并考虑排除

**最低要求**: 必须成功提取至少 3 个帖子详情才能继续

### Step 4: 创建 Raw Leads

写入 SQLite `leads` 表:
```sql
INSERT INTO leads (
  external_id, subreddit_id, source_url, title, 
  timestamp, upvotes, comments_count, 
  access_status, analyzed, created_at, updated_at
) VALUES (
  ?, ?, ?, ?, 
  ?, ?, ?, 
  'accessible', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
```

### Step 5: 更新 Subreddit Seed

```sql
UPDATE subreddits 
SET 
  status = 'verified', 
  total_posts_mined = total_posts_mined + ?, 
  last_explored = CURRENT_TIMESTAMP 
WHERE id = ?;
```

### Step 5.5: 循环完成验证 (MANDATORY)

> ⛔ **CRITICAL**: 在输出报告前，必须验证所有 new Subreddit 都已处理。

> [!CAUTION]
> **⛔ SUBREDDIT_LOOP_COMPLETION_GATE (必须输出)**:
> ```
> 🔍 SUBREDDIT_LOOP_COMPLETION:
>   - 计划处理: {N} 个 Subreddit (列表: ...)
>   - 成功挖掘: {M} 个 (列表: ...)
>   - 跳过: {K} 个 (原因列表: ...)
>     - {name1}: {原因}
>     - {name2}: {原因}
>   - 处理率: {(M+K)/N * 100}%
>   - 有效挖掘率: {M/N * 100}%
>   - OVERALL: {PASS / FAIL}
> ```
> 
> **⛔ 阻断规则**:
> - 如果 `有效挖掘率 < 100%` 且无具体原因 → OVERALL = FAIL
> - 如果 OVERALL = FAIL:
>   ```
>   ❌ EXECUTION_BLOCKED:
>     - Agent: Subreddit Miner
>     - 原因: 循环未完成 ({N-M} 个 Subreddit 未处理)
>     - 动作: 禁止调用下一个 Agent，返回 Step 1.5 继续处理
>   ```
> - **"时间约束" 不是有效的跳过原因**
> - **禁止以任何理由提前结束循环**

### Step 6: 输出报告

```markdown
⛏️ **Subreddit Mining Results**:
- Target: /r/xxx (sub_XXX)
- Posts Found: N
- Raw Leads Created: N
```

> ✅ **Agent 完成条件**: SUBREDDIT_LOOP_COMPLETION_GATE.OVERALL = PASS
> ❌ **如果 FAIL**: 禁止输出 "Agent 完成"，必须返回继续处理

---

**Version**: 1.2 | **Owner**: subreddit_seeds | **Updated**: 2025-12-25
