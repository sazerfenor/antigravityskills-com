import { ReactNode } from 'react';

interface PolicyPageProps {
  /** The rendered MDX body content */
  body: ReactNode;
  /** Optional className for the article container */
  className?: string;
}

/**
 * PolicyPage - A reusable component for rendering policy/legal pages
 *
 * This component provides consistent styling for all policy pages
 * (Privacy Policy, Terms of Service, Cookie Policy, etc.)
 *
 * Usage:
 * ```tsx
 * const page = await getLocalPageWithBody({ slug: 'privacy-policy', locale });
 * return <PolicyPage body={page.body} />;
 * ```
 */
export function PolicyPage({ body, className }: PolicyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <article className={`mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 ${className || ''}`}>
        <div className="rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-sm sm:p-12">
          <div className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-background prose-code:px-1.5 prose-code:py-0.5 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none prose-li:text-muted-foreground prose-ul:text-muted-foreground prose-ol:text-muted-foreground max-w-none">
            {body}
          </div>
        </div>
      </article>
    </div>
  );
}

export default PolicyPage;
