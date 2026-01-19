---
name: frontend-dev-guidelines
description: Use when creating React/TypeScript components, pages, or features. For modern patterns including Suspense, useSuspenseQuery, lazy loading, MUI v7 styling, TanStack Router, and performance optimization.
---

# Frontend Development Guidelines

> **Purpose**: Comprehensive guide for modern React development with Suspense-based data fetching, lazy loading, and performance optimization.

## When to Use

- Creating new components or pages
- Building features with TanStack Query
- Setting up TanStack Router routes
- Styling with MUI v7
- Performance optimization
- Organizing frontend code

---

## Quick Start Checklists

### New Component Checklist

- [ ] Use `React.FC<Props>` pattern with TypeScript
- [ ] Lazy load if heavy: `React.lazy(() => import())`
- [ ] Wrap in `<SuspenseLoader>` for loading states
- [ ] Use `useSuspenseQuery` for data fetching
- [ ] Import aliases: `@/`, `~types`, `~components`, `~features`
- [ ] Styles: Inline if <100 lines, separate if >100 lines
- [ ] Use `useCallback` for handlers passed to children
- [ ] Default export at bottom
- [ ] No early returns with loading spinners
- [ ] Use `useMuiSnackbar` for notifications

### New Feature Checklist

- [ ] Create `features/{feature-name}/` directory
- [ ] Subdirectories: `api/`, `components/`, `hooks/`, `helpers/`, `types/`
- [ ] API service: `api/{feature}Api.ts`
- [ ] Route: `routes/{feature-name}/index.tsx`
- [ ] Lazy load feature components
- [ ] Export public API from `index.ts`

---

## Import Aliases

| Alias | Resolves To | Example |
|-------|-------------|---------|
| `@/` | `src/` | `import { apiClient } from '@/lib/apiClient'` |
| `~types` | `src/types` | `import type { User } from '~types/user'` |
| `~components` | `src/components` | `import { SuspenseLoader } from '~components/SuspenseLoader'` |
| `~features` | `src/features` | `import { authApi } from '~features/auth'` |

---

## Common Imports

```typescript
// React & Lazy Loading
import React, { useState, useCallback, useMemo } from 'react';
const Heavy = React.lazy(() => import('./Heavy'));

// MUI Components
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

// TanStack Query (Suspense)
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';

// TanStack Router
import { createFileRoute } from '@tanstack/react-router';

// Project Components
import { SuspenseLoader } from '~components/SuspenseLoader';
import { useAuth } from '@/hooks/useAuth';
import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';
```

---

## Topic Guides

| Topic | Guide | Key Points |
|-------|-------|------------|
| 🎨 Component Patterns | [references/component-patterns.md](references/component-patterns.md) | `React.FC`, lazy loading, SuspenseLoader |
| 📊 Data Fetching | [references/data-fetching.md](references/data-fetching.md) | `useSuspenseQuery`, cache-first, API layer |
| 📁 File Organization | [references/file-organization.md](references/file-organization.md) | features/ vs components/, subdirs |
| 🎨 Styling | [references/styling-guide.md](references/styling-guide.md) | MUI v7 `sx`, inline vs separate |
| 🛣️ Routing | [references/routing-guide.md](references/routing-guide.md) | TanStack Router, `createFileRoute` |
| ⏳ Loading States | [references/loading-and-error-states.md](references/loading-and-error-states.md) | No early returns, SuspenseLoader |
| ⚡ Performance | [references/performance.md](references/performance.md) | `useMemo`, `useCallback`, debounce |
| 📘 TypeScript | [references/typescript-standards.md](references/typescript-standards.md) | Strict mode, no `any`, type imports |
| 🔧 Common Patterns | [references/common-patterns.md](references/common-patterns.md) | Forms, DataGrid, Dialogs, Auth |
| 📚 Examples | [references/complete-examples.md](references/complete-examples.md) | Full working code samples |

---

## Core Principles

1. **Lazy Load Heavy Components**: Routes, DataGrid, charts, editors
2. **Suspense for Loading**: Use SuspenseLoader, not early returns
3. **useSuspenseQuery**: Primary data fetching for new code
4. **Organized Features**: `api/`, `components/`, `hooks/`, `helpers/`
5. **Styles by Size**: <100 inline, >100 separate file
6. **Import Aliases**: `@/`, `~types`, `~components`, `~features`
7. **No Early Returns**: Prevents Cumulative Layout Shift
8. **useMuiSnackbar**: For all user notifications

---

## Critical Rule: No Early Returns

```typescript
// ❌ NEVER - Causes layout shift
if (isLoading) {
    return <LoadingSpinner />;
}

// ✅ ALWAYS - Consistent layout
<SuspenseLoader>
    <Content />
</SuspenseLoader>
```

---

## MUI v7 Grid Syntax

```typescript
<Grid size={{ xs: 12, md: 6 }}>  // ✅ v7 syntax
<Grid xs={12} md={6}>             // ❌ Old syntax
```

---

## File Structure Reference

```
src/
  features/
    my-feature/
      api/myFeatureApi.ts
      components/MyFeature.tsx
      hooks/useMyFeature.ts
      helpers/myFeatureHelpers.ts
      types/index.ts
      index.ts

  components/
    SuspenseLoader/SuspenseLoader.tsx
    CustomAppBar/CustomAppBar.tsx

  routes/
    my-route/
      index.tsx
      create/index.tsx
```

---

## Modern Component Template

```typescript
import React, { useState, useCallback } from 'react';
import { Box, Paper } from '@mui/material';
import { useSuspenseQuery } from '@tanstack/react-query';
import { featureApi } from '../api/featureApi';
import type { FeatureData } from '~types/feature';

interface MyComponentProps {
    id: number;
    onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ id, onAction }) => {
    const [state, setState] = useState<string>('');

    const { data } = useSuspenseQuery({
        queryKey: ['feature', id],
        queryFn: () => featureApi.getFeature(id),
    });

    const handleAction = useCallback(() => {
        setState('updated');
        onAction?.();
    }, [onAction]);

    return (
        <Box sx={{ p: 2 }}>
            <Paper sx={{ p: 3 }}>
                {/* Content */}
            </Paper>
        </Box>
    );
};

export default MyComponent;
```

For complete examples, see [references/complete-examples.md](references/complete-examples.md)
