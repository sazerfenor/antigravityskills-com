---
description: 帖子分析 Agent - 提取痛点和需求词
---

# Post Analyzer Agent

深度分析帖子内容，提取痛点和需求词，智能去重。

---

## 数据所有权

| 数据 | 权限 | SQLite 访问 |
|------|------|-------------|
| `leads` | ✅ OWNER (CRUD) | `PainMinerDB.leads.*` |
| `keywords` | 📝 Create Only | `PainMinerDB.keywords.create()` |

### SQLite Data Access (v2.0+)

```typescript
import { PainMinerDB } from '../src/db/data-service';

// 获取未分析的 leads
const unanalyzed = PainMinerDB.leads.getUnanalyzed();

// 标记 lead 为已分析
PainMinerDB.leads.markAnalyzed(leadId, {
  painPointSummary: '...',
  evidence: ['...'],
  emotionalLevel: 'High',
});

// 创建新关键词并关联 subreddits
const keyword = PainMinerDB.keywords.createWithSubreddits(
  { externalId: 'seed_XXX', keyword: 'Receipt OCR', status: 'pending' },
  [subredditId1, subredditId2]
);

// 关联 lead 到 keywords
PainMinerDB.leads.linkToKeywords(leadId, [keywordId1, keywordId2]);
```

> [!NOTE]
> **Migration**: v2.0+ 使用 SQLite 数据库。JSON 文件已弃用。

### V3.0 增强：竞品情报 + Entity Resolution

```typescript
// V3.0: 从 LLM 分析结果中解析竞品
for (const competitorName of analysisResult.commercial_signals.competitors_mentioned) {
  // Entity Resolution: 自动标准化名称、查找或创建
  const competitor = PainMinerDB.competitors.getOrCreate(competitorName);
  
  // 关联 Feature Gap
  for (const featureRequest of analysisResult.commercial_signals.feature_requests) {
    const gap = PainMinerDB.featureGaps.getOrCreate(competitor.id, featureRequest);
    PainMinerDB.featureGaps.linkEvidence(gap.id, leadId);
  }
}
```

### V3.0 Post Analysis Prompt (CoT + JSON Schema)

> 使用此 Prompt 分析帖子内容，输出结构化 JSON。

```markdown
You are a Product Discovery AI. Analyze this user post to extract specific commercial pain points.

# Input Post
- **Title**: {{title}}
- **Content**: {{content}}
- **Comments Sample**: {{comments_text}}

# Analysis Steps (Chain of Thought)
1. **Identify the Persona**: Who is the author? (e.g. Student, Founder, employee).
2. **Extract the Core Conflict**: What specifically are they trying to do, and what is stopping them?
3. **Constraint Check**: Why don't existing tools work? (e.g. "Too expensive", "No API", "Bad UI").
4. **Detect Emotions**: Look for signal words like "hate", "tired", "nightmare", "manually".
5. **Formulate the Gap**: Combine [Persona] + [Action] + [Constraint] into a single Pain Point sentence.

# Output Schema (JSON)
{
  "persona_profile": {
    "role": "string",
    "sophistication": "Expert" | "Novice"
  },
  "pain_point": {
    "summary": "string", // The Gap sentence defined in step 5
    "intensity": 1-10
  },
  "commercial_signals": {
    "competitors_mentioned": ["Tool A", "Tool B"],
    "feature_requests": ["Feature X", "Integration Y"],
    "willingness_to_pay_detected": boolean
  },
  "evidence_quote": "string" // Direct copy-paste of the most painful sentence
}
```

---

## 触发条件

- `raw_leads` 中存在 `analyzed = false` 的记录
- Orchestrator 调用

---

## 执行步骤

// turbo-all

### Step 1: 获取待分析帖子

读取 `raw_leads.json` 中 `analyzed = false` 的记录

### Step 2: 深度扫描帖子

对每个帖子:
1. 访问 URL
2. **强制滚动协议**:
   - 使用 `browser_mouse_wheel` 滚动页面至少 **5 次**
   - 每次滚动 `Dy: 1000-1500` 像素
   - 在滚动间隔等待 1 秒让内容加载
3. **评论展开协议**:
   - 查找 "load more comments" / "more replies" 按钮
   - 如存在则点击展开
   - 重复直到无更多可展开内容或达到 3 次展开上限
4. **最小采集标准**:
   - 至少读取 **20 条评论**
   - 如帖子评论少于 20 条，读取全部
5. 提取:
   - 痛点描述 (pain_point)
   - 关键证据 (evidence quotes)
   - 情绪强度 (🔥 High / 🧱 Medium / ❄️ Low)
   - 解决方案线索 (solution hints)
6. 寻找特征词:
   - "I pay for..."
   - "manual workaround"
   - "hiring someone"

### Step 2.5: 深层信号扫描

在滚动后的完整页面中，重点搜索以下高价值信号：

