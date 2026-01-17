'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Palette } from 'lucide-react';

/**
 * V15.0 CreationRecipe 组件
 *
 * @description
 * 在发布页面 Hero 区域下方展示用户在 Vision Logic Playground 中配置的生成参数。
 * 使用语义化 <dl> 结构，支持从 schema 获取友好的 label 名称。
 *
 * @example
 * <CreationRecipe
 *   params={{
 *     formValues: { art_style: 'anime', lighting: 'golden_hour' },
 *     schema: { fields: [{ id: 'art_style', label: 'Art Style' }] }
 *   }}
 * />
 */

interface CreationRecipeProps {
  /**
   * 从 community_post.params 解析的数据
   */
  params: {
    formValues: Record<string, any> | null;
    schema?: {
      fields: Array<{
        id: string;
        label: string;
        type?: string;
      }>;
    } | null;
  } | null;

  /**
   * 是否启用内链功能 (F5)
   * true: 渲染为可点击的链接（未来版本）
   * false: 渲染为普通文本
   */
  enableLinks?: boolean;

  /**
   * 可链接的字段 ID 白名单
   * 仅这些字段会渲染为链接（未来版本）
   */
  linkableFields?: string[];

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 格式化值用于显示
 */
function formatDisplayValue(value: any): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    // 0-1 范围的数字转为百分比
    if (value >= 0 && value <= 1) {
      return `${(value * 100).toFixed(0)}%`;
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // 将 snake_case 或 kebab-case 转为 Title Case
  return String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * 从 schema 获取字段的友好名称
 */
function getFieldLabel(
  key: string,
  schema?: { fields: Array<{ id: string; label: string }> } | null
): string {
  const field = schema?.fields?.find((f) => f.id === key);
  if (field?.label) {
    return field.label;
  }
  // Fallback: 将 snake_case 转为 Title Case
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * 过滤掉不应该展示的字段
 */
function shouldShowField(key: string, value: any): boolean {
  // 过滤空值
  if (value === undefined || value === null || value === '') return false;
  // 过滤空数组
  if (Array.isArray(value) && value.length === 0) return false;
  // 过滤内部字段（以 _ 开头）
  if (key.startsWith('_')) return false;
  return true;
}

export function CreationRecipe({
  params,
  enableLinks = false,
  linkableFields = ['art_style', 'lighting', 'mood', 'style'],
  className = '',
}: CreationRecipeProps) {
  // 安全检查
  if (!params?.formValues || Object.keys(params.formValues).length === 0) {
    return null;
  }

  const { formValues, schema } = params;

  // 过滤并获取要展示的字段
  const displayFields = Object.entries(formValues).filter(([key, value]) =>
    shouldShowField(key, value)
  );

  if (displayFields.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-xl bg-glass-subtle border border-border-medium overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 bg-card/10 border-b border-border-medium flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary drop-shadow-[0_0_8px_var(--color-primary)]" />
        <h2 className="font-semibold text-sm">Creation Recipe</h2>
        <Badge variant="outline" className="ml-auto text-xs">
          {displayFields.length} settings
        </Badge>
      </div>

      {/* Content List - Clean horizontal layout */}
      <dl className="p-4 space-y-2">
        {displayFields.map(([key, value]) => {
          const label = getFieldLabel(key, schema);
          const displayValue = formatDisplayValue(value);
          const isLinkable = enableLinks && linkableFields.includes(key);

          return (
            <div
              key={key}
              className="flex items-baseline gap-3 py-1.5 border-b border-border/20 last:border-0"
            >
              <dt className="text-xs text-muted-foreground/80 shrink-0 min-w-[120px]">
                {label}
              </dt>
              <dd className="text-sm text-foreground flex-1">
                {isLinkable ? (
                  <span className="text-primary cursor-pointer hover:underline">
                    {displayValue}
                  </span>
                ) : (
                  <span>{displayValue}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
