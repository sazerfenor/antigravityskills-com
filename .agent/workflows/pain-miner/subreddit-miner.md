---
description: 社区深挖 Agent - 在指定 Subreddit 中收集帖子
---

# Subreddit Miner Agent

在指定 Subreddit 中使用抱怨词搜索，收集原始帖子数据。

> **版本**: 10.0 (参见 [CHANGELOG](CHANGELOG.md))
> **核心改进**: 显式目标清单 + 进度计数 + 错误恢复

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `subreddits` | ✅ OWNER (CRUD) | `PainMinerDB.subreddits.*` |
| `leads` | 📝 Create Only | `PainMinerDB.leads.create()` |

---

## 触发条件

- `subreddits` 表中存在 `status = "new"` 的记录
- Orchestrator 调用

---

## 执行步骤\n
### Step 1: 获取目标并生成目标清单 (v10.0 重构)

**工具**: `mcp_sqlite_read_query`

```sql
-- MAX_SUBREDDITS_PER_RUN = 10
-- 排除 retry_count >= 3 的失败项
SELECT id, name, retry_count 
FROM subreddits 
WHERE status = 'new' AND (retry_count IS NULL OR retry_count < 3)
ORDER BY created_at DESC 
LIMIT 10;
```

**必须输出: 目标清单表格**

```markdown
## 🎯 目标清单 (共 {N} 个)

| # | Subreddit | ID | retry_count | Status |
|:--|:--|:--|:--|:--|
| 1 | /r/{name1} | {id1} | 0 | [ ] 待处理 |
| 2 | /r/{name2} | {id2} | 1 | [ ] 待处理 |
| 3 | /r/{name3} | {id3} | 0 | [ ] 待处理 |
...
```

> [!IMPORTANT]
> 如果 N = 0，切换到已验证 Subreddit 深度挖掘模式

---

### Step 1.5: 批量处理循环 (v10.0 显式控制)

> 🔄 **循环规则**: 按目标清单顺序，逐个处理每个 Subreddit

**处理流程**:
1. **开始时**: 输出目标清单表格 (如上)
2. **每处理 1 个**: 更新表格中的 Status 为 `[x]` 并输出进度
3. **失败时**: 更新 Status 为 `[!]` 并说明原因，增加 retry_count
4. **全部完成**: 输出完成统计

**进度输出格式**:
```
✅ [{current}/{total}] 完成 /r/{name}
   - 采集模式: mcp/browser
   - 帖子数: N
   - 入库: M 条
```

**失败处理** (v10.0 新增):
```sql
-- 处理失败时，增加重试计数
UPDATE subreddits 
SET retry_count = COALESCE(retry_count, 0) + 1, 
    updated_at = CURRENT_TIMESTAMP 
WHERE id = {id};
```

输出:
```
[!] /r/{name} 处理失败 (第 {retry_count} 次)
   - 错误: {error_message}
   - retry_count >= 3 → 将标记为 failed
```

**完成条件**:
- 只有当所有 `[ ]` 变成 `[x]` 或 `[!]` 时
- 才能输出: `🏁 循环完成: {processed}/{total} (失败: {failed})`

---

### Step 2: 调用 Hybrid Scraper (v8.0 新增)

> [!TIP]
> **优先使用 Hybrid Scraper** 直接从 Subreddit 获取帖子，无需 Google 搜索。

**执行**:
```markdown
调用 [hybrid-scraper.md](hybrid-scraper.md):
- subreddit: {subreddit_name}
- category: 'hot'
- limit: 25
- time_filter: 'month'
```

**成功条件**:
- 返回 >= 5 条帖子
- source = 'api' (最优) 或 'browser' (可接受)

**GATE**:
- ✅ >= 5 条 → 跳到 Step 3
- ⚠️ < 5 条 → 执行 Step 2.5 (Google 搜索补充)

### Step 2.5: Google 搜索补充 (Fallback)

> 仅当 Hybrid Scraper 结果不足时触发

采用 **痛点三连方** 搜索策略:

1. **Precision Query**: 
   `site:reddit.com/r/{subreddit} "{complaint_keyword}" (nightmare OR hell) after:2025-01-01`
2. **Action Query**:
   `site:reddit.com/r/{subreddit} "{complaint_keyword}" (tedious OR manual) after:2025-01-01`
