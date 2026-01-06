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
import { PainMinerDB } from '../../../pain-miner-dashboard/src/core/db/data-service';

// 获取待验证的关键词
const pending = PainMinerDB.keywords.listPending();

// 创建或更新 validation
PainMinerDB.validations.upsert(keywordId, {
  trends30d: '2% of GPTs (Stable)',
  trends12m: '2% of GPTs (Stable)',
  upworkVolume: 'High (50+ jobs)',
  verdict: '✅ Verified Gold',
});

// 更新关键词状态
PainMinerDB.keywords.updateStatus(keywordId, 'verified');
```

> [!NOTE]
> **Migration**: v2.0+ 使用 SQLite 数据库。JSON 文件已弃用。

---

## ⛔ 错误处理策略 (v4.0)

| 级别 | 触发条件 | 处理方式 |
|:--|:--|:--|
| 🔴 **HALT** | 认证失败、浏览器崩溃、关键服务不可用 | 停止并通知用户，输出 `❌ WORKFLOW_HALTED` |
| 🟡 **RETRY** | 网络超时、临时错误 | 重试 1 次 (间隔 30s)，仍失败则 SKIP |
| 🟢 **SKIP** | 数据解析失败、非关键步骤失败 | 标记 `Confidence: LOW`，记录原因，继续下一关键词 |

**错误输出格式**:
```
⚠️ ERROR_HANDLED:
  - Type: {HALT/RETRY/SKIP}
  - Step: {Step 名称}
  - Reason: {错误原因}
  - Action: {采取的动作}
  - Confidence: {HIGH/LOW}
```

---

## 触发条件

- `keyword_seeds` 中存在 `status ∈ [new, pending]` 的记录
- Orchestrator 调用

---

## 执行步骤

// turbo-all

### Step 1: 获取待验证关键词 (增强版)

**查询优先级** (按顺序执行，直到有结果):

**最优先** - 本轮新挖掘的关键词 (1 小时内创建):
```sql
-- 使用 mcp_sqlite_read_query 工具
SELECT * FROM keywords 
WHERE status IN ('new', 'pending') 
  AND created_at > datetime('now', '-1 hour')
ORDER BY created_at DESC
LIMIT 10;
```

**次选** - 其他未验证的关键词:
```sql
-- 使用 mcp_sqlite_read_query 工具
SELECT * FROM keywords WHERE status IN ('new', 'pending') ORDER BY created_at DESC LIMIT 10;
```

**次选** - 已 verified 但缺少完整验证数据:
```sql
-- 使用 mcp_sqlite_read_query 工具
SELECT k.* FROM keywords k
LEFT JOIN validations v ON k.id = v.keyword_id
WHERE k.status = 'verified'
  AND (v.trends_30d IS NULL 
       OR v.trends_30d = 'Skipped'
       OR v.upwork_volume IS NULL)
ORDER BY k.created_at DESC
LIMIT 10;
```

> [!IMPORTANT]
> **⚙️ DECISION GATE (必须输出)**:
> ```
> 🔍 DECISION_GATE:
>   - 首选查询结果数: {N}
>   - 次选查询结果数: {M}
>   - 关键词列表: {keyword1, keyword2, ...}
>   - Action: PROCEED  # ⛔ 禁止 SKIP
>   - Fallback: {如果 N+M=0 → 从 Top 3 verified 关键词的 Related Queries 发散新词}
> ```
> **⛔ 禁止跳过**: 如果无待验证关键词，必须从已验证关键词的 Google Trends Related Queries 中发散新词。

### Step 1.5: 强制循环包装 (MANDATORY LOOP)

> ⛔ **CRITICAL**: 对 Step 1 返回的**每一个**关键词，必须执行 Step 2-5。**禁止只处理部分关键词**。

**循环结构**:
```javascript
const allKeywords = await mcp_sqlite_read_query("SELECT * FROM keywords WHERE status IN ('new', 'pending')");

// ⛔ 禁止: 只处理第一个
// ❌ const keyword = allKeywords[0]; 

