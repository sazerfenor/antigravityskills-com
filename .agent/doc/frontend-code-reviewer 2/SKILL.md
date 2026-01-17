---
name: frontend-code-reviewer
description: Use this skill when the user provides frontend code for review. It helps users identify and resolve issues related to performance, accessibility, and security compliance.
metadata:
  version: "1.0.0"
  author: "antigravity-skill-builder"
---

# Frontend Code Reviewer

## Overview

This skill provides a professional-grade audit of frontend source code (HTML, CSS, JavaScript, React, Vue, etc.). It focuses on identifying bottlenecks in performance, violations of accessibility standards, and potential security vulnerabilities.

## When to Use This Skill

Use this skill when:
- A user submits frontend source code for review or optimization.
- You need to ensure a component meets WCAG accessibility guidelines.
- You are auditing a codebase for performance issues or security risks like XSS.

## How It Works

### Step 1: Analyze Source Code
Review the provided files for architectural patterns, DOM manipulation, and resource handling.

### Step 2: Evaluate Against Standards
Compare the code against the detailed checklists found in the `references/` directory:
- See `references/performance-standards.md` for Core Web Vitals and optimization.
- See `references/accessibility-checklist.md` for WCAG compliance.
- See `references/security-best-practices.md` for OWASP frontend security.

### Step 3: Generate Report
Provide a structured report highlighting issues, categorized by severity (Critical, Warning, Info), with actionable code fixes.

## Protocols

1. Always provide "Before" and "After" code snippets for suggested fixes.
2. Prioritize accessibility (WCAG 2.1 AA) and performance (Core Web Vitals) in every review.
3. If third-party libraries are used, check for known outdated patterns or bloated imports.

## Examples

**User**: "Can you review this React component for any issues? [Code snippet with <img> missing alt and heavy useEffect]"
**Action**: Analyzes code against accessibility and performance references.
**Output**: "I found 2 issues: 1. Missing alt attribute on image (Accessibility). 2. Unoptimized useEffect causing re-renders (Performance). Here are the fixes..."
