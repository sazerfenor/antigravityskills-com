---
description: PRD 到可用功能的完整开发工作流 - 融合多阶段协作与全栈开发能力
---

# Feature Development Workflow

将 PRD 转化为可用功能，内置自审循环，遵守项目规范。

> **来源**: 融合 Multi-Agent Audit (协作模式) + Full Stack Dev (开发流程)
> **推荐模型**: Opus (架构) → Gemini (实现) → Haiku (测试)
> **💡 Token 控制提示**: 每个独立任务建议新开对话，保持上下文纯净。

---

## 输出目录约定

所有产出物存放在功能专属目录：
```
artifacts/{feature-name}/
├── Audit-V{n}.md      # 审计报告
├── PRD-V{n}.md        # PRD 文档
├── Code-V{n}.md       # 代码补丁日志
└── Review-V{n}.md     # 审查报告
```

## 🔁 Handover Convention

| 方向 | 路径 |
|------|------|
| **输入** | `artifacts/{feature-name}/PRD_Handoff.md` (来自 `/1-prd-review`) |
| **输出** | Production Code + `artifacts/{feature-name}/Review-V{n}.md` |
| **下游** | Git Merge / Deploy |

---

## 📚 Agent 与规范引用

### Agents (7 个)

| Agent | 文件路径 | 阶段 |
|-------|---------|------|
| **mini-pm** | [feature-dev/mini-pm.md](feature-dev/mini-pm.md) | Phase 0 |
| **plan-reviewer** | [feature-dev/plan-reviewer.md](feature-dev/plan-reviewer.md) | Phase 0 (可选) |
| **database-architect** | [feature-dev/database-architect.md](feature-dev/database-architect.md) | Phase 1 |
| **backend-architect** | [feature-dev/backend-architect.md](feature-dev/backend-architect.md) | Phase 2 |
| **frontend-dev** | [feature-dev/frontend-dev.md](feature-dev/frontend-dev.md) | Phase 3 |
| **test-automator** | [feature-dev/test-automator.md](feature-dev/test-automator.md) | Phase 4 |
| **self-reviewer** | [feature-dev/self-reviewer.md](feature-dev/self-reviewer.md) | Phase 5 |

### 规范文件 (必读)

| 维度 | 规范文件路径 |
|-----|-------------|
| UI/UX | `.agent/rules/UIUX_Guidelines.md` |
| 安全 | `.agent/rules/Security_Guidelines.md` |
| 性能 | `.agent/rules/Performance_Guidelines.md` |

> ⚠️ **规范优先级**: 当 Agent 知识与 DeepCodeReview_Rules 冲突时，以 DeepCodeReview_Rules 为准。

---

## 流程概述

本工作流包含 6 个连续阶段：

1. **Phase 0: PRD 理解与规划** - 读取 PRD，评估 Fast Track
2. **Phase 1: 数据库设计** - Schema 设计 + 迁移脚本
3. **Phase 2: 后端实现** - API 设计 + Service 实现
4. **Phase 3: 前端实现** - 组件 + 状态管理 + API 集成
5. **Phase 4: 集成测试** - 单元/集成/E2E 测试
6. **Phase 5: 最终验收** - 安全/性能快速检查

---

## 执行步骤

// turbo-all

### Phase 0: PRD 理解与规划

Call /mini-pm

1. 读取用户提供的 PRD 或需求描述
3. 执行代码考古命令：
   ```bash
   grep -rn "export type" src/shared/types/ | head -30
   grep -A 20 "export const {相关表名}" src/config/db/schema.ts
   ```
4. 分解为子任务
5. **Fast Track 判断**: 评估是否满足以下全部条件

#### AI 功能检测

**触发条件**: PRD 中出现以下关键词或需求：
- [ ] LLM / AI / OpenAI / Gemini / Claude / Groq
- [ ] Embedding / 向量 / Vector
- [ ] RAG / 检索增强 / 知识库
- [ ] Prompt 生成 / 优化

**若命中任一条件** → 激活 **AI 开发模式**：

1. **激活 Rule**: `/serverless-rag-pattern` (完整模式文档在 `.agent/rules/`)

