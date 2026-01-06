---
name: uiux-developer
description: UIUX design and frontend development skill for this project. This skill should be used when designing UI/UX, implementing frontend components, reviewing existing pages, or validating implementation against design specs. It provides the Cyber-Banana Design System (CBDS) specifications, component guidelines, and review checklists.
---

# UIUX Developer

## Overview

This skill provides comprehensive guidance for UI/UX design and frontend development following the Cyber-Banana Design System (CBDS). It covers three core workflows: **Design** (意图分析 + 方案设计), **Implement** (组件选型 + 代码施工), and **Review** (规范审查 + 还原度验收).

## When to Use This Skill

| Trigger | Scenario |
|---------|----------|
| **Design Mode** | User requests UI/UX design, new feature layout, or visual specifications |
| **Implement Mode** | User requests frontend component implementation or styling changes |
| **Review Mode** | User requests page audit, CBDS compliance check, or implementation validation |

## Core Design System Reference

The authoritative CBDS specification is located at: `.agent/rules/UIUX_Guidelines.md`

Always read this file before any UIUX work to ensure compliance with:
- Component variants (Button, Card, Badge, Input)
- Forbidden patterns (禁止清单)
- Core philosophy (Deep Dark, Neon Pulse, Glassmorphism, Micro-interaction)

## Workflow: Design Mode

### Step 1: Intent Analysis (意图分析)

Extract these elements from the user request:

| Element | Question |
|---------|----------|
| **Goal** | What does the user want to achieve? |
| **Scope** | Which pages/components are affected? |
| **Constraints** | Are there any limitations? |

### Step 2: PRD UI Review (PRD 审查)

If input is a Feature Spec, check these 5 dimensions:

| Dimension | Checkpoint | Status |
|-----------|-----------|--------|
| Component Selection | Are components specified? | ✅/❌ |
| Interaction States | Are hover/loading/error/empty defined? | ✅/❌ |
| Responsive | Are desktop/mobile differences specified? | ✅/❌ |
| Accessibility | Are a11y requirements defined? | ✅/❌ |
| Animation | Are animation effects specified? | ✅/❌ |

### Step 3: Task Routing

```
IF scope <= 1 component AND no new component needed:
  → small_change → Direct Implementation
ELSE:
  → big_feature → Component Selection → Viewport Design → Final Spec
```

## Workflow: Implement Mode

### Component Selection

1. Read `.agent/rules/UIUX_Guidelines.md` for available components
2. Match user requirements to existing variants
3. Check forbidden patterns before implementation

**Component Quick Reference:**

| Component | Key Variants | Use Case |
|-----------|-------------|----------|
| Button | `default`, `glow-primary`, `glow-shimmer`, `outline`, `ghost` | CTA, form submit, links |
| Card | `default`, `glass`, `interactive`, `feature`, `neon` | Content containers |
| Badge | `default`, `glass`, `outline`, `destructive` | Labels, tags |
| Input | `default`, `neon`, `search` | Form inputs |

### Responsive Implementation

**Desktop First, Mobile Adaptive:**

| Viewport | Breakpoint | Layout Strategy |
|----------|-----------|-----------------|
| Desktop | >= 1024px | Full layout, hover effects |
| Tablet | 768-1023px | Condensed layout |
| Mobile | < 768px | Single column, touch-optimized |

**Mobile Requirements:**
- Touch targets >= 44px
- Critical actions in thumb zone (bottom half)
- Horizontal scroll for gallery (6 cards max)
- Reduced motion for performance

### Self-Review Protocol

Before completing implementation, verify:

| Dimension | Checkpoint |
|-----------|-----------|
| **Affordance** | Clickable elements have `cursor-pointer` |
| **Visual Flow** | Eye path flows top-left to bottom-right |
| **Consistency** | Component usage is consistent |
| **CBDS Compliance** | No forbidden patterns used |
| **Touch Target** | All interactive elements >= 44px on mobile |

## Workflow: Review Mode

### Mode A: Existing Page Audit (现有页面审查)

**Input:** Page URL + UIUX Guidelines

**Review Dimensions:**

| Dimension | Check Method |
|-----------|-------------|
| Spec Compliance | Scan DOM for forbidden patterns |
| Aesthetics | Check color/spacing/contrast/hierarchy |
| Usability | Test CTA feedback, error handling |
| Animation Consistency | Trigger hover, measure transitions |
| Mobile Compatibility | Check touch targets, responsive layout |

**Scoring Formula:**
```
Dimension Score = 10 - (CRITICAL × 3 + HIGH × 2 + MEDIUM × 1)
Overall Score = AVG(All Dimension Scores)
```

### Mode B: Post-Build Validation (施工后验收)

**Input:** UIUX Spec + Implementation URL

**Validation Process:**
1. Extract checkpoints from UIUX Spec
2. Verify each checkpoint against implementation
3. Calculate restoration rate

**Restoration Rate:**
```
Overall Rate = (Matched Items / Total Items) × 100%

PASS: >= 90%
FAIL: < 90% → Generate Deviation Report
```

## Output Templates

### UIUX_Spec.md Template

```markdown
# {Feature} UIUX Design Specification

## Design Goal
{From intent analysis}

## Component Specification
| Scene | Component | Variant | Notes |
|-------|-----------|---------|-------|

## Interaction Specification
| Interaction | Trigger | Effect | Source |
|-------------|---------|--------|--------|

## Responsive Specification
| Breakpoint | Changes |
|------------|---------|
```

### UI_Audit_Report.md Template

```markdown
# UI Audit Report

## Summary
- **Page:** {URL}
- **Timestamp:** {ISO_8601}
- **Overall Score:** {score}/10

## Issues
| # | Dimension | Issue | Severity | Location | Suggestion |
|---|-----------|-------|----------|----------|------------|

## Dimension Scores
| Dimension | Score | Deduction Reason |
|-----------|-------|------------------|
```

## Constraints

| Rule | Description |
|------|-------------|
| **No Hardcoding** | All design parameters must be read from CBDS spec |
| **Source Annotation** | Each parameter must cite spec line number |
| **Self-Review Required** | All outputs must include self-review report |
| **CBDS Compliance** | Zero tolerance for forbidden patterns |

## Integration with Other Skills

| Skill | Relationship |
|-------|-------------|
| `software-architecture` | Complementary - handles business logic layer |
| `webapp-testing` | Callable - for browser verification in Review Mode |
| `theme-factory` | Different scope - for documents/presentations, not web |

## References

For detailed workflow documentation, see:
- `references/workflow-phases.md` - Complete phase definitions
- `references/review-checklist.md` - Comprehensive review checklist

For output templates, see:
- `assets/UIUX_Spec_Template.md`
- `assets/UI_Audit_Report_Template.md`
- `assets/Deviation_Report_Template.md`
