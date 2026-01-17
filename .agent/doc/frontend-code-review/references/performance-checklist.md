# Performance Checklist

## Component Rendering Optimization
- [ ] **Memoization**: Are expensive calculations wrapped in `useMemo`?
- [ ] **Stable Callbacks**: Are event handlers passed to children wrapped in `useCallback` to prevent unnecessary re-renders?
- [ ] **Pure Components**: Are functional components wrapped in `React.memo` where appropriate?
- [ ] **Context Splitting**: Is the React Context split into smaller providers to prevent global re-renders?

## Bundle & Loading Strategy
- [ ] **Code Splitting**: Are large routes or heavy components loaded via `React.lazy` and `Suspense`?
- [ ] **Tree-Shaking**: Are imports specific? 
  - ❌ `import { _ } from 'lodash';` 
  - ✅ `import debounce from 'lodash/debounce';`
- [ ] **Dependency Audit**: Are there lighter alternatives to heavy libraries (e.g., `date-fns` instead of `moment`)??

## Assets & Media
- [ ] **Image Optimization**: Are images using modern formats (WebP/Avif) and `srcset` for responsiveness?
- [ ] **Layout Shift**: Do images/iframes have explicit `width` and `height` attributes to prevent CLS?
- [ ] **Font Loading**: Is `font-display: swap` used in CSS to prevent invisible text during load?

## Performance Metrics (Thresholds)
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.8s

## Code Example: Optimization

### ❌ BAD: Re-renders on every parent change
```javascript
const List = ({ items }) => {
  const sortedItems = items.sort((a, b) => a.value - b.value);
  return <ul>{sortedItems.map(i => <li key={i.id}>{i.text}</li>)}</ul>;
};
```

### ✅ GOOD: Memoized calculation
```javascript
const List = ({ items }) => {
  const sortedItems = useMemo(() => 
    [...items].sort((a, b) => a.value - b.value), 
    [items]
  );
  return <ul>{sortedItems.map(i => <li key={i.id}>{i.text}</li>)}</ul>;
};
```