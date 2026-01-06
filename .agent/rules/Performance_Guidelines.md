---
trigger: model_decision
description: Applied when implementing or reviewing frontend performance. Rules for LCP/CLS optimization, bundle strategy, and image handling
---

# ⚡ Banana-Performance 性能架构与审查规范 v1.1

> **For AI Agents**: "Fast" is our #1 feature. If it's slow, it's broken.

## 0. Import 速查表

```typescript
// 图片
import Image from 'next/image';
import { LazyImage } from '@/shared/blocks/common';

// 骨架屏
import { Skeleton, GallerySkeletonCard } from '@/shared/components/ui/skeleton';

// 字体 (next/font)
import { Geist, Geist_Mono } from 'next/font/google';
```

---

## 1. 核心架构约束

### 1.1 Cloudflare Edge 环境
*   **⚠️ 限制**：OpenNext on Cloudflare **不支持** On-demand Image Optimization。
*   **规则**：上传时必须压缩（WebP/AVIF），严禁依赖运行时优化。

### 1.2 `next.config.mjs` 已配置优化 (DO NOT REMOVE)
```javascript
// 🚨 以下配置已存在，勿删除
images: {
  formats: ['image/avif', 'image/webp'],  // 构建时格式转换
  minimumCacheTTL: 60 * 60 * 24 * 30,     // 30天缓存
},
experimental: {
  optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-icons'],
  modularizeImports: { 'react-icons/...': ... }  // 自动 tree-shake
}
```

### 1.3 移动端 GPU 瓶颈
*   `global.css:323-368` 已配置移动端降级（禁用大面积 blur/shadow）。**勿删除**。

---

## 2. 秒开法则

### 2.1 LCP (Largest Contentful Paint)
*   **❌ 禁止**：LCP 图片使用 `loading="lazy"`
*   **✅ 强制**：LCP 图片加 `priority={true}`
*   **✅ 强制**：LCP 文本禁止 `fade-in` 动画

### 2.2 CLS (Cumulative Layout Shift)
*   **✅ 强制**：图片必须有 `width/height` 或 `aspect-ratio`
*   **✅ 强制**：Skeleton 必须与内容尺寸 1:1 匹配

---

## 3. 字体加载

```tsx
// ✅ 正确：使用 next/font，自动 subset + swap
import { Geist } from 'next/font/google';
const geist = Geist({ subsets: ['latin'], display: 'swap' });

// ❌ 错误：Google Fonts CDN 链接
<link href="https://fonts.googleapis.com/..." />
```

---

## 4. Bundle 策略

### 4.1 动态导入
```tsx
const HeavyChart = dynamic(() => import('./Chart'), { 
  loading: () => <Skeleton className="h-[400px]" />,
  ssr: false 
});
```

### 4.2 包导入
```tsx
// ✅ date-fns 已配置 tree-shake，可直接 import
import { format } from 'date-fns';

// ❌ 禁止
import lodash from 'lodash';     // 用 lodash-es
import moment from 'moment';      // 用 date-fns
```

---

## 5. 禁止清单 ❌

| 禁止项 | 替代方案 |
|-------|---------|
| `<img src="...">` | `<Image>` / `<LazyImage>` |
| `import lodash` | `import { debounce } from 'lodash-es'` |
| `moment.js` | `date-fns` |
| `useEffect` 获取数据 | Server Component |
| Google Fonts CDN | `next/font` |

---

## 6. 审查命令

```bash
grep -r "<img" src/           # 原生 img
grep -r "moment" package.json # moment.js
grep -r "fonts.googleapis" src/ # 外部字体
```

---

**Version**: 1.1 | **Last Updated**: 2025-12-19
