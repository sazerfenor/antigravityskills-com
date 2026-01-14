# Prompt 优化自动化测试策略（修订版）

> 基于实际测试发现的问题，调整测试策略

## 发现的问题

### 1. API 限流
- Guest 用户：3 次/天
- Free 用户：10 次/天
- Paid 用户：100 次/天
- 当前测试套件有 9 个测试用例，会超过 Guest 限额

### 2. API 响应时间
- 单个请求响应时间：30-60 秒（调用 Gemini AI）
- 9 个测试用例串行执行：预计 4.5-9 分钟
- 每个测试间等待 500ms 防止限流：额外 4.5 秒

### 3. "fetch failed" 错误
- 原因：Node.js fetch 在本地开发环境可能遇到 DNS/网络问题
- 需要添加更详细的错误处理和日志

## 修订后的测试策略

### 方案 A：分层测试（推荐）

**Tier 1: 核心 Edge Cases（3 个测试 - Guest 限额内）**
```json
{
  "priority_tests": [
    "edge_no_primary_intent",
    "edge_implicit_style",
    "normal_photography"
  ]
}
```

执行方式：
```bash
pnpm tsx tests/prompts/run-baseline.ts --filter edge,normal --limit 3
```

预计时间：1.5-3 分钟

**Tier 2: 完整测试（需要登录）**
- 所有 9 个测试用例
- 需要管理员账号或 Paid 用户
- 预计时间：5-10 分钟

**Tier 3: 单元测试（Mock AI）**
- 不调用真实 AI API
- 测试数据验证逻辑
- 快速验证（< 1 秒）

### 方案 B：使用 Admin 账号绕过限流

**前提**：项目中配置 Admin 用户

**步骤**：
1. 登录 Admin 账号获取 session cookie
2. 在测试脚本中添加认证 header
3. 运行全部 9 个测试

**优点**：
- 无限流限制
- 可测试完整场景

**缺点**：
- 需要手动获取认证 token
- 测试不够自动化

### 方案 C：Mock 测试（快速验证逻辑）

**目标**：不调用真实 API，只测试验证逻辑

**实现**：
```typescript
// tests/prompts/run-mock-baseline.ts
const mockResponse = {
  primary_intent: null,
  context: "A portrait of a girl",
  fields: [{id: "style", label: "Art Style"}]
};

// 验证逻辑测试
validateResponse(mockResponse, expected, rules);
```

**优点**：
- 瞬间完成（< 1 秒）
- 无限流限制
- 可验证所有 validation rules

**缺点**：
- 不测试真实 AI 行为
- 无法收集性能指标

## 推荐执行计划

### Phase 0: Mock 测试（立即可执行）
- 创建 `run-mock-baseline.ts`
- 验证所有 validation rules 逻辑
- 确保测试框架正确
- **时间**: < 1 分钟

### Phase 1: 核心 Edge Cases（每天 1 次）
- 运行 Tier 1 测试（3 个用例）
- 收集 baseline 性能数据
- **时间**: 2-3 分钟

### Phase 2: 完整 Baseline（使用 Admin 账号）
- 配置 Admin 认证
- 运行全部 9 个测试
- 生成完整 baseline 报告
- **时间**: 6-10 分钟

### Phase 3: 优化后对比测试
- 修改 Prompt（删除冗余字段）
- 重新运行 Phase 2
- 对比 baseline vs 优化版
- **指标**: Token 消耗、响应时间、准确率

## 立即可执行的改进

### 1. 创建 Mini Baseline（3 个核心测试）
```bash
# tests/prompts/run-mini-baseline.ts
const PRIORITY_TESTS = ['edge_no_primary_intent', 'edge_implicit_style', 'normal_photography'];
```

### 2. 增加超时时间
```typescript
const TIMEOUT_MS = 90000; // 90 秒（考虑到 AI 响应慢）
```

### 3. 更详细的错误日志
```typescript
catch (error: any) {
  console.log(`💥 ERROR Details:`, {
    message: error.message,
    code: error.code,
    cause: error.cause
  });
}
```

### 4. 添加重试机制
```typescript
async function callIntentAPIWithRetry(input, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callIntentAPI(input);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(2000); // 等待 2 秒后重试
    }
  }
}
```

## 下一步行动

### 选项 1：快速验证（推荐）
1. ✅ 创建 Mock 测试脚本
2. ✅ 验证 validation rules 逻辑
3. ✅ 确认测试框架可用
4. ⏸️ 真实 API 测试延后（需要解决限流）

### 选项 2：配置 Admin 账号
1. 检查项目是否有 Admin 账号
2. 获取 session token
3. 修改测试脚本添加认证
4. 运行完整 baseline

### 选项 3：分批测试
1. 今天：运行 3 个核心测试
2. 明天：运行剩余 6 个测试
3. 合并结果生成 baseline 报告

## 技术债务记录

- [ ] 测试环境应该有独立的 API 限额配置
- [ ] 考虑添加测试专用的 API endpoint（无限流）
- [ ] AI 调用应该支持 Mock 模式（环境变量控制）

---

**更新时间**: 2026-01-13
**当前策略**: 先执行 Mock 测试验证逻辑，真实 API 测试需要解决限流问题