// ✅ 强制循环处理所有
for (const keyword of allKeywords) {
  await executeStep2_GoogleTrends(keyword);
  await executeStep3_UpworkValidation(keyword);
  await executeStep4_Judgment(keyword);
  await executeStep5_UpdateDB(keyword);
}
```

> [!IMPORTANT]
> **⚙️ LOOP_PROGRESS_GATE (每个关键词必须输出)**:
> ```
> 🔁 LOOP_PROGRESS:
>   - 当前关键词: {keyword} ({current_index}/{total_count})
>   - Trends 结果: {trends_30d}
>   - Upwork 结果: {upwork_volume}
>   - Verdict: {verified/dead/pending}
> ```
> **禁止跳过任何关键词。禁止合并验证多个关键词。**

### Step 1.6: 循环完成验证 (MANDATORY)

> ⛔ **CRITICAL**: 在输出报告前，必须验证所有关键词都已处理。

> [!CAUTION]
> **⛔ KEYWORD_LOOP_COMPLETION_GATE (必须输出)**:
> ```
> 🔍 KEYWORD_LOOP_COMPLETION:
>   - 计划验证: {N} 个关键词 (列表: ...)
>   - 成功验证: {M} 个 (列表: ...)
>   - 跳过: {K} 个 (原因列表: ...)
>   - 完成率: {M/N * 100}%
>   - OVERALL: {PASS / FAIL}
> ```
> 
> **⛔ 阻断规则**:
> - 如果 `完成率 < 100%` 且无具体原因 → OVERALL = FAIL
> - 如果 OVERALL = FAIL:
>   ```
>   ❌ EXECUTION_BLOCKED:
>     - Agent: Trend Validator
>     - 原因: 关键词验证未完成 ({N-M} 个未处理)
>     - 动作: 禁止调用下一个 Agent，返回 Step 1.5 继续验证
>   ```
> - **禁止只验证部分关键词就声称完成**



### Step 2: Google Trends 验证 (强制浏览器)

> ⛔ **MANDATORY**: 必须使用 `browser_subagent` 执行此步骤。**禁止模拟数据**。

**执行**:
```
browser_subagent({
  Task: "Navigate to https://trends.google.com/trends/explore?q={keyword},GPTs
         1. Wait for page to fully load (check for chart rendering)
         2. Capture full page screenshot
         3. Extract the relative percentage value comparing {keyword} to GPTs
         4. Switch to 'Past 12 months' view and capture another screenshot
         5. Return: { 
              trends_30d: '真实百分比 (e.g. 5% of GPTs)', 
              trends_12m: '真实百分比',
              screenshot_path: '/docs/data/trends_{keyword}.png' 
            }",
  TaskName: "Google Trends Validation - {keyword}",
  RecordingName: "trends_{keyword}"
})
```

> 🚫 **HALT CONDITIONS**: 如果 browser_subagent 返回错误，立即输出:
> ```
> ❌ WORKFLOW_HALTED
> Reason: Browser validation failed
> Error: {error_message}
> Action: 请手动验证或切换网络环境后重试
> ```
> **禁止继续执行后续步骤。禁止使用模拟数据替代。**

**趋势判断标准**:
| 形态 | 判断 |
|------|------|
| 热度 < 5% GPTs | 极窄利基 (Niche) |
| 热度 5-20% GPTs | 健康利基 |
| 热度 ≈ GPTs | 红海 |
| 热度 ≈ 0 且下降 | 死市场 |

### Step 2.5: Related Queries 挖掘

> ⛔ **MANDATORY**: 此步骤**必须执行**，不可跳过。

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
   - 设置 `parent_id = 当前验证的 keyword_id`, `depth_level = 1`

> [!IMPORTANT]
> **⚙️ DECISION GATE (Step 2.5 必须输出)**:
> ```
> 🔍 RELATED_QUERIES_GATE:
>   - Top Queries 采集: {成功/失败}
>   - Top Queries 数量: {N}
>   - Rising Queries 采集: {成功/失败}
>   - Rising Queries 数量: {M}
>   - Breakout 词数量: {K}
>   - 新创建 Keywords: {列表或"无"}
> ```
> **如果采集失败**: 设置 `validation_confidence = 'Low'`，但继续执行后续步骤。

### Step 2.6: 趋势方向判断

**基于 12 个月曲线判断趋势方向**:

| 曲线形态 | Direction | 说明 |
|:--|:--|:--|
| 30d 热度 > 12m 平均 × 1.2 | `rising` ⬆️ | 上升趋势，值得关注 |
| 30d 热度 ∈ [12m × 0.8, 12m × 1.2] | `stable` ➡️ | 稳定市场 |
| 30d 热度 < 12m 平均 × 0.8 | `declining` ⬇️ | 下降趋势，谨慎 |

**输出**: `trend_direction: "rising" | "stable" | "declining"`

### Step 2.7: 截图保存

**截图规范**:
- 路径: `pain-miner-dashboard/public/screenshots/trends/{keyword}_{date}.webp`
- 格式: WebP (质量 80%)
- 内容: 包含对比图和 Related Queries

**输出 Schema 增强**:
```json
{
  "validation": {
    "trends_30d": "...",
    "trends_12m": "...",
    "trend_direction": "rising | stable | declining",
    "screenshot_path": "/screenshots/trends/xxx.webp",
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
    "breakout_keywords_created": ["ai pdf parser"]
  }
}
```

### Step 3: 付费需求验证 (Google 间接搜索)

> ⛔ **BANNED**: 禁止直接访问 upwork.com。使用 Google 间接搜索。

**执行**:
```
browser_subagent({
  Task: "Navigate to https://www.google.com/search?q=site:upwork.com+{keyword}+jobs
         
         1. Wait for search results to load
         2. Count the number of Upwork job listings in search results:
            - Look for URLs containing 'upwork.com/freelance-jobs/' or 'upwork.com/job/'
            - Count unique job listings shown
         3. Extract top 3 job titles from search result snippets
         4. Estimate demand level:
            - 0 results → 'None'
            - 1-5 results → 'Low'
            - 6-15 results → 'Medium'  
            - 16+ results → 'High'
         5. Return: {
              status: 'success',
              method: 'google_site_search',
              estimated_count: N,
              demand_level: 'High/Medium/Low/None',
              sample_jobs: [{title}, {title}, {title}]
            }
         
         ⛔ DO NOT click into upwork.com. Only extract from Google search snippets.",
  TaskName: "Upwork Demand Check (via Google) - {keyword}",
  RecordingName: "upwork_google_{keyword}"
})
```

> [!CAUTION]
> **绝对禁止**: 
> - 直接访问 `upwork.com/*` 任何页面
> - 尝试绕过 Cloudflare
> - 使用 Bing/DuckDuckGo 替代后再访问 Upwork
> - 如果遇到任何形式的人机验证，立即 HALT

**验证门槛** (基于 Google 结果估算):
| 条件 | 状态 |
|------|------|
| estimated_count ≥ 16 | High Demand ✅ |
| estimated_count 6-15 | Medium Demand ⚠️ |
| estimated_count < 6 | Low Demand ❌ |
| 搜索无结果 | None → 跳过 |

### Step 3.5: 验证数据标准化

无论使用哪个平台验证，输出格式保持统一：

```json
{
  "upwork_volume": "High (16+ estimated)",
  "platform_source": "google_site_search",
  "blocked_platforms": [],
  "validation_confidence": "Medium"
}
```

> [!NOTE]
> **置信度判断规则**:
> - Google site:upwork 间接获取 → Medium
> - 备用平台 (Guru/Freelancer) → Medium
> - 全部失败 → Low (标记为 pending)

### Step 3.6: Upwork 语义校验

> [!CAUTION]
> **关键校验步骤**: 验证 Upwork 职位是否与原始痛点匹配，避免语义漂移。

1. **读取原始痛点上下文**:
   - 从 `raw_leads` 中获取关联帖子的 `pain_point_summary`
   - 从 `keyword_seeds` 中获取 `discovered_from` 字段

2. **职位详情采样** (Top 3):
   - 点击进入前 3 个职位详情页
   - 提取: 职位标题、预算范围、技能要求、项目描述

3. **语义匹配评分**:

| 匹配信号 | 权重 |
|---------|------|
| 职位描述提及原始痛点关键词 | +3 |
| 目标用户群一致 (SMB vs Enterprise) | +2 |
| 技术栈复杂度匹配 | +1 |
| 预算范围合理 ($100-$500 for simple automation) | +1 |

**评分判断**:
- ≥ 5/7: `semantic_match: "Strong"`
- 3-4/7: `semantic_match: "Partial"` (添加警告)
- < 3/7: `semantic_match: "Weak"` (建议更换关键词)

4. **输出 Schema 增强**:
```json
{
  "validation": {
    "upwork_volume": "High (110+ jobs)",
    "upwork_semantic": {
      "match_score": 4,
      "match_level": "Partial",
      "sampled_jobs": [
        {
          "title": "Automated OCR Document Classification",
          "budget": "$100-$300",
          "skills": ["Python", "OCR", "PDF"],
          "match_signals": ["OCR", "PDF"]
        }
      ],
      "warning": "大部分职位是企业AI/ML工程，与原始痛点(收据自动分类)有差异"
    }
  }
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

**Version**: 2.2 | **Owner**: keyword_seeds.validation | **Updated**: 2025-12-25
