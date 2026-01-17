# Accessibility (A11y) Checklist

## Semantic HTML
- [ ] **Landmarks**: Are `<header>`, `<nav>`, `<main>`, and `<footer>` used correctly?
- [ ] **Headings**: Is there a logical heading hierarchy (`h1` -> `h6`) without skipping levels?
- [ ] **Buttons vs Links**: Is `<button>` used for actions and `<a>` used for navigation?

## Forms & Inputs
- [ ] **Labels**: Does every input have a visible `<label>` or an `aria-label`?
- [ ] **Error Handling**: Are errors announced via `aria-live` or linked via `aria-describedby`?
- [ ] **Focus States**: Is the default focus ring preserved or replaced with a high-contrast alternative?

## Visual & Interaction
- [ ] **Color Contrast**: Does text have a contrast ratio of at least 4.5:1 (AA) or 7:1 (AAA)?
- [ ] **Keyboard Nav**: Can all interactive elements be reached and activated using only the Tab and Enter/Space keys?
- [ ] **Alt Text**: Do all `<img>` tags have descriptive `alt` attributes (or `alt=""` for decorative images)?

## ARIA Patterns
- [ ] **Roles**: Are custom widgets assigned appropriate roles (e.g., `role="dialog"` for modals)?
- [ ] **States**: Are dynamic states reflected via `aria-expanded`, `aria-checked`, or `aria-hidden`?

## Code Example: Semantic Buttons

### ❌ BAD: Inaccessible div-button
```html
<div class="btn" onclick="submit()">Submit</div>
<!-- Issues: Not focusable, no keyboard support, no screen reader role -->
```

### ✅ GOOD: Semantic button
```html
<button type="button" class="btn" onclick="submit()">
  Submit
</button>
<!-- Benefits: Native focus, keyboard support, automatic role announcement -->
```