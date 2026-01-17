'use client';

/**
 * Skill Builder Page
 *
 * 主页面：整合所有组件
 */

import { useSkillBuilder } from '@/features/skill-builder/hooks/useSkillBuilder';
import { InputPanel } from '@/features/skill-builder/components/InputPanel';
import { GenerationProgress } from '@/features/skill-builder/components/GenerationProgress';
import { SkillPreview } from '@/features/skill-builder/components/SkillPreview';
import { ExportButton } from '@/features/skill-builder/components/ExportButton';
import { AlertCircle } from 'lucide-react';

export default function SkillBuilderPage() {
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

  const isLoading = ['ANALYZING', 'BUILDING', 'VALIDATING'].includes(progress.phase);
  const hasResult = result !== null;

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Skill Builder
        </h1>
        <p className="text-muted-foreground">
          Create Antigravity Skills from natural language descriptions
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Input Panel - Show when no result */}
        {!hasResult && (
          <InputPanel
            value={input}
            onChange={setInput}
            onGenerate={generate}
            isLoading={isLoading}
          />
        )}

        {/* Progress - Show during generation */}
        {isLoading && (
          <GenerationProgress
            phase={progress.phase}
            message={progress.message}
            iteration={progress.iteration}
          />
        )}

        {/* Result Preview - Show when complete */}
        {hasResult && (
          <>
            <SkillPreview result={result} />
            <ExportButton
              onDownload={downloadZip}
              onReset={reset}
              skillName={result.skill.name}
            />
          </>
        )}
      </div>
    </div>
  );
}
