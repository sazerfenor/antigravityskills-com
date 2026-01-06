---
description: 帖子分析 Agent - 双层 Prompt 提取痛点和需求词
---

# Post Analyzer Agent

深度分析帖子内容，使用 **双层 Prompt + CoT** 提取痛点和需求词。

> **版本**: 10.0 (参见 [CHANGELOG](CHANGELOG.md))
> **核心改进** (v10.0):
> - 🧠 **Chain-of-Thought**: 强制 4 步思考过程
> - 📋 **RCOT 结构**: Role → Context → Output → Think → Constraints → Example
> - 📦 **折叠示例**: 使用 `<details>` 减少上下文占用

---

## 数据所有权

| 数据 | 权限 |
|------|------|
| `leads` | ✅ OWNER |
| `competitors` | 📝 延伸写入 |
| `feature_gaps` | 📝 延伸写入 |

---

## 执行步骤\n
### Step 0.5: 加载 Pain Signals (从数据库)

**工具**: `mcp_sqlite_read_query`

```sql
SELECT pk.keyword, pp.semantic_type, pk.weight
FROM pain_keywords pk
JOIN pain_patterns pp ON pk.category_id = pp.id
WHERE pp.semantic_type IN ('frustration', 'alternative_seeking', 'feature_gap');
```

**Fallback**: 如果查询为空，使用默认值:
- frustration: `["nightmare", "losing my mind", "hate", "worst"]`
- alternative_seeking: `["alternative to", "too expensive", "switch from"]`
- feature_gap: `["I wish", "Would pay", "Need a tool"]`

### Step 1: 获取待分析帖子

```sql
SELECT * FROM leads 
WHERE analyzed = 0 
ORDER BY comments_count DESC, upvotes DESC 
LIMIT 10;
```

> [!IMPORTANT]
> **⚙️ DECISION_GATE**:
> ```
> 🔍 DECISION_GATE:
>   - 待分析 Lead 数量: {N}
>   - Action: PROCEED
> ```

### Step 1.5: 批量处理循环 (MAX_LEADS = 20)

对每个 Lead 执行 Step 2-4，使用与 subreddit-miner 相同的显式目标清单模式。

---

### Step 2: 双层 Prompt 分析 (v10.0 CoT 重构)

> 🧠 **关键改进**: 必须先输出思考过程，再输出 JSON

#### Layer 1: Filter Prompt (RCOT 结构)

```markdown
# Role
你是 B2B SaaS 痛点筛选专家。你的任务是快速判断 Reddit 帖子是否有商业价值。

# Context
输入是一条 Reddit 帖子，包含标题和正文。
你需要评估它对 B2B SaaS 产品的潜在价值。

# Output Format
```json
{
  "relevance_score": 1-10,
  "emotion_intensity": 1-10,
  "pain_clarity": 1-10,
  "summary": "一句话中文概括 (10-30字)"
}
```

# Thinking Steps (必须在 JSON 前输出)
1. **用户身份**: 个人用户 / 职场人 / 企业主 / 无法判断？
2. **问题场景**: 抱怨什么？发生在什么场景？
3. **商业信号**: 提到付费/预算/时间成本/团队协作吗？
4. **情绪强度**: 使用了哪些情绪词？

# Scoring Rules
| 分数 | 标准 | 信号词示例 |
|:--|:--|:--|
| 9-10 | 明确付费意愿 | "I'd pay", "budget for", "worth $X" |
| 7-8 | 业务流程痛点 | "our team", "every day", "hours on" |
| 5-6 | 工作相关抱怨 | "at work", "my job", "for clients" |
| 3-4 | 个人/副业 | "side project", "personal use" |
| 1-2 | 无商业价值 | "game", "relationship", "homework" |

# Edge Cases
| 情况 | 处理 |
|:--|:--|
| 内容为空 | relevance=1, pain_clarity=1 |
| 广告/自我推广 | relevance=0 |
| 只有标题没正文 | 根据标题判断，pain_clarity 减 2 分 |
| 无法判断用户类型 | 不扣分，在 summary 中标注"用户类型不明" |

<details>
<summary>📋 完整示例 (点击展开)</summary>

**输入**:
标题: I'm losing my mind manually entering receipts
正文: I'm a small business owner. Every month I spend 4+ hours entering receipts. Would happily pay $30/mo for something that actually works.

**思考过程**:
1. 用户身份: 小企业主 (small business owner) ✅ B2B 相关
2. 问题场景: 每月花 4+ 小时手工录入收据 ✅ 具体场景
3. 商业信号: 明确愿付 $30/mo ✅ 强信号
4. 情绪强度: "losing my mind" = 极高 (9 分)

**输出**:
```json
{
  "relevance_score": 10,
  "emotion_intensity": 9,
  "pain_clarity": 10,
  "summary": "小企业主每月花4+小时录收据,愿付$30/mo解决"
}
```

</details>

---

# Your Task
分析以下帖子:

标题: {title}
正文: {content}

**先输出思考过程 (4 个步骤)，再输出 JSON。**
```

