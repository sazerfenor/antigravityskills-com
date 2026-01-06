import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

const cardVariants = cva(
  "rounded-xl border transition-all duration-300 relative",
  {
    variants: {
      variant: {
        // 1. 标准卡片 (用于布局容器)
        default: "bg-card text-card-foreground border-border-subtle shadow-sm",
        
        // 2. 玻璃卡片 (用于侧边栏、浮层) - 使用 subtle 背景匹配 Core Modules
        glass: "bg-glass-subtle backdrop-blur-xl border-border-medium",
        
        // 3. 交互卡片 (用于 Gallery - 必须配合 padding="none")
        interactive: "bg-card/40 backdrop-blur-md border-border-medium shadow-lg cursor-pointer hover:-translate-y-1 hover:shadow-[0_0_25px_-10px_var(--color-primary)] hover:border-primary/30",
        
        // 4. 幽灵/虚线 (用于 Upload 区域)
        outline: "bg-transparent border-dashed border-border-subtle",
        
        // 5. 特性卡片 (专门用于 Instant Generator - 含渐变背景和光斑)
        feature: "bg-gradient-to-b from-card to-background border-border-primary-glass shadow-2xl shadow-primary/10 ring-1 ring-border-glass-subtle overflow-hidden",
        
        // 6. 霓虹 (选中态)
        neon: "bg-card border-primary shadow-[0_0_20px_-5px_var(--color-primary)]",
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        default: "p-6",
        lg: "p-8",
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>, 
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, children, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    >
      {/* Feature variant: 内置右上角光斑效果 */}
      {variant === "feature" && (
        <div 
          className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-[80px] pointer-events-none" 
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn(
      "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    data-slot="card-title"
    className={cn("leading-none font-semibold", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-description"
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-action"
    className={cn(
      "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
      className
    )}
    {...props}
  />
))
CardAction.displayName = "CardAction"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-content"
    className={cn("px-6", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardAction, 
  CardDescription, 
  CardContent,
  cardVariants,
}
export type { CardProps }
