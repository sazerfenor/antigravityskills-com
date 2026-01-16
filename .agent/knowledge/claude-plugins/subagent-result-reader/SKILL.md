---
name: subagent-result-reader
description: Workaround for TaskOutput bug (GitHub Issue #14055). This skill should be used when Agent calls Task tool and needs to retrieve subagent results, since TaskOutput returns "No task found" error.
---

# Subagent Result Reader

## Problem

**TaskOutput tool is broken** due to SQLite lock contention (GitHub Issue #14055).

When Agent calls the `Task` tool to launch a subagent, the tool returns only `{agentId: "xxx"}` without actual results. Attempting to use `TaskOutput` to retrieve the results returns **"No task found"** error.

### Root Cause
- SQLite lock competition when multiple subagents run in parallel
- Task completion status not correctly persisted to `~/.claude/__store.db`
- Subagent output is written to disk (`.jsonl` files) but database entry is missing

## Solution

This skill provides a workaround by reading subagent output directly from `.jsonl` files instead of using the broken `TaskOutput` tool.

## Usage

### Method 1: Automated Script (Recommended)

After calling `Task` tool and receiving an `agentId`, use the bundled helper script:

```bash
Bash: node ~/.claude/skills/subagent-result-reader/scripts/get-result.ts {agentId}
```

**Example**:
```bash
Bash: node ~/.claude/skills/subagent-result-reader/scripts/get-result.ts acd1c2c
```

**Output**:
```json
{
  "status": "completed",
  "result": "Full analysis result from subagent...",
  "error": null,
  "agentId": "acd1c2c"
}
```

### Method 2: Manual with Native Tools

If you prefer using Agent's native tools:

**Step 1: Find the output file**
```
Glob: ~/.claude/projects/**/subagents/agent-{agentId}.jsonl
```

**Step 2: Read the file**
```
Read: {path from step 1}
```

**Step 3: Extract the result**
- Find the last message with `role: "assistant"`
- Check `stop_reason: "end_turn"` to confirm completion
- Extract `content[0].text` field for the analysis result

## Status Values

The helper script returns one of these statuses:

- **`completed`**: Subagent finished successfully (`stop_reason: "end_turn"`)
- **`running`**: Subagent still executing or stopped without completion
- **`not_found`**: Output file doesn't exist yet (subagent initializing)
- **`error`**: Failed to parse output file (file corrupted or empty)

## Race Condition Handling

If the file doesn't exist immediately after calling `Task`:

1. **Wait 5-10 seconds** - subagent may still be initializing
2. **Retry** the glob search or script execution
3. If still not found after 30 seconds, the subagent may have failed to start

## File Path Structure

Subagent output files follow this pattern:
```
~/.claude/projects/{project-encoded}/{session-id}/subagents/agent-{agentId}.jsonl
```

The middle path contains a random session ID, which is why we use `**` glob patterns or the `find` command to locate files.

## Verification Checklist

Before marking a subagent task as complete:

- [ ] Subagent output file found successfully
- [ ] File parsed without errors
- [ ] Status is `"completed"` (not `"running"` or `"error"`)
- [ ] Result text is present and meaningful
- [ ] Result answers the original task/question

## When NOT to Use This Skill

- **Simple queries**: If you can answer directly, don't launch a subagent
- **Sequential tasks**: If you need to act on subagent results immediately, wait for completion instead of checking status
- **Very quick tasks**: For 1-2 second tasks, the overhead of launching a subagent may not be worth it

## Troubleshooting

### "File not found" error
- **Cause**: Subagent hasn't started yet or failed to launch
- **Solution**: Wait 5-10 seconds and retry

### "Failed to parse" error
- **Cause**: Output file is corrupted or in unexpected format
- **Solution**: Use Method 2 (manual Read) to inspect the raw file

### Empty or null result
- **Cause**: Subagent may have only used tools without returning text
- **Solution**: Check the full jsonl file for tool_use entries

## Related Resources

- **GitHub Issue**: [#14055 - Parallel Task agents intermittently lose output content](https://github.com/anthropics/claude-code/issues/14055)
- **PostToolUse Hook**: Automatically reminds you to use this skill when `Task` is called
- **Implementation**: See `~/.claude/hooks/scripts/get-subagent-result.ts` for the original helper script

## Future Plans

This skill is a **temporary workaround** until the official fix for GitHub Issue #14055 is released. Once `TaskOutput` is fixed, this skill may be deprecated.

Monitor the GitHub issue for updates on the official fix.

---

**Version**: 1.0
**Created**: 2026-01-13
**Status**: Active (workaround)
**Maintainer**: User's Claude Code installation
