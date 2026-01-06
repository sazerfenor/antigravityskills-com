---
trigger: model_decision
description: Applied when implementing or reviewing backend APIs and security features. Rules for authentication, authorization, IDOR defense, and webhook security
---

# 🛡️ Banana-Security 安全架构与审查规范 v1.1

> **For AI Agents**: Security is architectural. Read this before designing or reviewing ANY backend feature.

## 1. 核心安全架构

### 1.1 Middleware 陷阱
- **事实**：`src/middleware.ts` 仅保护页面路由（`/admin/*`）
- **风险**：**完全忽略** `/api/*` 路由
- **规则**：每个 API Route 必须独立实现鉴权

### 1.2 AuthN vs AuthZ
| 概念 | 函数 | Import 路径 |
|-----|------|------------|
| **AuthN** (你是谁) | `getSignUser()` | `@/shared/models/user` |
| **AuthZ** (你能做什么) | `hasPermission()` / `hasRole()` | `@/shared/services/rbac` |

---

## 2. 禁止清单 ❌

| 禁止项 | 危险原因 | 正确替代 |
|-------|---------|---------|
| `if (!kv) return true` | Fail-Open 可被绕过 | `if (!kv && isProd) return false` |
| `dangerouslySetInnerHTML` | XSS 漏洞 | `<SafeHTML>` (`@/shared/components/SafeHTML`) |
| `getUserInfo()` 做鉴权 | 返回被模拟用户 | `getSignUser()` |
| `JSON.parse` 无校验 | 类型不安全 | Zod Schema (`@/shared/schemas/api-schemas.ts`) |
| 文件直接上传 | 绕过检查 | 4层防御 (Auth+Size+Ext+MIME) |

---

## 3. 标准安全模式

### 3.1 API Route 标准模板
```typescript
import { getSignUser } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { createPostSchema } from '@/shared/schemas/api-schemas';

export async function POST(req: NextRequest) {
  // 1. AuthN
  const user = await getSignUser();
  if (!user) return respErr('Unauthorized', 401);

  // 2. AuthZ
  if (!await hasPermission(user.id, 'admin.posts.write')) {
    return respErr('Forbidden', 403);
  }

  // 3. Input Validation
  const { success, data } = createPostSchema.safeParse(await req.json());
  if (!success) return respErr('Invalid data', 400);

  // 4. 业务逻辑...
}
```

### 3.2 IDOR 防御 (越权访问)
```typescript
// ❌ 危险：任何人可访问任意 post
const post = await db.select().from(posts).where(eq(posts.id, postId));

// ✅ 安全：双条件查询，确保归属
const post = await db.select().from(posts).where(
  and(eq(posts.id, postId), eq(posts.userId, user.id))
);
```

### 3.3 Webhook 签名验证
```typescript
// ✅ 必须验签，防止伪造请求
const event = stripe.webhooks.constructEvent(
  rawBody,
  req.headers.get('stripe-signature')!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
// 验签失败会抛异常，请求被拒绝
```

### 3.4 幂等性 (Webhook 重放防护)
```typescript
if (order.status === OrderStatus.PAID) {
  console.warn(`[Payment] Duplicate webhook for ${orderNo}`);
  return respData({ received: true });
}
```

---

## 4. 审查命令速查

Agent 在 Code Review 时执行以下命令查找潜在漏洞：

```bash
# XSS 风险
grep -rn "dangerouslySetInnerHTML" src/

# 缺少鉴权的 API
grep -rn "export async function POST" src/app/api/ | head -20
# 然后检查每个文件是否有 getSignUser 调用

# Fail-Open 风险
grep -rn "return.*success.*true" src/shared/lib/rate-limit.ts

# 硬编码密钥
grep -rn "sk_live\|sk_test\|password.*=" src/
```

---

## 5. Code Review 检查清单

- [ ] **API 鉴权**: 未登录 CURL 调用会发生什么？
- [ ] **IDOR**: 查询是否包含 `userId` 条件？
- [ ] **Webhook 验签**: 是否调用了 `constructEvent`？
- [ ] **幂等性**: 是否检查了订单/操作的重复状态？
- [ ] **输入校验**: 是否使用了 Zod Schema？
- [ ] **SQL 注入**: 是否使用 ORM 参数化查询？

---

**Version**: 1.1 | **Last Updated**: 2025-12-19
