description: |

## Purpose

Template for defining clear, measurable success criteria for features.
Use this when you need to specify how success will be measured.

---

## Success Metrics Definition

### Primary Metric (North Star)

> What single metric best represents success for this feature?

- **Metric Name**: [e.g., "Weekly Active Users using Feature X"]
- **Current Baseline**: [Current value or "TBD - establish after launch"]
- **Target**: [Target value]
- **Timeframe**: [When to measure, e.g., "30 days post-launch"]
- **Rationale**: [Why this metric matters]

### Secondary Metrics

| Metric | Description | Target | Priority |
|--------|-------------|--------|----------|
| [metric_1] | [what_it_measures] | [target] | High |
| [metric_2] | [what_it_measures] | [target] | Medium |
| [metric_3] | [what_it_measures] | [target] | Low |

### Guardrail Metrics

> What existing metrics must NOT be negatively impacted?

| Guardrail | Threshold | Action if Breached |
|-----------|-----------|-------------------|
| [existing_metric_1] | Must not decrease > 5% | Rollback |
| [existing_metric_2] | Must stay above [value] | Investigate |

---

## Measurement Plan

### Data Collection

- [ ] Analytics events defined
- [ ] Tracking implemented
- [ ] Dashboard created

### Review Schedule

- **Day 1**: Smoke test - is data flowing?
- **Week 1**: Early signal check
- **Week 4**: Full success evaluation
- **Week 12**: Long-term impact assessment

---

## Priority Validation (Optional)

### RICE Score

| Factor | Score | Notes |
|--------|-------|-------|
| **R**each | [1-10] | How many users affected? |
| **I**mpact | [1-3] | How much does it move the needle? |
| **C**onfidence | [50-100%] | How sure are we of estimates? |
| **E**ffort | [person-weeks] | How much work? |
| **RICE Score** | [R×I×C/E] | Higher = higher priority |

### Decision

- [ ] **Proceed** - RICE score supports investment
- [ ] **Defer** - Lower priority than current backlog
- [ ] **Needs more info** - Confidence too low

---

## Quick Reference

### Common Metric Types

| Type | Examples | When to Use |
|------|----------|-------------|
| **Adoption** | Sign-ups, First use, Feature activation | New features |
| **Engagement** | DAU/MAU, Session length, Return rate | UX improvements |
| **Conversion** | Funnel completion, Upgrade rate | Revenue features |
| **Efficiency** | Task completion time, Error rate | Productivity tools |
| **Satisfaction** | NPS, CSAT, Feature rating | Experience changes |
