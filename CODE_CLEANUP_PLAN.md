# Nano Banana Ultra 代码清理计划

> 生成时间: 2026-01-09
> 基于全面代码审核报告

---

## 执行摘要

**项目规模：**
- TypeScript/TSX 文件：620 个
- 总代码行数：约 101,341 行
- API 端点：77 个
- 依赖包：111 个

**架构评分：6.4/10**
- 整体架构良好，遵循 Clean Architecture
- 存在可清理的冗余代码和未使用依赖
- 部分文件过长需要拆分

**预期收益：**
- 删除 ~1,200 行未使用代码
- 移除 12+ 个未使用依赖
- 减少维护负担

---

## 阶段一：立即执行（高优先级）

### 1.1 删除未使用的代码文件

**影响：** 减少约 491 行代码

```bash
# 确认这些文件确实未被使用后删除
rm src/shared/lib/thumbnail-generator.ts       # 122 行
rm src/shared/lib/error-handler.ts             # 137 行
rm src/shared/lib/error-config.ts              # 105 行
rm src/shared/lib/error-id-generator.ts        # 38 行
rm src/shared/lib/simple-keyword-extractor.ts  # 84 行（被 seo-keyword-extractor 内部调用，考虑内联）
```

**验证步骤：**
```bash
# 搜索这些文件是否被 import
grep -r "thumbnail-generator" src --include="*.ts" --include="*.tsx"
grep -r "error-handler" src --include="*.ts" --include="*.tsx"
grep -r "error-config" src --include="*.ts" --include="*.tsx"
grep -r "error-id-generator" src --include="*.ts" --include="*.tsx"
```

### 1.2 修复服务层单例 Bug

**严重程度：高** - 每次调用都重新创建实例，浪费资源

**受影响文件：**
- `src/shared/services/email.ts`
- `src/shared/services/storage.ts`
- `src/shared/services/ai.ts`

**需要修复的代码：**
```typescript
// ❌ 错误 - 条件永远为 true
export async function getEmailService(): Promise<EmailManager> {
  if (true) {  // 应该是 if (!emailService)
    const configs = await getAllConfigs();
    emailService = getEmailServiceWithConfigs(configs);
  }
  return emailService;
}

// ✅ 正确
export async function getEmailService(): Promise<EmailManager> {
  if (!emailService) {
    const configs = await getAllConfigs();
    emailService = getEmailServiceWithConfigs(configs);
  }
  return emailService;
}
```

### 1.3 删除未使用的依赖

**影响：** 减少 12 个依赖包，减小 bundle 大小

```bash
pnpm remove \
  @dnd-kit/core \
  @dnd-kit/modifiers \
  @dnd-kit/sortable \
  @dnd-kit/utilities \
  @emoji-mart/data \
  @emoji-mart/react \
  recharts \
  swiper \
  embla-carousel-auto-scroll \
  embla-carousel-react \
  github-markdown-css \
  react-lazy-load-image-component \
  moment \
  @supabase/supabase-js \
  react-use-measure \
  streamdown \
  motion
```

**验证步骤：**
```bash
# 确认这些包确实未被使用
grep -r "dnd-kit" src --include="*.ts" --include="*.tsx"
grep -r "emoji-mart" src --include="*.ts" --include="*.tsx"
grep -r "recharts" src --include="*.ts" --include="*.tsx"
grep -r "swiper" src --include="*.ts" --include="*.tsx"
grep -r "embla-carousel" src --include="*.ts" --include="*.tsx"
grep -r "moment" src --include="*.ts" --include="*.tsx"
grep -r "supabase" src --include="*.ts" --include="*.tsx"
```

### 1.4 添加缺失的权限检查

**严重程度：高** - 安全问题

**需要修复的文件：**
- `src/app/api/admin/gallery/route.ts`
- `src/app/api/admin/gallery/[id]/route.ts`

**添加权限检查代码：**
```typescript
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

const user = await getUserInfo();
if (!user) return respErr('Unauthorized', 401);
if (!(await hasPermission(user.id, 'admin.gallery.write'))) {
  return respErr('Permission denied', 403);
}
```

---

## 阶段二：短期优化（中优先级）

### 2.1 拆分过长文件

**目标：** 将 >1000 行的文件拆分为更小的模块

| 文件 | 行数 | 拆分建议 |
|------|------|---------|
| `vision-logic-playground.tsx` | 2,241 | 拆分为：PromptPanel, OutputPanel, SettingsPanel, ControlBar |
| `intent-analyzer.ts` | 1,624 | 分离 prompt templates 到 `intent-prompts.ts` |
| `prompt-input.tsx` | 1,387 | 提取：SuggestionPanel, HistoryPanel, ShortcutBar |
| `generate-all/route.ts` | 1,055 | 业务逻辑抽到 `services/seo-generator.ts` |
| `prompt-quality.ts` | 1,045 | 分离评分规则到独立配置文件 |

**优先处理：**
1. `vision-logic-playground.tsx` - UI 组件最易拆分
2. `intent-analyzer.ts` - 分离 prompt templates 最简单

### 2.2 处理 scripts-archive 目录

**当前状态：**
- 50 个归档脚本文件
- 占用 352 KB

**处理方案：**

**保留（可能还需要）：**
- 迁移脚本（migrate-*.ts）
- 初始化脚本（init-*.ts）
- 提取脚本（extract-*.ts）