**GATE**:
- 如果 `(relevance + emotion + pain) / 3 < 5` → 标记为 `low_priority`，跳过 Layer 2
- 如果 `>= 5` → 继续 Layer 2

---

#### Layer 2: Insight Prompt (RCOT 结构)

```markdown
# Role
你是资深 SaaS 产品战略师，专注从用户抱怨中挖掘商业机会。

# Context
帖子已通过 Layer 1 初筛:
- relevance_score: {relevance_score}
- emotion_intensity: {emotion_intensity}
- pain_clarity: {pain_clarity}
- summary: {summary}

**原始帖子**:
标题: {title}
正文: {content}
热门评论: {top_comments}

# Your Task
1. 识别痛点模式 (frustration / alternative_seeking / feature_gap)
2. 判断用户类型 (founder / developer / marketer / accountant / other)
3. 评估 ROI 权重 (1-5)
4. 生成行动建议

# Thinking Steps (必须输出)

**Step 1: 痛点模式识别**
| 模式 | 信号词 |
|:--|:--|
| frustration | nightmare, hate, worst, losing my mind, waste of time |
| alternative_seeking | alternative to, too expensive, switch from, cheaper than |
| feature_gap | I wish, Would pay, Need a tool, If only |

判断: 匹配到 "{关键词}" → 模式 = {pattern}

**Step 2: 用户类型判断**
| 类型 | 信号 |
|:--|:--|
| founder | startup, founder, bootstrapped, small business owner |
| developer | dev, engineer, code, API, SDK |
| marketer | marketing, SEO, ads, campaign, content |
| accountant | accounting, bookkeeping, tax, invoice |
| other | 以上都不匹配 |

判断: 匹配到 "{信号}" → lead_type = {type}

**Step 3: ROI 权重评估**
| 分数 | 标准 |
|:--|:--|
| 5 | 明确付费意愿: "I'd pay $X", "worth paying for" |
| 4 | 暗示预算: "worth investing in", "budget for" |
| 3 | 有痛点但无行动意愿 |
| 2 | 轻度抱怨 |
| 1 | 无商业价值 |

判断: 匹配到 "{信号}" → roi_weight = {score}

**Step 4: 行动建议**
| 条件 | 建议 |
|:--|:--|
| ROI >= 4 且有帖子链接 | reddit_reply (共情，不推销) |
| 竞品吐槽 | blog_post (对比文章) |
| B2B 决策者 | cold_dm (直击痛点) |
| 其他 | ignore |

判断: → action_type = {type}, urgency = {level}

# Output Format
```json
{
  "pain_point": "中文，20-50字，格式: [用户类型] + [具体问题] + [影响]",
  "lead_type": "founder|developer|marketer|accountant|ops|other",
  "pain_signals": ["从词库选择: pay, hire, budget, hours, manual, nightmare, frustrated, alternative to"],
  "pain_pattern": "frustration|alternative_seeking|feature_gap|mixed|none",
  "pattern_evidence": ["实际匹配到的关键词/短语"],
  "roi_weight": 1-5,
  "action_plan": {
    "type": "reddit_reply|blog_post|cold_dm|ignore",
    "draft": "50-100字行动草稿 (如适用)",
    "urgency": "high|medium|low"
  },
  "competitors_mentioned": ["竞品名"] 或 null
}
```

# Constraints
1. `pain_point` 必须是中文
2. `pain_signals` 只能从词库选择，不能自创
3. `action_plan.draft` 禁止虚假承诺 (如"我们的产品可以...")
4. `action_plan.draft` 对于 reddit_reply 必须: 先共情，再提问，禁止推销
5. 如果无法确定 `lead_type`，使用 "other"，不要猜测
6. `pattern_evidence` 必须是帖子中实际出现的词，不能编造

<details>
<summary>📋 完整示例 (点击展开)</summary>

**输入**:
- relevance_score: 10
- emotion_intensity: 9
- pain_clarity: 10
- summary: 小企业主每月花4+小时录收据,愿付$30/mo解决
- 标题: I'm losing my mind manually entering receipts
- 正文: I'm a small business owner. Every month I spend 4+ hours entering receipts. Would happily pay $30/mo for something that actually works.
- 评论: (略)

**思考过程**:

Step 1: 痛点模式识别
匹配到 "losing my mind" → 模式 = frustration

Step 2: 用户类型判断
匹配到 "small business owner" → lead_type = founder

Step 3: ROI 权重评估
匹配到 "Would happily pay $30/mo" → roi_weight = 5

Step 4: 行动建议
ROI = 5 >= 4，有帖子 → action_type = reddit_reply, urgency = high

**输出**:
```json
{
  "pain_point": "小企业主每月花4+小时手工录入收据，效率极低且容易出错",
  "lead_type": "founder",
  "pain_signals": ["manual", "hours", "pay"],
  "pain_pattern": "frustration",
  "pattern_evidence": ["losing my mind", "manually entering"],
  "roi_weight": 5,
  "action_plan": {
    "type": "reddit_reply",
    "draft": "完全理解这个痛苦！手工录入确实是恶梦。方便私聊聊你的具体场景吗？想了解你现在用什么工具",
    "urgency": "high"
  },
  "competitors_mentioned": null
}
```

</details>

---

# Your Task
分析以上帖子。

**先输出 4 步思考过程，再输出 JSON。**
```

