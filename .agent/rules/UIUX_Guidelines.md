---
trigger: model_decision
description: Applied when implementing or reviewing UI components. Rules for CBDS design system, component variants, and visual specifications
---

# 🍌 Cyber-Banana Design System (CBDS) v5.0

> **For AI Agents:** This is a **Neo-Terminal** aesthetic — a professional-grade creative console, not a generic AI tool. Deviating from this degrades the premium feel.

## 0. Import 速查表

```typescript
// 布局
import { Section, Container, ResponsiveGrid } from '@/shared/components/ui/layout';

// 组件
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton, GallerySkeletonCard } from '@/shared/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

// 设计令牌
import { VS } from '@/shared/lib/design-tokens';

// 图标 & Loading
import { Loader2, SearchIcon } from 'lucide-react';
```

---

## 1. 核心哲学

| 核心 | 描述 |
|-----|-----|
| **Deep Dark** | 使用 `bg-background` / `bg-card`，不要纯黑 `#000` |
| **Neon Pulse** | `text-primary` = Neon Yellow，视觉锚点 |
| **Glassmorphism** | 层级玻璃 (`glass-subtle` → `glass-strong`) |
| **Motion Discipline** | 动效分层，避免视觉疲劳（见 Section 6） |

> **📱 移动端兼容**：`backdrop-blur-xl` 等效果会被 `global.css` 自动降级，无需额外处理。

---

## 2. 组件规范

### 2.1 Button ⭐
| Variant | 场景 | 特效 |
|---------|-----|------|
| `default` | 标准提交 | 发光 20→25px |
| `glow-primary` | **Generate / 核心 CTA** | 发光 20→30px + bold |
| `glow-shimmer` | **最强 CTA** | 扫光动画 |
| `premium` | **Get Credits / 升级会员** | 渐变背景 + 内发光 + 边框发光 |
| `neon-glass` | 次要霓虹按钮 | 玻璃背景 + 霓虹边框 |
| `outline` | 次要 / 社交登录 | 边框发光 |
| `ghost` | 辅助链接 | 无背景 |
| `destructive` | 危险操作 | 红色 |

```tsx
<Button variant="glow-shimmer" size="xl">Generate</Button>
<Button loading={isLoading}>Submit</Button>  // 自动显示 Spinner
```

### 2.2 Card
| Variant | 场景 |
|---------|-----|
| `default` | 基础布局 |
| `glass` | 侧边栏、浮层 |
| `interactive` | Gallery 卡片 (Hover 上浮) |
| `feature` | Landing 功能区 (内置光斑) |
| `neon` | 选中态 |

### 2.3 Badge
| Variant | 场景 |
|---------|-----|
| `default` | 标签 (霓虹发光) |
| `glass` | 玻璃态标签 |
| `outline` | 描边标签 |
| `destructive` | 警告/错误 |

### 2.4 Input
| Variant | 场景 |
|---------|-----|
| `default` | 表单 |
| `neon` | Hero 主搜索 (大圆角+发光) |
| `search` | 搜索框 (自带 padding) |

```tsx
<Input variant="search" startContent={<SearchIcon />} />
```

### 2.5 Loading 状态
```tsx
// Spinner (lucide-react)
<Loader2 className="animate-spin text-primary" />

// Skeleton (防 CLS)
<Skeleton className="h-4 w-24" />

// Gallery 专用骨架屏
<GallerySkeletonCard />
```

---

## 3. 禁止清单 ❌

| 禁止 | 正确 |
|-----|-----|
| `border-yellow-500` | `border-primary` |
| `hover:scale-105` | `hover:scale-102` |
| `bg-gray-900` | `bg-card` / `bg-sidebar` |
| `<div className="spinner">` | `<Loader2 className="animate-spin text-primary" />` |
| 多个 `animate-pulse` 同时存在 | 使用 Motion Discipline 规则 (Section 6) |
| 所有标题用相同渐变 | 使用 Section 专属渐变 (Section 7) |

