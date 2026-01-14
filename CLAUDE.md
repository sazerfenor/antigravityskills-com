# 全局规则（来自大脑中枢）

> 以下规则继承自 agents 项目，是所有项目共享的基础规则
> 同步自大脑版本: v1.4 (2026-01-12)

## 第一性原理
> 详细规则见 /Users/lixuanying/Documents/GitHub/agents/rules/first-principles.md

核心：找到基本事实 + 从基本事实向上推导。

## 认知边界
> 详细规则见 /Users/lixuanying/Documents/GitHub/agents/rules/cognitive-boundaries.md

核心：知道自己不知道什么。遇到不确定时主动搜索验证，不编造。

## Agent 身体架构
> 详细规则见 /Users/lixuanying/Documents/GitHub/agents/rules/agentic-body-architecture.md

核心：大脑规划协调，眼睛调研观察，手操作制作，脚批量执行。

## 子项目工作协议
> 详细规则见 /Users/lixuanying/Documents/GitHub/agents/rules/subproject-protocol.md

核心：在子项目工作时，强制执行眼睛-大脑-手分工。遇到调研类任务必须先调用 Explore agent 系统性分析。

## 任务持久化

收到多步骤任务时，先把执行计划写到项目的 `scratch/plan-{任务名}.md`，再开始执行。

## Skill 使用

收到任务后检查 `~/.claude/skills/` 是否有相关 skill，有就调用。

---

# Nano Banana Ultra 项目开发指南

> 本文档面向 AI 编程助手，定义项目架构约束和开发规范

---

## 项目概述

**Nano Banana Ultra** - AI 提示词社区平台

核心功能：
- AI 图片/音乐生成（Gemini/Replicate/Fal/Kie.ai）
- Case-Based RAG 提示词优化
- 社区画廊系统 + SEO 优化
- 虚拟作者系统

---

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Next.js 15.5 (App Router) + React 19 + TypeScript |
| 数据库 | SQLite/Turso + Drizzle ORM |
| 认证 | Better-Auth |
| AI | Gemini 3.0 Flash, Replicate, Fal, Kie.ai |
| 支付 | Stripe, PayPal, Creem |
| 存储 | Cloudflare R2 |
| 向量 | Gemini Embedding (text-embedding-004) |
| 缓存 | Cloudflare KV |
| 部署 | Cloudflare Workers |
| 样式 | Tailwind CSS 4 + Radix UI |

---

## 项目结构

```
src/
├── app/
│   ├── [locale]/              # 国际化页面
│   │   ├── (admin)/           # 管理后台
│   │   ├── (auth)/            # 认证
│   │   ├── (chat)/            # 聊天
│   │   ├── (docs)/            # 文档
│   │   └── (landing)/         # 前台页面
│   └── api/                   # API Routes (~77 个端点)
│       ├── ai/                # AI 生成、优化
│       ├── admin/             # 管理后台 API
│       ├── community/         # 社区帖子
│       ├── payment/           # 支付
│       ├── user/              # 用户
│       └── ...
│
├── config/
│   └── db/schema.ts           # Drizzle Schema (SQLite/Turso)
│
├── core/                      # 核心模块（谨慎修改）
│   ├── auth/                  # Better-Auth 配置
│   ├── db/                    # 数据库连接
│   ├── i18n/                  # 国际化
│   └── rbac/                  # 权限控制
│
├── extensions/                # 外部服务封装
│   ├── ai/                    # Gemini/Replicate/Fal/Kie
│   ├── payment/               # Stripe/PayPal/Creem
│   ├── storage/               # R2/S3
│   └── email/                 # Resend
│
└── shared/                    # 共享层
    ├── models/                # 数据模型 (~24 个)
    ├── services/              # 业务服务 (~23 个)
    ├── lib/                   # 工具函数 (~32 个)
    ├── blocks/                # UI 组件块
    ├── components/            # 基础组件
    └── types/                 # 类型定义
```

---

## 架构分层

```
┌─────────────────────────────────────────────────┐
│  app/api/* (API Routes)  |  app/[locale]/*      │  应用层
└────────────────┬────────────────────────────────┘
                 │ 调用
┌────────────────▼────────────────────────────────┐
│         shared/services/* (业务服务)             │  服务层
└────────┬─────────────────┬──────────────────────┘
         │                 │
┌────────▼───────┐  ┌──────▼──────────────────────┐
│ shared/models/ │  │ extensions/* (Provider)     │  数据层
└────────────────┘  └─────────────────────────────┘
```

