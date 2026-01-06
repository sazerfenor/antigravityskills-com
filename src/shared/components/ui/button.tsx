import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  // Base styles - 增强 disabled 对比度，添加触控区扩展
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary/20 border border-primary/80 text-primary shadow-[0_0_12px_-3px_rgba(250,204,21,0.3)] hover:bg-primary/30 hover:border-primary hover:shadow-[0_0_15px_-3px_rgba(250,204,21,0.4)] active:scale-[0.98] transition-all duration-300",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-primary/20 dark:text-primary/80 dark:hover:border-primary dark:hover:bg-primary/10 dark:hover:text-primary transition-colors",
        secondary:
          "bg-glass-subtle border border-border-medium text-foreground hover:bg-glass-hint hover:border-primary/30 hover:text-primary dark:hover:shadow-[0_0_15px_-5px_rgba(250,204,21,0.2)]",
        // 霓虹玻璃按钮 - 次要 CTA，明确的霓虹边框 + 玻璃背景
        "neon-glass":
          "bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 hover:border-primary/60 hover:shadow-[0_0_15px_-5px_rgba(250,204,21,0.3)] transition-all",
        // Premium 按钮 - 用于 Get Credits / 升级会员等高价值操作
        // 设计语言：纯黑底 + 霓虹光晕 + 清晰文字 = 高端克制
        "premium":
          "bg-black text-primary font-semibold shadow-[0_0_25px_-5px_rgba(250,204,21,0.6)] hover:shadow-[0_0_35px_-5px_rgba(250,204,21,0.8)] transition-all duration-300",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-primary/10 dark:hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        // Generate 按钮专用 - 强发光效果
        "glow-primary":
          "bg-primary text-primary-foreground font-bold shadow-[0_0_20px_-5px_var(--color-primary)] hover:shadow-[0_0_30px_-5px_var(--color-primary)] hover:bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all duration-300",
        // Generate 按钮专用 - 带扫光动画效果 (CSS ::after 实现)
        "glow-shimmer":
          "bg-primary text-primary-foreground font-bold shadow-[0_0_20px_-5px_var(--color-primary)] hover:shadow-[0_0_30px_-5px_var(--color-primary)] hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-in-out",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        // xs: 高度保持 h-7 视觉，但使用 min-h-8 确保触控区至少 32px
        xs: "h-7 min-h-8 rounded-md gap-1 px-3 text-xs has-[>svg]:px-2",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-lg px-8 text-base has-[>svg]:px-6",
        icon: "size-9",
        "icon-sm": "size-7 min-w-8 min-h-8", // 确保图标按钮也有足够触控区
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  const isDisabled = disabled || loading

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin text-primary" />
          <span className="sr-only">Loading...</span>
          {/* 保留 children 文字但隐藏，保持按钮宽度一致 */}
          <span className="opacity-0 absolute">{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
