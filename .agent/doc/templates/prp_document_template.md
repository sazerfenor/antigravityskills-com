# PRP Document Template (v2.0)

> **适配工作流**: `/prp_gen` (PATH A/B)  
> **用途**: AI 实现指南 - 包含完整上下文、验证命令、参考模式

---

## 元信息

- **Feature Name**: [功能名称]
- **Path Selected**: [A (精益迭代) / B (产品发现)]
- **Created**: [YYYY-MM-DD]
- **Confidence Score**: [1-10]

---

## Discovery Summary (仅 PATH B)

> 如果选择 PATH A，跳过本章节。

### Success Metrics (from prp-business-analyst)

```yaml
Primary Metric (North Star):
  metric: [metric_name]
  baseline: [current_value or TBD]
  target: [target_value]
  timeframe: [measurement_period]

Secondary Metrics:
  - [metric_1]: [description]
  - [metric_2]: [description]

Guardrail Metrics:
  - [guardrail]: Must not decrease below [threshold]
```

### User Research (from prp-user-researcher)

**Target Persona**:
- Name: [persona_name]
- Goal: [what they want to achieve]
- Pain Point: [current friction]

**Key User Flow**:
1. User [action_1]
2. System [response_1]
3. User [action_2]
4. System [response_2]
5. Success state: [description]

**Error Scenarios**:
- If [condition_1]: Show [error_message]
- If [condition_2]: [handling]

### Market Context (from prp-market-researcher)

| Competitor | Approach | Strengths | Weaknesses |
|------------|----------|-----------|------------|
| [name_1]   | [how]    | [pros]    | [cons]     |

**Recommendations**:
- Differentiation opportunity: [suggestion]
- Table stakes: [must_have_list]

---

## Goal

[What needs to be built - specific end state]

## Why

- [Business value]
- [User impact]
- [Problems this solves]

## What

[User-visible behavior and technical requirements]

### Success Criteria

- [ ] [Specific measurable outcome 1]
- [ ] [Specific measurable outcome 2]

---

## Context (from codebase-research)

### Codebase Patterns Found

```yaml
Similar Features:
  - file: [path/to/similar_feature.ts]
    pattern: [description of reusable pattern]

Existing Conventions:
  - [naming_convention]
  - [file_structure_pattern]
  - [error_handling_approach]
```

### External Research (from research-agent, if needed)

```yaml
Documentation References:
  - url: [Official API docs URL]
    section: [Specific sections needed]

Known Gotchas:
  - [Library/framework quirk to avoid]
```

---

## Implementation Blueprint

### Data Models

```[LANGUAGE]
# Define core types/interfaces
```

### Task List

```yaml
Task 1:
  action: [CREATE/MODIFY/DELETE]
  file: [path/to/file]
  details: [what to do]
  reference: [path/to/reference_file]

Task 2:
  ...
```

### Integration Points

```yaml
Database: # (MANDATORY if DB changes)
  engine: [SQLite/PostgreSQL/None]
  orm: [Drizzle/Prisma/None]  
  schema_file: [path/to/schema.ts]
  migration: [if needed]
  constraints:
    - [UNIQUE/CHECK/FK descriptions]
  concurrency: [WAL mode / N/A]
   
API/Routes:
  add_to: [routes_file_path]
  
Config:
  add_to: [config_file_path]
```

---

## Validation Loop

### Level 1: Syntax & Style

```bash
# Run FIRST - fix before proceeding
[linter_command] [file_paths]
[type_checker_command] [file_paths]
```

### Level 2: Tests

```bash
# Run tests
[test_command]
```

---

## Final Checklist

- [ ] All tests pass
- [ ] No linting errors
- [ ] Build succeeds
- [ ] Error cases handled
- [ ] Discovery context included (if PATH B)

---

## Anti-Patterns

- ❌ Don't create new patterns when existing ones work
- ❌ Don't skip validation
- ❌ Don't ignore failing tests
- ❌ Don't hardcode values that should be config
