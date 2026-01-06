---
description: 趋势验证 Agent - Google Trends 专精验证
---

# Trends Validator Agent

通过 Google Trends 验证关键词的市场趋势和相关机会。

> **版本**: 10.0 (参见 [CHANGELOG](CHANGELOG.md))
> **核心约束**: 
> - 🚫 **严禁模拟**: 禁止使用 "Simulated Mode" 或为了效率跳过验证
> - 🔄 **强制重试**: 浏览器失败时必须重试一次
> - 📊 **证据导向**: 报告必须基于真实数据或明确的错误堆栈

---

## 🚫 禁止事项 (Strict Constraints)

> [!CAUTION]
> **违反以下任一条，整个验证无效**

1. **禁止模拟**: 不得臆造数据、截图路径，或使用 "Simulated"、"Demo"、"Placeholder"、"for Efficiency" 等词汇。
2. **禁止跳过**: 即使工具调用慢，也必须等待结果。**准确性 > 效率**。
3. **禁止掩盖错误**: 验证失败必须报告 `confidence: zero` + 具体错误堆栈，禁止伪装成 `confidence: low`。

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

## 执行步骤\n
### Step 1: 获取待验证关键词

**工具**: 使用 `mcp_sqlite_read_query`:
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

### Step 2: Google Trends 验证 (强制重试机制)

> ⛔ **MANDATORY**: 必须使用 `browser_subagent` 执行。**如果第一次失败，必须重试一次**。

#### Attempt 1: 首次尝试
```javascript
browser_subagent({
  Task: "Navigate to https://trends.google.com/trends/explore?q={keyword},GPTs
         1. Wait for chart to render
         2. Capture screenshot
         3. Extract percentage comparing {keyword} to GPTs
         4. Switch to 12 months view, capture again
         Return: { trends_30d, trends_12m, screenshot_path }",
  TaskName: "Google Trends - {keyword} (Attempt 1)",
  RecordingName: "trends_{keyword}_1"
})
```

#### Attempt 2: 失败重试 (仅当 Attempt 1 失败时)

> ⚠️ 如果 Attempt 1 返回错误 (如 `browser_subagent_failed` 或 timeout):

1. 等待 5 秒
2. 再次执行相同任务

```javascript
browser_subagent({
  Task: "Navigate to https://trends.google.com/trends/explore?q={keyword},GPTs ...",
  TaskName: "Google Trends - {keyword} (Retry)",
  RecordingName: "trends_{keyword}_retry"
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

**工具**: 使用 `mcp_sqlite_write_query`:
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

## GATE 规则 (v2.1 严格模式)

> [!CAUTION]
> **v2.1 变更**: 验证失败使用 `confidence: zero` (非 low)，明确区分"验证失败"和"数据不足"。

| 场景 | v2.0 行为 | v2.1 行为 |
|------|-----------|-----------|
| 两次 browser_subagent 都失败 | `confidence: low` | `confidence: zero` + 必须记录 error_reason |
| 数据解析失败 | `confidence: low` | `confidence: zero` + 必须记录 error_reason |
| 成功但数据稀疏 | - | `confidence: medium` |
| 完全成功 | `confidence: high` | `confidence: high` |

**失败写入** (使用 `mcp_sqlite_write_query`):
```sql
INSERT INTO validations (keyword_id, trends_30d, trends_12m, confidence, error_reason)
VALUES (?, NULL, NULL, 'zero', '{具体错误信息，如 browser_subagent_failed after 2 attempts}');
```

**下游处理**:
- Gold Curator 收到 `confidence: zero` 时，在报告中**红色标注** "趋势验证失败"
- `opportunity_score` 扣 20 分

---

**Version**: 2.1 | **Owner**: validations (trends) | **Updated**: 2025-12-26

