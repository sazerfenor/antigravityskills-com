'use client';

import { MessageSquareQuote } from 'lucide-react';

/**
 * V15.0 SnippetPackage 组件
 *
 * @description
 * 在页面底部展示 AI 生成的 GEO 摘要，优化被 AI 搜索引擎引用的概率。
 * 使用 .snippet-package-summary class 配合 Speakable Schema 标记。
 *
 * @example
 * <SnippetPackage summary="To generate an anime portrait..." />
 */

interface SnippetPackageProps {
  /**
   * AI 生成的 GEO 摘要
   * 从 community_post.snippetSummary 获取
   */
  summary: string | null | undefined;

  /**
   * 自定义类名
   */
  className?: string;
}

export function SnippetPackage({ summary, className = '' }: SnippetPackageProps) {
  // 安全检查
  if (!summary || summary.trim().length === 0) {
    return null;
  }

  return (
    <aside
      className={`snippet-package-summary rounded-xl bg-muted/30 border border-border/50 p-4 ${className}`}
      aria-label="Quick Summary"
    >
      <div className="flex items-center gap-2 mb-2">
        <MessageSquareQuote className="w-4 h-4 text-primary/60" />
        <h2 className="text-sm font-semibold text-muted-foreground">Quick Summary</h2>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
    </aside>
  );
}
