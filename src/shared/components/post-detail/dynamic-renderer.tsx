import { SidebarSection } from './sidebar-section';
import { SidebarFAQ } from './sidebar-faq';
import { Badge } from '@/shared/components/ui/badge';
import { ContentSection, ContentSections } from '@/shared/schemas/api-schemas';

/**
 * V14.0 Dynamic Content Renderer
 *
 * Polymorphic dispatcher for AI-generated content sections.
 * Each section type (rich-text, checklist, faq-accordion, comparison-table)
 * is rendered by a specialized sub-component.
 *
 * @example
 * <DynamicRenderer sections={post.contentSections} />
 * <DynamicRenderer sections={post.contentSections} variant="main-content" />
 */

interface DynamicRendererProps {
  sections?: ContentSections;
  className?: string;
  variant?: 'sidebar' | 'main-content';
}

export function DynamicRenderer({ sections, className, variant = 'sidebar' }: DynamicRendererProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className={className}>
      {sections.map((section) => (
        <SectionDispatcher key={section.id} section={section} variant={variant} />
      ))}
    </div>
  );
}

/**
 * Section Dispatcher - Routes to appropriate sub-component based on type
 */
function SectionDispatcher({ section, variant }: { section: ContentSection; variant: 'sidebar' | 'main-content' }) {
  switch (section.type) {
    case 'rich-text':
      return <RichTextSection section={section} variant={variant} />;
    case 'checklist':
      return <ChecklistSection section={section} variant={variant} />;
    case 'faq-accordion':
      return <FAQAccordionSection section={section} variant={variant} />;
    case 'comparison-table':
      return <ComparisonTableSection section={section} variant={variant} />;
    case 'tags':
      return <TagsSection section={section} variant={variant} />;
    default:
      console.warn(`Unknown section type: ${(section as any).type}`);
      return null;
  }
}

/**
 * Rich Text Section - Simple paragraph content
 */
function RichTextSection({
  section,
  variant,
}: {
  section: ContentSection & { type: 'rich-text' };
  variant: 'sidebar' | 'main-content';
}) {
  if (variant === 'main-content') {
    return (
      <div className="rounded-2xl bg-glass-subtle backdrop-blur-md border border-border-medium p-6 hover:border-primary/20 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {section.title}
        </h2>
        <div className="text-sm text-muted-foreground leading-relaxed prose prose-invert prose-sm max-w-none">
          {section.data.text}
        </div>
      </div>
    );
  }

  return (
    <SidebarSection title={section.title} headingLevel={section.headingLevel}>
      <div className="text-sm text-muted-foreground leading-relaxed prose prose-invert prose-sm max-w-none">
        {section.data.text}
      </div>
    </SidebarSection>
  );
}

/**
 * Checklist Section - Bullet points with checkmark icons
 */
