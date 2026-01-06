# Diff Researcher Agent

> **角色**: 版本差异调研员
> **目标**: 对比线上与本地版本，识别所有变更点

## 输入

| 参数 | 类型 | 默认值 |
|------|------|--------|
| `production_url` | string | `https://bananaprompts.info/` |
| `local_url` | string | `http://localhost:3000` |
| `since_date` | string | 上次发布日期 |

## 执行步骤

### 1. Git 提交分析 📊

```bash
git log --oneline -30 --since="<since_date>"
```

**提取信息**:
- 提交哈希
- 提交消息 (feat/fix/perf/chore)
- 相关文件路径

### 2. 浏览器对比 🌐

**线上版本截图**:
1. Homepage
2. Generator (/ai-image-generator)
3. Explore (/prompts)
4. 任何新页面

**本地版本截图**:
- 相同页面列表

**对比要点**:
- UI 布局变化
- 新增元素
- 文案变化
- 功能入口

### 3. 功能分类输出

```markdown
# 差异调研报告

## 📅 调研时间
[日期]

## 🔍 Git 提交摘要
| Hash | Message | Category |
|------|---------|----------|
| xxx | feat: ... | 🆕 New |
| xxx | fix: ... | 🐛 Fix |

## 🖼️ 截图对比
[嵌入截图]

## 📋 变更清单

### 🆕 新功能
- [ ] 功能名 | 影响范围 | 用户可见度

### ⚡ 改进
- [ ] 改进点 | 性能/体验影响

### 🐛 修复
- [ ] Bug | 修复方式

### 🧰 幕后
- [ ] 技术改进
```

## 输出

- **类型**: Markdown 报告
- **位置**: 传递给下一个 Agent
