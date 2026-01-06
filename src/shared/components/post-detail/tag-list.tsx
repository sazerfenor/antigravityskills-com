import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

interface TagListProps {
  title?: string;
  tags: string[];
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'glass';
}

export function TagList({ title, tags, className, variant = 'secondary' }: TagListProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {title && <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</h3>}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge 
            key={tag} 
            variant={variant}
            className="px-2.5 py-1 text-xs font-medium cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
