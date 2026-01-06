import { Badge } from "@/shared/components/ui/badge";
import { SidebarSection } from "./sidebar-section";

interface SidebarAttributeSectionProps {
  title: string;
  items?: string[];
}

export function SidebarAttributeSection({ title, items }: SidebarAttributeSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <SidebarSection title={title}>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="bg-secondary/40 hover:bg-secondary/60 text-secondary-foreground px-2.5 py-1 text-xs font-medium transition-colors cursor-default"
          >
            {item}
          </Badge>
        ))}
      </div>
    </SidebarSection>
  );
}
