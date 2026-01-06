---
description: 需求验证 Agent - Upwork 付费需求专精验证
---

# Demand Validator Agent

通过 Upwork 间接搜索验证关键词的付费需求和语义匹配。

> **版本**: 10.0 (参见 [CHANGELOG](CHANGELOG.md))
> **核心功能**: Upwork 付费需求验证，语义匹配校验

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `validations` | ✅ OWNER (upwork 字段) | `UPDATE validations SET ...` |
| `keywords` | 📝 Update status | `UPDATE keywords SET status = ...` |

---

## 输入规格

```yaml
INPUT:
  keyword: string           # 待验证关键词
  keyword_id: number        # 数据库 ID
  original_pain:            # 原始痛点上下文 (用于语义校验)
    summary: string
    keywords: string[]
```

---

## 输出规格

```yaml
OUTPUT:
  PRIMARY:
    upwork_volume: string      # "High (16+)" | "Medium (6-15)" | "Low (<6)" | "None"
    demand_level: string       # High | Medium | Low | None
    semantic_match:
      level: string            # Strong | Partial | Weak
      score: number            # 0-7
  SECONDARY:
    sample_jobs: object[]
    warning: string | null
  METADATA:
    confidence: string
    platform_source: string    # "google_site_search"
```

---

## 执行步骤\n
### Step 1: Upwork 间接搜索 (Google Site Search)

> ⛔ **BANNED**: 禁止直接访问 upwork.com

```
browser_subagent({
  Task: "Navigate to https://www.google.com/search?q=site:upwork.com+{keyword}+jobs
         1. Wait for results
         2. Count Upwork job listings
         3. Extract top 3 job titles from snippets
         4. Return: { estimated_count, demand_level, sample_jobs }
         
         ⛔ DO NOT click into upwork.com",
  TaskName: "Upwork Demand Check - {keyword}",
  RecordingName: "upwork_{keyword}"
})
```

**需求等级判断**:
| estimated_count | demand_level |
|-----------------|--------------|
| ≥ 16 | High ✅ |
| 6-15 | Medium ⚠️ |
| 1-5 | Low ❌ |
| 0 | None |

### Step 2: 语义校验

比较原始痛点与 Upwork 职位的匹配度。

**匹配信号权重**:
| 信号 | 权重 |
|------|------|
| 职位描述提及痛点关键词 | +3 |
| 目标用户群一致 | +2 |
| 技术栈复杂度匹配 | +1 |
| 预算范围合理 ($100-$500) | +1 |

**Prompt** (内联执行):
```markdown
# Role
你是 Semantic Matcher，判断两个需求是否指向同一问题。

# 输入
原始痛点: {original_pain.summary}
职位列表: {sample_jobs}

# 输出
{
  "match_score": 0-7,
  "match_level": "Strong | Partial | Weak",
  "overlap_signals": ["信号1", "信号2"],
  "warning": "如有语义漂移，描述内容"
}
```

**匹配等级**:
| score | level | 行动 |
|-------|-------|------|
| ≥ 5 | Strong | ✅ 验证通过 |
| 3-4 | Partial | ⚠️ 需人工复核 |
| < 3 | Weak | ❌ 建议更换关键词 |

> [!CAUTION]
> **⛔ SEMANTIC_MATCH_GATE**:
> ```
> 🔍 SEMANTIC_MATCH_GATE:
>   - 原始痛点: {summary}
>   - Upwork 职位数: {N}
>   - 匹配分数: {score}/7
>   - 匹配等级: {Strong/Partial/Weak}
>   - Warning: {如有}
> ```

### Step 3: 更新验证结果

**工具**: 使用 `mcp_sqlite_write_query`:
```sql
UPDATE validations SET
  upwork_volume = ?,
  upwork_semantic = ?,  -- JSON
  validation_confidence = ?,
  updated_at = datetime('now')
WHERE keyword_id = ?;
```

### Step 4: 综合判断

结合 Trends 验证结果和 Demand 验证结果：

| 条件 | 新 Status |
|------|-----------|
| Trends ≥ 5% + Demand High + Semantic Strong | verified ✅ |
| Trends ≥ 5% + Demand High + Semantic Partial | verified ⚠️ |
| Trends ≥ 5% + Demand High + Semantic Weak | pending |
| Trends < 5% + Demand High | verified (Niche) |
| Trends = 0 + Demand None | dead |

**工具**: 使用 `mcp_sqlite_write_query`:
```sql
UPDATE keywords SET 
  status = ?,
  updated_at = datetime('now')
WHERE id = ?;
```

### Step 5: 输出报告

```markdown
💼 **Demand Validation Results**:
- Keyword: {keyword}
- Upwork Volume: {High/Medium/Low/None}
- Semantic Match: {Strong/Partial/Weak} ({score}/7)
- Warning: {如有}
- **Final Verdict**: {verified/pending/dead}
```

---

## GATE 规则 (v8.1 降级策略)

> [!IMPORTANT]
> **P0 优化**: 验证失败不阻断流程，而是降级继续执行。

| 场景 | 旧行为 | 新行为 (v8.1) |
|------|-------|---------------|
| 人机验证无法绕过 | ❌ HALT | ⚠️ WARN + 继续，标记 `upwork_volume: unknown` |
| semantic_match = Weak | ⚠️ SKIP | ⚠️ SKIP + warning |
| 成功 | ✅ PASS | ✅ PASS |

**降级写入** (使用 `mcp_sqlite_write_query`):
```sql
UPDATE validations SET
  upwork_volume = 'unknown',
  validation_confidence = 'low',
  error_reason = 'captcha_blocked'
WHERE keyword_id = ?;
```

**下游处理**:
- Gold Curator 收到 `upwork_volume: unknown` 时，在报告中标注 "付费需求未验证"
- 仍可生成 Gold Lead，但需明确标注数据来源不完整

---

**Version**: 2.0 | **Owner**: validations (upwork) | **Updated**: 2025-12-26