**删除（已完成或废弃）：**
- 修复脚本（fix-*.ts）
- 调试脚本（debug-*.ts）
- 临时脚本（check-*.ts）

**执行步骤：**
1. 创建 `scripts-archive/README.md` 说明保留原因
2. 删除明确废弃的脚本
3. 将剩余脚本移到独立的归档仓库（可选）

### 2.3 分离 Model 中的 UI 逻辑

**问题：** `post.tsx` 和 `changelog.tsx` 混合了数据模型和 React 组件

**重构方案：**
```
# 当前
src/shared/models/post.tsx          # 541 行，混合 Model + UI

# 重构后
src/shared/models/post.ts           # 数据模型 + CRUD
src/shared/components/post-renderer.tsx  # React 组件
```

### 2.4 检查并删除可疑的未使用服务

**需要确认的文件：**
- `src/shared/services/etl-processor.service.ts` (361 行)
- `src/shared/services/vector-storage.service.ts` (321 行)

**验证步骤：**
```bash
# 检查是否只在 scripts 中使用
grep -r "etl-processor" src/app --include="*.ts"
grep -r "vector-storage" src/app --include="*.ts"
```

如果确认只在 scripts 中使用，考虑：
- 移动到 `scripts/lib/`
- 或添加注释说明用途

---

## 阶段三：长期优化（低优先级）

### 3.1 服务层工厂模式抽象

**问题：** 以下服务文件结构完全相同，存在重复代码
- `ads.ts`, `affiliate.ts`, `analytics.ts`, `customer_service.tsx`
- `email.ts`, `storage.ts`, `ai.ts`

**解决方案：** 创建通用服务工厂

```typescript
// src/shared/lib/service-factory.ts
export function createServiceFactory<T, Config>(
  serviceName: string,
  createInstance: (config: Config) => T
) {
  let instance: T | null = null;

  return {
    async get(): Promise<T> {
      if (!instance) {
        const configs = await getAllConfigs();
        instance = createInstance(configs);
      }
      return instance;
    },
    reset() {
      instance = null;
    }
  };
}

// 使用示例
const emailFactory = createServiceFactory(
  'email',
  (config) => new EmailManager(config)
);

export const getEmailService = emailFactory.get;
```

### 3.2 API 路由业务逻辑抽离

**目标：** 保持 API Routes 简洁，只处理 HTTP 层逻辑

**需要重构的文件：**
- `src/app/api/admin/cases/sync-v2/route.ts` (444 行)
- `src/app/api/admin/cases/optimize/route.ts` (340 行)

**重构方案：**
```
# 当前
src/app/api/admin/cases/sync-v2/route.ts  # 444 行，混合 HTTP + 业务逻辑

# 重构后
src/app/api/admin/cases/sync-v2/route.ts  # ~50 行，只处理 HTTP
src/shared/services/case-sync.ts          # 业务逻辑
```

### 3.3 优化 console.log

**当前状态：**
- API 路由中有 177 处 console.log

**解决方案：**
1. 替换为结构化日志（使用 `logError`, `logInfo`）
2. 或在生产环境禁用 console.log

```typescript
// 替换
console.log('[Generate] Retrying...', attemptNumber);

// 为
import { logger } from '@/shared/lib/logger';
logger.info('Generate retry', { attemptNumber, provider, model });
```

---

## 清理检查清单

### 阶段一（立即执行）

- [ ] 删除 `thumbnail-generator.ts`
- [ ] 删除 `error-handler.ts`
- [ ] 删除 `error-config.ts`
- [ ] 删除 `error-id-generator.ts`
- [ ] 修复 `email.ts` 单例 bug
- [ ] 修复 `storage.ts` 单例 bug
- [ ] 修复 `ai.ts` 单例 bug
- [ ] 删除 17 个未使用的依赖
- [ ] 添加 admin/gallery 权限检查

### 阶段二（短期优化）

- [ ] 拆分 `vision-logic-playground.tsx`
- [ ] 拆分 `intent-analyzer.ts`
- [ ] 拆分 `prompt-input.tsx`
- [ ] 重构 `generate-all/route.ts`
- [ ] 处理 scripts-archive 目录
- [ ] 分离 `post.tsx` UI 逻辑
- [ ] 确认并处理 `etl-processor.service.ts`

### 阶段三（长期优化）

- [ ] 创建服务工厂抽象
- [ ] 重构 API 路由业务逻辑
- [ ] 优化 console.log

---

## 预期收益

**代码质量：**
- 删除 ~1,200 行未使用代码
- 移除 17 个未使用依赖
- 拆分 5 个过长文件

**性能提升：**
- Bundle 大小减少（移除未使用依赖）
- 服务层单例正确工作（减少重复实例化）

**可维护性：**
- 文件更小、更聚焦
- 职责更清晰
- 减少认知负担

**安全性：**
- 修复 admin API 权限检查

---

## 风险评估

### 低风险（可立即执行）

- 删除未使用的依赖
- 删除未使用的代码文件
- 修复单例 bug

### 中风险（需要测试）

- 拆分大文件
- 重构 API 路由

### 注意事项

1. **删除代码前务必确认：**
   - 使用 grep 搜索确认未被引用
   - 检查 scripts 目录是否有使用

2. **分阶段执行：**
   - 每个阶段完成后运行测试
   - 提交 git commit
   - 确保可回滚

3. **保留备份：**
   - 大规模重构前创建 git branch
   - 保留归档脚本的备份

---

**最后更新：** 2026-01-09
