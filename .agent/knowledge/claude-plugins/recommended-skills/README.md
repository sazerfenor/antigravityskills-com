# Antigravity Recommended Skills

> 基于全面市场调研，推荐的10个优先开发的Claude Skills
> 调研日期: 2026-01-16

## 📂 目录结构

```
recommended-skills/
├── skill-creator/          # ⭐ 核心差异点 - Skill创建指南
├── xlsx/                   # Excel/CSV分析
├── pdf/                    # PDF报告生成
├── pptx/                   # PPT/幻灯片生成
├── docx/                   # 文档转换
├── dashboard-ui/           # Dashboard/Admin UI设计
├── content-research-writer/# 内容写作
├── brand-guidelines/       # 品牌指南
├── code-review/            # 代码审查
├── changelog-generator/    # 更新日志生成
└── frontend-design/        # 前端设计 (补充)
```

## 🎯 Skills 优先级

### Tier 1: 立即开发 (官方验证)

| # | Skill | 来源 | 说明 |
|---|-------|------|------|
| 1 | **skill-creator** | 官方 anthropics/skills | ⭐ Antigravity核心差异点 |
| 2 | **xlsx** | 官方 anthropics/skills | Excel/CSV分析，非程序员刚需 |
| 3 | **pdf** | 官方 anthropics/skills | PDF处理，企业刚需 |
| 4 | **pptx** | 官方 anthropics/skills | 演示文稿生成，商业用户高频 |
| 5 | **docx** | 官方 anthropics/skills | Word文档处理，通用刚需 |

### Tier 2: 短期开发 (社区验证)

| # | Skill | 来源 | 说明 |
|---|-------|------|------|
| 6 | **dashboard-ui** | 社区 kpi-dashboard-design | Reddit 717 upvotes验证 |
| 7 | **content-research-writer** | 社区 ComposioHQ | 营销人员需求 |
| 8 | **brand-guidelines** | 官方 anthropics/skills | 设计师需求 |
| 9 | **code-review** | 社区 shareAI-lab | Reddit 887 upvotes验证 |
| 10 | **changelog-generator** | 社区 ComposioHQ | 开发者需求 |

## 📋 验证来源

| 来源 | URL |
|------|-----|
| Anthropic官方Skills | github.com/anthropics/skills |
| ComposioHQ awesome-claude-skills | github.com/ComposioHQ/awesome-claude-skills |
| Reddit r/ClaudeAI | 50+热门帖子分析 |
| GitHub热门仓库 | 30+个stars>50的仓库 |

## 🔗 原始仓库链接

- **官方Skills**: https://github.com/anthropics/skills
- **awesome-claude-skills**: https://github.com/ComposioHQ/awesome-claude-skills
- **code-review**: https://github.com/shareAI-lab/learn-claude-code
- **kpi-dashboard-design**: 本地 claude-plugins/kpi-dashboard-design

## 📝 使用说明

每个Skill文件夹包含:
- `SKILL.md` - 核心Skill定义文件 (必需)
- `LICENSE.txt` - 许可证 (如适用)
- `scripts/` - 辅助脚本 (如适用)
- `references/` - 参考资料 (如适用)

### Antigravity转换

这些Skills可以通过Antigravity Skills平台转换为开放格式:
1. 上传原始Claude Skill
2. 自动转换为Antigravity格式
3. 兼容Cursor, Amp, Windsurf等工具

---

**完整调研报告**: `~/.gemini/antigravity/brain/.../03_skills_ranking.md.resolved`
