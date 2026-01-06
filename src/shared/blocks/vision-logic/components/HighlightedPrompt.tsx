'use client';

/**
 * HighlightedPrompt Component
 * 可编辑的富文本高亮组件，用于显示和编辑带有高亮标记的 Prompt
 *
 * 功能：
 * - 使用 contenteditable 实现可编辑
 * - 解析 prompt 为 segments (高亮/非高亮)
 * - 高亮片段带颜色 + 下划线 + Tooltip
 * - 点击高亮触发 onHighlightClick(fieldId)
 * - 编辑时自动清空高亮标记
 *
 * @see PRD: Prompt 高亮交互系统
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/shared/lib/utils';
import { HIGHLIGHT_COLORS } from '../constants/highlight-colors';
import type { HighlightSpan, HighlightCategory } from '../types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/shared/components/ui/tooltip';

// ============================================
// Types
// ============================================

interface HighlightedPromptProps {
  /** The prompt text */
  prompt: string;
  /** Array of highlight spans */
  highlights: HighlightSpan[];
  /** Callback when prompt is edited */
  onPromptChange?: (newPrompt: string) => void;
  /** Callback when a highlight is clicked */
  onHighlightClick?: (fieldId: string) => void;
  /** Whether editing is enabled */
  editable?: boolean;
  /** Placeholder when empty */
  placeholder?: string;
  /** Additional class names */
  className?: string;
}

interface ParsedSegment {
  text: string;
  highlight?: HighlightSpan;
  isHighlighted: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse prompt into segments based on highlights
 */
function parseSegments(prompt: string, highlights: HighlightSpan[]): ParsedSegment[] {
  if (!prompt || highlights.length === 0) {
    return [{ text: prompt || '', isHighlighted: false }];
  }

  const segments: ParsedSegment[] = [];
  let lastEnd = 0;

  // Sort highlights by start position
  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

  for (const highlight of sortedHighlights) {
    // Add non-highlighted segment before this highlight
    if (highlight.start > lastEnd) {
      segments.push({
        text: prompt.slice(lastEnd, highlight.start),
        isHighlighted: false,
      });
    }

    // Add highlighted segment
    const highlightText = prompt.slice(highlight.start, highlight.end);
    if (highlightText) {
      segments.push({
        text: highlightText,
        highlight,
        isHighlighted: true,
      });
    }

    lastEnd = highlight.end;
  }

  // Add remaining non-highlighted text
  if (lastEnd < prompt.length) {
    segments.push({
      text: prompt.slice(lastEnd),
      isHighlighted: false,
    });
  }

  return segments;
}

/**
 * Check if highlights are still valid for the prompt
 */
function validateHighlightsForPrompt(highlights: HighlightSpan[], prompt: string): boolean {
  if (!highlights.length) return true;

  return highlights.every((h) => {
    return h.start >= 0 && h.end <= prompt.length && h.start < h.end;
  });
}

// ============================================
// Sub-component: HighlightSpanElement
// ============================================

interface HighlightSpanElementProps {
  text: string;
  highlight: HighlightSpan;
  onClick: (fieldId: string, e: React.MouseEvent) => void;
}

function HighlightSpanElement({ text, highlight, onClick }: HighlightSpanElementProps) {
  const colors = HIGHLIGHT_COLORS[highlight.category as HighlightCategory] || HIGHLIGHT_COLORS.technical;

  const handleClick = (e: React.MouseEvent) => {
    onClick(highlight.fieldId, e);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(e as unknown as React.MouseEvent);
            }
          }}
          className={cn(
            'cursor-pointer rounded-sm px-0.5 -mx-0.5',
            'transition-all duration-200',
            colors.bg,
            'hover:ring-2',
            colors.ring,
            // Underline effect
            'underline decoration-dotted decoration-1 underline-offset-4',
            colors.decoration,
            colors.text,
            'font-medium'
          )}
          data-field-id={highlight.fieldId}
          data-category={highlight.category}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs bg-card/95 backdrop-blur-sm border-border-medium">
        <div className="space-y-1">
          <div className="font-medium text-sm text-foreground">{highlight.fieldLabel}</div>
          <div className="text-xs text-muted-foreground">
            <span className="opacity-70">Original: </span>
            <span className={colors.text}>{highlight.originalValue}</span>
          </div>
          {highlight.transformedTo && (
            <div className="text-xs text-muted-foreground">
              <span className="opacity-70">AI enhanced to: </span>
              <span>&quot;{highlight.transformedTo}&quot;</span>
            </div>
          )}
          <div className="text-xs text-primary/70 pt-1">Click to edit this parameter</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================
// Main Component: HighlightedPrompt
// ============================================

export function HighlightedPrompt({
  prompt,
  highlights,
  onPromptChange,
  onHighlightClick,
  editable = true,
  placeholder = 'Your optimized prompt will appear here...',
  className,
}: HighlightedPromptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localPrompt, setLocalPrompt] = useState(prompt);
  const [highlightsValid, setHighlightsValid] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Sync external prompt changes
  useEffect(() => {
    if (!isEditing) {
      setLocalPrompt(prompt);
      setHighlightsValid(validateHighlightsForPrompt(highlights, prompt));
    }
  }, [prompt, highlights, isEditing]);

  // Parse prompt into segments with highlights
  const segments = useMemo(
    () => parseSegments(localPrompt, highlightsValid ? highlights : []),
    [localPrompt, highlights, highlightsValid]
  );

  // Handle contenteditable input
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const newText = e.currentTarget.innerText;
      setLocalPrompt(newText);
      setIsEditing(true);

      // Invalidate highlights after edit
      setHighlightsValid(false);

      onPromptChange?.(newText);
    },
    [onPromptChange]
  );

  // Handle blur - sync editing state
  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Handle highlight click
  const handleHighlightClick = useCallback(
    (fieldId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onHighlightClick?.(fieldId);
    },
    [onHighlightClick]
  );

  // Prevent default formatting on paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Empty state
  if (!localPrompt && !editable) {
    return (
      <div
        className={cn(
          'min-h-[180px] flex items-center justify-center text-muted-foreground/50',
          className
        )}
      >
        {placeholder}
      </div>
    );
  }

  // Render with highlights when not editing
  if (!isEditing && highlightsValid && highlights.length > 0) {
    return (
      <TooltipProvider delayDuration={200}>
        <div
          ref={containerRef}
          contentEditable={editable}
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onPaste={handlePaste}
          className={cn(
            'min-h-[180px] w-full',
            'font-mono text-foreground leading-relaxed',
            'focus:outline-none',
            'selection:bg-primary/20',
            editable && 'cursor-text',
            className
          )}
          data-placeholder={placeholder}
        >
          {segments.map((segment, index) =>
            segment.isHighlighted && segment.highlight ? (
              <HighlightSpanElement
                key={`${index}-${segment.highlight.fieldId}`}
                text={segment.text}
                highlight={segment.highlight}
                onClick={handleHighlightClick}
              />
            ) : (
              <span key={index}>{segment.text}</span>
            )
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Render plain text when editing or no highlights
  return (
    <div
      ref={containerRef}
      contentEditable={editable}
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      onPaste={handlePaste}
      className={cn(
        'min-h-[180px] w-full',
        'font-mono text-foreground leading-relaxed',
        'focus:outline-none',
        'selection:bg-primary/20',
        editable && 'cursor-text',
        !localPrompt && 'text-muted-foreground/50',
        className
      )}
      data-placeholder={placeholder}
    >
      {localPrompt || placeholder}
    </div>
  );
}

export default HighlightedPrompt;
