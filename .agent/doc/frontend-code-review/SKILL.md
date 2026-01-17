---
name: frontend-code-review
description: Use this skill when the user provides frontend code for review. It helps users optimize performance, ensure web accessibility (WCAG), and identify security vulnerabilities.
metadata:
  version: "1.0.0"
  author: "antigravity-skill-builder"
---

# Frontend Code Review

## Overview

This skill provides a comprehensive audit of frontend source code, focusing on performance optimization, accessibility compliance (WCAG), and security hardening. It transforms raw code into an actionable report with specific improvement suggestions.

## When to Use This Skill

Use this skill when:
- A developer submits a Pull Request for a new frontend component or feature.
- You need to audit an existing codebase for technical debt or compliance issues.
- You want to ensure that code follows modern best practices before deployment.

## How It Works

### Step 1: Static Analysis
Analyze the provided code structure, framework usage (e.g., React, Vue, Svelte), and dependency patterns.

### Step 2: Domain-Specific Audit
Evaluate the code against the detailed checklists found in the `references/` directory:
- Performance: Check for re-render loops, bundle bloat, and inefficient asset loading. See `references/performance-checklist.md`.
- Accessibility: Check for semantic HTML, ARIA usage, and keyboard navigability. See `references/accessibility-checklist.md`.
- Security: Check for XSS vectors, insecure data handling, and CSRF risks. See `references/security-checklist.md`.

### Step 3: Report Generation
Synthesize findings into a report categorized by severity (Critical, Warning, Optimization) with "Before vs. After" code examples.

## Protocols

1. **Evidence-Based Review**: Every critique must be backed by a specific standard (e.g., WCAG 2.1 Level AA) or performance metric.
2. **Actionable Feedback**: Do not just identify problems; provide the corrected code snippet.
3. **Reference-First**: Always consult the checklists in the `references/` folder to ensure consistency across reviews.

## Examples

**User**: "Can you review this React component? <div onClick={doSomething}>Click Me</div>"
**Action**: Analyzes the snippet for accessibility and performance.
**Output**: "### Accessibility Issue: Interactive element using non-semantic tag. \n**Fix**: Change `div` to `button` or add `role='button'` and `onKeyDown`. See `references/accessibility-checklist.md` for details."