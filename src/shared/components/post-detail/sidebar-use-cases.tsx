import Link from "next/link";
import { Check } from "lucide-react";
import { SidebarSection } from "./sidebar-section";

interface SidebarUseCasesProps {
  title?: string;
  items?: string[];
}

/**
 * SidebarUseCases with internal search links for SEO crawl mesh
 */
export function SidebarUseCases({ title = "Use Cases", items }: SidebarUseCasesProps) {
  if (!items || items.length === 0) return null;

  return (
    <SidebarSection title={title}>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3 text-sm">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            {/* Link to search page for internal linking (SEO crawl mesh) */}
            <Link 
              href={`/prompts?q=${encodeURIComponent(item)}`}
              className="text-foreground/90 hover:text-primary transition-colors"
            >
              {item}
            </Link>
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}