function ChecklistSection({
  section,
  variant,
}: {
  section: ContentSection & { type: 'checklist' };
  variant: 'sidebar' | 'main-content';
}) {
  const items = section.data?.items || [];
  if (items.length === 0) return null;

  if (variant === 'main-content') {
    return (
      <div className="rounded-2xl bg-glass-subtle backdrop-blur-md border border-border-medium p-6 hover:border-primary/20 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          {section.title}
        </h2>
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <svg
                className="w-5 h-5 mt-0.5 text-primary shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <SidebarSection title={section.title} headingLevel={section.headingLevel}>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <svg
              className="w-4 h-4 mt-0.5 text-primary shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}

/**
 * FAQ Accordion Section - Reuses existing SidebarFAQ component for sidebar, custom for main content
 */
function FAQAccordionSection({
  section,
  variant,
}: {
  section: ContentSection & { type: 'faq-accordion' };
  variant: 'sidebar' | 'main-content';
}) {
  const items = section.data?.items || [];
  if (items.length === 0) return null;

  // Transform V14.0 format {q, a} to legacy format {question, answer}
  const legacyItems = items.map((item) => ({
    question: item.q,
    answer: item.a,
  }));

  if (variant === 'main-content') {
    return (
      <div className="rounded-2xl bg-glass-subtle backdrop-blur-md border border-border-medium p-6 hover:border-primary/20 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {section.title}
        </h2>
        <div className="space-y-3">
          {legacyItems.map((item, index) => (
            <details
              key={index}
              className="group rounded-xl bg-black/20 border border-border-subtle hover:border-primary/30 transition-all"
            >
              <summary className="cursor-pointer p-4 flex items-center justify-between text-sm font-medium text-foreground/90 hover:text-foreground transition-colors">
                <span>{item.question}</span>
                <svg
                  className="w-4 h-4 text-primary/60 group-open:rotate-180 transition-transform duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border-subtle/50 pt-3">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  }

  return <SidebarFAQ title={section.title} items={legacyItems} />;
}

/**
 * Comparison Table Section - Side-by-side Pro/Con comparison
 */
function ComparisonTableSection({
  section,
  variant,
}: {
  section: ContentSection & { type: 'comparison-table' };
  variant: 'sidebar' | 'main-content';
}) {
  const data = section.data as any;
  const rows = data?.rows || [];
  if (rows.length === 0) return null;

  // Support both old format (left/right + pro/con) and new format (columns + col1/col2/col3)
  const columns: string[] =
    data?.columns || [data?.left || 'Option A', data?.right || 'Option B'];

  if (variant === 'main-content') {
    return (
      <div className="rounded-2xl bg-glass-subtle backdrop-blur-md border border-border-medium p-6 hover:border-primary/20 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          {section.title}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/30">
                {columns.map((col: string, i: number) => (
                  <th
                    key={i}
                    className="text-left py-3 px-4 font-semibold text-primary border-b border-border-medium"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, index: number) => (
                <tr
                  key={index}
                  className="border-b border-border-subtle last:border-b-0 hover:bg-primary/5 transition-colors"
                >
                  <td className="py-3 px-4 text-muted-foreground">
                    {row.col1 || row.pro}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {row.col2 || row.con}
                  </td>
                  {row.col3 && (
                    <td className="py-3 px-4 text-muted-foreground">
                      {row.col3}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <SidebarSection title={section.title} headingLevel={section.headingLevel}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              {columns.map((col: string, i: number) => (
                <th
                  key={i}
                  className="text-left py-2 px-2 font-medium text-foreground/80 drop-shadow-[0_0_4px_var(--color-primary)]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr
                key={index}
                className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
              >
                <td className="py-2 px-2 text-muted-foreground">
                  {row.col1 || row.pro}
                </td>
                <td className="py-2 px-2 text-muted-foreground">
                  {row.col2 || row.con}
                </td>
                {row.col3 && (
                  <td className="py-2 px-2 text-muted-foreground">
                    {row.col3}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SidebarSection>
  );
}

/**
 * Tags Section - Keywords/LSI terms as badges
 */
function TagsSection({
  section,
  variant,
}: {
  section: ContentSection & { type: 'tags' };
  variant: 'sidebar' | 'main-content';
}) {
  const items = section.data?.items || [];
  if (items.length === 0) return null;

  if (variant === 'main-content') {
    return (
      <div className="rounded-2xl bg-glass-subtle backdrop-blur-md border border-border-medium p-6 hover:border-primary/20 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          {section.title || 'Keywords'}
        </h2>
        <div className="flex flex-wrap gap-2">
          {items.map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className="bg-primary/5 border-primary/20 text-foreground/80 hover:border-primary/40 hover:bg-primary/10 transition-colors"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SidebarSection
      title={section.title || 'Keywords'}
      headingLevel={section.headingLevel}
    >
      <div className="flex flex-wrap gap-2">
        {items.map((tag, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    </SidebarSection>
  );
}
