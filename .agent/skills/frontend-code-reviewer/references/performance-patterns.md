# React Performance Optimization Patterns

## Preventing Unnecessary Re-renders

### 1. useMemo for Expensive Calculations

```tsx
// ❌ Recalculates on every render
const sortedItems = items.sort((a, b) => a.price - b.price);

// ✅ Only recalculates when items change
const sortedItems = useMemo(
  () => items.sort((a, b) => a.price - b.price),
  [items]
);
```

### 2. useCallback for Event Handlers

```tsx
// ❌ New function reference on every render
<Button onClick={() => handleClick(id)} />

// ✅ Stable function reference
const handleButtonClick = useCallback(() => {
  handleClick(id);
}, [id]);
<Button onClick={handleButtonClick} />
```

### 3. React.memo for Pure Components

```tsx
// ❌ Re-renders when parent renders
const ProductCard = ({ product }) => { ... };

// ✅ Only re-renders when props change
const ProductCard = React.memo(({ product }) => { ... });
```

## Bundle Optimization

### 1. Tree-Shakeable Imports

```tsx
// ❌ Imports entire library
import _ from 'lodash';

// ✅ Import only what you need
import debounce from 'lodash/debounce';
```

### 2. Dynamic Imports for Code Splitting

```tsx
// ❌ Loaded immediately
import HeavyComponent from './HeavyComponent';

// ✅ Loaded on demand
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Image Optimization

### 1. Next.js Image Component

```tsx
// ❌ Unoptimized
<img src="/hero.jpg" />

// ✅ Optimized with Next.js
import Image from 'next/image';
<Image
  src="/hero.jpg"
  width={800}
  height={400}
  alt="Hero image"
  priority // for LCP images
/>
```

### 2. Lazy Loading Below-the-Fold Images

```tsx
<Image
  src="/product.jpg"
  loading="lazy" // default in next/image
  alt="Product"
/>
```

## Event Handler Optimization

### 1. Debouncing Search Input

```tsx
const debouncedSearch = useMemo(
  () => debounce((query) => search(query), 300),
  []
);

<input onChange={(e) => debouncedSearch(e.target.value)} />
```

### 2. Throttling Scroll Handlers

```tsx
useEffect(() => {
  const throttledHandler = throttle(handleScroll, 100);
  window.addEventListener('scroll', throttledHandler);
  return () => window.removeEventListener('scroll', throttledHandler);
}, []);
```

## State Management

### 1. Colocate State

```tsx
// ❌ State too high in tree
const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  return <Header isOpen={isOpen} setIsOpen={setIsOpen} />;
};

// ✅ State where it's used
const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  return <Menu isOpen={isOpen} />;
};
```

### 2. Split Context by Update Frequency

```tsx
// ❌ One big context
const AppContext = createContext({ user, theme, cart });

// ✅ Separate contexts
const UserContext = createContext(user);
const ThemeContext = createContext(theme);
const CartContext = createContext(cart);
```
