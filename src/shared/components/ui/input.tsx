import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-xl border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
  {
    variants: {
      variant: {
        // 1. 标准款 (用于表单) - Enhanced Cyberpunk focus with glow
        default: "h-9 bg-glass-subtle border-border-medium focus:border-primary/60 focus:ring-1 focus:ring-primary/40 focus:shadow-[0_0_12px_-4px_rgba(250,204,21,0.3)]",

        // 2. 霓虹款 (用于主生成器 - Hero Input)
        neon: "h-12 md:h-14 lg:h-16 bg-glass-strong backdrop-blur-xl border-border-medium focus:border-primary/60 focus:ring-1 focus:ring-primary/50 focus:shadow-[0_0_20px_-4px_rgba(250,204,21,0.4)] shadow-inner text-base md:text-lg",

        // 3. 幽灵款 (用于无边框场景)
        ghost: "h-9 border-none bg-transparent shadow-none focus:ring-0",

        // 4. 搜索款 (用于搜索框)
        search: "h-10 bg-glass-subtle border-border-subtle focus:border-primary/60 focus:ring-1 focus:ring-primary/40 focus:shadow-[0_0_12px_-4px_rgba(250,204,21,0.3)] pl-10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface InputProps 
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  /** 前置内容 (如图标)，自动定位在左侧 */
  startContent?: React.ReactNode
  /** 后置内容 (如按钮)，自动定位在右侧 */
  endContent?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, type, startContent, endContent, ...props }, ref) => {
    const hasStartContent = !!startContent
    const hasEndContent = !!endContent
    
    return (
      <div className="relative group w-full">
        {/* Neon Glow Wrapper - 仅在 neon 模式下激活 */}
        {variant === "neon" && (
          <div 
            className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500 group-focus-within:opacity-100 group-focus-within:duration-200 pointer-events-none" 
            aria-hidden="true"
          />
        )}

        {/* 前置内容 */}
        {startContent && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center text-muted-foreground">
            {startContent}
          </div>
        )}

        {/* 真实的输入框 */}
        <input
          type={type}
          data-slot="input"
          className={cn(
            inputVariants({ variant }),
            hasStartContent && "pl-10",
            hasEndContent && "pr-16",
            variant === "neon" && "relative rounded-full",
            className
          )}
          ref={ref}
          {...props}
        />
        
        {/* 后置内容 (如按钮) */}
        {endContent && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
            {endContent}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
export type { InputProps }
