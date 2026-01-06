import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

const textareaVariants = cva(
  "flex w-full rounded-xl border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 resize-none",
  {
    variants: {
      variant: {
        // 1. 标准款 (用于评论、简单表单)
        default: "min-h-[80px] bg-glass-subtle border-border-medium focus:border-primary/50 focus:ring-1 focus:ring-primary/50",
        
        // 2. 霓虹款 (用于主生成器 - Target B)
        // 组件内部处理外层的发光 Wrapper
        neon: "min-h-[180px] sm:min-h-[140px] bg-glass-subtle/50 backdrop-blur-xl border-border-medium focus:border-primary/50 focus:ring-1 focus:ring-primary/50 shadow-inner",
        
        // 3. 紧凑款 (用于评论回复)
        compact: "min-h-[60px] bg-glass-hint-alt border-border-medium focus:border-primary/50",
        
        // 4. 幽灵款 (用于无边框场景)
        ghost: "border-none bg-transparent shadow-none focus:ring-0 min-h-[80px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface TextareaProps 
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  /** 内嵌动作 (如按钮、图标)，自动定位在右下角 */
  action?: React.ReactNode
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, action, ...props }, ref) => {
    const hasAction = !!action
    
    return (
      <div className="relative group w-full">
        {/* Neon Glow Wrapper - 仅在 neon 模式下激活 */}
        {variant === "neon" && (
          <div 
            className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500 group-focus-within:opacity-100 group-focus-within:duration-200 pointer-events-none" 
            aria-hidden="true"
          />
        )}

        {/* 真实的输入框 */}
        <textarea
          className={cn(
            textareaVariants({ variant }),
            hasAction && "pr-12", // 为右下角按钮留出空间
            variant === "neon" && "relative", // 确保在 glow 之上
            className
          )}
          ref={ref}
          {...props}
        />
        
        {/* 内嵌动作 (Action Slot) - 绝对定位 */}
        {action && (
          <div className="absolute bottom-3 right-3 z-10 flex items-center justify-center">
            {action}
          </div>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
export type { TextareaProps }