3. **Intent Query**:
   `site:reddit.com/r/{subreddit} "best tool for" "{complaint_keyword}" after:2025-01-01`

> [!IMPORTANT]
> **⚙️ TIME_FILTER_GATE** (必须输出):
> ```
> 🔍 TIME_FILTER_GATE:
>   - 使用的查询: {完整查询字符串}
>   - 包含时间过滤: YES
>   - 结果数量: {N}
> ```

---

### Step 3: 收集帖子详情

> ⛔ **MANDATORY**: 对每个帖子，提取详情。

**如果来自 Hybrid Scraper** (直接使用，已包含详情):
- title, score, num_comments, created_utc, selftext

**如果来自 Google 搜索** (需浏览器访问):
```
browser_subagent({
  Task: "Navigate to {post_url}
         1. Extract: title, upvotes, comments_count, post_body
         2. Extract post_date
         3. Return structured data",
  TaskName: "Post Detail - {post_title}",
  RecordingName: "post_{lead_id}"
})
```

**最低要求**: 必须成功提取至少 3 个帖子详情

### Step 4: 创建 Raw Leads (v8.1 修复)

> [!IMPORTANT]
> **v8.1 修复**: 存储帖子正文和作者，支持后续深度分析。

**工具**: 使用 `mcp_sqlite_write_query` 写入 `leads` 表:
```sql
INSERT INTO leads (
  external_id, subreddit_id, source_url, title, 
  timestamp, upvotes, comments_count, 
  post_content,           -- v8.1 新增: 帖子正文 (来自 selftext)
  author,                 -- v8.1 新增: 作者用户名
  access_status, analyzed, created_at, updated_at
) VALUES (
  {post.id}, 
  {subreddit_id}, 
  'https://reddit.com' || {post.permalink},
  {post.title},
  datetime({post.created_utc}, 'unixepoch'),
  {post.score},
  {post.num_comments},
  {post.selftext},        -- 帖子正文
  {post.author},          -- 作者
  'accessible', 
  0, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
);
```

### Step 5: 更新 Subreddit Seed

**工具**: 使用 `mcp_sqlite_write_query`:
```sql
UPDATE subreddits 
SET status = 'verified', 
    total_posts_mined = total_posts_mined + ?, 
    last_explored = CURRENT_TIMESTAMP 
WHERE id = ?;
```

### Step 5.5: 失败项处理 (v10.0 新增)

对于 retry_count >= 3 的 Subreddit:

```sql
UPDATE subreddits 
SET status = 'failed', 
    updated_at = CURRENT_TIMESTAMP 
WHERE id = {id} AND retry_count >= 3;
```

输出:
```
⏭️ 标记为 failed: /r/{name} (已失败 3 次)
```

### Step 5.6: 循环完成验证

> [!CAUTION]
> **⛔ LOOP_COMPLETION_GATE (必须输出)**:

```
🔍 LOOP_COMPLETION_GATE:
  ┌────────────────────────────────────────┐
  │ 目标清单最终状态                        │
  ├────────────────────────────────────────┤
  │ 计划处理: {N} 个                        │
  │ 成功 [x]: {success} 个                  │
  │ 失败 [!]: {failed} 个                   │
  │ 采集模式: mcp: {X} / browser: {Y}       │
  │ 处理率: {success/N * 100}%              │
  │ SLA 标准: >= 80%                        │
  ├────────────────────────────────────────┤
  │ OVERALL: {PASS / FAIL}                  │
  └────────────────────────────────────────┘
```

**FAIL 条件**: 处理率 < 80% 且不是因为 retry_count 达到上限

### Step 6: 输出报告

```markdown
⛏️ **Subreddit Mining Results**:

## 目标清单
| # | Subreddit | Status | Posts | Leads |
|:--|:--|:--|:--|:--|
| 1 | /r/{name1} | [x] 完成 | 25 | 3 |
| 2 | /r/{name2} | [x] 完成 | 18 | 2 |
| 3 | /r/{name3} | [!] 失败 | 0 | 0 |

## 统计
- 总计处理: {N} 个
- 成功: {success} 个
- 失败: {failed} 个
- 新增 Leads: {total_leads} 条
```

---

**Version**: 10.0 | **Owner**: subreddits | **Updated**: 2025-12-28
