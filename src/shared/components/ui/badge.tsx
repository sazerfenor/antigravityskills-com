import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-300 overflow-hidden",
  {
    variants: {
      variant: {
        // 全息投影风格 - 发光半透明
        default:
          "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 shadow-[0_0_10px_-5px_var(--color-primary)]",
        // 深色填充
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // 玻璃描边
        outline:
          "text-foreground border-border-medium bg-glass-subtle hover:bg-glass-hint-alt",
        // 强玻璃态
        glass:
          "bg-glass-strong backdrop-blur-md border-border-medium text-foreground hover:bg-glass-strong/80",
        // 危险
        destructive:
          "border-transparent bg-destructive text-white hover:bg-destructive/90 shadow-[0_0_10px_-5px_hsl(0_84%_60%)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
