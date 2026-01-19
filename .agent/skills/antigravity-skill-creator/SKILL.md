---
name: antigravity-skill-creator
description: Use this skill when the user wants to create a new Antigravity Skill from scratch, or refactor an existing skill to meet Antigravity standards. Triggers on requests like "make a skill for...", "create a skill to...", "convert this to Antigravity format", or "improve this skill".
metadata:
  version: "1.0.0"
  author: "antigravity-skill-creator"
---

# Antigravity Skill Creator

## Overview

This meta-skill guides the creation of high-quality Antigravity Skills that conform to the Agent Skills specification. It enforces Trigger-First descriptions and Progressive Disclosure principles.

## Protocols

1. **Route Intent**: Determine if user wants to CREATE from scratch or REFACTOR existing content
2. **Collect Requirements**: Extract Trigger (WHEN), Outcome (WHAT), and Knowledge (HOW)
3. **Generate Form**: Present a configuration form for user confirmation
4. **Build Skill**: Create directory structure and files following Antigravity standards
5. **Validate Quality**: Score against 6 dimensions, iterate if score < 8.0

## Dual Entry Points

### Entry A: Create from Scratch
- User provides: Natural language description of desired capability
- Example: "I need a skill that helps with code review"
- Flow: `requirement-collector` → `form-generator` → `skill-builder` → `skill-validator`

### Entry B: Refactor Existing
- User provides: File path, code block, or raw skill content
- Example: "Convert this Claude skill to Antigravity format"
- Flow: `skill-parser` → `form-generator` → `skill-builder` → `skill-validator`

## Quality Standards

### Trigger-First Description (MANDATORY)
- ❌ Bad: "A skill for code review"
- ✅ Good: "Use this skill when the user asks to review code for bugs, style violations, or best practices"

### Progressive Disclosure
- SKILL.md < 500 行 (硬性限制，超过必须拆分到 references/)
- Code blocks < 50 lines (move to `scripts/`)
- Documentation > 500 words (move to `references/`)

### Name Format
- Strict Kebab Case: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Length: 1-64 characters
- Must match directory name

## Available Scripts

> [!TIP]
> **按需加载原则**：这些脚本支持 `--help` 参数。请先运行 `--help` 获取用法说明，而不是阅读源代码，以节省 Token。

### meta_init.py
Initialize a new skill directory with scaffolding.

```bash
python3 scripts/meta_init.py --help
python3 scripts/meta_init.py my-new-skill --path .agent/skills
```

### meta_validate.py
Validate a skill against Antigravity standards (6-dimension scoring).

```bash
python3 scripts/meta_validate.py --help
python3 scripts/meta_validate.py .agent/skills/my-new-skill
```

## Usage Examples

**User**: "I want to create a skill that helps with Python testing"
**Action**: Route to CREATE flow, ask about trigger conditions, generate SKILL.md with proper structure

**User**: "Here's my Claude skill file, convert it to Antigravity format: [code block]"
**Action**: Route to REFACTOR flow, parse existing content, identify compliance issues, generate improved version

## Related Workflow

See `.agent/workflows/antigravity-skill-creator.md` for the complete workflow definition.