---

## 4. 最佳实践

### Hero Section
```tsx
<Section spacing="loose" className="min-h-screen flex items-center">
  <div className="absolute inset-0 bg-primary/10 blur-[120px]" />
  <Container>
    <Badge variant="glass">New</Badge>
    <h1>Banana <span className={VS.gradient.hero}>Prompts</span></h1>
    <Input variant="neon" placeholder="Try..." />
  </Container>
</Section>
```

---

## 5. Cyberpunk Landing 主题规范

> 适用范围: 所有 `src/themes/default/blocks/*.tsx` 营销页面组件。

### 5.1 The Glass System (玻璃物理)

*"In Cyberpunk, nothing floats in void. Data must be contained in high-tech enclosures."*

| Token 名 | Tailwind 类 | 使用规则 |
|----------|-------------|----------|
| `glass-base` | `bg-glass-subtle backdrop-blur-md` | 所有容器的基础背景 |
| `glass-border` | `border border-border-medium` | 容器边框，提供视觉分隔 |
| `glass-hover` | `hover:border-primary/50 transition-colors` | 交互卡片的 Hover 反馈 |
| `glass-container` | `rounded-2xl` 或 `rounded-3xl` | 容器圆角 |

**禁止**: 内容区块直接悬浮在 `bg-background` 上无边界。

### 5.2 The Neon System (霓虹视觉)

*"Light is information. Color indicates priority."*

| Token 名 | Tailwind 类 | 使用规则 |
|----------|-------------|----------|
| `neon-primary` | `text-primary drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]` | 主数据、核心操作 |
| `neon-secondary` | `text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.5)]` | 次要数据 |
| `neon-accent` | `text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]` | 技术指标 |

**禁止**: Stats 区块使用统一颜色。

### 5.3 The Form System (交互形态)

*"High-tech interfaces are precise and ergonomic."*

| 元素 | 必须样式 | 备注 |
|------|----------|------|
| **Button (CTA)** | `rounded-full h-12 px-8` | 强制胶囊型 |
| **Button (Primary)** | `+ shadow-[0_0_30px_-10px_var(--color-primary)]` | 霓虹光晕 |
| **Button (Ghost)** | `+ border-white/5 bg-white/5` | 玻璃态次要按钮 |
| **Badge** | `rounded-full px-4 py-1.5` | 强制胶囊型 |
| **Input (Hero)** | `rounded-full` | 强制胶囊型 |

**禁止**: 在 Landing 使用 `rounded-md` 或 `rounded-lg` 的按钮。

### 5.4 The Poster Layout (海报排版)

*"Hero section must look like a movie poster, not a document."*

| 属性 | 必须值 | 备注 |
|------|--------|------|
| Hero Section 高度 | `min-h-[80vh]` 或 `min-h-[85vh]` | 占满首屏 |
| Hero 内容对齐 | `flex flex-col justify-center items-center` | 绝对居中 |
| Hero 背景 | `bg-[radial-gradient(ellipse_at_top,...)]` | 顶部极光 |

**禁止**: Hero 区块使用 `pt-24 pb-8` 顶部靠左对齐布局。

---

## 6. Motion Discipline 动效纪律 (v5.0 新增) ⭐

> *"One well-orchestrated animation creates more delight than scattered micro-interactions."*

### 6.1 动效层级制度

| 层级 | 名称 | 使用场景 | 每页限制 | 动效类型 |
|------|------|----------|----------|----------|
| **L1** | Signature | Hero CTA、核心功能入口 | **1个** | `animate-glow-pulse`, `glow-shimmer` |
| **L2** | Functional | Loading 状态、进度指示、活跃状态 | 2-3个 | `animate-spin`, `animate-ping` |
| **L3** | Decorative | 背景光效、hover 反馈 | 不限 | `animate-glow-slow`, hover states |

### 6.2 动效令牌

