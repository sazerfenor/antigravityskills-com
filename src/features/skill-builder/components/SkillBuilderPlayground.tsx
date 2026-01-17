'use client';

/**
 * Skill Builder Playground (Split Layout)
 *
 * 左右分栏布局：左边输入，右边预览
 * 用于嵌入主页的 Skill Converter Section
 */

import { useSkillBuilder } from '@/features/skill-builder/hooks/useSkillBuilder';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  Download,
  RotateCcw,
  FileText,
  FolderTree,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { SkillBuilder } from '@/shared/types/blocks/landing';

interface SkillBuilderPlaygroundProps {
  config?: SkillBuilder;
}

export function SkillBuilderPlayground({ config }: SkillBuilderPlaygroundProps) {
  const {
    input,
    progress,
    result,
    error,
    setInput,
    generate,
    reset,
    downloadZip,
  } = useSkillBuilder();

  // Get i18n strings from config with defaults
  const inputLabel = config?.input_label || 'Describe Your Skill';
  const inputPlaceholder = config?.input_placeholder || 'Example: Create a skill that helps write commit messages following Conventional Commits format, analyzes git diffs, and suggests appropriate prefixes like feat:, fix:, docs:...';
  const inputHint = config?.input_hint || 'Describe a new skill in natural language, or paste an existing SKILL.md to refactor.';
  const outputLabel = config?.output_label || 'Generated Skill';
  const outputEmptyTitle = config?.output_empty_title || 'Your generated skill will appear here';
  const outputEmptyHint = config?.output_empty_hint || 'Enter a description and click Generate';
  const buttonGenerate = config?.button_generate || 'Generate Skill';
  const buttonReset = config?.button_reset || 'Create New Skill';
  const buttonDownload = config?.button_download || 'Download';

  const isLoading = ['ANALYZING', 'BUILDING', 'VALIDATING'].includes(progress.phase);
  const hasResult = result !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Panel - Input */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{inputLabel}</h3>
        </div>

        <Textarea
          placeholder={inputPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[280px] resize-none bg-background/50 border-border/50 focus:border-primary/50"
          disabled={isLoading}
        />

        <p className="text-xs text-muted-foreground">
          {inputHint}
        </p>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        <Button
          onClick={hasResult ? reset : generate}
          disabled={isLoading || (!hasResult && !input.trim())}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {progress.phase === 'ANALYZING' && 'Analyzing...'}
              {progress.phase === 'BUILDING' && 'Building...'}
              {progress.phase === 'VALIDATING' && 'Validating...'}
            </>
          ) : hasResult ? (
            <>
              <RotateCcw className="w-4 h-4 mr-2" />
              {buttonReset}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {buttonGenerate}
            </>
          )}
        </Button>
      </div>

      {/* Right Panel - Preview */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FolderTree className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{outputLabel}</h3>
        </div>

        {/* Empty State */}
        {!hasResult && !isLoading && (
          <Card className="border-dashed border-border/50 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center min-h-[280px] text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary/60" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {outputEmptyTitle}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {outputEmptyHint}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center min-h-[280px] text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium mb-1">{progress.message}</p>
              {progress.iteration && progress.iteration > 1 && (
                <p className="text-xs text-muted-foreground">
                  Attempt {progress.iteration}/3
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Result Preview */}
        {hasResult && (
          <div className="space-y-4">
            {/* Validation Score */}
            <Card className="border-border/50">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {result.validation.passed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    Validation
                  </CardTitle>
                  <Badge variant={result.validation.passed ? 'default' : 'secondary'} className="text-xs">
                    {result.validation.score.toFixed(1)} / 10
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* File Preview */}
            <Card className="border-border/50">
              <CardHeader className="py-3 px-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FolderTree className="w-4 h-4" />
                    {result.skill.name}/
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {result.skill.files.length} files
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[180px] overflow-y-auto text-muted-foreground">
                  {result.skill.files.find(f => f.path === 'SKILL.md')?.content.slice(0, 800) || ''}
                  {(result.skill.files.find(f => f.path === 'SKILL.md')?.content.length || 0) > 800 && '\n...'}
                </pre>
              </CardContent>
            </Card>

            {/* Download Button */}
            <Button onClick={downloadZip} className="w-full" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {buttonDownload} {result.skill.name}.zip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
