---
name: frontend-code-reviewer
description: Use this skill when the user provides front-end source code or a pull request. It identifies performance bottlenecks, accessibility gaps, and security vulnerabilities to improve web application quality.
metadata:
  version: "1.0.0"
  author: "antigravity-skill-builder"
---

# Frontend Code Reviewer

## Overview

This skill provides a comprehensive audit of front-end source code, focusing on three critical pillars: performance optimization, accessibility (a11y) compliance, and security best practices.

## When to Use This Skill

Use this skill when:
- Reviewing a Pull Request (PR) for a web application.
- Auditing an existing codebase for performance bottlenecks.
- Ensuring a user interface meets WCAG accessibility standards.
- Checking for common front-end security vulnerabilities like XSS or insecure dependencies.

## How It Works

### Step 1: Code Analysis
The skill parses the provided HTML, CSS, and JavaScript/TypeScript code to understand the component structure and logic.

### Step 2: Performance Audit
Identifies heavy assets, inefficient DOM manipulations, unnecessary re-renders (in frameworks like React), and opportunities for code splitting or lazy loading.

### Step 3: Accessibility (a11y) Check
Evaluates the use of semantic HTML, ARIA attributes, color contrast, and keyboard navigability against WCAG 2.1 standards.

### Step 4: Security Review
Scans for Cross-Site Scripting (XSS) risks, insecure use of `dangerouslySetInnerHTML`, sensitive data in local storage, and missing security headers.

### Step 5: Reporting
Generates a structured report categorized by severity with specific code snippets and suggested fixes.

## Protocols

1. Always categorize findings into "Critical", "Warning", and "Optimization".
2. Provide the "Why" behind every suggestion, referencing industry standards (MDN, WCAG, OWASP).
3. Suggest specific code refactors rather than just pointing out the problem.
4. If the code is a specific framework (React, Vue, Angular), use framework-specific best practices.

## Examples

**User**: "Can you review this React component for any issues? [Code Snippet]"
**Action**: Analyzes the component for hooks usage, accessibility labels, and rendering efficiency.
**Output**: A report highlighting a missing `alt` tag on an image (a11y) and an unoptimized `map` function (performance).