```css
/* L1: Signature - 仅用于最重要的 CTA */
--animate-glow-pulse: glow-pulse 2s ease-in-out infinite;

/* L3: Decorative - 背景用，非常慢 */
--animate-glow-slow: glow-slow 8s ease-in-out infinite;
--animate-glow-medium: glow-medium 4s ease-in-out infinite;

/* 一次性动画 - 入场后停止 */
--animate-pulse-once: pulse-once 0.6s ease-out forwards;
```

### 6.3 禁止规则

| ❌ 禁止 | ✅ 正确 |
|--------|--------|
| 多个 `animate-pulse` 同时在视口内 | 最多 1 个 L1 + 2 个 L2 |
| 背景光效用 `animate-pulse` | 背景用 `animate-glow-slow` (8s+) |
| 箭头图标 `animate-pulse` | 箭头用静态或 hover 触发 |
| 装饰元素快速闪烁 | 装饰元素用 4s+ 的缓慢动画 |

### 6.4 实施示例

```tsx
// ❌ 错误: 多个 pulse 同时存在
<div className="animate-pulse" /> {/* 背景 */}
<span className="animate-pulse" /> {/* 光标 */}
<ArrowRight className="animate-pulse" /> {/* 箭头 */}

// ✅ 正确: 层级分明
<div className="animate-glow-slow" /> {/* L3: 背景，8s */}
<Button className="animate-glow-pulse" /> {/* L1: CTA，唯一 */}
<ArrowRight className="opacity-50 group-hover:opacity-100 transition-opacity" /> {/* 静态 */}
```

---

## 7. Section Gradient Palette 专属渐变 (v5.1 - Color Psychology) ⭐

> *"Every section deserves its own visual identity, designed with user psychology in mind."*

### 7.0 色彩心理学基础

| 色系 | 心理效应 | 适用场景 |
|------|----------|----------|
| **Yellow/Orange/Amber** | 能量、行动、温暖、乐观 | Hero, CTA, Generator |
| **Purple/Violet** | 神秘、科技、创意、高端 | Features, Core Modules |
| **Blue/Cyan** | 信任、知识、冷静、专业 | Stats, FAQ |
| **Pink/Rose** | 温暖、社交、亲和、人性化 | Testimonials, Gallery |

### 7.1 渐变令牌

| Section | 令牌名 | Tailwind 类 | 心理目标 |
|---------|--------|-------------|----------|
| **Hero** | `VS.gradient.hero` | `from-primary via-amber-400 to-orange-500` | 🔥 Warm Ignition - 能量、第一印象 |
| **Features** | `VS.gradient.features` | `from-violet-400 via-purple-500 to-fuchsia-500` | 🔮 Deep Tech - 科技、神秘、AI感 |
| **Generator** | `VS.gradient.generator` | `from-primary via-yellow-300 to-lime-400` | ⚡ Neon Core - 创造力、活跃状态 |
| **Gallery** | `VS.gradient.gallery` | `from-pink-400 via-rose-400 to-purple-500` | 🎨 Creative Spectrum - 艺术、多样性 |
| **Core Modules** | `VS.gradient.coreModules` | `from-blue-400 via-indigo-500 to-violet-500` | 🏗️ Tech Blueprint - 架构、可靠性 |
| **Stats** | `VS.gradient.stats` | `from-cyan-400 via-blue-400 to-indigo-500` | 📊 Data Trust - 信任、数据驱动 |
| **Testimonials** | `VS.gradient.testimonials` | `from-rose-400 via-pink-400 to-fuchsia-400` | 💬 Human Warmth - 社交、共情 |
| **FAQ** | `VS.gradient.faq` | `from-sky-400 via-blue-400 to-cyan-400` | 📚 Knowledge Guide - 帮助、清晰 |
| **CTA** | `VS.gradient.cta` | `from-amber-300 via-primary to-orange-400` | 🎯 Solar Burst - 紧迫感、最高注意力 |

### 7.2 Typography 统一规范

**所有 H2 必须使用统一字号**：