**分层规则：**
1. API Routes → 只调用 Services
2. Services → 聚合 Models + Extensions
3. Models → 直接操作数据库
4. Extensions → 封装外部服务

---

## 核心约束

### 1. 遵循分层架构

**不要绕过封装层直接调用底层**

```typescript
// ❌ API Route 直接调用数据库
const posts = await db.select().from(communityPost);

// ✅ 通过 Model
const posts = await getCommunityPosts({ status: 'published' });

// ❌ 直接调用外部 API
const response = await fetch('https://api.gemini...');

// ✅ 通过 Extension/Service
const aiService = await getAIService();
const result = await aiService.generate({ ... });
```

### 2. 先查再写

**新增功能前必须检查现有实现：**
- `src/shared/lib/` - 工具函数
- `src/shared/services/` - 业务服务
- `src/shared/models/` - 数据操作
- `src/extensions/` - 外部服务封装

### 3. 先确认再动手

**非小修改必须先说明计划，等待确认**

小修改 = 单行修复、typo、格式调整

### 4. 验证而非猜测

**遇到问题时：**
- 先查数据、打日志，确认根因
- 列出所有可能原因，逐一验证
- 不要基于单一现象武断推测

---

## API 开发规范

### 统一响应格式

```typescript
import { respData, respErr, respOk } from '@/shared/lib/resp';

return respData({ id: '123' });  // 成功 + 数据
return respOk();                  // 成功无数据
return respErr('错误信息');       // 错误
return respErr('Unauthorized', 401);
```

### API 必须包含

```typescript
import { checkRateLimit, getClientIP } from '@/shared/lib/rate-limit';
import { validateRequest } from '@/shared/lib/zod';
import { logError } from '@/shared/lib/error-logger';

export async function POST(request: Request) {
  try {
    // 1. 限流
    const ip = getClientIP(request);
    const { success } = await checkRateLimit(`key:${ip}`, 5, 60);
    if (!success) return respErr('Too many requests', 429);

    // 2. 参数校验
    const validation = await validateRequest(request, schema);
    if (!validation.success) return validation.response;

    // 3. 业务逻辑
    const result = await doSomething(validation.data);
    return respData(result);

  } catch (e: any) {
    await logError(e, { context: 'api:xxx' });
    return respErr(e.message);
  }
}
```

### 权限检查（管理后台 API）

```typescript
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

const user = await getUserInfo();
if (!user) return respErr('Unauthorized', 401);
if (!(await hasPermission(user.id, 'admin.xxx.write'))) {
  return respErr('Permission denied', 403);
}
```

---

## 数据库规范

### Schema 位置

- `src/config/db/schema.ts` - 入口（重导出 SQLite schema）
- `src/config/db/schema.sqlite.ts` - SQLite/Turso schema
- `src/config/db/schema.postgres.ts` - PostgreSQL 备份

### 迁移流程

1. 修改 `schema.sqlite.ts`
2. `pnpm db:generate` - 生成迁移
3. `pnpm db:migrate` - 执行迁移
4. 更新对应 Model

### SQLite 事务规则

**禁止嵌套事务**（SQLite 不支持，会锁冲突）

```typescript
// ❌ 错误：两个函数都有独立事务，A 调用 B 会锁冲突
async function A() {
  await db().transaction(async (tx) => {
    await B();  // B 内部也有 db().transaction()
  });
}

// ✅ 正确：B 支持传入外部事务
async function B({ tx: externalTx }) {
  const execute = async (tx) => { /* 逻辑 */ };
  return externalTx ? execute(externalTx) : db().transaction(execute);
}
```

---

## AI 模型配置

### 当前使用的模型

| 用途 | 模型 ID |
|------|---------|
| 文本/聊天 | `gemini-3-flash-preview` |
| 图片生成 | `gemini-3-pro-image-preview` |
| 向量嵌入 | `text-embedding-004` |

### AI Provider 位置

- `src/extensions/ai/gemini.ts` - Gemini
- `src/extensions/ai/replicate.ts` - Replicate
- `src/extensions/ai/fal.ts` - Fal
- `src/extensions/ai/kie.ts` - Kie.ai
- `src/shared/services/ai.ts` - AI 服务管理器

