import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Heading level for SEO - default h2 for main sections */
  headingLevel?: 'h2' | 'h3';
}

export function SidebarSection({ 
  title, 
  children, 
  className, 
  contentClassName,
  headingLevel = 'h2', // Default to h2 for proper SEO
}: SidebarSectionProps) {
  const Heading = headingLevel; // Dynamic heading tag
  
  return (
    <div className={cn("rounded-xl bg-glass-subtle backdrop-blur-md border border-border-medium overflow-hidden", className)}>
      {title && (
        <div className="px-4 py-3 border-b border-white/10 bg-card/10">
          <Heading className="font-bold text-base text-foreground/90 leading-none tracking-tight">
            {title}
          </Heading>
        </div>
      )}
      <div className={cn("p-4", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

