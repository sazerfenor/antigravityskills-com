# WCAG 2.1 AA Checklist for Frontend Review

## Perceivable

### 1.1 Text Alternatives
- [ ] All `<img>` have meaningful `alt` text (or `alt=""` for decorative)
- [ ] Icon-only buttons have `aria-label`
- [ ] Complex images have extended descriptions

### 1.3 Adaptable
- [ ] Use semantic HTML (`<nav>`, `<main>`, `<article>`, `<aside>`)
- [ ] Headings follow logical order (h1 → h2 → h3)
- [ ] Lists use `<ul>`, `<ol>`, `<dl>` appropriately
- [ ] Tables have `<th>` with `scope` attribute

### 1.4 Distinguishable
- [ ] Text contrast ratio ≥ 4.5:1 (3:1 for large text)
- [ ] UI component contrast ratio ≥ 3:1
- [ ] Text can be resized to 200% without loss of content
- [ ] No information conveyed by color alone

## Operable

### 2.1 Keyboard Accessible
- [ ] All interactive elements are keyboard focusable
- [ ] No keyboard traps
- [ ] Custom components support expected keyboard patterns
- [ ] Skip links provided for repetitive navigation

### 2.4 Navigable
- [ ] Page has descriptive `<title>`
- [ ] Focus order is logical
- [ ] Link text is descriptive (not "click here")
- [ ] Focus indicator is visible

### 2.5 Input Modalities
- [ ] Touch targets are at least 44x44 CSS pixels
- [ ] Functionality not dependent on specific input type

## Understandable

### 3.1 Readable
- [ ] Page language is set (`<html lang="en">`)
- [ ] Language changes are marked (`<span lang="fr">`)

### 3.2 Predictable
- [ ] Focus does not trigger unexpected context changes
- [ ] Navigation is consistent across pages

### 3.3 Input Assistance
- [ ] Form errors are clearly identified
- [ ] Error messages suggest corrections
- [ ] Required fields are marked
- [ ] Labels are associated with inputs

## Robust

### 4.1 Compatible
- [ ] Valid HTML (no duplicate IDs)
- [ ] ARIA roles/states/properties are valid
- [ ] Custom components have appropriate ARIA
