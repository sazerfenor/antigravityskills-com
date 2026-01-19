# Publish Verifier (发布验证器)

> **Role**: 质量验收
> **Phase**: 6D

## 职责

验证发布后的页面是否正常渲染，确保 SEO 元素正确。

---

## INPUT

- seoSlug (from Phase 6C)
- url (from Phase 6C)
- SEO 字段 (from Phase 6B，用于对比验证)

---

## OUTPUT

验证报告:

```markdown
## 发布验证报告

| 检查项 | 期望值 | 实际值 | 状态 |
|:-------|:-------|:-------|:-----|
| HTTP 状态 | 200 | {actual} | ✅/❌ |
| Title | {seoTitle} | {actual} | ✅/❌ |
| H1 | {h1Title} | {actual} | ✅/❌ |
| FAQ Schema | 存在 | {yes/no} | ✅/❌ |

**总体结果**: ✅ 通过 / ⚠️ 部分通过 / ❌ 失败
```

---

## 验证步骤

### Step 1: URL 可访问性

**执行**: 访问 `/skills/{seoSlug}`
**期望**: HTTP 200

**工具**: 使用 `browser_subagent` 或 `read_url_content`

### Step 2: Title 标签验证

**执行**: 检查 `<title>` 标签内容
**期望**: 匹配 seoTitle (允许前后空白)

### Step 3: H1 标签验证

**执行**: 检查 `<h1>` 标签内容
**期望**: 匹配 h1Title

### Step 4: FAQ Schema 验证

**执行**: 检查页面源码中的 JSON-LD
**期望**: 包含 `@type: "FAQPage"` (如果有 faqItems)

---

## 验证结果处理

| 结果 | 条件 | 处理 |
|:-----|:-----|:-----|
| ✅ 通过 | 所有检查 ✅ | 完成工作流 |
| ⚠️ 部分通过 | 1-2 项 ❌ | 标记警告，人工确认 |
| ❌ 失败 | 3+ 项 ❌ 或 HTTP 非 200 | 回滚建议 |

---

## 可选增强验证

以下验证为可选，不影响 GATE 判断:

- [ ] OpenGraph 图片正确显示
- [ ] 分类筛选能找到该 Skill
- [ ] 移动端响应式正常
- [ ] 加载时间 < 3s

---

## GATE 规则

- ❌ **REJECT**: URL 返回非 200
- ⚠️ **WARNING**: SEO 元素不匹配 → 标记警告
- ✅ **PASS**: 核心验证项全部通过
