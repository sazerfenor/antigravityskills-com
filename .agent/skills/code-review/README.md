# Code Review

> Expert code reviewer for bugs, security, performance, and best practices

## 🚀 Quick Start

Simply ask for a code review:

```
Review this function for potential issues
Check this PR for security vulnerabilities  
Audit this module's performance
```

## ✨ What It Does

This skill performs comprehensive code reviews covering:

- **Correctness**: Logic errors, edge cases, error handling
- **Security**: SQL injection, XSS, authentication gaps
- **Performance**: Algorithm complexity, query efficiency, caching opportunities
- **Quality**: DRY/SOLID principles, readability, test coverage

## 🔧 How It Works

1. **Gathers Context** - Understands project structure and conventions
2. **Analyzes Structure** - Reviews file organization and separation of concerns
3. **Checks Issues** - Identifies bugs, vulnerabilities, and performance problems
4. **Evaluates Quality** - Assesses readability, principles adherence, test coverage
5. **Provides Feedback** - Delivers prioritized, actionable suggestions

## 🔔 When to Use

- Before merging a Pull Request
- When auditing existing code for issues
- During refactoring to ensure quality
- For security-focused code audits
- When optimizing performance-critical code

## 📝 Examples

### Example 1: General Code Review

**User**: "Review this authentication function"

**Output**:
```markdown
## Summary
The function has a critical security issue and several code quality improvements.

## Critical Issues 🔴
- Line 15: Password comparison vulnerable to timing attacks

## Improvements 🟡
- Add rate limiting for failed attempts
- Use parameterized queries

## Positive Notes ✨
- Good separation of concerns
- Clear error messages
```

### Example 2: Performance Audit

**User**: "Audit this data processing module for performance"

**Output**:
```markdown
## Summary
O(n²) complexity in the main loop causing slowdowns with large datasets.

## Critical Issues 🔴
- Line 42: Nested loop with list membership check - convert to set

## Improvements 🟡
- Add caching for repeated calculations
- Use generator expressions for memory efficiency
```

## 📊 Review Output Structure

All reviews follow a consistent format:

| Section | Purpose |
|:--------|:--------|
| **Summary** | 1-2 sentence overall assessment |
| **Critical Issues 🔴** | Must fix before merge |
| **Improvements 🟡** | Should consider |
| **Suggestions 🟢** | Nice to have |
| **Positive Notes ✨** | What's done well |
