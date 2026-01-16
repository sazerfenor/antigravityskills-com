---
name: ab-testing
description: Use this skill when the user wants to design, implement, or analyze A/B tests (also known as split tests or controlled experiments). Triggers on requests like "set up an A/B test for...", "compare two versions of...", "run an experiment on...", "analyze test results", or "calculate sample size for...".
metadata:
  version: "1.0.0"
  author: "antigravity-skill-creator"
---

# A/B Testing

Comprehensive guidance for designing, implementing, and analyzing A/B tests to make data-driven decisions.

## Overview

This skill provides patterns and best practices for:
- **Experiment Design**: Hypothesis formation, metric selection, power analysis
- **Sample Size Calculation**: Statistical significance and confidence intervals
- **Implementation Patterns**: Feature flags, traffic splitting, user bucketing
- **Result Analysis**: Statistical tests, confidence intervals, practical significance

## Core Concepts

### 1. Hypothesis Formation

Always start with a clear hypothesis:

```markdown
**Hypothesis Template**:
If we [change X], then [metric Y] will [increase/decrease] by [Z%]
because [reasoning].

**Example**:
If we change the CTA button from gray to green, then click-through rate
will increase by 15% because green creates higher visual contrast.
```

### 2. Key Metrics

| Metric Type | Description | Example |
|-------------|-------------|---------|
| **Primary** | Main success metric | Conversion rate |
| **Secondary** | Supporting metrics | Time on page, bounce rate |
| **Guardrail** | Metrics that shouldn't degrade | Page load time, error rate |

### 3. Sample Size Calculation

Before running a test, calculate required sample size:

```markdown
**Required Inputs**:
- Baseline conversion rate: {current_rate}
- Minimum Detectable Effect (MDE): {expected_improvement}
- Statistical significance level (α): 0.05 (standard)
- Statistical power (1-β): 0.80 (standard)

**Formula Factors**:
- Higher baseline rate → smaller sample needed
- Smaller MDE → larger sample needed
- Higher power → larger sample needed
```

### 4. Test Duration Guidelines

| Factor | Recommendation |
|--------|---------------|
| **Minimum duration** | 1-2 full business cycles (typically 1-2 weeks) |
| **Day-of-week effects** | Run for complete weeks |
| **Seasonality** | Avoid major holidays unless testing holiday behavior |
| **Statistical significance** | Don't stop early just because p < 0.05 |

## Implementation Patterns

### 1. Feature Flag Architecture

```markdown
**Basic Structure**:
1. User enters experiment
2. Hashing function assigns bucket (control vs. treatment)
3. Feature flag returns variant
4. Track exposure event
5. Track conversion event
```

### 2. Traffic Splitting Strategies

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| **Random** | Most A/B tests | Simple, unbiased | May have imbalance |
| **Deterministic** | Consistent experience | Repeatable | Requires user ID |
| **Stratified** | Small sample sizes | Balanced groups | More complex |

### 3. Safe Rollout Pattern

```markdown
**Gradual Rollout**:
1. 1% → Smoke test for bugs
2. 10% → Early signal check
3. 50% → Full experiment
4. 100% → Winner rollout

**Rollback Triggers**:
- Error rate spikes > 2x baseline
- Guardrail metrics violated
- Critical user complaints
```

## Analysis Framework

### 1. Statistical Tests

| Test | Use When |
|------|----------|
| **Z-test** | Large sample, proportion metrics |
| **T-test** | Small sample, continuous metrics |
| **Chi-square** | Categorical outcomes |
| **Mann-Whitney U** | Non-normal distributions |

### 2. Result Interpretation

```markdown
**Decision Matrix**:

| Stat Sig? | Practical Sig? | Action |
|-----------|----------------|--------|
| Yes | Yes | ✅ Ship treatment |
| Yes | No | 🤔 Consider cost/benefit |
| No | N/A | ❌ No winner, iterate |

**Practical Significance**:
- Is the lift worth the engineering cost?
- Does it move the needle on business goals?
```

### 3. Common Pitfalls

- ❌ **Peeking**: Checking results too early inflates false positive rate
- ❌ **Multiple comparisons**: Testing many variants without correction
- ❌ **Selection bias**: Non-random user assignment
- ❌ **Novelty effect**: Short-term lift that fades
- ❌ **Sample ratio mismatch**: Uneven traffic split indicates bugs

## Checklist Templates

### Pre-Launch Checklist

```markdown
- [ ] Hypothesis documented
- [ ] Primary and guardrail metrics defined
- [ ] Sample size calculated
- [ ] Test duration planned (min 1 week)
- [ ] QA on both variants complete
- [ ] Tracking events verified
- [ ] Rollback plan documented
```

### Post-Test Analysis Checklist

```markdown
- [ ] Sample ratio validated
- [ ] Statistical significance calculated
- [ ] Confidence intervals computed
- [ ] Guardrail metrics checked
- [ ] Segment analysis completed
- [ ] Results documented
- [ ] Decision made and communicated
```

## Quick Reference

### Minimum Sample Size Rules of Thumb

| Baseline Rate | 10% MDE | 5% MDE |
|---------------|---------|--------|
| 1% | ~16,000/variant | ~64,000/variant |
| 5% | ~3,100/variant | ~12,000/variant |
| 10% | ~1,500/variant | ~6,000/variant |
| 20% | ~700/variant | ~2,700/variant |

### Significance Thresholds

| Confidence Level | p-value | Z-score |
|------------------|---------|---------|
| 90% | < 0.10 | 1.645 |
| 95% | < 0.05 | 1.96 |
| 99% | < 0.01 | 2.576 |

## Best Practices

1. **One variable at a time**: Test single changes for clear attribution
2. **Document everything**: Future you will thank present you
3. **Pre-register analysis**: Define success criteria before seeing results
4. **Consider long-term effects**: Short wins may have long-term costs
5. **Share learnings**: Build organizational testing knowledge

## Usage Examples

**User**: "I want to test a new checkout flow"
**Action**: Guide through hypothesis formation, metric selection, sample size calculation, and provide implementation checklist

**User**: "My test shows p=0.03, should I ship it?"
**Action**: Review practical significance, check guardrail metrics, verify test duration, recommend decision

**User**: "How many users do I need for my test?"
**Action**: Collect baseline rate and MDE, calculate sample size, estimate test duration
