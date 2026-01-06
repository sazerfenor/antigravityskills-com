import { SidebarSection } from "./sidebar-section";

interface SidebarTextSectionProps {
  title: string;
  content: string;
}

export function SidebarTextSection({ title, content }: SidebarTextSectionProps) {
  if (!content) return null;

  return (
    <SidebarSection title={title}>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </SidebarSection>
  );
}
