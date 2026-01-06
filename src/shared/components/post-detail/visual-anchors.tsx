'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Sparkles } from 'lucide-react';

/**
 * V15.0 VisualAnchors 组件
 *
 * @description
 * 将 promptHighlights 数据转换为可视化的 Tag Cloud，
 * 展示 Prompt 的语义切片。使用颜色编码区分不同类别。
 *
 * @example
 * <VisualAnchors highlights={promptHighlights.native} />
 */

/** 高亮类别类型 */
type HighlightCategory =
  | 'subject'      // 主题 - 黄色
  | 'style'        // 风格 - 紫色
  | 'lighting'     // 光照 - 蓝色
  | 'environment'  // 环境 - 绿色
  | 'mood'         // 氛围 - 粉色
  | 'technical';   // 技术参数 - 青色

/** 单个高亮片段数据结构 */
interface HighlightSpan {
  start: number;
  end: number;
  fieldId: string;
  fieldLabel: string;
  originalValue: string;
  category: HighlightCategory;
  transformedTo?: string;
}

interface VisualAnchorsProps {
  /**
   * Prompt 高亮数据
   * 从 community_post.params.promptHighlights.native 获取
   */
  highlights: HighlightSpan[];

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 颜色映射表
 * 与 vision-logic 中的 highlight-colors.ts 保持一致
 */
const CATEGORY_COLORS: Record<HighlightCategory, { bg: string; text: string; border: string }> = {
  subject: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-200',
    border: 'border-yellow-500/30',
  },
  style: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
  },
  lighting: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    border: 'border-blue-500/30',
  },
  environment: {
    bg: 'bg-green-500/10',
    text: 'text-green-300',
    border: 'border-green-500/30',
  },
  mood: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-300',
    border: 'border-pink-500/30',
  },
  technical: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-300',
    border: 'border-cyan-500/30',
  },
};

/**
 * 类别显示名称
 */
const CATEGORY_LABELS: Record<HighlightCategory, string> = {
  subject: 'Subject',
  style: 'Style',
  lighting: 'Lighting',
  environment: 'Environment',
  mood: 'Mood',
  technical: 'Technical',
};

export function VisualAnchors({ highlights, className = '' }: VisualAnchorsProps) {
  // 安全检查
  if (!highlights || !Array.isArray(highlights) || highlights.length === 0) {
    return null;
  }

  // 按类别分组显示
  const groupedHighlights = highlights.reduce((acc, h) => {
    const category = h.category || 'technical';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(h);
    return acc;
  }, {} as Record<HighlightCategory, HighlightSpan[]>);

  // 获取有数据的类别列表
  const categories = Object.keys(groupedHighlights) as HighlightCategory[];

  if (categories.length === 0) {
    return null;
  }

  return (
    <aside
      className={`rounded-xl bg-glass-subtle border border-border-subtle p-4 space-y-3 ${className}`}
      aria-label="Visual Anchors"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary/60" />
        <h2 className="text-sm font-semibold text-foreground">Prompt Anchors</h2>
      </div>

      <div className="space-y-2">
        {categories.map((category) => {
          const items = groupedHighlights[category];
          const colors = CATEGORY_COLORS[category];
          const categoryLabel = CATEGORY_LABELS[category];

          return (
            <div key={category} className="flex flex-wrap items-center gap-1.5">
              {/* Category Label */}
              <span className={`text-xs font-medium ${colors.text} opacity-70`}>
                {categoryLabel}:
              </span>

              {/* Highlight Badges */}
              {items.map((item, idx) => (
                <Badge
                  key={`${item.fieldId}-${idx}`}
                  variant="outline"
                  className={`text-xs ${colors.bg} ${colors.text} ${colors.border} border`}
                >
                  {item.transformedTo || item.originalValue}
                </Badge>
              ))}
            </div>
          );
        })}
      </div>

      {/* 显示总数 */}
      <p className="text-[10px] text-muted-foreground">
        {highlights.length} anchor{highlights.length > 1 ? 's' : ''} detected
      </p>
    </aside>
  );
}
