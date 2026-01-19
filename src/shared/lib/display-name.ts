/**
 * Display Name Utilities
 * Convert kebab-case skill IDs to human-readable display names
 */

/**
 * Special display name overrides for skills that need custom formatting
 * Format: 'kebab-case-id': 'Display Name'
 */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  'ui-ux-designer': 'UI/UX Designer',
  'ai-assistant': 'AI Assistant',
  'ai-ml-developer': 'AI/ML Developer',
  'tdd-orchestrator': 'TDD Orchestrator',
  'api-builder': 'API Builder',
  'sql-expert': 'SQL Expert',
  'llm-application-dev': 'LLM Application Dev',
  'mcp-builder': 'MCP Builder',
  'seo-content-creation': 'SEO Content Creation',
};

/**
 * Convert kebab-case string to Title Case
 * Examples:
 *   'frontend-expert' → 'Frontend Expert'
 *   'code-review' → 'Code Review'
 *   'data-analyst' → 'Data Analyst'
 */
export function kebabToTitleCase(str: string): string {
  if (!str) return '';

  // Check for override first
  const override = DISPLAY_NAME_OVERRIDES[str.toLowerCase()];
  if (override) return override;

  // Default: convert kebab-case to Title Case
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get display name for a skill
 * Uses title if available, otherwise converts slug to title case
 */
export function getSkillDisplayName(skill: {
  title?: string | null;
  name?: string | null;
  seoSlug?: string | null;
}): string {
  // Priority: title > name > seoSlug conversion
  if (skill.title && !skill.title.includes('-')) {
    return skill.title;
  }

  const identifier = skill.name || skill.title || skill.seoSlug || '';
  return kebabToTitleCase(identifier);
}
