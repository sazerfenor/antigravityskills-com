---
name: statistical-advisor
description: Statistical and ML methodology advisor for data-driven decisions. This skill should be used when designing data analysis algorithms, choosing statistical or ML methods, designing thresholds or classification criteria, analyzing trends, attribution, conversion, or making data-driven business decisions. Provides methodology guidance without code implementation.
---

# Statistical Advisor

## Overview

This skill helps design data analysis algorithms and decision logic using statistical and machine learning methodology. It focuses on methodology and design thinking, not code implementation.

## When to Use This Skill

This skill should be used when:

- **Algorithm Design**: Designing data analysis algorithms or judgment logic
- **Method Selection**: Choosing between statistical tests, regression models, or ML methods
- **Threshold Design**: Setting decision boundaries, classification criteria, or detection thresholds
- **Business Analysis**: Analyzing trends, attribution, conversion funnels, or user behavior
- **Decision Making**: Making data-driven decisions based on quantitative analysis

### Example Triggers

- "How should I detect if a keyword is trending up?"
- "What's the best way to measure if this growth is significant?"
- "How do I design thresholds for classifying user segments?"
- "What attribution model should I use for conversion analysis?"
- "How can I tell if two groups are statistically different?"

## Workflow

```
User Need → Problem Classification → Method Selection → Metric Design → Threshold Setting → Algorithm Output
```

### Step 1: Problem Classification

Identify the type of analysis problem:

| Type | Description | Example |
|------|-------------|---------|
| **Trend** | Time series changes, growth detection, periodicity | Keyword hotness over 90 days |
| **Attribution** | Causality, contribution, influencing factors | Which channel drives conversions |
| **Classification** | User segmentation, clustering, intent recognition | Grouping keywords by intent |
| **Funnel** | Conversion rate, drop-off points, path analysis | Checkout flow optimization |
| **Comparison** | A/B testing, before/after, group differences | Feature impact measurement |

### Step 2: Method Selection

Based on problem type, select appropriate methods from reference files:

| Problem Type | Reference File | Key Methods |
|--------------|----------------|-------------|
| Trend analysis | `references/time_series.md` | Stationarity tests, change point detection, decomposition |
| Statistical comparison | `references/statistical_inference.md` | t-tests, ANOVA, effect sizes |
| Attribution/Regression | `references/regression_attribution.md` | Linear/logistic regression, attribution models |
| Clustering/Segmentation | `references/ml_methods.md` | K-means, hierarchical clustering |
| Threshold setting | `references/threshold_design.md` | Percentiles, multipliers, statistical boundaries |

### Step 3: Metric Design

Define measurement standards:

1. **Choose the right metric** for what you want to measure
2. **Define calculation method** clearly
3. **Consider edge cases** (zero values, missing data)
4. **Establish baseline** for comparison

### Step 4: Threshold Setting

Design decision boundaries using methods from `references/threshold_design.md`:

- **Statistical approach**: Mean ± N standard deviations, percentiles
- **Business approach**: Multipliers (2x, 3x), absolute minimums
- **Data-driven approach**: Inflection points, distribution breaks

### Step 5: Algorithm Output

Deliver a complete algorithm design including:

1. Input data requirements
2. Calculation steps
3. Decision logic (with thresholds)
4. Output categories/values
5. Edge case handling

---

## Core Methodology

### Trend Analysis

**Growth Detection**:
- Compare means before/after inflection point
- Significant growth threshold: typically 2x (100% increase)
- Calculate: `growth_ratio = post_mean / pre_mean`

**Stability Detection**:
- Coefficient of Variation: `CV = std_dev / mean`
- CV < 0.3: Stable | CV 0.3-0.5: Moderate | CV > 0.5: Volatile

**Timing Judgment**:
- Days since growth started + current momentum direction
- Recency matters: closer to today = higher priority

### Attribution Analysis

**Correlation vs Causation**:
- Correlation: Variables move together
- Causation: One variable causes changes in another
- Use regression for controlled analysis

**Attribution Models**:
| Model | Logic | Best For |
|-------|-------|----------|
| First-touch | 100% credit to first interaction | Awareness campaigns |
| Last-touch | 100% credit to last interaction | Conversion optimization |
| Linear | Equal credit to all touchpoints | Balanced view |
| Time-decay | More credit to recent touchpoints | Short purchase cycles |
| Position-based | 40% first, 40% last, 20% middle | Common default |

### Classification Design

**MECE Principle** (Mutually Exclusive, Collectively Exhaustive):
- Each item belongs to exactly one category
- All items are covered by the categories

**Decision Tree Logic**:
1. Start with most important criterion
2. Branch into mutually exclusive paths
3. End with clear action for each path

**Priority Ordering**:
- Higher priority rules evaluated first
- Default/fallback case for unmatched items

### ML vs Statistics Decision

| Use Statistics When | Use ML When |
|---------------------|-------------|
| Testing hypotheses | Discovering patterns |
| Comparing groups | Segmenting data |
| Understanding relationships | Predicting outcomes |
| Small samples | Large datasets |
| Need interpretability | Need accuracy |

---

## Reference Files

For detailed methodology, consult these reference files:

### `references/method_selection.md`
Quick guide for choosing the right analysis method based on problem type.

### `references/time_series.md`
Time series analysis including:
- Stationarity tests (ADF, KPSS)
- Trend decomposition (STL)
- Change point detection
- Forecasting methods

### `references/statistical_inference.md`
Statistical testing including:
- Hypothesis test selection
- Effect size definitions
- Confidence intervals
- Sample size calculation

### `references/regression_attribution.md`
Regression and attribution including:
- Linear regression concepts
- Logistic regression for conversion
- Attribution models
- Causal inference basics

### `references/ml_methods.md`
Machine learning methods including:
- Clustering (K-means, hierarchical)
- Classification basics
- Dimensionality reduction (PCA)
- ML vs Statistics decision guide

### `references/threshold_design.md`
Threshold design including:
- Selection methodology
- Statistical approaches
- Business-driven approaches
- Validation methods

---

## Best Practices

1. **Start with the question**: What decision will this analysis inform?
2. **Choose appropriate methods**: Match method complexity to data quality
3. **Document assumptions**: State what conditions must hold
4. **Design for edge cases**: Handle zeros, nulls, outliers explicitly
5. **Validate thresholds**: Test on holdout data or A/B test
6. **Keep it simple**: Prefer interpretable methods unless accuracy is critical
7. **Consider sample size**: Ensure sufficient data for chosen method
8. **Update over time**: Thresholds and models may need recalibration