```tsx
// ✅ 正确: 所有 H2 统一使用 md: 断点
<h2 className="text-3xl md:text-5xl font-bold tracking-tight">

// ❌ 错误: 使用不同断点或不同大小
<h2 className="text-3xl sm:text-5xl">  // 错误断点
<h2 className="text-3xl md:text-4xl">  // 错误大小
<h2 className="text-3xl">              // 缺少响应式
```

**Typography Scale Reference:**
```
H1 (Hero only): text-5xl sm:text-7xl
H2 (All sections): text-3xl md:text-5xl
H3 (Subheadings): text-xl md:text-2xl
Body: text-base md:text-lg
```

---

## 8. Atmosphere System 背景氛围 (v5.0 新增) ⭐

> *"Vary the atmosphere to create visual rhythm."*

### 8.1 背景类型

| 类型 | 使用场景 | Tailwind 类 |
|------|----------|-------------|
| `aurora-top` | Hero | `bg-[radial-gradient(ellipse_at_top,...)]` |
| `glow-center` | Features, FAQ | 居中模糊圆 + `animate-glow-slow` |
| `glow-diagonal` | Generator | 对角线光带 |
| `matrix-grid` | Generator (The Matrix Moment) | 网格 + 径向遮罩 |
| `noise-overlay` | Gallery, Testimonials | 噪点纹理 `opacity-[0.02]` |
| `scanline` | Stats | 扫描线效果 |

### 8.2 The Matrix Moment (Generator Section 专属)

Generator Section 是页面的**视觉高潮**，需要特殊处理：

```tsx
<Section className="relative">
  {/* 背景渐暗 */}
  <div className="absolute inset-0 bg-gradient-to-b from-background via-[hsl(0,0%,2%)] to-background" />

  {/* 汇聚网格 */}
  <div className="absolute inset-0 bg-matrix-grid opacity-30" />

  {/* 内容 */}
  <Container className="relative z-10">...</Container>
</Section>
```

### 8.3 禁止规则

| ❌ 禁止 | ✅ 正确 |
|--------|--------|
| 每个 Section 都用相同的居中模糊圆 | 交替使用不同背景类型 |
| 背景效果过于明显 (opacity > 0.1) | 保持微妙 (opacity 0.02-0.1) |

---

## 9. 响应式设计补充 (v5.0 新增)

### 9.1 流程指示器

桌面端和移动端使用不同的流程指示方式：

```tsx
{/* 桌面端: 箭头 */}
<div className="hidden lg:flex items-center justify-center">
  <ArrowRight className="w-8 h-8 text-primary/50" />
</div>

{/* 移动端: 数字步骤 */}
<div className="lg:hidden flex items-center justify-center gap-2 py-4">
  <span className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">
    1
  </span>
  <div className="w-12 h-px bg-gradient-to-r from-primary/50 to-transparent" />
</div>
```

### 9.2 卡片高度

使用 `min-h-` 而非固定 `h-` 以适应不同内容长度：

```tsx
// ❌ 错误
className="h-[280px]"

// ✅ 正确
className="min-h-[280px]"
```

---

## 10. Header & Footer Cyberpunk 规范 (v5.1 新增) ⭐

> *"Navigation is the first and last impression. It must match the premium Cyberpunk aesthetic."*

### 10.1 Header (导航栏)

**滚动状态样式**：
```tsx
// 滚动时激活 Glass + Cyberpunk 边框
'in-data-scrolled:border-primary/20'      // 霓虹边框
'in-data-scrolled:bg-glass-subtle'        // 玻璃背景
'in-data-scrolled:backdrop-blur-md'       // 模糊效果
```

**菜单展开状态**：
```tsx
'has-data-[state=open]:ring-primary/10'   // 外圈发光
'has-data-[state=open]:border-primary/20' // 霓虹边框
'has-data-[state=open]:shadow-primary/5'  // 柔和阴影
```

