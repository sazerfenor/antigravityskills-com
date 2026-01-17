'use client';

/**
 * Input Panel Component
 *
 * 用户输入面板：输入需求或粘贴现有 Skill
 */

import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { Sparkles } from 'lucide-react';

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function InputPanel({
  value,
  onChange,
  onGenerate,
  isLoading,
}: InputPanelProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Describe the skill you want to create
        </label>
        <Textarea
          placeholder="Example: Create a skill that helps write commit messages following Conventional Commits format..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] resize-none"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          You can describe a new skill in natural language, or paste an existing SKILL.md to refactor it.
        </p>
      </div>

      <Button
        onClick={onGenerate}
        disabled={isLoading || !value.trim()}
        className="w-full"
        size="lg"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isLoading ? 'Generating...' : 'Generate Skill'}
      </Button>
    </div>
  );
}
