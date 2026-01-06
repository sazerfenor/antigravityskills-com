import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { LucideIcon, FolderOpen } from "lucide-react";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 显示的图标，默认为 FolderOpen */
  icon?: LucideIcon;
  /** 标题 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 操作按钮插槽 */
  action?: React.ReactNode;
}

function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        "border-2 border-dashed border-border-medium rounded-xl bg-glass-hint/20",
        className
      )}
      {...props}
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-glass-subtle p-4">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {title}
      </h3>
      
      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      
      {/* Action Slot */}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

export { EmptyState };
