'use client';

/**
 * SkillContent - Markdown content renderer for SKILL.md
 *
 * Documentation style: Clean, readable, with syntax highlighting
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';

interface SkillContentProps {
  content: string | null;
}

export function SkillContent({ content }: SkillContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!content) {
    return (
      <section className="rounded-xl border border-border-subtle bg-card p-6">
        <p className="text-muted-foreground italic">No skill content available.</p>
      </section>
    );
  }

  // Limit content height when collapsed
  const displayContent = isExpanded ? content : content.slice(0, 2000);
  const needsExpansion = content.length > 2000;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Skill content copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="rounded-xl border border-border-subtle bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-muted/30">
        <h2 className="text-sm font-semibold text-foreground">
          SKILL.md
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="gap-2 h-8"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        <pre
          className={`
            text-sm leading-relaxed whitespace-pre-wrap break-words
            font-mono text-muted-foreground
            ${!isExpanded && needsExpansion ? 'max-h-[400px] overflow-hidden relative' : ''}
          `}
        >
          {displayContent}
          {!isExpanded && needsExpansion && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent" />
          )}
        </pre>

        {/* Expand/Collapse Button */}
        {needsExpansion && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show Full Content ({Math.ceil(content.length / 1000)}k chars)
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
