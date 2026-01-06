# UIUX Developer Workflow Phases

> **Source:** Migrated from `.agent/workflows/0-uiux-designer.md`

## Phase Overview

```
Phase -1: Mode Routing (路由判断)
    ↓
Phase 0: Spec Injection (规范注入)
    ↓
Phase 1: Spec Audit (规范审计)
    ↓
Phase 2: Intent Analysis + PRD Review (意图分析)
    ↓
Phase 3: Component Selection (组件选型)
    ↓
Phase 4: Viewport Design (分视口设计)
    ↓
Phase 5: Consolidation (汇总决策)
    ↓
Phase 6: Direct Implementation (直接施工)
    ↓
Phase 7: Human Review (人工审核)
```

---

## Phase -1: Mode Routing

**Purpose:** Determine which workflow mode to use based on user request.

| Keyword/Scenario | Route | Mode |
|-----------------|-------|------|
| "设计/创建/实现/修改" + UI feature | → Phase 0 | `design_implement` |
| "审查/检查" + existing page URL | → Phase R1 | `review_existing` |
| "验收/验证" + Feature Dev complete | → Phase R2 | `review_post_build` |

---

## Phase 0: Spec Injection

**Input:**
- `input_source`: User request (string) or Feature_Spec.md
- `target_url`: Page URL (review mode only)

**Output:**
- `uiux_guidelines`: CBDS specification content

**Execution:**
1. Read `.agent/rules/UIUX_Guidelines.md` (MANDATORY)
2. Read project `CLAUDE.md` (if exists)
3. Pass specification to Phase 1

**Gate:** If UIUX_Guidelines.md does not exist → REJECT

---

## Phase 1: Spec Audit

**Input:** `uiux_guidelines` (CBDS specification)

**Output:**
- `status`: PASS | WARNING
- `Spec_Gap_Report.md` (if gaps found)

### Audit Checklist

| Category | Checkpoint | Status |
|----------|-----------|--------|
| **Animation** | Entry animation (fadeIn/slideUp params) | ✅/❌ |
| | Exit animation (fadeOut params) | ✅/❌ |
| | Hover effects (scale/glow params) | ✅/❌ |
| | Loading states (skeleton/spinner) | ✅/❌ |
| | Page transition params | ✅/❌ |
| **Performance** | Allowed CSS animation properties | ✅/❌ |
| | Framer Motion usage rules | ✅/❌ |
| | Mobile degradation strategy | ✅/❌ |
| **Mobile** | Touch target size (min-h/min-w) | ✅/❌ |
| | Responsive breakpoints (sm/md/lg/xl) | ✅/❌ |
| | Glassmorphism degradation | ✅/❌ |
| **Components** | Button variants defined | ✅/❌ |
| | Card variants defined | ✅/❌ |
| | Input variants defined | ✅/❌ |
| | Forbidden list complete | ✅/❌ |

**Gate:**
- All items ✅ → Continue to Phase 2
- Any item ❌ → Output Spec_Gap_Report.md + suggest backfill

---

## Phase 2: Intent Analysis + PRD Review

**Input:**
- `input_source`: User request or Feature_Spec.md
- `uiux_guidelines`: CBDS specification

**Output:**
- Intent analysis report
- `context.scene`: `small_change` | `big_feature`
- `UI_Gap_Report.md` (if PRD has gaps)

### Step 2.1: Intent Extraction

| Element | Content |
|---------|---------|
| Goal | {What user wants to achieve} |
| Scope | {Pages/components affected} |
| Constraints | {Limitations} |

### Step 2.2: PRD UI Review

| Dimension | Checkpoint | Status |
|-----------|-----------|--------|
| Component Selection | Components specified? | ✅/❌ |
| Interaction States | hover/loading/error/empty defined? | ✅/❌ |
| Responsive | Desktop/mobile differences? | ✅/❌ |
| Accessibility | a11y requirements defined? | ✅/❌ |
| Animation | Animation effects specified? | ✅/❌ |

### Step 2.3: Task Routing

```
IF scope <= 1 component AND no new component:
  scene = small_change → Phase 6
ELSE:
  scene = big_feature → Phase 3
```

---

## Phase 3: Component Selection

**Input:**
- `design_intent`: From Phase 2
- `uiux_guidelines`: Component section

