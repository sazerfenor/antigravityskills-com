# UIUX Review Checklist

> Comprehensive checklist for UI/UX review and validation.

## Part 1: CBDS Compliance Check

### 1.1 Forbidden Patterns

| Pattern | Correct Alternative | Severity |
|---------|-------------------|----------|
| `border-yellow-500` | `border-primary` | CRITICAL |
| `hover:scale-105` | `hover:scale-102` | HIGH |
| `bg-gray-900` | `bg-card` / `bg-sidebar` | CRITICAL |
| `<div className="spinner">` | `<Loader2 className="animate-spin text-primary" />` | HIGH |
| Hardcoded colors (`#FACC15`) | CSS variables (`text-primary`) | CRITICAL |
| Magic numbers in spacing | Tailwind spacing classes | MEDIUM |

### 1.2 Component Variant Check

**Button:**
- [ ] Using correct variant for context (default/glow-primary/glow-shimmer/outline/ghost)
- [ ] Loading state uses built-in `loading` prop
- [ ] Size appropriate for context (sm/md/lg/xl)

**Card:**
- [ ] Variant matches use case (default/glass/interactive/feature/neon)
- [ ] Hover effects appropriate for `interactive` variant
- [ ] Glass effects on overlays/sidebars only

**Badge:**
- [ ] Variant matches context (default/glass/outline/destructive)
- [ ] Neon glow on default variant

**Input:**
- [ ] Variant matches context (default/neon/search)
- [ ] Hero inputs use `neon` variant
- [ ] Search inputs have proper padding

---

## Part 2: Visual Design Check

### 2.1 Color & Contrast

| Check | Pass Criteria |
|-------|--------------|
| Primary accent | Uses `text-primary` (Neon Yellow) |
| Background | Uses `bg-background` or `bg-card`, not pure black |
| Text contrast | Meets WCAG AA (4.5:1 for normal, 3:1 for large) |
| Hierarchy | Clear visual distinction between levels |

### 2.2 Spacing & Layout

| Check | Pass Criteria |
|-------|--------------|
| Consistent spacing | Uses Tailwind spacing scale |
| Section padding | Uses `<Section spacing="default|tight|loose">` |
| Container width | Uses `<Container>` component |
| Grid alignment | Proper use of grid/flex |

### 2.3 Typography

| Check | Pass Criteria |
|-------|--------------|
| Heading hierarchy | H1 > H2 > H3 clearly distinguished |
| Body text | Readable size (base/lg) |
| Line height | Appropriate for readability |
| Font weight | Semantic use (bold for emphasis) |

---

## Part 3: Interaction Check

### 3.1 Hover States

| Element | Expected Behavior |
|---------|------------------|
| Button (default) | Glow 20→25px |
| Button (glow-primary) | Glow 20→30px + scale(1.02) |
| Button (glow-shimmer) | Shimmer animation |
| Card (interactive) | Lift + border glow |
| Link | Color change + underline |

### 3.2 Loading States

| Scenario | Implementation |
|----------|---------------|
| Button loading | `<Button loading>` with Spinner |
| Content loading | `<Skeleton>` placeholder |
| Gallery loading | `<GallerySkeletonCard>` |
| Page loading | Next.js loading.tsx |

### 3.3 Error States

| Scenario | Implementation |
|----------|---------------|
| Form error | Red border + error message |
| API error | Toast notification |
| Empty state | Illustrated empty state |
| 404/500 | Custom error page |

---

## Part 4: Responsive Check

### 4.1 Breakpoint Behavior

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, stacked elements |
| sm | 640-767px | Minor adjustments |
| md | 768-1023px | Two columns where appropriate |
| lg | 1024-1279px | Full desktop layout |
| xl | >= 1280px | Maximum content width |

### 4.2 Mobile-Specific

| Check | Pass Criteria |
|-------|--------------|
| Touch targets | All interactive elements >= 44x44px |
| Thumb zone | Critical actions in bottom half |
| Horizontal scroll | Gallery shows 6 cards with scroll |
| Text size | Readable without zooming |
| Tap highlight | Removed (`-webkit-tap-highlight-color: transparent`) |

### 4.3 Performance Degradation

| Effect | Desktop | Mobile |
|--------|---------|--------|
| `backdrop-blur-3xl` | Full effect | Solid background fallback |
| `backdrop-blur-xl` | Full effect | `blur(4px)` |
| `blur-[100px]` | Full effect | `filter: none; opacity: 0.5` |
| Complex shadows | Full effect | Simplified |
| Shimmer animation | Full effect | Disabled |

---

## Part 5: Accessibility Check

### 5.1 Semantic HTML

| Check | Pass Criteria |
|-------|--------------|
| Headings | Proper H1-H6 hierarchy |
| Landmarks | `<main>`, `<nav>`, `<footer>` used |
| Lists | `<ul>/<ol>` for list content |
| Buttons vs Links | Correct element for action type |

### 5.2 ARIA & Labels

| Check | Pass Criteria |
|-------|--------------|
| Button labels | Clear, descriptive text or aria-label |
| Icon buttons | Have sr-only text or aria-label |
| Form inputs | Associated labels |
| Images | Meaningful alt text |

### 5.3 Keyboard Navigation

| Check | Pass Criteria |
|-------|--------------|
| Focus visible | Clear focus indicator |
| Tab order | Logical sequence |
| Skip links | Available for main content |
| Modal focus | Trapped within modal |

### 5.4 Motion Preferences

| Check | Pass Criteria |
|-------|--------------|
| `prefers-reduced-motion` | Animations respect user preference |
| Essential animations | Still functional with reduced motion |

---

## Part 6: Animation Check

### 6.1 Entry Animations

| Element | Parameters |
|---------|-----------|
| Fade in | `opacity: 0 → 1`, `duration: 0.3s`, `ease-out` |
| Slide up | `translateY: 10px → 0`, `duration: 0.5s` |
| Stagger | `delay: index * 0.1s` |

### 6.2 Transition Parameters

| Property | Duration | Easing |
|----------|----------|--------|
| Color changes | 150-200ms | ease |
| Transform | 200-300ms | ease-out |
| Opacity | 200-300ms | ease |
| Layout | 300-500ms | ease-in-out |

### 6.3 GPU-Optimized Properties

| Allowed | Avoid |
|---------|-------|
| `transform` | `width/height` |
| `opacity` | `margin/padding` |
| `filter` | `top/left/right/bottom` |

---

## Scoring Template

```markdown
## Review Score

| Dimension | Score | Issues |
|-----------|-------|--------|
| CBDS Compliance | /10 | |
| Visual Design | /10 | |
| Interactions | /10 | |
| Responsive | /10 | |
| Accessibility | /10 | |
| Animation | /10 | |
| **Overall** | **/10** | |

### Calculation
- CRITICAL issue: -3 points
- HIGH issue: -2 points
- MEDIUM issue: -1 point
- Minimum score: 0
```

---

## Quick Reference: Severity Levels

| Level | Definition | Examples |
|-------|-----------|----------|
| **CRITICAL** | Breaks functionality or major brand violation | Forbidden color, missing loading state |
| **HIGH** | Significant UX degradation | Poor touch targets, missing hover state |
| **MEDIUM** | Minor inconsistency | Spacing off by 1 step, minor contrast issue |
| **LOW** | Suggestion for improvement | Could use better animation |
