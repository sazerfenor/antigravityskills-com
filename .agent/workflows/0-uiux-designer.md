---
description: UIUX 设计 + 前端施工 + UI 审查工作流
---

# UIUX Designer Workflow

> **核心理念**: 规范驱动、禁止硬编码、具备规范反写能力、具备审查验收能力
> **适用场景**: UI/UX 设计、前端施工、现有页面审查、施工后验收

## 🔁 Handover Convention

| 方向 | 内容 |
|------|------|
| **上游** | `Feature_Spec.md` (来自 `/0-pm-agent`) 或用户直接请求 |
| **输出** | `UIUX_Spec.md` + `Frontend_Blueprint.md` |
| **下游** | `/1-cpo-builder` (可选输入 `UIUX_Spec.md`) |

---

## 🚦 适用条件

**触发本工作流**:
- 用户请求涉及 UI/UX 设计或前端实现
- 需要审查现有页面的 UIUX 合规性
- Feature Dev 完成后需要验收还原度

**不适用** (应使用其他工作流):
- 纯后端 API 开发 → `/1-feature-dev`
- 纯 PRD 编写 → `/0-pm-agent`
- 工作流创建 → `/1-workflow-gen`

---

## 📚 Agent Roster

| Agent | 文件路径 | 阶段 |
|-------|---------|------|
| **design-advisor** | [design-advisor.md](uiux-designer/design-advisor.md) | Phase 2, 5 |
| **spec-auditor** | [spec-auditor.md](uiux-designer/spec-auditor.md) | Phase 1 |
| **component-advisor** | [component-advisor.md](uiux-designer/component-advisor.md) | Phase 3 |
| **desktop-implementer** | [desktop-implementer.md](uiux-designer/desktop-implementer.md) | Phase 4, 6 |
| **mobile-implementer** | [mobile-implementer.md](uiux-designer/mobile-implementer.md) | Phase 4, 6 |
| **ui-reviewer** | [ui-reviewer.md](uiux-designer/ui-reviewer.md) | Phase R1, R2 |

---

## 📁 输出目录

```
artifacts/{feature_name}/
├── Spec_Gap_Report.md      # Phase 1 (规范缺失时)
├── UI_Gap_Report.md        # Phase 2 (PRD UI 缺失时)
├── Component_Spec.md       # Phase 3
├── New_Component_Spec.md   # Phase 3 (需新组件时)
├── Desktop_Design.md       # Phase 4
├── Mobile_Design.md        # Phase 4
├── UIUX_Spec.md            # Phase 5
├── Frontend_Blueprint.md   # Phase 5
├── UI_Audit_Report.md      # Phase R1
└── Deviation_Report.md     # Phase R2 (还原度 < 90% 时)
```

---

## 📋 Phase -1: 模式路由

**INPUT**: 用户请求
**OUTPUT**: `context.mode`

### 路由判断

| 关键词/场景 | 路由 | context.mode |
|------------|------|--------------|
| "设计/创建/实现/修改" + UI 功能 | → Phase 0 | design_implement |
| "审查/检查" + 现有页面 URL | → Phase R1 | review_existing |
| "验收/验证" + Feature Dev 完成 | → Phase R2 | review_post_build |

---

## 📋 Phase 0: 规范注入

**INPUT**: 
- `input_source`: 用户请求 (string) 或 `Feature_Spec.md` (来自 `/0-pm-agent`)
- `target_url`: 页面 URL (仅 review 模式)

**OUTPUT**: 
- `uiux_guidelines`: 规范内容 (传递给 Phase 1)
- `context.mode`: 路由模式 (来自 Phase -1)

**执行**:
1. 读取 `.agent/rules/UIUX_Guidelines.md` (MANDATORY)
2. 读取项目 `CLAUDE.md` (如有)
3. 传递规范内容给 Phase 1

**GATE**: 如果 UIUX_Guidelines.md 不存在 → REJECT

---

## 📋 Phase 1: 规范审计

Call /spec-auditor

**INPUT**: 
- `uiux_guidelines`: UIUX_Guidelines.md 内容

**OUTPUT**: 
- `status`: PASS | WARNING
- `Spec_Gap_Report.md` (如有缺失)

### 检查清单
- [ ] 动画规范 (进入/退出/Hover/Loading)
- [ ] 性能约束 (允许的 CSS 属性)
- [ ] 移动端规范 (触摸目标/断点)
- [ ] 组件规范 (所有 variant 定义)

**GATE**:
- 全部充足 → Phase 2
- 有缺失 → 输出 `Spec_Gap_Report.md` + 反写建议

### ⏸️ CHECKPOINT 1
> **选项**: 
> - "继续" → Phase 2
> - "反写" → 执行反写后重新检查
> - "终止" → 结束

---

## 📋 Phase 2: 意图理解 + PRD UI 审查

Call /design-advisor

**INPUT**: 
- `input_source`: 以下任一:
  - 用户自然语言请求 (string)
  - `Feature_Spec.md` 内容 (来自 `/0-pm-agent`)
- `uiux_guidelines`: 规范内容

**OUTPUT**: 
- 意图分析报告
- `context.scene`: small_change | big_feature
- `UI_Gap_Report.md` (如有缺失)

