---
name: lighthouse-performance
description: Core Web Vitals performance optimization for LCP, CLS, and INP. This skill should be used when optimizing Lighthouse performance scores, improving page load speed, fixing Core Web Vitals issues, or setting up performance monitoring in CI/CD pipelines. Based on official Google documentation and tools.
---

# Lighthouse Performance Optimization

Comprehensive guide for optimizing Core Web Vitals (LCP, CLS, INP) based on official Google documentation and verified best practices.

## Purpose

Provide actionable optimization strategies for the three Core Web Vitals metrics that directly impact SEO rankings and user experience:
- **LCP** (Largest Contentful Paint) - Loading performance
- **CLS** (Cumulative Layout Shift) - Visual stability
- **INP** (Interaction to Next Paint) - Interactivity

## When to Use

- Lighthouse Performance score is below 90
- LCP exceeds 2.5 seconds
- CLS exceeds 0.1
- INP exceeds 200ms
- Setting up CI/CD performance monitoring
- Diagnosing Core Web Vitals issues

## Reference Sources

All optimization strategies in this skill are based on:
- [GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals) - Official measurement library
- [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) - CI/CD integration
- [web.dev Core Web Vitals](https://web.dev/articles/vitals) - Official documentation

---

## Metric Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** | ≤ 2.5s | 2.5s - 4.0s | > 4.0s |
| **CLS** | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| **INP** | ≤ 200ms | 200ms - 500ms | > 500ms |

---

## LCP Optimization

LCP measures how quickly the largest visible content element renders. Target: **≤ 2.5 seconds** at the 75th percentile.

### LCP Subparts

| Subpart | Target % | What It Measures |
|---------|----------|------------------|
| TTFB | ~40% | Server response time |
| Resource Load Delay | <10% | Time until resource starts loading |
| Resource Load Duration | ~40% | Download time |
| Element Render Delay | <10% | Time from loaded to painted |

### Critical Optimizations

#### 1. Make LCP Resource Discoverable Early

```html
<!-- Preload LCP image -->
<link rel="preload" fetchpriority="high" as="image"
      href="/hero-image.webp" type="image/webp">

<!-- Set high priority on LCP image -->
<img fetchpriority="high" src="/hero-image.webp" alt="Hero">
```

**Anti-patterns to avoid:**
- Dynamically adding images via JavaScript
- Using `data-src` with lazy-loading libraries for above-fold images
- CSS background images without preload hints

#### 2. Never Lazy-Load LCP Image

```tsx
// WRONG: Lazy loading LCP image
<Image src="/hero.jpg" loading="lazy" />

// CORRECT: Priority loading for LCP
<Image src="/hero.jpg" priority />
```

#### 3. Reduce Render-Blocking Resources

```html
<!-- Blocks rendering -->
<script src="/main.js"></script>

<!-- Deferred loading -->
<script src="/main.js" defer></script>

<!-- Async for non-critical -->
<script src="/analytics.js" async></script>
```

#### 4. Inline Critical CSS

For small stylesheets (< 10KB), inline directly in HTML:

```html
<head>
  <style>
    /* Critical above-fold styles only */
    .hero { ... }
  </style>
  <link rel="preload" href="/styles.css" as="style" onload="this.rel='stylesheet'">
</head>
```

### Next.js Specific LCP Fixes

```tsx
// next.config.js - Enable image optimization
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
}

// Page component - Priority loading for LCP image
import Image from 'next/image'

export default function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority  // Critical for LCP!
      sizes="100vw"
    />
  )
}
```

---

## CLS Optimization

CLS measures visual stability. Target: **≤ 0.1** at the 75th percentile.

### Common Causes

1. Images without dimensions
2. Ads/embeds without reserved space
3. Dynamically injected content
4. Web font loading (FOUT/FOIT)

### Critical Optimizations

#### 1. Always Specify Image Dimensions

```html
<!-- Explicit dimensions prevent layout shift -->
<img src="photo.jpg" width="640" height="360" alt="Photo">
```

```css
/* Responsive images with aspect ratio preservation */
img {
  width: 100%;
  height: auto;
}
```

#### 2. Reserve Space for Dynamic Content

```css
/* Reserve space for ad slots */
.ad-container {
  min-height: 250px;
  aspect-ratio: 300 / 250;
}

/* Reserve space for embeds */
.video-container {
  aspect-ratio: 16 / 9;
}
```

#### 3. Fix Web Font Layout Shifts

```css
/* Option 1: Use font-display: optional */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: optional;  /* Only use if immediately available */
}

/* Option 2: Size-adjust fallback fonts */
@font-face {
  font-family: 'Adjusted Arial';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 90%;
  descent-override: 20%;
}
```

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/main.woff2" as="font"
      type="font/woff2" crossorigin>
```

#### 4. Use CSS Transform for Animations

```css
/* Causes layout shift */
.element {
  animation: slide 0.3s;
}
@keyframes slide {
  from { top: -100px; }
  to { top: 0; }
}

/* No layout shift */
.element {
  animation: slide 0.3s;
}
@keyframes slide {
  from { transform: translateY(-100px); }
  to { transform: translateY(0); }
}
```

### Next.js Specific CLS Fixes

```tsx
// Use next/image for automatic dimension handling
import Image from 'next/image'

// Static import provides automatic dimensions
import heroImage from '../public/hero.jpg'

export default function Page() {
  return (
    <Image
      src={heroImage}
      alt="Hero"
      placeholder="blur"  // Prevents shift with blur-up
    />
  )
}

// next/font for optimized font loading
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
})
```

---

## INP Optimization

INP measures responsiveness to user input. Target: **≤ 200ms** at the 75th percentile.

### INP Subparts

| Subpart | What It Measures |
|---------|------------------|
| Input Delay | Time before event callbacks start |
| Processing Duration | Event callback execution time |
| Presentation Delay | Time to render next frame |

### Critical Optimizations

#### 1. Yield to Main Thread

```javascript
// Long blocking task
button.addEventListener('click', () => {
  heavyComputation();      // Blocks for 500ms
  updateUI();              // User sees nothing
});

