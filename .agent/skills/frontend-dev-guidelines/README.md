# Frontend Dev Guidelines

Modern React/TypeScript development guidelines with Suspense-based data fetching, lazy loading, and performance optimization.

## 🚀 Quick Start

This skill provides:
- **Component Checklists** - Step-by-step for new components/features
- **Import Aliases** - `@/`, `~types`, `~components`, `~features`
- **Topic Guides** - 10 detailed reference documents

## ✨ What It Does

Provides comprehensive guidelines for:
- React component patterns (`React.FC`, lazy loading, Suspense)
- Data fetching with TanStack Query (`useSuspenseQuery`)
- Routing with TanStack Router
- Styling with MUI v7
- Performance optimization (`useMemo`, `useCallback`)
- TypeScript best practices (strict mode)

## 🔧 How It Works

1. Agent reads `SKILL.md` for quick reference
2. Loads specific guides from `references/` when needed
3. Applies patterns to your code

## 🔔 When to Use

- Creating new React components or pages
- Building new features
- Fetching data with TanStack Query
- Setting up routing
- Styling with MUI v7
- Optimizing frontend performance

## 📝 Examples

**Create a component:**
```
Create a UserProfile component that fetches user data
```

**Build a feature:**
```
Build a posts feature with CRUD operations
```

**Apply patterns:**
```
Refactor this component to use Suspense and lazy loading
```

## 📚 Reference Guides

| Guide | Topic |
|-------|-------|
| `component-patterns.md` | React.FC, lazy, Suspense |
| `data-fetching.md` | useSuspenseQuery, API layer |
| `file-organization.md` | features/ structure |
| `styling-guide.md` | MUI v7, sx prop |
| `routing-guide.md` | TanStack Router |
| `loading-and-error-states.md` | SuspenseLoader |
| `performance.md` | Memoization, debounce |
| `typescript-standards.md` | Strict mode |
| `common-patterns.md` | Forms, DataGrid |
| `complete-examples.md` | Full code samples |
