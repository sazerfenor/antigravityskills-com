"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

// ===== Container Component =====
const containerVariants = cva(
  "mx-auto w-full px-4 sm:px-6 lg:px-8",
  {
    variants: {
      size: {
        default: "max-w-7xl",      // 标准应用宽 (Dashboard/Generator)
        narrow: "max-w-3xl",       // 阅读宽 (文档/博客)
        wide: "max-w-[90rem]",     // 宽屏 (Gallery)
        full: "max-w-none",        // 全屏 (Hero 背景)
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

function Container({ className, size, ...props }: ContainerProps) {
  return (
    <div
      data-slot="container"
      className={cn(containerVariants({ size }), className)}
      {...props}
    />
  );
}

// ===== Section Component =====
const sectionVariants = cva(
  "relative w-full",
  {
    variants: {
      spacing: {
        default: "py-16 md:py-24",  // 标准区块间距 (匹配现有设计)
        tight: "py-12 md:py-16",    // 紧凑
        loose: "py-24 md:py-32",    // Hero 区块
        none: "py-0",               // 无间距
      },
    },
    defaultVariants: {
      spacing: "default",
    },
  }
);

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  as?: "section" | "div" | "article" | "main" | "footer";
}

function Section({ className, spacing, as: Component = "section", ...props }: SectionProps) {
  return (
    <Component
      data-slot="section"
      className={cn(sectionVariants({ spacing }), className)}
      {...props}
    />
  );
}

// ===== ResponsiveGrid Component (Mobile-First Reordering) =====
export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 在移动端反转子元素顺序，让重要内容置顶 */
  reverseOnMobile?: boolean;
  /** 列数 (桌面端) */
  cols?: 2 | 3 | 4;
  /** 间距大小 */
  gap?: "sm" | "md" | "lg";
}

function ResponsiveGrid({
  children,
  className,
  reverseOnMobile = false,
  cols = 2,
  gap = "md",
  ...props
}: ResponsiveGridProps) {
  const colsClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }[cols];
  
  const gapClass = {
    sm: "gap-4 lg:gap-6",
    md: "gap-6 lg:gap-8",
    lg: "gap-8 lg:gap-12",
  }[gap];

  return (
    <div
      data-slot="responsive-grid"
      className={cn(
        "w-full",
        // 移动端：flex 布局，可选反转顺序
        reverseOnMobile ? "flex flex-col-reverse" : "flex flex-col",
        // 桌面端：恢复 Grid 布局
        "md:grid",
        colsClass,
        gapClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ===== PageHeader Component =====
interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
}

function PageHeader({ title, description, className, children, ...props }: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("space-y-2", className)}
      {...props}
    >
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {description && (
        <p className="text-muted-foreground text-lg">{description}</p>
      )}
      {children}
    </div>
  );
}

export { 
  Container, 
  Section, 
  ResponsiveGrid, 
  PageHeader, 
  containerVariants, 
  sectionVariants 
};
