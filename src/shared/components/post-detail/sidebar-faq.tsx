import { SidebarSection } from "./sidebar-section";

interface FAQItem {
  question: string;
  answer: string;
}

interface SidebarFAQProps {
  title?: string;
  items?: FAQItem[];
}

/**
 * SidebarFAQ with native <details>/<summary> for SEO
 * - Content is ALWAYS in HTML (Googlebot 100% visible)
 * - Users click to expand/collapse (UX preserved)
 */
export function SidebarFAQ({ title = "FAQ", items }: SidebarFAQProps) {
  if (!items || items.length === 0) return null;

  return (
    <SidebarSection title={title} contentClassName="p-0">
      <div className="divide-y divide-border-medium/30">
        {items.map((item, index) => (
          <details 
            key={index} 
            className="group px-4"
            // All items closed by default - but content is ALWAYS in DOM for Googlebot
          >
            <summary className="text-sm font-medium text-foreground hover:text-primary hover:drop-shadow-[0_0_4px_rgba(250,204,21,0.3)] transition-colors py-3 cursor-pointer list-none flex items-center justify-between">
              <span className="text-left pr-2">{item.question}</span>
              <svg 
                className="w-4 h-4 shrink-0 text-muted-foreground group-open:rotate-180 group-open:text-primary group-open:drop-shadow-[0_0_4px_rgba(250,204,21,0.3)] transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            {/* Answer is ALWAYS in DOM - Googlebot sees this! */}
            <div className="text-sm text-muted-foreground pb-4 leading-relaxed">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </SidebarSection>
  );
}
