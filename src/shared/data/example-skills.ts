/**
 * Example Skills Data
 * 10 个预设示例，用于快速填充 Skill 转换器输入框
 */

export interface ExampleSkill {
  id: number;
  title: string;
  preview: string;
  input: string;
}

export const EXAMPLE_SKILLS: ExampleSkill[] = [
  {
    id: 1,
    title: 'Test-Driven Development',
    preview: 'TDD workflow for robust code',
    input: `---
name: test-driven-development
description: Apply TDD workflow
metadata:
  author: obra
  version: 1.0.0
  tags: [testing, tdd, development]
---

# Test-Driven Development

This skill helps you write tests before implementation.

## Usage

1. Write failing test
2. Implement minimum code to pass
3. Refactor while keeping tests green`,
  },
  {
    id: 2,
    title: 'Code Review Assistant',
    preview: 'Systematic code review checklist',
    input:
      'Help me review pull requests with focus on security, performance, and maintainability. Should check for common issues like SQL injection, XSS, and performance bottlenecks.',
  },
  {
    id: 3,
    title: 'API Documentation Generator',
    preview: 'Generate OpenAPI specs from code',
    input:
      'Create a skill that generates comprehensive API documentation from code comments and type definitions. Should support REST and GraphQL.',
  },
  {
    id: 4,
    title: 'Systematic Debugging',
    preview: 'Structured debugging approach',
    input: `---
name: systematic-debugging
description: Debug with structured approach
---

# Systematic Debugging

Step-by-step debugging methodology for complex issues.`,
  },
  {
    id: 5,
    title: 'Refactoring Assistant',
    preview: 'Safe refactoring patterns',
    input:
      'Help refactor legacy code while maintaining backwards compatibility. Should identify code smells, suggest improvements, and ensure test coverage.',
  },
  {
    id: 6,
    title: 'Performance Optimization',
    preview: 'Identify and fix bottlenecks',
    input:
      'Create a skill for analyzing and optimizing application performance. Should profile code, identify bottlenecks, and suggest specific optimizations.',
  },
  {
    id: 7,
    title: 'Security Audit',
    preview: 'Vulnerability scanning and fixes',
    input:
      'Build a skill that checks code for common security vulnerabilities including OWASP Top 10, and provides remediation guidance.',
  },
  {
    id: 8,
    title: 'Database Schema Designer',
    preview: 'Design normalized schemas',
    input:
      'Help design database schemas following best practices. Should consider normalization, indexes, relationships, and migration strategies.',
  },
  {
    id: 9,
    title: 'UI/UX Reviewer',
    preview: 'Accessibility and usability checks',
    input:
      'Review UI components for accessibility (WCAG 2.1 AA), usability, and design consistency. Should check color contrast, keyboard navigation, and screen reader support.',
  },
  {
    id: 10,
    title: 'Deployment Checklist',
    preview: 'Production deployment guide',
    input:
      'Create a comprehensive checklist for production deployments including infrastructure, monitoring, backups, and rollback procedures.',
  },
];
