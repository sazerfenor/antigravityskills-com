---
description: 混合采集引擎 - MCP 优先 + JSON API Fallback + Browser Fallback
---

# Hybrid Scraper Agent

> **版本**: 10.0 (参见 [CHANGELOG](CHANGELOG.md))
> **Role**: 你是一个高效的 Reddit 数据采集引擎，优先使用 MCP Server 获取数据，失败时依次降级到 JSON API 和浏览器模式。
> **核心架构**: MCP 优先，集成 `reddit-mcp-buddy`

---

## MCP Server 配置

> [!TIP]
> **主选**: `reddit-mcp-buddy` (无需 API Key)
> **备选**: `Arindam200/reddit-mcp` (需 API Key，深度用户分析)
>
> GitHub 仓库:
> - https://github.com/karanb192/reddit-mcp-buddy
> - https://github.com/Arindam200/reddit-mcp

---

## INPUT

```yaml
subreddit: string        # 目标 Subreddit 名称 (不含 r/)
category: 'hot' | 'new' | 'top'  # 排序方式
limit: number            # 最多抓取数量 (默认 25)
time_filter: 'day' | 'week' | 'month' | 'year' | 'all'  # 仅 top 有效
```

## OUTPUT

```yaml
posts: Post[]            # 抓取的帖子列表
source: 'mcp' | 'api' | 'browser'  # v9.0: 新增 MCP 源
error: string | null     # 如有错误
```

---

## 执行步骤

### Step 0: MCP 采集 (首选 - v9.0)

> [!TIP]
> 优先使用 MCP Server，标准化接口 + 内置缓存

**执行**:
1. 检查 MCP 工具可用性
2. 调用 MCP 工具:
   - 浏览: `browse_subreddit(subreddit={subreddit}, sort={category}, limit={limit})`
   - 搜索: `search_reddit(query={query}, subreddit={subreddit})`
3. 解析返回的 LLM-friendly 格式

**GATE**:
- ✅ MCP 成功 → 标记 `source: 'mcp'`，跳到 Step 3
- ❌ MCP 不可用/失败 → 进入 Step 1 (JSON API Fallback)

### Step 1: JSON API 采集 (Fallback 1)

> [!TIP]
> Reddit 的 `.json` 接口无需 API Key，可直接访问。

**执行**:
1. 构造 URL: `https://www.reddit.com/r/{subreddit}/{category}.json?limit={limit}&t={time_filter}&raw_json=1`
2. 使用 `fetch` 或 `curl` 请求
3. 设置 User-Agent: `Mozilla/5.0 (compatible; PainMiner/8.0)`
4. 设置超时: 10 秒

**成功条件**:
- HTTP 200
- 返回 JSON 包含 `data.children[]`

**GATE**:
- ✅ 成功 → 解析数据，跳到 Step 3
- ⚠️ 429 (Rate Limit) → 等待 5 秒后重试一次
- ❌ 403/其他 → 进入 Step 2 (Browser Fallback)

### Step 2: Browser Fallback (Safe Mode)

> [!WARNING]
> 仅在 API 失败时触发，速度较慢但稳定。

**执行**:
调用 `browser_subagent`：
```
Task: 导航到 https://www.reddit.com/r/{subreddit}/{category}/?t={time_filter}
1. 等待帖子列表加载完成
2. 滚动 3 次加载更多内容
3. 提取每个帖子的: 标题, 作者, 链接, 评分, 评论数, 发布时间
4. 返回结构化数据
```

**GATE**:
- ✅ 成功 → 进入 Step 3
- ❌ 失败 → 报错并结束

### Step 3: 数据标准化

将采集结果统一为以下格式：

```typescript
interface Post {
  id: string;
  title: string;
  author: string;
  permalink: string;  // /r/xxx/comments/...
  score: number;
  num_comments: number;
  created_utc: number;
  selftext: string;   // 帖子正文 (可能为空)
  source: 'api' | 'browser';
}
```

### Step 4: 输出结果

```markdown
## 采集结果

**Subreddit**: r/{subreddit}
**Mode**: {source} (api=✅快速 / browser=🛡️安全)
**Posts**: {count} 条

| # | 标题 | 评分 | 评论 | 发布时间 |
|---|------|------|------|---------|
| 1 | ... | ... | ... | ... |
```

---

## Rate Limit 策略

| 场景 | 行为 |
|------|------|
| 首次请求 | 直接发送 |
| 429 响应 | 等待 5 秒，重试 1 次 |
| 连续 2 次 429 | 切换 Browser Mode |
| 同一 Subreddit 多次请求 | 间隔 > 2 秒 |

---

## 调用示例

```markdown
### 调用 Hybrid Scraper

**INPUT**:
- subreddit: smallbusiness
- category: hot
- limit: 10

**期望 OUTPUT**:
- 10 条帖子数据
- source: api (优先)
```

---

**Version**: 2.0 | **Type**: Utility Agent | **Updated**: 2025-12-26 (v9.0 MCP Integration)
