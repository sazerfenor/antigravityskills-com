'use client';

/**
 * SkillTriggers - Trigger phrases display
 *
 * Shows: List of phrases that activate this skill
 */

import { MessageCircle } from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';

interface SkillTriggersProps {
  phrases: string[];
}

export function SkillTriggers({ phrases }: SkillTriggersProps) {
  if (!phrases || phrases.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border-subtle bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        Trigger Phrases
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Use these phrases to activate this skill in your AI coding assistant:
      </p>
      <div className="flex flex-wrap gap-2">
        {phrases.map((phrase, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className="text-xs font-mono bg-muted/30 hover:bg-muted/50 transition-colors cursor-default"
          >
            "{phrase}"
          </Badge>
        ))}
      </div>
    </section>
  );
}