---

## 常用开发命令

```bash
# 开发
pnpm dev                # 启动开发服务器 (Turbopack)

# 数据库
pnpm db:generate        # 生成迁移文件
pnpm db:migrate         # 执行迁移
pnpm db:push            # 直接推送 Schema
pnpm db:studio          # Drizzle Studio

# 构建部署
pnpm build              # 生产构建
pnpm cf:deploy          # 部署到 Cloudflare Workers

# 权限
pnpm rbac:init          # 初始化权限系统

# 测试
pnpm test               # 运行测试
pnpm lint               # ESLint
```

---

## 核心 Model 和 Service

### Models (数据层)

| Model | 职责 |
|-------|------|
| `user.ts` | 用户 CRUD |
| `ai_task.ts` | AI 任务管理 |
| `community_post.ts` | 社区帖子 |
| `credit.ts` | 积分系统 |
| `config.ts` | 配置中心 |
| `error_report.ts` | 错误报告 |
| `preset.ts` | 模板预设 |
| `virtual_persona.ts` | 虚拟作者 |

### Services (服务层)

| Service | 职责 |
|---------|------|
| `ai.ts` | AI 服务管理器 |
| `payment.ts` | 支付管理器 |
| `storage.ts` | 存储管理器 |
| `gemini-text.ts` | Gemini 文本/Embedding |
| `vector-search.ts` | 向量搜索 |
| `rbac.ts` | 权限管理 |
| `notification.ts` | 通知系统 |

### Lib (工具函数)

| 工具 | 用途 |
|------|------|
| `resp.ts` | API 响应格式 |
| `zod.ts` | 参数校验 |
| `rate-limit.ts` | 限流 |
| `error-logger.ts` | 错误日志 |
| `cache.ts` | KV 缓存 |
| `seo-slug-generator.ts` | SEO Slug |
| `image-naming.ts` | 图片命名 |

---

## 开发原则

### 抽象的错误模式

这些错误在不同场景下有不同表现，但根因相同：

1. **绕过封装层**
   - 根因：直接调用底层而非通过封装
   - 表现：直接操作数据库、直接调用外部 API、硬编码配置
   - 原则：通过封装层调用

2. **假设而非验证**
   - 根因：基于假设行动而不先验证
   - 表现：猜测 API 路径、猜测错误原因、猜测数据格式
   - 原则：先确认事实再行动

3. **重复实现**
   - 根因：不检查现有实现就新建
   - 表现：重写工具函数、重复封装、新建类似组件
   - 原则：先查现有代码

4. **直接修改**
   - 根因：未沟通就动手
   - 表现：直接重构、直接"优化"、直接改架构
   - 原则：非小修改必须先确认

### 调试原则

1. **先查原始数据** - 打印原始响应，确认是截断、格式错误还是其他问题
2. **追踪完整调用链** - 理解 API → Service → Model → DB 的完整流程
3. **一次改一个变量** - 验证假设是否正确
4. **简单方案优先** - 先检查配置、环境，再做复杂分析

---

## 环境变量

```env
# 数据库
DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# 认证
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=...

# AI
GOOGLE_GEMINI_API_KEY=...
REPLICATE_API_TOKEN=...

# 支付
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# 存储
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_DOMAIN=...

# Cloudflare
CLOUDFLARE_KV_NAMESPACE_ID=...
CLOUDFLARE_KV_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

---

## 业务规则备忘

### 积分消耗

- `text-to-image`: 2 积分
- `image-to-image`: 4 积分
- `text-to-music`: 10 积分

### SEO Slug 格式

`nano-banana-{subject}-{6位哈希}`

### 虚拟作者

- `isVirtual: true` 标记
- 前台不展示 Twitter 链接
- `originalTwitterHandle` 仅管理员可见

---

## 数据完整性

### 等价性原则

批量操作必须和手动操作产生相同的结果。如果用户手动做一件事会产生 10 个字段，批量做同样的事也必须产生同样的 10 个字段。

### 数据流追踪

修改保存逻辑前，必须先搞清楚：
- 这个数据结构有哪些字段？
- 每个字段从哪来？
- 每个字段被谁使用？
- 漏掉会导致什么后果？

### 验证标准

功能完成后，必须验证产出物和预期完全一致，不是"看起来能跑"就算完成。

---

**最后更新**: 2026-01-11
