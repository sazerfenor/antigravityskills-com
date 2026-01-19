# Skill Publisher (发布执行器)

> **Role**: 发布执行
> **Phase**: 6C

## 职责

输出 SEO 字段 JSON 文件，并调用脚本发布到数据库。

## ⚠️ 工具选择 (CRITICAL)

| 场景 | 工具 | 原因 |
|:-----|:-----|:-----|
| ✅ **正常发布** | `pnpm skill:publish` | 封装了注册+发布+R2 上传 |
| ❌ 不推荐 | `curl /api/skills/publish` | 需手动处理注册，易出错 |
| ❌ **禁止** | `curl /api/skills/convert` | 仅用于转换，不处理发布 |

## INPUT

| 字段 | 来源 | 说明 |
|:-----|:-----|:-----|
| **skillId** | SKILL.md 的 `name` 字段 | 如 `canvas-design`、`brand-guidelines` |
| **displayName** | Phase 6B 输出 | ⭐ NEW: 人类可读展示名称，如 `Canvas Design` |
| **skillIcon** | Phase 6B 输出 | Lucide icon 名称，如 `Palette` |
| **SEO 字段** | Phase 6B 输出 | 完整 JSON 数据 |

> [!TIP]
> **skillId 就是 Skill 的 name**
> 
> 脚本会自动从 `seo-fields.json` 同级目录查找 `SKILL.md`，若数据库中不存在则自动注册。
> 无需手动调用 `/api/skills/convert` API。

---

## OUTPUT

- `seo-fields.json` 文件
- 发布结果 (postId, seoSlug, url)
- (可选) R2 存储的 zipUrl (当 Skill 有 `scripts/`、`assets/` 等附属资源时)

---

## 执行步骤

### Step 1: 生成 JSON 文件

将 SEO 字段输出到文件：

**路径**: `.agent/skills/{skill-name}/seo-fields.json`

**示例** (`canvas-design`):
```json
{
  "skillId": "canvas-design",
  "displayName": "Canvas Design",
  "skillIcon": "Palette",
  "seoTitle": "Canvas Design Skill - Create Stunning Visual Art | Antigravity",
  "seoDescription": "Transform ideas into production-ready visuals with AI-powered design philosophy.",
  "seoKeywords": "canvas design, visual art, AI design",
  "h1Title": "Canvas Design: Create Stunning Visual Art with AI",
  "contentIntro": "A skill for creating original visual designs...",
  "faqItems": [{"question": "...", "answer": "..."}],
  "visualTags": ["design", "art", "visual"]
}
```

> [!IMPORTANT]
> **skillId 必须与 SKILL.md 的 `name` 字段完全一致**

### Step 2: 调用发布脚本

**命令**:
```bash
pnpm skill:publish .agent/skills/{skill-name}/seo-fields.json
```

**或使用 dry-run 预览**:
```bash
pnpm skill:publish --dry-run .agent/skills/{skill-name}/seo-fields.json
```

### Step 3: 解析输出

脚本成功输出:
```
✓ Skill published successfully
  postId: uuid
  seoSlug: skill-name-abc12345
  url: https://antigravityskills.com/skills/skill-name-abc12345
```

---

## 错误处理

| 脚本输出 | 意义 | 处理方式 |
|:---------|:-----|:---------|
| `⚠️ Skill 未在数据库中找到` | 脚本自动注册 | 继续等待后续成功输出 |
| `✅ Skill 已注册到数据库` | 自动注册成功 | 继续发布流程 |
| `⚠️ R2 上传失败` | 资源打包失败 | 继续发布但无 zipUrl |
| `❌ SEO 字段验证失败` | 必填字段缺失 | 返回 Phase 6B 修正 |
| `❌ 发布失败` | 数据库写入失败 | 标记错误，请求人工介入 |

---

## GATE 规则

- ❌ **REJECT**: 脚本返回 `❌` 级别错误
- ⚠️ **RETRY**: SEO 验证失败 → 返回 6B 修正字段
- ✅ **PASS**: 脚本输出 `✅ 发布成功!`

