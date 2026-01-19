# Schema Validator (Schema 验证器) v1.0

> **Role**: JSON Schema 验证专家
> **Phase**: 6B.5 (在 SEO Field Generator 之后，Skill Publisher 之前)
> **版本**: 1.0 | 2026-01-20

> [!TIP]
> **类型定义参考**: 验证规则基于 `src/shared/types/skill-seo.ts` 中的 `SkillSEOFields` 接口。
> 如有 Schema 变更，请同步更新该文件。

## 职责

验证并修复 `seo-fields.json` 的结构错误，确保符合前端期望的 Schema。

> [!IMPORTANT]
> **职责分离**: SEO Field Generator 负责内容生成，Schema Validator 负责格式正确性。

---

## INPUT

| 来源 | 数据 | 必需 |
|:---|:---|:---:|
| **Phase 6B** | `.agent/skills/{name}/seo-fields.json` | ✅ |

---

## OUTPUT

| 状态 | 输出 |
|:---|:---|
| ✅ **PASS** | 验证通过的 `seo-fields.json` (可能已自动修复) |
| ❌ **REJECT** | 错误报告 + 需要返回 Phase 6B 重新生成 |

---

## 🔍 验证规则

### Rule 1: 必填字段存在性

以下字段**必须存在且非空**:

```
skillId           ✅ 必填
seoTitle          ✅ 必填
seoDescription    ✅ 必填
h1Title           ✅ 必填
heroSection       ✅ 必填
quickStart        ✅ 必填
capabilities      ✅ 必填 (且 length >= 1)
usageExamples     ✅ 必填 (且 length >= 1)
triggerPhrases    ✅ 必填
visualTags        ✅ 必填
```

### Rule 2: 字段名正确性 ⭐ CRITICAL

| 位置 | 正确字段名 | 常见错误 | 自动修复 |
|:---|:---|:---|:---:|
| `heroSection.` | `headline` | `title` | ✅ |
| `heroSection.` | `subheadline` | `subtitle` | ✅ |
| `quickStart.` | `title` | `heading` | ✅ |
| `quickStart.` | `exampleCommand` | `command` | ✅ |

### Rule 3: 类型正确性 ⭐ CRITICAL

| 字段 | 期望类型 | 验证方法 |
|:---|:---|:---|
| `quickStart.steps` | `string[]` | 每个元素必须是 string，**禁止** `{ title, description }` 对象 |
| `capabilities` | `{ icon, title, description }[]` | 每个元素必须有这 3 个字段 |
| `usageExamples` | `{ input, output }[]` | 每个元素必须有这 2 个字段 |
| `faqItems` | `{ question, answer }[]` | 每个元素必须有这 2 个字段 |
| `presets` | `array \| null` | 可以为 null，但若存在必须是数组 |

### Rule 4: skillIcon 验证

**验证**: `skillIcon` 必须是有效的 Lucide icon 名称

**有效 Icon 列表** (常用):
```
Palette, Code, Search, Bug, Shield, Zap, FileText, TestTube, 
BarChart3, Bot, Server, Cloud, Wrench, Layout, BookOpen, 
Lock, Timer, AlertTriangle, Paintbrush, Database, Rocket, Sparkles
```

**修复逻辑**:
- 若 `skillIcon` 为空 → 设为 `Wrench`
- 若 `skillIcon` 包含空格 → 移除空格
- 若 `skillIcon` 全小写 → 首字母大写

---

## 🔧 执行步骤

### Step 1: 读取 JSON 文件

```
读取 `.agent/skills/{name}/seo-fields.json`
解析为 JSON 对象
```

### Step 2: 必填字段检查

```
对于每个必填字段:
  如果不存在或为空:
    记录 ERROR: "字段 {name} 缺失"
    标记 can_fix = false
```

### Step 3: 字段名自动修复

```
如果 heroSection.title 存在 且 heroSection.headline 不存在:
  heroSection.headline = heroSection.title
  删除 heroSection.title
  记录 FIX: "heroSection.title → heroSection.headline"

如果 heroSection.subtitle 存在 且 heroSection.subheadline 不存在:
  heroSection.subheadline = heroSection.subtitle
  删除 heroSection.subtitle
  记录 FIX: "heroSection.subtitle → heroSection.subheadline"

如果 quickStart.heading 存在 且 quickStart.title 不存在:
  quickStart.title = quickStart.heading
  删除 quickStart.heading
  记录 FIX: "quickStart.heading → quickStart.title"

如果 quickStart.command 存在 且 quickStart.exampleCommand 不存在:
  quickStart.exampleCommand = quickStart.command
  删除 quickStart.command
  记录 FIX: "quickStart.command → quickStart.exampleCommand"
```

### Step 4: 类型检查

```
如果 quickStart.steps 不是 string[]:
  如果是 object[] 且每个对象有 description:
    steps = steps.map(s => s.description || s.title)
    记录 FIX: "quickStart.steps 从 object[] 转换为 string[]"
  否则:
    记录 ERROR: "quickStart.steps 类型错误，无法自动修复"
    标记 can_fix = false
```

### Step 5: skillIcon 修复

```
如果 skillIcon 为空:
  skillIcon = "Wrench"
  记录 FIX: "skillIcon 设为默认值 Wrench"

如果 skillIcon 包含空格:
  skillIcon = skillIcon.replace(/ /g, '')
  记录 FIX: "skillIcon 移除空格"

如果 skillIcon 首字母小写:
  skillIcon = skillIcon.charAt(0).toUpperCase() + skillIcon.slice(1)
  记录 FIX: "skillIcon 首字母大写"
```

### Step 6: 输出结果

```
如果有任何 can_fix = false 的错误:
  → ❌ REJECT: 输出错误报告，要求返回 Phase 6B

如果所有错误都已修复:
  → 写入修复后的 JSON
  → ✅ PASS: 输出修复报告

如果没有任何错误:
  → ✅ PASS: 验证通过，无需修改
```

---

## GATE 规则

### 自动修复的错误 (PASS with FIX)
- 字段名错误 (如 `title` → `headline`)
- `skillIcon` 格式问题
- `quickStart.steps` 可转换的类型问题

### 无法修复的错误 (REJECT)
- 必填字段完全缺失
- `quickStart.steps` 无法转换为 `string[]`
- `capabilities` 或 `usageExamples` 为空

---

## 输出格式

### PASS (验证通过)

```markdown
## ✅ Schema 验证通过

**文件**: `.agent/skills/{name}/seo-fields.json`

### 修复记录 (如有)
- [FIX] heroSection.title → heroSection.headline
- [FIX] quickStart.command → quickStart.exampleCommand

### 继续执行
→ Phase 6C: Skill Publisher
```

### REJECT (验证失败)

```markdown
## ❌ Schema 验证失败

**文件**: `.agent/skills/{name}/seo-fields.json`

### 错误列表
- [ERROR] quickStart.steps 是 object[]，期望 string[]
- [ERROR] capabilities 为空数组

### 需要操作
→ 返回 Phase 6B，重新生成 seo-fields.json
```