**Output:**
- `Component_Spec.md`
- `New_Component_Spec.md` (if new component needed)

### Execution Logic

1. Match requirements to existing components
2. Check forbidden list
3. If existing components insufficient → Design new component

### Component Matching Template

| Scene | Component | Variant | Reason | Spec Source |
|-------|-----------|---------|--------|-------------|
| Main CTA | Button | glow-shimmer | Strongest visual guidance | L106 |
| Content Card | Card | interactive | Needs hover interaction | L142 |

---

## Phase 4: Viewport Design (Parallel)

Execute Desktop and Mobile design simultaneously.

### Desktop Design (Leo Protocol)

**Primary Viewport:** 1920x1080
**Secondary:** 1440x900, 1280x720

**Self-Review Dimensions:**
| Dimension | Check | Pass Criteria |
|-----------|-------|---------------|
| Affordance | All interactive elements | `cursor: pointer` exists |
| Symbol | Icon semantics | Icons are clear |
| Visual Flow | Eye path | Top-left to bottom-right |
| Path Minimalism | Operation steps | Minimum steps to complete |
| CBDS Compliance | Scan forbidden patterns | Zero violations |

### Mobile Design (Mia Protocol)

**Primary Viewport:** iPhone 14 (390x844)
**Secondary:** Android mid (360x800), iPad Mini (768x1024)

**Self-Review Dimensions:**
| Dimension | Check | Pass Criteria |
|-----------|-------|---------------|
| Touch Target | All interactive elements | >= 44px |
| Thumb Zone | Critical actions | In bottom half |
| Keyboard | Input focus | Layout not obscured |
| Gesture | Swipe/pinch | Visual feedback exists |
| Reduced Motion | Animations | Degradation exists |

---

## Phase 5: Consolidation

**Input:**
- Desktop_Design.md
- Mobile_Design.md
- Component_Spec.md

**Output:**
- UIUX_Spec.md
- Frontend_Blueprint.md

### Conflict Resolution Strategy

1. Mobile-first principle (touch-friendly priority)
2. Spec-first principle (explicit spec wins)
3. Ask user (for complex conflicts)

---

## Phase 6: Direct Implementation

**Routing:**
- Desktop only → Call desktop implementer
- Mobile only → Call mobile implementer
- Responsive → Call both

**Execution:**
1. Write code (follow spec)
2. Self-review (check against spec)
3. Browser verification (via webapp-testing skill if available)

---

## Phase R1: Existing Page Audit

**Input:**
- `target_url`: Page URL
- `uiux_guidelines`: CBDS specification

**Output:** `UI_Audit_Report.md`

### Review Dimensions

| Dimension | Check Method |
|-----------|-------------|
| Spec Compliance | Scan DOM for forbidden patterns |
| Aesthetics | Color/spacing/contrast/hierarchy |
| Usability | CTA feedback, error handling |
| Animation Consistency | Trigger hover, measure transitions |
| Mobile Compatibility | Touch targets, responsive layout |

### Scoring

```
Dimension Score = 10 - (CRITICAL × 3 + HIGH × 2 + MEDIUM × 1)
Dimension Score = MAX(0, score)
Overall Score = AVG(all dimension scores)
```

---

## Phase R2: Post-Build Validation

**Input:**
- `uiux_spec`: UIUX_Spec.md content
- `target_url`: Implementation page URL

**Output:**
- Validation report (if >= 90%)
- `Deviation_Report.md` (if < 90%)

### Restoration Rate Calculation

```
overall_rate = (match_count / total) × 100%

Sub-rates:
  Component Rate = component matches / component total
  Layout Rate = layout matches / layout total
  Interaction Rate = interaction matches / interaction total
```

**Gate:**
- >= 90% → PASS
- < 90% → FAIL (output deviation report)

---

## Phase 7: Human Review (MANDATORY)

**Input:** All output artifacts

**Options:**
- "Apply" → Output final files
- "Modify" → Return to corresponding phase
- "Abort" → End workflow

---

## Quality Checklist

- [ ] Spec file read (Phase 0)
- [ ] Spec completeness verified (Phase 1)
- [ ] Component selection has spec reference (Phase 3)
- [ ] All parameters read from spec (entire workflow)
- [ ] Restoration rate >= 90% (Phase R2)
- [ ] **Human review passed (Phase 7)**
