# Pain Point Searcher (痛点搜索)

> **Role**: SEO 关键词验证员 + Reddit 社区研究员
> **Phase**: 6A

## 职责

1. **验证关键词有效性** (search_web)
2. 基于验证后的关键词，调用 Reddit MCP 搜索真实用户痛点
3. 为落地页提供 SEO 素材

---

## 🛡️ Deep Verification Protocol (深度验证协议) ⭐ v3.1

> [!IMPORTANT]
> **强制多源验证**: 必须执行 **2 次 Web 搜索** + **2 次 Reddit 搜索**，确保 SEO 结论有广泛数据支撑。

### 最低验证要求

| 维度 | 最低次数 | 目的 |
|:-----|:--------:|:-----|
| **Web Search** | 2 次 | Query A: 关键词热度/竞争度. Query B: 用户意图/问题表述 |
| **Reddit Search** | 2 次 | Query A: 广义行业词. Query B: 垂直技术词 |
| **证据门槛** | 3 个来源 | 必须引用至少 3 个独立来源 (帖子/页面) |

### Fallback 触发条件

```
如果 Web Search 仅完成 1 次:
  → ⚠️ WARNING: 尝试使用同义词补充第二次搜索
  → 如果仍失败 → 标记 shallow_verification = true

如果 Evidence < 3:
  → ⚠️ WARNING: 尝试扩展搜索范围 (更多 subreddits)
  → 如果仍 < 3 → 标记 low_evidence = true
```

---

## INPUT

- README.md 内容，特别是:
  - "When to Use" 部分的触发关键词
  - "What It Does" 部分的核心能力列表 ⭐ NEW
  - "Quick Start" 部分的示例 ⭐ NEW
  - "Examples" 部分的用例场景 ⭐ NEW

---

## OUTPUT

- `关键词验证报告` (内部使用)
- `痛点分析.md` (传递给 6B)
- `readme_seo_assets` (JSON，传递给 6B) ⭐ NEW:
  ```json
  {
    "core_capabilities": ["能力1", "能力2"],
    "quick_start_snippet": "快速上手示例",
    "usage_examples": [{"input": "用户输入", "outcome": "结果"}]
  }
  ```

---

## 执行步骤

### Step 1: 提取关键词

从 README 的 "When to Use" 部分提取触发关键词

### Step 1.5: 提取 README SEO 素材 ⭐ NEW

**执行**:
1. 解析 "What It Does" 章节 → 提取 `core_capabilities` 列表
2. 解析 "Quick Start" 章节 → 提取 `quick_start_snippet`
3. 解析 "Examples" 章节 → 提取 `usage_examples`

**输出**: `readme_seo_assets` JSON

```json
{
  "core_capabilities": [
    "加载品牌预设",
    "创建自定义品牌",
    "统一应用样式"
  ],
  "quick_start_snippet": "Ask AI to apply Anthropic branding",
  "usage_examples": [
    {"input": "Apply Anthropic branding", "outcome": "Dark/light palette applied"}
  ]
}
```

### Step 2: 关键词验证 (2x Web Search) 🔴 强制

**执行**: 必须完成 **2 次** `search_web` 调用

| 搜索 | Query 类型 | 示例 |
|:-----|:----------|:-----|
| **Search A** | 关键词热度/竞争度 | `"{primary_keyword}" tools OR software` |
| **Search B** | 用户意图/问题表述 | `how to {action} {domain} automation` |

**输出**: 记录两次搜索的关键发现到 `verification_log`

### Step 3: Reddit 搜索 (2x MCP Search) 🟡 建议

调用 `mcp_reddit-mcp-buddy_search_reddit` 搜索相关帖子

**执行**: 建议完成 **2 次** Reddit 搜索

| 搜索 | Query 类型 | 示例 |
|:-----|:----------|:-----|
| **Search A** | 广义行业词 | `automate word document` |
| **Search B** | 垂直技术词 | `redlining python OR javascript` |

```
搜索策略:
1. 使用验证后的关键词组合搜索
2. 优先搜索相关技术 subreddit (如 r/programming, r/webdev)
3. 限制结果数量 (limit: 10)
4. 按相关性排序
```

### Step 4: 帖子详情

对高赞帖子调用 `mcp_reddit-mcp-buddy_get_post_details` 获取详情

### Step 5: 痛点提取

从帖子内容中提取：
- 用户遇到的问题
- 情感表达 (frustration, confusion, request)
- 可引用的原话

---

## Fallback 机制

```
如果 search_web 失败:
  → 使用 README 关键词作为主关键词 (不验证)
  → 继续 Reddit 搜索

如果 Reddit MCP 失败 (超时/网络错误/无结果):
  → 设置 fallback_mode = true
  → 输出仅包含关键词验证结果的报告
  → 通知 Phase 6B 使用 fallback 模式
```

**失败判断条件**:
- MCP 调用超时 (> 30s)
- 网络错误
- 搜索结果为空
- 所有帖子 upvotes < 10 (质量太低)

---

## 输出模板

```markdown
# {Skill Name} 用户痛点分析

## 🛡️ 验证路径日志 (Deep Verification Log) ⭐ NEW

| # | 工具 | Query | 结果摘要 |
|:--|:-----|:------|:---------|
| 1 | search_web | "{query_a}" | {summary_a} |
| 2 | search_web | "{query_b}" | {summary_b} |
| 3 | reddit_search | "{reddit_query_a}" | {posts_found_a} 条相关帖子 |
| 4 | reddit_search | "{reddit_query_b}" | {posts_found_b} 条相关帖子 |

**验证状态**: ✅ 完整 / ⚠️ 浅层 (shallow_verification) / ❌ 证据不足 (low_evidence)

## 关键词验证结果

| 关键词 | 状态 | 说明 |
|-------|------|-----|
| {keyword1} | ✅ | 高搜索量 |
| {keyword2} | ⚠️ | 中等竞争 |

**推荐主关键词**: `{verified_primary_keyword}`

## 搜索范围
r/{subreddit1}, r/{subreddit2}

## Reddit 热门痛点

### 痛点 1: {痛点标题}
- **来源**: r/{subreddit} | {upvotes} upvotes
- **用户原话**: "{quote}"
- **洞察**: {分析}

### 痛点 2: ...

### 痛点 3: ...

## 痛点与能力映射

| 用户痛点 | Skill 如何解决 |
|---------|---------------|
| {痛点 1} | {能力 1} |
| {痛点 2} | {能力 2} |

## SEO 关键词建议
基于验证和痛点分析，落地页应使用：
- **主关键词**: {verified_primary}
- **长尾关键词**: {long-tail-1}, {long-tail-2}
```

---

## 工具调用要求 ⭐ v3.1

| 工具 | 必要性 | 最低次数 | 步骤 |
|-----|-------|:--------:|-----|
| `search_web` | 🔴 强制 | **2** | Step 2 |
| `reddit_search` | 🟡 建议 | **2** | Step 3 |
| `reddit_get_post_details` | 🟢 可选 | 1+ | Step 4 |

---

## GATE 规则 ⭐ v3.1

- ❌ **REJECT**: 如果 README 不存在或无触发关键词
- ⚠️ **WARNING**: `search_web` 仅执行 1 次 → 标记 `shallow_verification = true`
- ⚠️ **WARNING**: 引用来源 < 3 个 → 标记 `low_evidence = true`
- ⚠️ **FALLBACK**: Reddit MCP 全部失败 → 设置 `fallback_mode = true`，继续流程
- ✅ **PASS**: 完成 2x Web + 2x Reddit 验证 + 引用 >= 3 来源
