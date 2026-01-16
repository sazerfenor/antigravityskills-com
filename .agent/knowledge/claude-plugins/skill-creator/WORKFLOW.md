# Skill Creator 工作流程指南

> 本文档是对 skill-creator 的完整工作流程拆解，便于快速参考。

---

## Skill 目录结构

```
skill-name/
├── SKILL.md              # (必需) 主文件，包含元数据 + 指令
├── scripts/              # (可选) 可执行脚本 (Python/Bash)
├── references/           # (可选) 参考文档，按需加载到上下文
└── assets/               # (可选) 输出资源 (模板/图片/字体)
```

### 资源类型说明

| 目录 | 用途 | 示例 |
|------|------|------|
| `scripts/` | 需要重复执行的代码，确保确定性和可靠性 | `rotate_pdf.py`, `fill_form.py` |
| `references/` | 参考文档，Claude 按需读取 | `schema.md`, `api_docs.md` |
| `assets/` | 输出资源，不加载到上下文，直接用于产出物 | `template.pptx`, `logo.png` |

---

## 六步工作流程

### Step 1: 理解 Skill 的具体用例

**目标**：用具体例子搞清楚 skill 要做什么

**关键问题**：
- "这个 skill 应该支持什么功能？"
- "能举几个使用场景的例子吗？"
- "用户说什么话应该触发这个 skill？"

**结束标志**：清楚了解 skill 要支持的功能

---

### Step 2: 规划可复用内容

**目标**：分析每个用例，识别可复用资源

| 分析问题 | 对应资源 |
|---------|---------|
| 需要重复写相同代码？ | → `scripts/` |
| 需要重复查阅文档/schema？ | → `references/` |
| 需要重复使用模板/素材？ | → `assets/` |

**示例**：
- PDF 旋转 → 需要 `scripts/rotate_pdf.py`
- 前端 webapp → 需要 `assets/hello-world/` 模板
- BigQuery 查询 → 需要 `references/schema.md`

---

### Step 3: 初始化 Skill

**目标**：创建 skill 脚手架

```bash
# 运行初始化脚本
scripts/init_skill.py <skill-name> --path <output-directory>

# 示例
scripts/init_skill.py my-new-skill --path ~/.claude/skills
```

**脚本会创建**：
```
my-new-skill/
├── SKILL.md                    # 带 TODO 的模板
├── scripts/example.py          # 示例脚本
├── references/api_reference.md # 示例参考文档
└── assets/example_asset.txt    # 示例资源文件
```

**命名规则**：
- 必须是 hyphen-case（小写 + 连字符）
- 只能用小写字母、数字、连字符
- 最长 40 字符
- 不能以连字符开头/结尾，不能连续连字符

---

### Step 4: 编辑 Skill

**目标**：填充实际内容

#### 4.1 先处理可复用资源

- 创建/添加 `scripts/`、`references/`、`assets/` 中的文件
- 删除不需要的示例文件

#### 4.2 编辑 SKILL.md

```markdown
---
name: my-skill              # (必需) hyphen-case 名称
description: 详细描述...     # (必需) 说明做什么 + 何时触发
---

# My Skill

## Overview
1-2 句话说明功能

## [选择结构]
...
```

**SKILL.md 结构模式**：

| 模式 | 适用场景 | 结构示例 |
|------|---------|---------|
| Workflow-Based | 顺序流程 | Overview → Decision Tree → Step 1 → Step 2 |
| Task-Based | 任务集合 | Overview → Quick Start → Task 1 → Task 2 |
| Reference/Guidelines | 规范标准 | Overview → Guidelines → Specifications |
| Capabilities-Based | 功能集成 | Overview → Core Capabilities → Feature 1 → Feature 2 |

**写作风格**：
- 用祈使句（动词开头），不用第二人称
- 写给"另一个 Claude 实例"看
- 包含 Claude 不知道的专业知识

---

### Step 5: 打包 Skill

**目标**：验证 + 打包为 zip

```bash
# 运行打包脚本
scripts/package_skill.py <path/to/skill-folder> [output-directory]

# 示例
scripts/package_skill.py ~/.claude/skills/my-skill ./dist
```

**脚本会**：
1. **自动验证**（调用 quick_validate.py）：
   - YAML frontmatter 格式
   - name/description 必填字段
   - 命名规范（hyphen-case）
   - description 不能包含尖括号
2. **验证通过后打包** → `my-skill.zip`

---

### Step 6: 迭代改进

**目标**：实际使用后优化

```
使用 skill → 发现问题 → 改进 SKILL.md 或资源 → 重新测试
```

---

## 辅助脚本汇总

| 脚本 | 用途 | 命令 |
|------|------|------|
| `init_skill.py` | 创建新 skill 脚手架 | `init_skill.py <name> --path <dir>` |
| `quick_validate.py` | 快速验证 skill 格式 | `quick_validate.py <skill_dir>` |
| `package_skill.py` | 验证 + 打包为 zip | `package_skill.py <skill_dir> [output]` |

---

## Progressive Disclosure 设计原则

三层加载机制，节省上下文：

| 层级 | 内容 | 大小 | 加载时机 |
|------|------|------|---------|
| L1 | name + description | ~100 词 | 始终在上下文 |
| L2 | SKILL.md 正文 | <5k 词 | skill 触发时加载 |
| L3 | 捆绑资源 | 无限制 | Claude 按需加载 |

**设计启示**：
- SKILL.md 保持精简，只放核心流程
- 详细信息放到 `references/` 中
- 大文件（>10k 词）应在 SKILL.md 中提供 grep 搜索模式

---

## 快速参考

### SKILL.md 必需元素

```yaml
---
name: skill-name          # hyphen-case，与目录名一致
description: 完整描述      # 说明做什么 + 什么时候用，用第三人称
---
```

### 验证检查项

- [ ] SKILL.md 存在
- [ ] YAML frontmatter 格式正确（以 `---` 开头和结尾）
- [ ] `name` 字段存在且符合 hyphen-case
- [ ] `description` 字段存在且不含尖括号
- [ ] 目录名与 `name` 字段一致

---

*生成时间: 2026-01-16*
