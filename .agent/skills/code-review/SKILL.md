---
name: code-review
description: Use this skill when reviewing code for bugs, security issues, performance problems, or best practices. For PR reviews, code audits, refactoring assessments, and identifying potential issues before production.
metadata:
  version: "1.0.0"
  author: "antigravity-skill-creator"
---

# Code Review

## Overview

A comprehensive code review skill that analyzes code for correctness, maintainability, performance, and security. Helps identify potential issues before they reach production by providing structured, actionable feedback.

## Protocols

### 1. Gather Context

- Identify the files to review using Glob patterns
- Understand the project structure and conventions
- Check for existing linting/formatting rules

### 2. Analyze Code Structure

- Review file organization and module structure
- Check for proper separation of concerns
- Verify naming conventions are consistent

### 3. Check for Common Issues

- Logic errors and edge cases
- Error handling completeness
- Resource management (memory leaks, unclosed handles)
- Thread safety issues in concurrent code
- Input validation gaps

### 4. Evaluate Code Quality

- Readability and clarity
- DRY principle adherence
- SOLID principles compliance
- Appropriate abstraction levels
- Test coverage adequacy

### 5. Performance Review

- Algorithm complexity analysis
- Database query efficiency
- Memory usage patterns
- Caching opportunities

### 6. Security Review

- SQL injection vulnerabilities
- XSS attack vectors
- Authentication/authorization gaps
- Sensitive data exposure

## Best Practices

1. **Be Specific**: Point to exact lines and provide concrete suggestions
2. **Prioritize Issues**: Distinguish between critical bugs and style preferences
3. **Explain Why**: Don't just say what's wrong, explain the reasoning
4. **Suggest Solutions**: Provide alternative implementations when possible
5. **Acknowledge Good Code**: Recognize well-written sections
6. **Consider Context**: Understand the constraints and trade-offs
7. **Be Constructive**: Frame feedback positively and professionally

## Usage Examples

**User**: "Review this Python function for issues"
**Action**: Analyze the function for logic errors, type safety, naming conventions, and provide improvement suggestions with code examples.

**User**: "Check this PR for security vulnerabilities"
**Action**: Focus on security-critical patterns like SQL injection, XSS, authentication bypass, and sensitive data handling.

**User**: "Audit this module's performance"
**Action**: Analyze algorithm complexity, identify O(n²) patterns, suggest optimizations like caching or data structure changes.

## Review Output Format

Structure your review as follows:

```markdown
## Summary
{Overall assessment in 1-2 sentences}

## Critical Issues 🔴
{Must fix before merge}

## Improvements 🟡
{Should consider}

## Suggestions 🟢
{Nice to have}

## Positive Notes ✨
{What's done well}
```
