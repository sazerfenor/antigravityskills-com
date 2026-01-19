'use client';

/**
 * SkillFilterSidebar - 手风琴式分类筛选侧边栏
 *
 * 设计：
 * - 主分类可折叠展开
 * - 点击主分类展开子分类
 * - 选中状态用 primary 色高亮
 * - 使用项目 theme tokens，不写死颜色
 */

import { useState } from 'react';
import { ChevronDown, Terminal, Palette, Briefcase, Database, TestTube, FileText, Image, FlaskConical, HardDrive, Sparkles, Blocks, LayoutGrid } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { SKILL_CATEGORIES } from '@/config/skill-categories';

// ==================== Types ====================

export interface SkillFilterSidebarProps {
  selectedCategory: string;
  selectedSubcategory?: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange?: (subcategory: string) => void;
}

// ==================== Icon Map ====================

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  tools: <Terminal className="w-5 h-5" />,
  development: <Blocks className="w-5 h-5" />,
  'data-ai': <Sparkles className="w-5 h-5" />,
  business: <Briefcase className="w-5 h-5" />,
  devops: <LayoutGrid className="w-5 h-5" />,
  'testing-security': <TestTube className="w-5 h-5" />,
  documentation: <FileText className="w-5 h-5" />,
  'content-media': <Image className="w-5 h-5" />,
  research: <FlaskConical className="w-5 h-5" />,
  databases: <Database className="w-5 h-5" />,
  lifestyle: <Palette className="w-5 h-5" />,
  blockchain: <HardDrive className="w-5 h-5" />,
};

// ==================== Component ====================

export function SkillFilterSidebar({
  selectedCategory,
  selectedSubcategory,
  onCategoryChange,
  onSubcategoryChange,
}: SkillFilterSidebarProps) {
  // Track which categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(selectedCategory !== 'all' ? [selectedCategory] : [])
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryClick = (categoryId: string) => {
    onCategoryChange(categoryId);
    // Auto-expand when selecting
    if (!expandedCategories.has(categoryId)) {
      setExpandedCategories(new Set([...expandedCategories, categoryId]));
    }
  };

  const handleSubcategoryClick = (subcategoryId: string) => {
    onSubcategoryChange?.(subcategoryId);
  };

  const handleClearAll = () => {
    onCategoryChange('all');
    setExpandedCategories(new Set());
  };

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card hidden lg:flex flex-col">
      <div className="sticky top-24 p-5 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-xs font-bold uppercase tracking-widest">
            Filters
          </h2>
          <p className="text-muted-foreground text-xs">
            Browse by domain
          </p>
        </div>

        {/* Category Accordion */}
        <div className="flex flex-col border-t border-border">
          {/* All Skills */}
          <button
            onClick={() => onCategoryChange('all')}
            className={cn(
              'flex items-start gap-3 py-4 transition-colors group',
              'hover:text-primary',
              selectedCategory === 'all' && 'text-primary'
            )}
          >
            <span className={cn(
              'flex-shrink-0 mt-0.5 flex items-center justify-center',
              'w-8 h-8 rounded-lg transition-all duration-300',
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
            )}>
              <LayoutGrid className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider leading-tight pt-1">
              All Skills
            </span>
          </button>

          {/* Dynamic Categories */}
          {Object.entries(SKILL_CATEGORIES).map(([categoryId, config]) => {
            const isExpanded = expandedCategories.has(categoryId);
            const isSelected = selectedCategory === categoryId;

            return (
              <div
                key={categoryId}
                className="border-t border-border"
              >
                {/* Category Header */}
                <div className="flex items-center">
                  <button
                    onClick={() => handleCategoryClick(categoryId)}
                    className={cn(
                      'flex-1 flex items-start gap-3 py-4 transition-colors group',
                      'hover:text-primary',
                      isSelected && 'text-primary'
                    )}
                  >
                    <span className={cn(
                      'flex-shrink-0 mt-0.5 flex items-center justify-center',
                      'w-8 h-8 rounded-lg transition-all duration-300',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    )}>
                      {CATEGORY_ICONS[categoryId] || <Blocks className="w-5 h-5" />}
                    </span>
                    <span className="text-left text-xs font-bold uppercase tracking-wider leading-tight pt-1">
                      {config.name}
                    </span>
                  </button>

                  {/* Expand Toggle */}
                  {config.subcategories.length > 0 && (
                    <button
                      onClick={() => toggleCategory(categoryId)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </button>
                  )}
                </div>

                {/* Subcategories */}
                {isExpanded && config.subcategories.length > 0 && (
                  <div className={cn(
                    'flex flex-col gap-0.5 pb-4 pl-7 ml-2',
                    'border-l-2',
                    isSelected ? 'border-primary/30' : 'border-border'
                  )}>
                    {config.subcategories.map((sub) => {
                      const isSubSelected = selectedSubcategory === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubcategoryClick(sub.id)}
                          className={cn(
                            'text-left text-sm font-medium py-1.5 px-2 transition-colors',
                            'rounded-sm',
                            isSubSelected
                              ? 'text-primary bg-primary/5 border-r-2 border-primary'
                              : 'text-muted-foreground hover:text-primary'
                          )}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Clear All */}
        <button
          onClick={handleClearAll}
          className={cn(
            'w-full flex items-center justify-center rounded-lg h-10 px-4',
            'border border-border',
            'text-foreground text-sm font-medium',
            'hover:bg-muted/50 transition-all'
          )}
        >
          Clear All
        </button>
      </div>
    </aside>
  );
}

// ==================== Mobile Filter Drawer ====================

export function MobileFilterButton({
  onClick,
  activeCount,
}: {
  onClick: () => void;
  activeCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg',
        'bg-card border border-border',
        'text-sm font-medium',
        'hover:border-primary transition-colors'
      )}
    >
      <LayoutGrid className="w-4 h-4" />
      <span>Filters</span>
      {activeCount && activeCount > 0 && (
        <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
          {activeCount}
        </span>
      )}
    </button>
  );
}
