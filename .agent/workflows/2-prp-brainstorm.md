---
description: 头脑风暴工作流 - 把模糊想法变成清晰的 Feature Spec，作为 /1-prp-gen 的输入
argument-hint: [一句话描述你想做的功能]
---

# PRP Brainstorm Workflow

把模糊的想法转化为结构化的功能规格，为 `/1-prp-gen` 提供高质量输入。

> **定位**: `/1-prp-gen` 的上游"输入生成器"
> **产出**: 清晰的 Feature Spec，可直接传入 `/1-prp-gen`

## 🔁 Handover Convention

| 方向 | 路径 |
|------|------|
| **输入** | 用户一句话想法 (无文件输入) |
| **输出** | `docs/brainstorming/YYYY-MM-DD-{feature}.md` |
| **下游** | `/1-prp-gen` (粘贴 Feature Spec) |

---

## 📚 Agent 引用

| Agent | 文件路径 | 用途 |
|-------|---------|------|
| **brainstorm** | [brainstorm.md](prp-gen/brainstorm.md) | Scrum Master 引导头脑风暴 |

---

## 使用场景

**适合**:
- 只有一句话想法 ("做个类似 Trello 的看板")
- 需要梳理需求的产品经理
- 跨团队需求对齐讨论

**不适合**:
- 需求已经非常清晰，直接用 `/1-prp-gen`

---

## 流程

### Phase 1: 上下文澄清

Call /brainstorm

**执行**:
1. 理解功能需求和范围
2. 明确目标用户和使用场景
3. 识别技术约束和依赖
4. 评估可用资源和时间线

### Phase 2: 想法生成

**技术**:
- "如果...会怎样?" 场景探索
- 任务分解
- 用户故事分析
- 技术规划和架构讨论
- 风险评估和缓解策略

### Phase 3: 结果结构化

**执行**:
- 将相似想法归组
- 使用 MoSCoW 或类似方法确定优先级
- 估算复杂度和工作量 (T-shirt sizing)
- 创建可执行项目

### Phase 4: 输出文档

**产出**: `docs/brainstorming/YYYY-MM-DD-feature-name.md`

**内容**:
- ✅ 清晰的功能实现计划
- ✅ 分解为可管理的子任务
- ✅ 风险和依赖关系
- ✅ 团队下一步行动
- ✅ 优先级排序的 Backlog 项目

---

## 语言规范

- **讨论阶段**: 使用用户的语言
- **最终文档**: 英文输出
- **代码示例**: 英文注释和变量名

---

## 与 /1-prp-gen 的衔接

完成头脑风暴后，将产出的 Feature Spec 作为 `/1-prp-gen` 的输入参数：

```bash
/1-prp-gen [粘贴头脑风暴输出的功能描述]
```

---

**Version**: 1.0 | **Created**: 2025-12-21 | **Source**: cc-blueprint-toolkit/brainstorm