**Mobile Drawer**：
```tsx
<DrawerContent className={cn(
  "bg-glass-subtle backdrop-blur-xl",
  "border-t border-primary/20",
  "shadow-[0_-10px_40px_-15px_rgba(250,204,21,0.15)]"  // 顶部霓虹光晕
)} />
```

### 10.2 Footer (页脚)

**容器样式**：
```tsx
<Section className={cn(
  "bg-glass-subtle backdrop-blur-xl",     // 玻璃背景
  "border-t border-primary/20"            // 霓虹边框
)} />
```

**必需的 Atmosphere 效果**：
```tsx
{/* 顶部发光 */}
<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-primary/5 blur-[100px]" />

{/* 扫描线纹理 */}
<div className={cn("absolute inset-0 pointer-events-none opacity-30", VS.atmosphere.scanline)} />
```

**导航列标题**：
```tsx
// 使用霓虹高亮的列标题
<span className="text-xs font-bold text-primary uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">
  {title}
</span>
```

**链接 Hover 效果**：
```tsx
// 链接悬停时的微动效
className="hover:text-primary hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] hover:translate-x-1 transition-all duration-300"
```

**分隔线**：
```tsx
// 霓虹渐变分隔线
<div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
```

### 10.3 禁止规则

| ❌ 禁止 | ✅ 正确 |
|--------|--------|
| `border-foreground/5` | `border-primary/20` |
| `bg-background/75` | `bg-glass-subtle` |
| `shadow-black/10` | `shadow-primary/5` |
| 无背景效果的 Footer | 添加 glow + scanline |

---

## 11. Dialog & Form Cyberpunk 规范 (v5.2 新增) ⭐

> *"Every interaction point must feel premium. Forms are not just functional—they're experiences."*

### 11.1 Dialog (弹窗)

**已内置样式** (dialog.tsx):
```tsx
// DialogContent 已包含:
- "bg-card/95 backdrop-blur-xl"           // Glass 背景
- "border border-primary/30"              // 霓虹边框
- "shadow-[0_0_50px_-10px_rgba(250,204,21,0.15)]"  // Primary 光晕
- "rounded-xl"                            // 圆角
```

**标题图标必须有发光效果**：
```tsx
// ✅ 正确
<Plus className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />

// ❌ 错误
<Plus className="w-5 h-5 text-primary" />
```

### 11.2 Input (输入框)

**Focus 状态必须包含霓虹发光**：
```tsx
// v5.2 增强的 focus 效果
"focus:border-primary/60"
"focus:ring-1 focus:ring-primary/40"
"focus:shadow-[0_0_12px_-4px_rgba(250,204,21,0.3)]"  // 发光阴影
```

### 11.3 Button 变体选择

| 场景 | 推荐变体 | 效果 |
|------|----------|------|
| **主 CTA (Generate)** | `glow-primary` | 强发光 + scale |
| **高价值操作 (Get Credits)** | `premium` | 渐变背景 + 内发光 + 边框发光 |
| **次要霓虹操作** | `neon-glass` | 玻璃背景 + 霓虹边框 |
| **次要操作 (Cancel)** | `ghost` | 透明 + hover 高亮 |
| **辅助操作 (Regenerate)** | `outline` | 边框 + hover 发光 |
| **卡片内按钮** | `secondary` | Glass 背景 + subtle 发光 |

### 11.4 选项按钮 (Option Chips)

**选中态必须有发光阴影**：
```tsx
// ✅ 正确 - 选中态
"bg-primary/20 border-primary text-primary shadow-[0_0_12px_-3px_rgba(250,204,21,0.5)]"

// ✅ 正确 - 未选中态
"bg-glass-subtle border-border-medium/50 text-muted-foreground hover:border-primary/50"
```

### 11.5 预览卡片区域

**使用 Glass 效果而非普通 muted 背景**：
```tsx
// ✅ 正确
"bg-glass-subtle backdrop-blur-sm rounded-xl border border-border-medium/50"

// ❌ 错误
"bg-muted/50 rounded-lg"
```

---

**Version**: 5.2 | **Last Updated**: 2025-12-29