| 信号类型 | 搜索模式 | 价值等级 |
|---------|---------|---------|
| 付费意愿 | "I pay for", "would pay", "hiring someone" | 🔥 最高 |
| 工具推荐 | 具体产品名称 (DocuClipper, TableSense 等) | 🔥 高 |
| 时间成本 | "hours", "days", "weeks to enter" | 🧱 中 |
| 情绪爆发 | "nightmare", "losing my mind", "hate" | 🔥 高 |

> [!TIP]
> **优先提取**: 包含多个高价值信号的评论应优先记录到 `evidence` 字段。

### Step 2.6: 作者信息提取

从帖子页面提取作者信息：

| 字段 | 说明 |
|-----|------|
| `username` | Reddit 用户名 |
| `role` | 从 flair 推断 (CPA/Bookkeeper/Developer/unknown) |
| `account_age` | 账号年龄 (如可获取) |

> [!NOTE]
> 作者身份有助于判断痛点的专业性和可信度。

### Step 2.7: 评论循环采集 (Top 10)

对高赞评论按点赞数排序，采集前 10 条：

| 字段 | 说明 |
|-----|------|
| `content` | 评论文本 (截取前 500 字符) |
| `upvotes` | 点赞数 |
| `author_role` | 评论者角色 (从 flair 推断) |
| `sentiment` | 情感倾向 (positive/negative/neutral) |

> [!CAUTION]
> **采集上限**: 只采集 Top 10 高赞评论，避免信息过载。

### Step 2.8: 竞品提取器

扫描评论中的产品/工具提及：

**识别模式**:
- "I use [ProductName]"
- "[ProductName] works great / sucks / doesn't support"
- "$X/mo" 或 "$X/year" 价格模式

**输出**:
| 字段 | 说明 |
|-----|------|
| `tools_mentioned[]` | 产品名称列表 |
| `sentiment` | positive/negative/neutral |
| `price_mentioned` | 价格信息 (如有) |

### Step 2.9: 功能需求提取器

识别用户明确的功能请求：

**识别模式**:
- "I wish it could..."
- "Would be great if..."
- "Need a tool that..."
- "[Tool] doesn't support..."
- "Looking for a way to..."

**输出**: `feature_requests_extracted[]` 数组

> [!TIP]
> 功能需求是产品设计的黄金信号，应优先提取。

### Step 3: 提取需求词

从内容中提取 Solution-oriented keywords:
- 例如: "Receipt OCR", "PDF to CSV"

> [!IMPORTANT]
> **智能去重**:
> - 检查 `keyword_seeds` 是否已存在相似词
> - 相似度 > 80% 则合并，更新 `related_seeds`
> - 不存在则创建新 seed

### Step 4: 更新数据

1. **更新** `raw_leads` (完整 Schema):
   ```json
   {
     "id": "lead_XXX",
     "source_url": "https://reddit.com/...",
     "subreddit": "r/xxx",
     
     "author": {
       "username": "user123",
       "role": "CPA",
       "account_age": "3 years"
     },
     
     "post_content": {
       "title": "...",
       "body_excerpt": "... (前 500 字符)",
       "posted_at": "2024-11-15",
       "upvotes": 290
     },
     
     "comments": [
       {
         "content": "...",
         "upvotes": 45,
         "author_role": "Bookkeeper",
         "sentiment": "positive",
         "tools_mentioned": ["DocuClipper"],
         "price_mentioned": "$29/mo"
       }
     ],
     
     "feature_requests_extracted": [
       "批量导入照片自动命名",
       "识别手写收据"
     ],
     
     "competitor_analysis": {
       "tools_mentioned": ["DocuClipper", "Dext"],
       "positive_mentions": 2,
       "negative_mentions": 1,
       "common_complaints": ["手写支持差"]
     },
     
     "pain_point_summary": "...",
     "evidence": ["..."],
     "emotional_level": "High",
     "extracted_keywords": ["..."],
     "analyzed": true,
     "analyzed_at": "2025-12-23"
   }
   ```

2. **创建** `keyword_seeds` (如有新词):
   ```json
   {
     "id": "seed_XXX",
     "keyword": "...",
     "status": "new",
     "source_subreddits": ["sub_XXX"]
   }
   ```

3. **追加** `research_log.md` (中英双语):
   ```markdown
   ### Post N: [Title](url)
   **中文摘要**: 一句话概括痛点。
   
   - **Time**: 2023-11 (Active/Old)
   - **Pain Point**: English description
   - **Evidence**: *"Original quote"*
   - **Competitors**: DocuClipper (+), Dext (-)
   - **Feature Requests**: 手写识别, 批量导入
   - **Status**: 🔥 High
   ```

### Step 5: 输出报告

```markdown
🔬 **Post Analysis Results**:
- Analyzed: N posts
- Keywords Extracted: X
- New Keywords Created: Y
- Competitors Found: Z
- Feature Requests: W
- Next: Run `/pain-miner` for trend validation
```

---

**Version**: 1.0 | **Owner**: raw_leads, research_log
