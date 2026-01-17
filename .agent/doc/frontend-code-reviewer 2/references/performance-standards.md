# Performance & Core Web Vitals Standards

## Core Metrics Thresholds
- **LCP (Largest Contentful Paint)**: < 2.5s (Good), < 4.0s (Needs Improvement)
- **FID (First Input Delay)**: < 100ms (Good), < 300ms (Needs Improvement)
- **CLS (Cumulative Layout Shift)**: < 0.1 (Good), < 0.25 (Needs Improvement)

## Optimization Checklist
- [ ] **Image Optimization**: Use modern formats (WebP/Avif), provide `width` and `height` to prevent CLS.
- [ ] **Code Splitting**: Use dynamic imports (`React.lazy`, `import()`) for routes and heavy components.
- [ ] **Bundle Size**: Avoid importing entire libraries (e.g., `lodash`). Use tree-shaking.
- [ ] **Resource Prioritization**: Use `<link rel="preload">` for critical assets.
- [ ] **Execution**: Avoid long-running tasks on the main thread (> 50ms).

## Code Examples

### Tree-Shaking
❌ **BAD**:
```javascript
import { _ } from 'lodash';
_.debounce(() => {}, 100);
```

✅ **GOOD**:
```javascript
import debounce from 'lodash/debounce';
debounce(() => {}, 100);
```

### Layout Shift Prevention
❌ **BAD**:
```html
<img src="hero.jpg" />
```

✅ **GOOD**:
```html
<img src="hero.jpg" width="800" height="600" fetchpriority="high" />
```