---

### Step 2.5: 帖子深度扫描 (浏览器)

> 仅对通过 Layer 1 的帖子执行

```
browser_subagent({
  Task: "Navigate to {lead.source_url}
         1. Wait for page load
         2. Scroll down 5 times (Dy: 1000)
         3. Extract: top 10 comments, author info
         4. Return structured data",
  TaskName: "Deep Scan - {lead.title}",
  RecordingName: "post_scan_{lead.id}"
})
```

---

### Step 3: 更新 Lead 记录

> [!CAUTION]
> **AUTHENTICITY_GATE**:
> 在执行任何数据库写入前，必须先输出:
> 1. 📝 **原始数据摘要**: 帖子标题 + 前 100 字正文
> 2. 🧠 **分析思考过程**: 4 步 CoT (用户身份/问题场景/商业信号/情绪强度)
> 3. 📊 **生成的 JSON**: 完整 JSON 输出
>
> 如果跳过 1-2 步直接输出 JSON → REJECT

**工具**: `mcp_sqlite_write_query`

```sql
UPDATE leads SET
  analyzed = 1,
  analyzed_at = CURRENT_TIMESTAMP,
  pain_point = ?,
  relevance_score = ?,
  emotion_score = ?,
  pain_score = ?,
  lead_type = ?,
  pain_signals = ?,       -- JSON array
  pain_pattern = ?,       -- 'frustration' | 'alternative_seeking' | 'feature_gap'
  pattern_evidence = ?,   -- JSON array
  roi_weight = ?,
  comments = ?            -- Top 10 评论 (JSON array from Step 2.5)
WHERE id = ?;
```

### Step 4: 更新匹配统计

**工具**: `mcp_sqlite_write_query`

```sql
UPDATE pain_keywords 
SET match_count = match_count + 1 
WHERE keyword IN ('keyword1', 'keyword2', ...);
```

---

### Step 5: 竞品与功能缺口提取

如果 Layer 2 返回了 `competitors_mentioned`:

```sql
-- 使用 getOrCreate 实体解析
INSERT OR IGNORE INTO competitors (name, normalized_name, mention_count) 
VALUES (?, ?, 1);
UPDATE competitors SET mention_count = mention_count + 1 WHERE normalized_name = ?;
```

如果存在功能抱怨 (如 "X doesn't support Y"):

```sql
INSERT INTO feature_gaps (competitor_id, missing_feature_name, evidence_lead_ids)
VALUES (?, ?, ?);
```

---

### Step 6: 输出报告

```markdown
🔬 **Post Analysis Results**:

## Layer 1 筛选统计
- 分析帖子: {N} 条
- 高价值: {high_count} 条 (≥ 5 分)
- 低价值: {low_count} 条 (< 5 分)

## TOP 5 高置信度痛点

| Lead | 痛点 | 用户类型 | ROI | 信号 |
|------|------|---------|-----|------|
| #1 | ... | founder | 4 | pay, hire |
| #2 | ... | developer | 3 | frustrated |

## 竞品发现
- {competitor_name}: {mention_count} 次提及
```

> [!CAUTION]
> **⚙️ ANALYSIS_COVERAGE_GATE**:
> ```
> 🔍 ANALYSIS_COVERAGE:
>   - 待分析: {N}
>   - 实际分析: {M}
>   - 高价值占比: {high_count/M * 100}%
>   - CoT 输出: 全部 / 部分 / 无
>   - OVERALL: {PASS / FAIL}
> ```

---

**Version**: 10.0 | **Owner**: leads | **Updated**: 2025-12-28
