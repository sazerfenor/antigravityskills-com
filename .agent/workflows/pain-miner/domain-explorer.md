---
description: 领域探索 Agent - 发现新 Subreddit
---

# Domain Explorer Agent

通过抱怨词宽搜索发现新的高价值 Subreddit。

> **版本**: 10.0 (参见 [CHANGELOG](CHANGELOG.md))
> **核心策略**: 纯痛苦词驱动发现，搜索策略矩阵

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `subreddits` | ✅ OWNER (CRUD) | `PainMinerDB.subreddits.*` |

> [!NOTE]
> **v2.0 变更**: 不再依赖 `domains` 表。Subreddit 发现完全由痛苦词驱动。

---

## 触发条件

- Orchestrator 用户选择 "完整流程" 或 "仅探索新领域"
- Orchestrator 自动模式判断需要新领域探索

---

## 执行步骤\n
### Step 1: 加载抱怨词库 (搜索策略矩阵) ⭐ v7.0 NEW

> [!IMPORTANT]
> **搜索策略矩阵**: 使用 3 类不同的词确保发现多样性。

**策略矩阵定义**:
| 类别 | 目的 | 关键词示例 |
|------|------|-----------|
| **情绪词** | 发现痛点社区 | nightmare, frustrating, hate, tired of |
| **行动词** | 发现付费意愿 | hiring someone, looking for, need help, paying for |
| **竞品词** | 发现竞争机会 | alternative to, better than, switch from, X sucks |

**选择规则** (⚙️ v7.0 变更):
1. 每轮选择 **3-4 个** 词
2. **必须覆盖至少 2 类**:
   - 情绪词: 1-2 个
   - 行动词: 1-2 个
   - 竞品词: 0-1 个 (如有已知竞品)
3. **轮换机制**: 优先选择本周未使用过的词

**查询** (使用 `mcp_sqlite_read_query`):
```sql
-- 情绪词 (通过 JOIN pain_patterns 获取分类)
SELECT pk.keyword 
FROM pain_keywords pk
JOIN pain_patterns pp ON pk.category_id = pp.id
WHERE pp.name = 'emotional' 
ORDER BY RANDOM() LIMIT 2;

-- 行动词 (使用 delegation 分类)
SELECT pk.keyword 
FROM pain_keywords pk
JOIN pain_patterns pp ON pk.category_id = pp.id
WHERE pp.name = 'delegation' 
ORDER BY RANDOM() LIMIT 2;
```

> [!IMPORTANT]
> **⚙️ DECISION GATE (必须输出)**:
> ```
> 🔍 DECISION_GATE:
>   - 策略类型分布:
>     - 情绪词: {keyword1, keyword2}
>     - 行动词: {keyword3, keyword4}
>     - 竞品词: {如有}
>   - 类别覆盖: {2/3 或 3/3}
>   - Action: PROCEED
> ```
> **⛔ 禁止跳过**: 至少覆盖 2 类。
> **默认词**:
> - 情绪: "nightmare", "frustrating"
> - 行动: "hiring someone", "looking for tool"

### Step 2: 纯痛苦词搜索 (带终止条件)

> ⚠️ **不加领域限定** - 让搜索结果自然发现社区

**⛔ 执行规则** (防止无限循环):
1. 每个关键词只执行 **1 次** Google 搜索
2. 搜索完成后立即进入 Step 3
3. **禁止重复搜索同一关键词**

**搜索流程**:
```javascript
const selectedKeywords = [keyword1, keyword2, keyword3, keyword4];  // 最多 4 个
const searchedKeywords = [];  // 记录已搜索

for (const keyword of selectedKeywords) {
  if (searchedKeywords.includes(keyword)) continue;  // 去重
  
  // 获取一年前的日期 (YYYY-MM-DD)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateStr = oneYearAgo.toISOString().split('T')[0];

  // 执行搜索: site:reddit.com "{keyword}" after:{dateStr}
  browser_subagent({
    Task: `搜索 site:reddit.com "${keyword}" after:${dateStr} 并提取前 20 个结果中的 subreddit 名称`,
    RecordingName: `domain_search_${keyword.replace(/\s/g, '_')}`
  });
  
  searchedKeywords.push(keyword);  // 标记已搜索
}
```

> [!CAUTION]
> **⛔ SEARCH_COMPLETION_GATE (必须输出)**:
> ```
> 🔍 SEARCH_COMPLETION_GATE:
>   - 计划搜索关键词: {N} 个 ({keyword1, keyword2, ...})
>   - 已完成搜索: {M} 个
>   - 搜索结果摘要:
>     - "{keyword1}": {X} 个 Subreddit 发现
>     - "{keyword2}": {Y} 个 Subreddit 发现
>   - OVERALL: {PASS (M == N) / FAIL}
> ```
> **如果 OVERALL = FAIL**: ⛔ 返回继续搜索未完成的关键词
> **如果 OVERALL = PASS**: ✅ 进入 Step 3

### Step 3: 收集 Subreddit

1. 从搜索结果中提取出现的 Subreddit
2. 统计每个 Subreddit 的命中频率
3. 过滤已存在于 `subreddits` 表的记录

### Step 4: B2B 价值评估

> 🎯 **核心过滤器** - 只保留有商业产品潜力的社区

**自动排除** (个人情感/法律个人类):
- relationship, dating, breakups, divorce, mentalhealth
- legaladvice, dui, custody, immigration
- askdocs, medical, depression

**优先保留** (B2B/工具/行业类):
- 包含 "business", "professional", "enterprise" 的社区
- 行业垂直: quickbooks, salesforce, supplychain, paralegal, accounting
- 工具/软件: software, saas, automation, excel, sheets

**评估输出**:
```
/r/xxx → ✅ 保留 (行业垂直)
/r/yyy → ❌ 排除 (个人情感)
```

### Step 5: 写入数据

**工具**: 使用 `mcp_sqlite_write_query`

创建新的 `subreddits` (status: new):
```sql
INSERT INTO subreddits (
  external_id, name, discovery_method, 
  hit_count, total_posts_mined, status, created_at, updated_at
) VALUES (
  ?, ?, 
  "Pain search: '{complaint_keyword}'", 
  ?, 0, 'new', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);
```

### Step 6: 输出报告

```markdown
🔍 **Domain Exploration Results**:
- Query: "{complaint_keyword}"
- Discovered: N subreddits
- Filtered: M (B2B value check)
- Added:
  - /r/xxx (N hits) → sub_XXX ✅
  - /r/yyy (M hits) → Excluded (personal) ❌
```

> ✅ **Agent 完成** - Orchestrator 将自动执行下一个 Agent

---

> [!TIP]
> 轮换使用不同类别的抱怨词能提高发现多样化社区的概率。

---

**Version**: 2.2 | **Owner**: subreddits | **Updated**: 2025-12-25