// Yield after UI update
button.addEventListener('click', () => {
  updateUI();  // Immediate visual feedback

  // Defer heavy work
  requestAnimationFrame(() => {
    setTimeout(() => {
      heavyComputation();
    }, 0);
  });
});
```

#### 2. Break Up Long Tasks

```javascript
// Single long task
function processItems(items) {
  items.forEach(item => heavyProcess(item));
}

// Chunked processing with yielding
async function processItems(items) {
  const CHUNK_SIZE = 50;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    chunk.forEach(item => heavyProcess(item));

    // Yield to main thread between chunks
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

#### 3. Avoid Layout Thrashing

```javascript
// Forces synchronous layout
elements.forEach(el => {
  const height = el.offsetHeight;  // Read
  el.style.height = height + 10 + 'px';  // Write (triggers layout)
});

// Batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight);  // All reads
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';  // All writes
});
```

#### 4. Use content-visibility for Large DOM

```css
/* Lazy render off-screen content */
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;  /* Estimated height */
}
```

### Next.js Specific INP Fixes

```tsx
// Dynamic imports for heavy components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Client-only if not needed for SEO
})

// Use React transitions for non-urgent updates
import { useTransition } from 'react'

function SearchResults({ query }) {
  const [isPending, startTransition] = useTransition()
  const [results, setResults] = useState([])

  function handleSearch(query) {
    startTransition(() => {
      setResults(search(query))  // Low priority update
    })
  }

  return isPending ? <Spinner /> : <Results data={results} />
}
```

---

## Diagnostic Tools

### 1. web-vitals Library

```bash
npm install web-vitals
```

```javascript
// Report Core Web Vitals
import { onLCP, onCLS, onINP } from 'web-vitals';

onLCP(console.log);
onCLS(console.log);
onINP(console.log);

// With attribution for debugging
import { onLCP, onCLS, onINP } from 'web-vitals/attribution';

onLCP((metric) => {
  console.log('LCP:', metric.value);
  console.log('Element:', metric.attribution.element);
  console.log('Resource URL:', metric.attribution.url);
});
```

### 2. Chrome DevTools

```
Performance Panel:
1. Record page load or interaction
2. Look for long tasks (> 50ms) marked in red
3. Check "Experience" row for layout shifts

Lighthouse Panel:
1. Select "Performance" category
2. Run audit
3. Review opportunities and diagnostics
```

### 3. PageSpeed Insights API

```bash
# Command line check
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=YOUR_URL&strategy=mobile"
```

---

## CI/CD Integration

### Lighthouse CI Setup

```bash
npm install -D @lhci/cli
```

### Configuration File

Create `.lighthouserc.js` in project root:

```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/about'],
      startServerCommand: 'npm run start',
      numberOfRuns: 5,
    },
    assert: {
      assertions: {
        // Core Web Vitals assertions
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],

        // Category score assertions (0-1 scale)
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### GitHub Actions Workflow

Create `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: './.lighthouserc.js'
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Performance Budget File

Create `budgets.json` for resource budgets:

```json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "first-contentful-paint", "budget": 1800 },
      { "metric": "interactive", "budget": 3800 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "stylesheet", "budget": 100 },
      { "resourceType": "image", "budget": 500 },
      { "resourceType": "total", "budget": 1000 }
    ],
    "resourceCounts": [
      { "resourceType": "script", "budget": 10 },
      { "resourceType": "third-party", "budget": 5 }
    ]
  }
]
```

---

## Quick Diagnostic Checklist

### LCP Issues

```bash
# Check for large images
find . -name "*.jpg" -o -name "*.png" | xargs ls -lh | awk '$5 > 500000'

# Check for missing priority on hero images
grep -r "Image" --include="*.tsx" | grep -v "priority"

# Check for render-blocking scripts
grep -r "<script" --include="*.html" | grep -v "defer\|async"
```

### CLS Issues

```bash
# Check for images without dimensions
grep -r "<img" --include="*.tsx" --include="*.html" | grep -v "width\|height"

# Check for layout-triggering animations
grep -r "animation\|transition" --include="*.css" | grep "top\|left\|width\|height"
```

### INP Issues

```bash
# Check for synchronous event handlers
grep -r "addEventListener" --include="*.ts" --include="*.js" -A 5
```

---

## Expected Outcomes

After applying these optimizations:

| Metric | Before | After |
|--------|--------|-------|
| LCP | > 4s | < 2.5s |
| CLS | > 0.25 | < 0.1 |
| INP | > 500ms | < 200ms |
| Lighthouse Performance | < 50 | > 90 |

---

## Resources

- [web.dev - Optimize LCP](https://web.dev/articles/optimize-lcp)
- [web.dev - Optimize CLS](https://web.dev/articles/optimize-cls)
- [web.dev - Optimize INP](https://web.dev/articles/optimize-inp)
- [GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals)
- [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
