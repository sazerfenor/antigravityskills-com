---
description: 趋势验证 Agent - Google Trends 专精验证
---

# Trends Validator Agent

通过 Google Trends 验证关键词的市场趋势和相关机会。

> **v2.0 拆分**: 从原 trend-validator 拆分，专注 Google Trends 验证。

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `keywords` | 📝 Update status | `UPDATE keywords SET ...` |
| `validations` | ✅ OWNER (trends 字段) | `INSERT/UPDATE validations` |

---

## 输入规格

```yaml
INPUT:
  keyword: string           # 待验证关键词
  keyword_id: number        # 数据库 ID
  benchmark: string         # 对标词 (默认: "GPTs")
```

---

## 输出规格

```yaml
OUTPUT:
  PRIMARY:
    vs_benchmark: string       # "X% of GPTs"
    trend_direction: string    # rising | stable | declining
    market_type: string        # niche | moderate | red_ocean
    verdict: string            # verified | pending | dead
  SECONDARY:
    breakout_keywords: string[]
    related_queries:
      top: object[]
      rising: object[]
    screenshot_path: string
  METADATA:
    confidence: string         # High | Medium | Low
    execution_time: number
```

---

## 执行步骤

// turbo-all

### Step 1: 获取待验证关键词

```sql
SELECT id, keyword FROM keywords 
WHERE status IN ('new', 'pending') 
ORDER BY created_at DESC 
LIMIT 10;
```

**循环保护**: `MAX_KEYWORDS = 15`

> [!IMPORTANT]
> **⚙️ DECISION GATE**:
> ```
> 🔍 DECISION_GATE:
>   - 待验证关键词数: {N}
>   - 关键词列表: {keyword1, keyword2, ...}
>   - Action: PROCEED
> ```

### Step 2: Google Trends 验证 (强制浏览器)

> ⛔ **MANDATORY**: 必须使用 `browser_subagent` 执行。

```
browser_subagent({
  Task: "Navigate to https://trends.google.com/trends/explore?q={keyword},GPTs
         1. Wait for chart to render
         2. Capture screenshot
         3. Extract percentage comparing {keyword} to GPTs
         4. Switch to 12 months view, capture again
         Return: { trends_30d, trends_12m, screenshot_path }",
  TaskName: "Google Trends - {keyword}",
  RecordingName: "trends_{keyword}"
})
```

**趋势判断标准**:
| 热度 vs GPTs | market_type |
|--------------|-------------|
| < 5% | niche |
| 5-20% | moderate |
| ≈ 100% | red_ocean |
| ≈ 0 且下降 | dead |

### Step 3: Related Queries 挖掘

> ⛔ **MANDATORY**: 不可跳过。

1. 切换到 **Related queries** 区域
2. 采集 **Top** (前 5 个) 和 **Rising** (前 5 个)
3. 标记 **Breakout** 关键词
4. 自动创建 Breakout 词到 `keywords` 表

> [!IMPORTANT]
> **⚙️ RELATED_QUERIES_GATE**:
> ```
> 🔍 RELATED_QUERIES_GATE:
>   - Top Queries: {N} 个
>   - Rising Queries: {M} 个
>   - Breakout 词: {K} 个
>   - 新创建 Keywords: {列表}
> ```

### Step 4: 趋势方向判断

| 曲线形态 | direction |
|---------|-----------|
| 30d > 12m × 1.2 | rising ⬆️ |
| 30d ∈ [12m × 0.8, 12m × 1.2] | stable ➡️ |
| 30d < 12m × 0.8 | declining ⬇️ |

### Step 5: 写入验证结果

```sql
INSERT INTO validations (
  keyword_id, trends_30d, trends_12m, 
  trend_direction, market_type,
  related_queries, screenshot_path,
  updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
ON CONFLICT(keyword_id) DO UPDATE SET
  trends_30d = excluded.trends_30d,
  trends_12m = excluded.trends_12m,
  trend_direction = excluded.trend_direction,
  market_type = excluded.market_type,
  related_queries = excluded.related_queries,
  updated_at = excluded.updated_at;
```

### Step 6: 输出报告

```markdown
📊 **Trends Validation Results**:
- Keyword: {keyword}
- vs GPTs: {X}%
- Direction: {rising/stable/declining}
- Market: {niche/moderate/red_ocean}
- Breakout discoveries: {N}
```

---

## GATE 规则

- ❌ **HALT**: browser_subagent 失败
- ⚠️ **SKIP**: 数据解析失败 → confidence: Low
- ✅ **PASS**: 完成验证

---

**Version**: 2.0 | **Owner**: validations (trends) | **Updated**: 2025-12-26
