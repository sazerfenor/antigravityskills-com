---
description: wshobson/agents 插件转化工作流 - 将 Claude Code 插件转为 Antigravity 原生格式
---

# Plugin Conversion Workflow

> **用途**: 将 wshobson/agents 库中的插件转化为 Antigravity 标准格式
> **转化策略**: Option A - 分离存储 (Workflow + 独立 Agent/Skill 文件)

---

## 📋 上下文恢复信息

### 项目位置
- **工作目录**: `/Users/lixuanying/Documents/GitHub/agents/`
- **源插件库**: `wshobson-agents/plugins/`
- **目标 Agent 目录**: `.agent/rules/{workflow_name}/` (每个工作流独立文件夹)
- **目标 Skill 目录**: `.agent/doc/skills/`
- **目标 Workflow 目录**: `.agent/workflows/`


## 执行步骤

### Phase 1: 选择目标插件

1. 查看 [plugin_registry.md](DOC/plugin_registry.md) 选择要转化的插件
2. 确认该插件未被转化过

### Phase 2: 分析源插件结构

3. 列出插件目录内容：
   ```bash
   ls -la wshobson-agents/plugins/{plugin-name}/
   ls -la wshobson-agents/plugins/{plugin-name}/agents/
   ls -la wshobson-agents/plugins/{plugin-name}/skills/
   ls -la wshobson-agents/plugins/{plugin-name}/commands/
   ```

4. 统计文件数量和大小

### Phase 3: 复制 Agent 文件

5. **创建 Workflow 专属文件夹** 并复制 Agent 系统提示词（**完整复制，不得删减**）：
   ```bash
   mkdir -p .agent/rules/{workflow_name}/
   cp wshobson-agents/plugins/{plugin-name}/agents/*.md .agent/rules/{workflow_name}/
   ```

6. 验证复制完整性：
   ```bash
   wc -l .agent/rules/{workflow_name}/*.md
   # 应与源文件行数一致
   ```

### Phase 4: 复制 Skills 文件

7. 复制 Skills 目录（**包含所有子目录和 references**）：
   ```bash
   cp -r wshobson-agents/plugins/{plugin-name}/skills/* .agent/doc/skills/
   ```

8. 验证复制完整性：
   ```bash
   find .agent/doc/skills/{skill-name} -type f | wc -l
   ```

### Phase 5: 创建 Workflow

9. 创建工作流文件 `.agent/workflows/{workflow_name}.md`：

   ```markdown
   ---
   description: {一句话描述}
   ---

   # {Workflow 名称}

   > **来源**: `{plugin-name}` 插件
   > **推荐模型**: {模型建议}

   ---

   ## 包含的专家角色

   执行此工作流时，请读取以下 Agent 系统提示词：

   | Agent | 完整知识文件 | 用途 |
   |-------|-------------|------|
   | **{agent-1}** | [.agent/rules/{workflow_name}/{agent-1}.md](file:///.agent/rules/{workflow_name}/{agent-1}.md) | {用途} |

   > 💡 **使用提示**：在开始相关阶段前，先阅读对应 Agent 文件以获取完整专家知识。

   ---

   ## 执行步骤

   ### Phase 1: {阶段名}
   1. {步骤 1}
   2. {步骤 2}

   ---

   ## 包含的专业技能

   执行此工作流时，请参考以下 Skill 知识文档：

   | Skill | 完整文档 | 用途 |
   |-------|---------|------|
   | `{skill-name}` | [.agent/doc/skills/{skill-name}/SKILL.md](file:///.agent/doc/skills/{skill-name}/SKILL.md) | {用途} |
   ```

### Phase 6: 验证转化

10. 检查 Workflow 中的所有链接是否有效
11. 确认 Agent 文件行数与源文件一致
12. 确认 Skills 文件/目录完整

---

## ⚠️ 关键约束

### 禁止行为
- ❌ 删减 Agent 系统提示词内容
- ❌ 省略 Skills 中的 references 子目录
- ❌ 只保留摘要而丢弃详细能力列表

### 必须保留的内容
- ✅ Agent 的 `## Capabilities` 完整列表
- ✅ Agent 的 `## Behavioral Traits`
- ✅ Agent 的 `## Knowledge Base`
- ✅ Skills 的所有 `references/*.md`
- ✅ Skills 的所有代码示例

---

## 📊 转化质量检查清单

每个插件转化完成后，执行以下检查：

- [ ] Agent 文件行数与源文件一致
- [ ] Skills 文件数量与源目录一致
- [ ] Workflow 包含所有 Agent 链接
- [ ] Workflow 包含所有 Skill 链接
- [ ] 链接可点击且指向正确文件

---

## 🔗 相关文档

- [plugin_registry.md](DOC/plugin_registry.md) - 67 插件完整清单
- [handover_protocol.md](DOC/handover_protocol.md) - 模型切换协议
- `conversion_audit.md` - 转化审计报告 (位于 artifacts 目录)

---

**Version**: 1.0 | **Created**: 2025-12-21