2. **架构速查** (Serverless RAG 三件套):
   - **Provider Manager**: `src/extensions/ai/provider-manager.ts` - 统一 AI 调用入口
   - **ETL Processor**: `src/shared/services/etl-processor.service.ts` - LLM 驱动数据清洗
   - **Vector Search**: `src/shared/services/vector-search.ts` - 内存余弦相似度

3. **Phase 2 检查**: 是否存在现有 AI Provider？复用 > 新建

4. **Phase 5 追加**: AI 专项验收清单

---

#### Fast Track 判断标准

满足**全部**以下条件可跳过 Phase 1：
- [ ] 修改文件数 ≤ 2
- [ ] 无新增类型/接口定义
- [ ] 无数据库 Schema 变更
- [ ] 无跨模块依赖变更

**若符合 Fast Track** → 跳转到 Phase 2 或 Phase 3

6. 生成规划文档 `artifacts/{feature-name}/Plan.md`

7. **[可选] Plan Review** (融合自 diet103)
   - **触发条件**: 复杂度 > 中等 OR 修改文件 > 5 OR 涉及数据库变更
   - Call /plan-reviewer
   - **指令**: 读取 `Plan.md`，评估技术可行性与潜在风险，输出 `Plan-Review.md`

> 🛑 **USER_APPROVAL_REQUIRED**: 规划完成后**必须等待用户确认**后再进入后续阶段。

---

### Phase 1: 数据库设计

Call /database-architect

1. 设计数据库 Schema
3. 创建数据库迁移脚本
4. **自审**: Schema 合理性（索引、关系、命名）
5. 输出设计文档 `artifacts/{feature-name}/Schema.md`
6. **Git Checkpoint**: `git commit -m "feat({feature}): Phase 1 - Schema design"`

---

### Phase 2: 后端实现

Call /backend-architect

1. **Reference-First Coding** ⭐ (新增):
   - **编码前必读**: 先读取参考文件，理解其结构、模式和组织方式
   - **模式镜像**: 严格遵循参考实现的文件组织、命名规范、组件结构
   - **禁止范围蔓延**: 只实现 PRD 要求的功能，不扩展范围
3. 设计 API 结构 (REST/GraphQL)
4. **接口先行 (API First)**：
   - 定义接口契约（Request/Response 结构）
   - 生成 cURL 测试命令
   - 验证接口可用性后再编码
5. 实现数据模型 (Models)
6. 实现业务逻辑 (Services)
7. 实现 API 端点 (Routes)
8. 添加输入验证 (Zod)

**架构约束** (来自 CLAUDE.md):
- ✅ API Routes 只调用 Services
- ✅ Services 聚合 Models + Extensions
- ✅ 使用 `respData` / `respErr` 统一响应格式
- ✅ 所有 API 必须 try-catch + logError

8. **自审**: 架构一致性
9. 生成代码补丁日志 `artifacts/{feature-name}/Code-Backend.md`
10. **Git Checkpoint**: `git commit -m "feat({feature}): Phase 2 - Backend implementation"`

---

### Phase 3: 前端实现

Call /frontend-dev

> [!IMPORTANT]
> **Browser 验证强制**
> 
> 如果 PRD 涉及动画/过渡/滚动，必须用 `browser_subagent` 验证。
> **编译通过 ≠ 功能正确**

1. 读取 `Feature_Spec.md` 中的施工检查清单
2. 对每个检查项执行: Code → Verify → Mark 循环
3. 创建 UI 组件
4. 实现状态管理
5. 集成 API 调用
6. 添加表单验证
7. 实现响应式设计

**UIUX 规范检查** (引用 `UIUX_Guidelines.md`):
- ✅ Button 使用 `variant="glow-primary"`
- ✅ Card 使用 `variant="interactive"`
- ❌ 禁止 `border-yellow-500` → 使用 `border-primary`
- ❌ 禁止 `hover:scale-105` → 使用 `hover:scale-102`
- ❌ 禁止 `bg-gray-900` → 使用 `bg-card`

8. **自审**: UIUX 规范合规
9. 生成代码补丁日志 `artifacts/{feature-name}/Code-Frontend.md`
10. **Git Checkpoint**: `git commit -m "feat({feature}): Phase 3 - Frontend implementation"`

