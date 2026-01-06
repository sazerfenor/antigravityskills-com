---
description: CTO 级实施工作流 - 合成 Prompt/UIUX/SEO 输入，执行高保真代码实现
---

# Implementation Agent (施工机器人)

> **核心理念**: 我是 CTO，我了解架构，我不重复造轮子，我按图施工
> **版本**: 1.0 | 基于 0-workflow-master V2.0 生成
> **适用场景**: 全功能高保真实现

## 🔁 Handover Convention

| 方向 | 路径 |
|------|------|
| **输入** | `artifacts/{feature-name}/PRD_Handoff.md` (from `/0-pm-agent`) |
| **输入** | `artifacts/{feature-name}/Design-Specs.md` (from `/0-uiux-designer`) |
| **输入** | `artifacts/{feature-name}/SEO-Strategy.md` (from `/1-seo-optimization`) |
| **输出** | Production Code + `artifacts/{feature-name}/Review-V{n}.md` |

---

## 📚 Agent Roster (7 个)

| Agent | 文件路径 | 阶段 |
|-------|---------|------|
| **architecture-archaeologist** | [architecture-archaeologist.md](1-implementation-agent/architecture-archaeologist.md) | Phase 0 |
| **infra-registrar** | [infra-registrar.md](1-implementation-agent/infra-registrar.md) | Phase 0.5 |
| **tech-lead** | [tech-lead.md](1-implementation-agent/tech-lead.md) | Phase 1 |
| **database-architect** | [database-architect.md](1-implementation-agent/database-architect.md) | Phase 2 |
| **backend-dev** | [backend-dev.md](1-implementation-agent/backend-dev.md) | Phase 3 |
| **frontend-dev** | [frontend-dev.md](1-implementation-agent/frontend-dev.md) | Phase 4 |
| **qa-engineer** | [qa-engineer.md](1-implementation-agent/qa-engineer.md) | Phase 5 |

---

## 📋 Phase 0: 架构考古

Call /architecture-archaeologist

### Step 0.1: 读取项目架构

**INPUT**: 项目根目录路径
**OUTPUT**: `Architecture-Context.md`

**执行**:
1. 读取 `CLAUDE.md` (项目主文档)
2. 读取 `.agent/rules/serverless-rag-pattern.md` (AI 开发规则)
3. 扫描 `src/extensions/` 目录结构
4. 提取技术栈、分层架构、禁止模式

**GATE**: 如果 `CLAUDE.md` 不存在 → 询问用户提供项目文档

---

## 📋 Phase 0.5: 基础设施注册

Call /infra-registrar

### Step 0.5.1: 收集可复用资源

**INPUT**: `Architecture-Context.md`
**OUTPUT**: `Infrastructure-Registry.md`

**执行**:
1. 扫描 `src/shared/lib/*.ts` (工具函数)
2. 扫描 `src/extensions/ai/*.ts` (AI Provider)
3. 提取环境变量清单
4. 记录推荐模型和 API 响应格式

**GATE**:
- 如果 `Architecture-Context.md` 不存在 → REJECT，返回 Phase 0
- 如果 AI Provider 列表为空 → WARNING，询问用户是否继续

---

## 📋 Phase 1: 规划

Call /tech-lead

### Step 1.1: 合成输入并规划

**INPUT**: 
- PRD/UIUX/SEO 输入文件
- `Architecture-Context.md`
- `Infrastructure-Registry.md`

**OUTPUT**: `Implementation-Plan.md`

**执行**:
1. 读取所有输入 Artifacts
2. 检测输入间冲突
3. 输出技术方案

### ⏸️ CHECKPOINT 1
> **检查点**: 确认技术方案可行
> **回复**: "继续" 或指出问题

---

## 📋 Phase 2: 数据库设计

Call /database-architect

// turbo-all

### Step 2.1: Schema 设计

**INPUT**: `Implementation-Plan.md`
**OUTPUT**: Schema 设计 + 迁移脚本

**执行**:
1. 设计数据库 Schema
2. 生成迁移文件: `pnpm db:generate`
3. **Git Checkpoint**: `git commit -m "feat({feature}): Phase 2 - Schema"`

---

## 📋 Phase 3: 后端实现

Call /backend-dev

### Step 3.1: API 实现

**INPUT**: Schema + `Infrastructure-Registry.md`
**OUTPUT**: 后端代码

**约束** (from Infrastructure-Registry):
- ✅ 使用 `respData()` / `respErr()` 响应格式
- ✅ 使用 Provider Manager 调用 AI
- ✅ 使用 `zod.ts` 参数校验
- ❌ 禁止直接调用外部 API

**执行**:
1. 创建 API Routes
2. 创建 Services
3. 创建 Models
4. **Git Checkpoint**: `git commit -m "feat({feature}): Phase 3 - Backend"`

---

## 📋 Phase 4: 前端实现

Call /frontend-dev

### Step 4.1: UI + SEO 实现

**INPUT**: 
- UIUX 规格
- SEO 策略
- `Infrastructure-Registry.md`

**OUTPUT**: 前端代码

**执行**:
1. 创建 UI 组件 (应用 UIUX 规范)
2. 创建页面
3. 注入 SEO 元数据
4. **Git Checkpoint**: `git commit -m "feat({feature}): Phase 4 - Frontend"`

---

## 📋 Phase 5: 竣工验收

Call /qa-engineer

### Step 5.1: 综合验收

**INPUT**: 全部代码 + 原始输入
**OUTPUT**: `Review-V{n}.md`

**执行**:
1. PRD 合规检查
2. UIUX 规范检查
3. SEO 检查 (Meta, Schema, Semantic HTML)
4. 架构合规检查 (Provider 模式)

**结论**: 
- **APPROVED** → 输出 `Review-V{n}.md`，流程结束
- **REJECTED** → 返回相关 Phase 修复，修复后重新验收 (V{n+1})

**收敛控制**:
- REJECTED 累计 ≥ 2 次 → 强制人工介入评估

### ⏸️ CHECKPOINT 5 (MANDATORY)
> **检查点**: 确认验收结论
> **回复**: "Approved" 或 "Rejected + 原因"

---

## ✅ 最终输出

**代码输出**: `src/app/`, `src/shared/`, `src/components/`
**文档输出**: `artifacts/{feature-name}/Review-V{n}.md`

---

**Version**: 1.0 | **Created**: 2025-12-25
