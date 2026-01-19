# Curated Skills 占位数据 & 参考映射

> 来源：`src/config/locale/messages/en/landing.json` → `gallery.skills`

## 占位 Skills 列表（共 10 个）

| # | 名称 | 标签 | 描述 | 星级 | 图标 |
|---|------|------|------|------|------|
| 1 | Frontend Expert | Next.js/React | Build modern web apps with React 19, Next.js 15, and TypeScript best practices. | ⭐⭐⭐⭐⭐ | ⚛️ |
| 2 | UIUX Designer | Tailwind/shadcn | Create beautiful interfaces with Tailwind CSS, shadcn/ui, and Radix primitives. | ⭐⭐⭐⭐⭐ | 🎨 |
| 3 | Code Reviewer | Auto audit | Automated code review with best practices, security checks, and performance tips. | ⭐⭐⭐⭐ | 🔍 |
| 4 | Data Analyst | Python/Pandas | Analyze data with Python, Pandas, and create insightful visualizations. | ⭐⭐⭐⭐ | 📊 |
| 5 | API Builder | FastAPI/Django | Design and build RESTful APIs with proper authentication and documentation. | ⭐⭐⭐⭐ | 🔌 |
| 6 | AI/ML Developer | PyTorch/LLM | Develop machine learning models and integrate LLMs into your applications. | ⭐⭐⭐⭐ | 🤖 |
| 7 | Docs Generator | Auto docs | Generate comprehensive documentation from your codebase automatically. | ⭐⭐⭐⭐ | 📝 |
| 8 | Mobile Expert | React Native | Build cross-platform mobile apps with React Native and Expo. | ⭐⭐⭐⭐ | 📱 |
| 9 | Excel Master | Power Query | Automate Excel workflows with Power Query and advanced formulas. | ⭐⭐⭐ | 📈 |
| 10 | SQL Expert | DB Design | Design efficient database schemas and write optimized SQL queries. | ⭐⭐⭐ | 🗄️ |

---

## Work Floor 任务表

| # | 目标 Skill | 参考路径 | Prompt |
|---|------------|----------|--------|
| 1 | Frontend Expert | `.agent/knowledge/claude-plugins/frontend-dev-guidelines/` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 2 | UIUX Designer | `.agent/skills/ui-ux-pro-max/` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 3 | Code Reviewer | `.agent/knowledge/prompt-engineering-repos/claude-code-tresor/skills/development/code-reviewer/` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 4 | Data Analyst | `.agent/knowledge/claude-plugins/data-storytelling/` + `statistical-advisor/` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 5 | API Builder | `.agent/knowledge/claude-plugins/python-development/agents/fastapi-pro.md` + `django-pro.md` + `api-testing-observability/` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 6 | AI/ML Developer | `.agent/knowledge/claude-plugins/llm-application-dev/` + `statistical-advisor/references/ml_methods.md` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 7 | Docs Generator | `.agent/knowledge/claude-plugins/document-skills/` + `changelog-generator/` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 8 | Mobile Expert | `.agent/knowledge/prompt-engineering-repos/claude-code-tresor/subagents/engineering/mobile/mobile-developer/agent.md` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 9 | Excel Master | `.agent/knowledge/skills/skills/xlsx/SKILL.md` | 读取参考 skill，转化为 Antigravity Skill 格式 |
| 10 | SQL Expert | `.agent/knowledge/claude-plugins/loom/skills/sql-optimization/SKILL.md` + `sql-pro/agent.md` | 读取参考 skill，转化为 Antigravity Skill 格式 |

---

## 通用 Prompt 模板

```
读取 {参考路径} 中的所有文件，理解其核心功能和规则。

然后转化为 Antigravity Skill 格式，要求：
1. 使用标准 frontmatter（name, description）
2. description 用第三人称描述，包含关键词和使用场景
3. 正文包含：概述、使用场景、使用方法、原始元数据
4. 保留原始 skill 的核心规则和最佳实践

输出到：{输出路径}
最终命名为：{目标名称}
```

---

## 状态追踪

- [ ] Frontend Expert
- [ ] UIUX Designer
- [ ] Code Reviewer
- [ ] Data Analyst
- [ ] API Builder
- [ ] AI/ML Developer
- [ ] Docs Generator
- [ ] Mobile Expert
- [ ] Excel Master
- [ ] SQL Expert

---

## 参考来源汇总

| 目标 Skill | 主要参考 | 补充参考 |
|------------|----------|----------|
| Frontend Expert | `frontend-dev-guidelines/` | - |
| UIUX Designer | `.agent/skills/ui-ux-pro-max/` | - |
| Code Reviewer | `claude-code-tresor/.../code-reviewer/` | - |
| Data Analyst | `data-storytelling/` | `statistical-advisor/` |
| API Builder | `python-development/agents/fastapi-pro.md` | `django-pro.md`, `api-testing-observability/` |
| AI/ML Developer | `llm-application-dev/` | `statistical-advisor/references/ml_methods.md` |
| Docs Generator | `document-skills/` | `changelog-generator/` |
| Mobile Expert | `claude-code-tresor/.../mobile-developer/agent.md` | - |
| Excel Master | `skills/skills/xlsx/SKILL.md` | - |
| SQL Expert | `loom/skills/sql-optimization/SKILL.md` | `sql-pro/agent.md` |

**所有 10 个 Skills 都已找到参考来源！**