### Step 2.1: 意图分析
提取: 目标、范围、约束

### Step 2.2: PRD UI 审查 (仅 Feature_Spec.md 输入时)
检查: 组件选型、交互状态、响应式、a11y、动画

### Step 2.3: 任务路由
```
IF 修改范围 <= 1 个组件 AND 无新组件需求:
  scene = small_change → Phase 6
ELSE:
  scene = big_feature → Phase 3
```

**GATE**: PRD UI 缺失 → 输出 `UI_Gap_Report.md` + HALT

### ⏸️ CHECKPOINT 2
> **选项**: "继续" / "修改" / "终止"

---

## 📋 Phase 3: 组件选型 + 新组件设计

Call /component-advisor

**INPUT**: 
- `design_intent`: 设计意图 (from Phase 2)
- `uiux_guidelines`: 规范内容 (组件章节)

**OUTPUT**: 
- `Component_Spec.md`
- `New_Component_Spec.md` (如需新组件)

### 执行逻辑
1. 根据需求匹配现有组件
2. 检查禁止清单
3. 如现有组件不足 → 设计新组件

**GATE**: 
- 现有组件满足 → 输出 Component_Spec.md
- 需新组件 → 输出 New_Component_Spec.md → 用户确认后生成代码

### ⏸️ CHECKPOINT 3
> **选项**: "继续" / "创建新组件" / "终止"

---

## 📋 Phase 4: 分视口设计 (并行)

**同时调用两个 Implementer**

### Call /desktop-implementer

**INPUT**: 设计意图 + Component_Spec.md + 规范
**OUTPUT**: `Desktop_Design.md`

### Call /mobile-implementer

**INPUT**: 设计意图 + Component_Spec.md + 规范
**OUTPUT**: `Mobile_Design.md`

---

## 📋 Phase 5: 汇总决策

Call /design-advisor

**INPUT**: 
- `Desktop_Design.md`
- `Mobile_Design.md`
- `Component_Spec.md`

**OUTPUT**: 
- `UIUX_Spec.md`
- `Frontend_Blueprint.md`

### 执行逻辑
1. 检查两端方案是否冲突
2. 解决冲突 (移动优先原则)
3. 生成最终规格

### ⏸️ CHECKPOINT 5
> **选项**: "继续" / "修改" / "终止"

---

## 📋 Phase 6: 直接施工 (仅小修改)

**路由**:
- 仅桌面端 → Call /desktop-implementer
- 仅移动端 → Call /mobile-implementer
- 响应式 → 两者都调用

**执行**:
1. 写代码 (按规范)
2. 自我审查 (按规范检查)
3. 浏览器验证 (browser_subagent)

---

## 📋 Phase R1: 现有页面审查

Call /ui-reviewer (审查模式)

**INPUT**: 
- `target_url`: 页面 URL
- `uiux_guidelines`: 规范内容

**OUTPUT**: `UI_Audit_Report.md`

### 检查维度
| 维度 | 检查方法 |
|------|---------|
| 规范合规 | 扫描禁止清单违规 |
| 审美评估 | 配色/间距/对比度/层级 |
| 可用性 | 操作反馈/错误处理 |
| 移动端兼容 | 触摸目标/响应式 |

### ⏸️ CHECKPOINT R1
> **选项**: "继续" / "修改" / "终止"

---

## 📋 Phase R2: 施工后验收

Call /ui-reviewer (验收模式)

**INPUT**: 
- `uiux_spec`: UIUX_Spec.md 内容
- `target_url`: 实现页面 URL

**OUTPUT**: 
- 验收报告 (还原度 >= 90%)
- `Deviation_Report.md` (还原度 < 90%)

### 还原度计算
```
overall_restoration_rate = (一致项 / 总项) * 100%
```

**GATE**:
- >= 90% → PASS
- < 90% → FAIL (输出偏差报告)

### ⏸️ CHECKPOINT R2
> **选项**: "通过" / "返工" / "强制通过"

---

## 📋 Phase 7: 人工审核 (MANDATORY)

**INPUT**: 所有输出物
**OUTPUT**: 审核决策

### ⏸️ CHECKPOINT 7 (不可跳过)
> **选项**:
> - "应用" → 输出最终文件
> - "修改" → 返回相应阶段
> - "放弃" → 结束

---

## ✅ 最终输出

### 设计施工模式
- `UIUX_Spec.md` (给 CPO/Feature Dev)
- `Frontend_Blueprint.md` (可直接施工)

### 审查模式
- `UI_Audit_Report.md` (问题清单 + 改进建议)

### 验收模式
- 验收报告 或 `Deviation_Report.md`

---

## Quality Checklist

- [ ] 规范文件已读取 (Phase 0)
- [ ] 规范完整性已检查 (Phase 1)
- [ ] 组件选型有规范依据 (Phase 3)
- [ ] 所有参数从规范读取 (全流程)
- [ ] 还原度 >= 90% (Phase R2)
- [ ] **人工审核通过 (Phase 7)**

---

**Version**: 1.1 | **Created**: 2025-12-25 | **Updated**: 添加 Handover Convention + Phase 0/2 INPUT/OUTPUT
