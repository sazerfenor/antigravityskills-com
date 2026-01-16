/**
 * Skill Converter Prompt
 * 将 Claude Skills 或自然语言想法转换为 Antigravity Skills 格式
 */

export const SKILL_CONVERSION_PROMPT = `You are an expert at converting Claude Skills to Antigravity Skills format.

# Background

**Claude Skills**: Anthropic's skill format for Claude agents
**Antigravity Skills**: Open standard for agent skills (supports Cursor, Antigravity, Claude Code, Amp, etc.)

Your job: Convert Claude Skills to the more portable Antigravity format, OR create Antigravity Skills from natural language ideas.

---

# Format Specifications

## Claude Skills Format (INPUT)

\`\`\`markdown
---
name: skill-name
description: Short description
metadata:
  author: name
  version: 1.0.0
  tags: [tag1, tag2]
license: MIT
---

# Skill Title

Content here...
\`\`\`

**Directory structure**:
- \`scripts/\` - Executable scripts
- \`references/\` - Reference documentation
- \`assets/\` - Output files (templates, icons, etc.)

---

## Antigravity Skills Format (OUTPUT)

\`\`\`markdown
---
name: skill-name
description: Third-person description that includes keywords and explains when to use this skill. Use when working with [specific scenarios].
---

# Skill Title

[Overview paragraph]

## When to use this skill

- Use when [scenario 1]
- Use when [scenario 2]
- This is helpful for [use case]

## How to use it

[Step-by-step instructions or workflow]

## [Other sections as needed]

## Original Metadata

| Field   | Value      |
|---------|------------|
| Author  | obra       |
| Version | 1.0.0      |
| Tags    | tag1, tag2 |

## License

MIT
\`\`\`

**Directory structure**:
- \`scripts/\` - Helper scripts (unchanged)
- \`resources/\` - Templates and assets (renamed from \`references/\`)
- \`examples/\` - Reference implementations (renamed from \`assets/\`)

---

# Conversion Rules

## 1. Frontmatter Transformation

### Description Rewriting (CRITICAL)
The description must be completely rewritten to meet Antigravity standards:

❌ **Bad** (Claude Skills style):
\`\`\`
description: Apply TDD workflow
\`\`\`

✅ **Good** (Antigravity style):
\`\`\`
description: Guides agents through test-driven development workflow for robust, maintainable code. Use when writing new features or fixing bugs that need test coverage.
\`\`\`

**Requirements**:
- Third-person voice ("Guides agents...", "Assists in...", "Provides...")
- Include specific keywords related to the skill's domain
- Explicitly state when to use ("Use when...", "Helpful for...")
- 1-2 sentences maximum

### Metadata/License Handling
- Remove \`metadata\` and \`license\` from frontmatter
- Move to content body (see format above)

## 2. Content Structure

### Required Sections
Every converted skill MUST have:

1. **## When to use this skill**
   - List 3-5 specific scenarios
   - Be concrete and actionable
   - Example: "Use when reviewing pull requests before merging"

2. **## How to use it**
   - Step-by-step workflow OR
   - Key procedures and patterns
   - Reference any bundled resources (scripts, examples)

### Optional Sections
- "## Overview" - High-level explanation
- "## Examples" - Concrete usage examples
- "## Original Metadata" - Only if metadata exists in input
- "## License" - Only if license exists in input

## 3. Directory Mapping

If the input mentions bundled resources:
- \`scripts/\` → \`scripts/\` (no change)
- \`references/\` → \`resources/\`
- \`assets/\` → \`examples/\`

## 4. Creating from Natural Language

If the input is a natural language idea (not a Claude Skill):
- Infer appropriate \`name\` (kebab-case)
- Write comprehensive description following rules above
- Create complete "When to use" and "How to use" sections
- Add relevant examples and best practices

---

# Task

Convert the following to Antigravity Skills format:

\`\`\`
{INPUT}
\`\`\`

---

# Output Format

Return a JSON object with these exact fields:

\`\`\`json
{
  "name": "kebab-case-skill-name",
  "description": "Third-person description with keywords and use cases (1-2 sentences)...",
  "skillMd": "---\\nname: skill-name\\ndescription: ...\\n---\\n\\n# Title\\n\\n## When to use this skill\\n\\n- Use when...\\n\\n## How to use it\\n\\n..."
}
\`\`\`

**Important**:
- \`skillMd\` should be the complete SKILL.md file content
- Ensure description follows all requirements (third-person, keywords, use cases)
- Include "When to use this skill" and "How to use it" sections
- Move metadata/license to content body if present
- Use \\n for newlines in JSON string

Convert now:`;

/**
 * 构建完整的转换 Prompt
 */
export function buildConversionPrompt(userInput: string): string {
  return SKILL_CONVERSION_PROMPT.replace('{INPUT}', userInput);
}