### ⏸️ CHECKPOINT 3.5 (MANDATORY - 不可跳过)

> **检查点**: 确认所有施工检查清单项已验证
> **必须满足**:
> - 所有检查项标记为 `[x]`
> - 每个涉及动画/布局的项有 `browser_subagent` 验证记录
> **选项**: 
> - "继续" → 进入 Phase 4
> - "返回" → 修复未通过的检查项

---

### Phase 4: 集成测试

Call /test-automator

1. 编写单元测试 (Models/Services)
3. 编写集成测试 (API Routes)
4. 编写 E2E 测试 (关键流程)
5. **Given-When-Then 验收** ⭐ (新增):
   - 使用 GWT 格式验证每个场景
   - 执行验收标准检查列表
6. 确保测试覆盖率 > 80%
7. **自审**: 测试覆盖
8. 生成测试报告 `artifacts/{feature-name}/Test-Report.md`
9. **Git Checkpoint**: `git commit -m "feat({feature}): Phase 4 - Tests"`

---

### Phase 5: 最终验收

Call /self-reviewer

1. **二次阅读 PRD** ⭐ (新增): 重新阅读 PRD，确认所有需求均已实现，无遗漏
3. 执行一致性检查 (PRD ↔ Code)
4. **接口一致性验证**: 对比 PRD 定义的接口 vs 实际实现
5. 提出 3 个边缘场景
6. 安全快速检查:
   ```bash
   grep -rn "dangerouslySetInnerHTML" {修改的文件}
   grep -rn "export async function" {API文件} | head -20
   ```
7. 性能快速检查
8. **架构一致性检查** (融合自 diet103):
   - 验证分层合规: Routes → Controllers → Services → Repositories
   - 检查职责边界: Controller 不直接调用 Repository
9. **[仅 AI 模式] AI 专项检查**:
   - [ ] LLM 调用是否通过 Provider 封装？（参考 `src/extensions/ai/provider-manager.ts`）
   - [ ] Embedding 维度是否与存储一致？
   - [ ] Prompt 模板是否外置可配置？
   - [ ] 是否有 AI 调用失败的降级策略？
   - [ ] 向量索引是否预计算并存储于 KV？
10. **Gotchas 记录** ⭐ (新增): 记录开发过程中发现的坑和注意事项
11. 输出审查报告 `artifacts/{feature-name}/Review-V{n}.md`
12. 结论：**APPROVED** / **REJECTED**
11. **Git Checkpoint**: `git commit -m "review({feature}): Phase 5 - {审查结论}"`

---

## 收敛控制

- 若 Phase 5 结论为 **REJECTED**，返回相应阶段修复
- 若 **REJECTED 累计 ≥ 2 次**，触发重新评估技术方案
- 每次代码合并后自动刷新代码库状态

---

## 产出物清单

| 阶段 | 产出物 | 路径 |
|------|-------|------|
| Phase 0 | 规划文档 | `artifacts/{feature-name}/Plan.md` |
| Phase 1 | Schema 设计 | `artifacts/{feature-name}/Schema.md` |
| Phase 2 | 后端代码 | `src/app/api/`, `src/shared/` |
| Phase 3 | 前端组件 | `src/components/`, `src/app/` |
| Phase 4 | 测试代码+报告 | `__tests__/`, `artifacts/{feature-name}/Test-Report.md` |
| Phase 5 | 审查报告 | `artifacts/{feature-name}/Review-V{n}.md` |

---

## 断点与模型切换

```markdown
## 🛑 HANDOVER CHECKPOINT

### 1. 当前状态
- **阶段**: Phase {n}: {阶段名称}
- **已完成**: {已完成的任务列表}
- **产出物**: {生成的文件列表}

### 2. 下一步行动
- **目标**: {下一阶段目标}
- **推荐模型**: {模型名称}
- **推荐理由**: {选择理由}

### 3. 上下文传递
> 致下一个模型：
> 你现在是 {角色}。请读取 {文件列表}，继续执行 Phase {n+1}。
```

---

**Version**: 1.0 | **Created**: 2025-12-21 | **Source**: Multi-Agent Audit + Full Stack Dev
