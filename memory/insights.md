# 项目记忆

> 项目专属的经验积累，广泛记录防丢失
> 可抽象的教训用 [待反馈主脑] 标记，会话结束时同步到主脑

## 技术决策
<!-- [日期] 决策 - 理由 - 上下文 -->

## 踩坑记录
<!-- [日期] 问题 → 解决方案 - 详细排查过程 -->

### [2026-01-14] Prompt 优化去重逻辑错误 → 区分"用户强调"和"无意义重复"

**问题场景**：
设计 Compiler 去重逻辑时，错误地认为"关键词重复 = 冗余"，设计了过滤与 primary_intent 重复的 narrative_params 的逻辑。

**错误理解**：
```typescript
// ❌ 错误逻辑：过滤与 primary_intent 重复的 narrative_params
const primaryKeywords = plo.primary_intent.phrase.toLowerCase().split(/\s+/);
const hasOverlap = primaryKeywords.some(kw => paramValue.includes(kw));
return !hasOverlap;  // 这会删除用户强调的重要信息
```

案例：
- 用户输入："clay style cat"
- 用户表单：选择了 texture: "clay surface", style: "3D clay"
- 我的逻辑会过滤掉 "clay surface" 和 "3D clay"（因为与 primary_intent "Clay Style" 重复）
- 结果：用户强调的重要信息被删除了

**正确理解**：

**重复 ≠ 冗余**

1. ✅ **应该去重的**：
   - 冗余的描述方式（style_hints 和 creative_params 说的是同一件事）
   - 无意义的重复（同一个词在同一个句子里出现 3 次：「clay clay clay」）

2. ❌ **不应该去重的**：
   - 用户强调的内容（用户描述提到 + 表单也选了 = 证明重要）
   - 案例："clay" 出现 3 次但分布在不同概念（风格、纹理、渲染）→ ✅ 合理

**正确的去重逻辑设计方向**：
- 检测字段级重复（整个字段说的是同一件事）
- 检测句内无意义重复（同一个词连续出现）
- 不按关键词匹配简单过滤

**根本原则**：用户强调的内容 = 重要信息，不要试图"优化掉"用户的强调。

### [2026-01-14] Cloudflare Workers 部署后请求 localhost → 缺少 `.env.production`

**问题场景**：
部署到 Cloudflare Workers 后，生产环境仍向 `http://localhost:3000` 发送 API 请求，导致 Better-Auth OAuth 认证失败和 CORS 错误。

**错误诊断过程**：
1. ❌ 初始错误：修改代码逻辑（`src/config/index.ts` line 53），认为是运行时配置问题
2. ❌ 用户反馈："你这个没有改好，不要做任何修改，现在先定位问题"
3. ✅ 正确做法：对比成功项目 `bananaprompts-info`，发现其有 `.env.production` 文件
4. ✅ 验证发现：`nanobananaultra` 只有 `.env` (localhost)，缺少 `.env.production`

**根本原因**：
- `NEXT_PUBLIC_*` 环境变量在**构建时**静态替换到代码中，不是运行时读取
- `wrangler.toml` 的 `[vars]` 只影响运行时（太晚了，静态替换已完成）
- Next.js 生产构建优先读取 `.env.production`，其次才是 `.env`
- 项目缺少 `.env.production`，导致 `next build` 使用 `.env` 的 `localhost:3000`

**解决方案**：
创建 `.env.production` 文件，包含生产环境的 `NEXT_PUBLIC_*` 变量：
```env
NEXT_PUBLIC_APP_URL=https://nanobananaultra.com
NEXT_PUBLIC_APP_NAME=Nano Banana Ultra
# ... 其他 NEXT_PUBLIC_* 变量
```

**验证方法**：
- 部署日志应显示：`Environments: .env.production, .env` （正确）
- 而非：`Environments: .env`（错误）
- 检查 `wrangler` 输出的 bindings 中 `NEXT_PUBLIC_APP_URL` 值

**教训总结**：
1. **理解构建时 vs 运行时**：`NEXT_PUBLIC_*` = 构建时替换，其他变量 = 运行时读取
2. **对比成功项目**：遇到问题先看之前能用的项目有什么不同
3. **不要猜测，要验证**：初次修改代码逻辑是错误方向，应该先调查环境配置
4. **遵循 Next.js 环境文件优先级**：`.env.production` > `.env.local` > `.env`

**适用范围**：所有使用 Next.js + Cloudflare Workers (OpenNext) 部署的项目

## 架构笔记
<!-- 项目特有的架构理解和备忘 -->
