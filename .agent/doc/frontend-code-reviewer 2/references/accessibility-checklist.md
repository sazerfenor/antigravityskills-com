# Accessibility (A11y) Checklist

Based on WCAG 2.1 AA Standards.

## Semantic HTML
- [ ] Use landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`).
- [ ] Ensure heading levels (`<h1>`-`<h6>`) follow a logical nesting order.
- [ ] Use `<button>` for actions and `<a>` for navigation.

## Interactive Elements
- [ ] **Focus Indicators**: All focusable elements must have a visible focus state.
- [ ] **Contrast Ratio**: Text must have a contrast ratio of at least 4.5:1 against background.
- [ ] **ARIA**: Use `aria-label` or `aria-labelledby` only when native HTML is insufficient.
- [ ] **Forms**: Every input must have a programmatically associated `<label>`.

## Code Examples

### Accessible Buttons
❌ **BAD**:
```html
<div class="btn" onclick="submit()">Click Me</div>
```

✅ **GOOD**:
```html
<button type="button" onclick="submit()">Click Me</button>
```

### Image Descriptions
❌ **BAD**:
```html
<img src="chart.png">
```

✅ **GOOD**:
```html
<img src="chart.png" alt="Quarterly revenue chart showing 15% growth">
```