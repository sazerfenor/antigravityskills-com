'use client';

import { forwardRef } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { Sparkles, Layers, Plus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { m, AnimatePresence } from 'framer-motion';
import { GlassOverlay } from '@/shared/components/ui/glass-overlay';
import { DynamicField } from './DynamicField';
import type { DynamicSchema, SchemaField, UIState, GeneratePhase, DynamicFieldRef } from '../types';

// ============================================
// Dynamic Form Panel Component
// Extracted from vision-logic-playground.tsx
// Contains: Loading State, Dynamic Fields, Advanced Section, Follow-up
// ============================================

export interface DynamicFormPanelProps {
  // Schema & Form State
  activeSchema: DynamicSchema | null;
  formValues: Record<string, unknown>;
  onFieldChange: (id: string, value: unknown) => void;
  customInput: string;
  setCustomInput: (v: string) => void;

  // UI State
  uiState: UIState;
  generatePhase: GeneratePhase;
  buildMessage: string;
  /** Build 阶段进度 (0-100)，由父组件传入 */
  buildProgress: number;
  prefersReducedMotion: boolean;

  // Field Focus
  focusedFieldIndex: number;
  setFocusedFieldIndex: (idx: number) => void;

  // Advanced Section
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  showAddDimensionDialog: () => void;

  // Field Refs
  createRefCallback: (field: SchemaField) => (ref: DynamicFieldRef | null) => void;

  // Ambient Gradient
  getAmbientGradient: () => string;
}

export const DynamicFormPanel = forwardRef<HTMLDivElement, DynamicFormPanelProps>(
  function DynamicFormPanel(props, ref) {
    const {
      // Schema & Form State
      activeSchema,
      formValues,
      onFieldChange,
      customInput,
      setCustomInput,
      // UI State
      uiState,
      generatePhase,
      buildMessage,
      buildProgress,
      prefersReducedMotion,
      // Field Focus
      focusedFieldIndex,
      setFocusedFieldIndex,
      // Advanced Section
      showAdvanced,
      setShowAdvanced,
      showAddDimensionDialog,
      // Field Refs
      createRefCallback,
      // Ambient Gradient
      getAmbientGradient,
    } = props;

    return (
      <div className="space-y-6" ref={ref}>
        <AnimatePresence mode="wait">
          {/* Build Loading Overlay - Fixed height, shows during ANALYZING */}
          {uiState === 'ANALYZING' && (
            <m.div
              key="loading-overlay"
              initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: prefersReducedMotion ? 0 : 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="min-h-[500px] relative rounded-xl overflow-hidden"
            >
              <GlassOverlay
                autoSimulate={false}
                progress={buildProgress}
                dynamicMessages={false}
                message={buildMessage || "Initializing Neural Link..."}
                showProgress={true}
                variant="local"
              />
            </m.div>
          )}

          {/* Show form only when NOT ANALYZING and schema is ready */}
          {uiState !== 'ANALYZING' && activeSchema && (
            <m.div
              key="form-active"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -20 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              layout={!prefersReducedMotion}
            >
              <Card
                variant="glass"
                className={cn(
                  "p-6 overflow-hidden relative transition-all duration-200",
                  getAmbientGradient(),
                  // ✅ PRD V6: 生成时表单降级 (仅 Opacity，无 height 动画)
                  (generatePhase === 'OPTIMIZING' || generatePhase === 'GENERATING') && [
                    "opacity-30 pointer-events-none",
                    "transform scale-[0.98]",
                    // 移动端增强：渐隐遮罩效果
                    "md:opacity-30 max-md:[mask-image:linear-gradient(to_bottom,black_20%,transparent_100%)]"
                  ]
                )}
              >
                {/* AC 2.2: Dynamic Ambient Glow - Using primary theme color */}
                <div className={cn(
                  "absolute inset-0 opacity-20 pointer-events-none",
                  "bg-gradient-radial from-primary/30 to-transparent"
                )} />

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 min-w-0">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>Parameters for</span>
                    <span className={cn("truncate max-w-[200px] md:max-w-none text-primary")}>{activeSchema.context}</span>
                  </h3>
                </div>

                <div className="space-y-3 relative">
                  {/* Basic Fields - Always visible */}
                  {activeSchema.fields
                    .filter(field => !field.isAdvanced)
                    .map((field, index) => (
                    <DynamicField
                      key={field.id}
                      ref={createRefCallback(field)}
                      field={field}
                      value={formValues[field.id]}
                      onChange={(v) => onFieldChange(field.id, v)}
                      isFocused={focusedFieldIndex === index}
                      onFocus={() => setFocusedFieldIndex(index)}
                    />
                  ))}

                  {/* Show Advanced Toggle */}
                  {activeSchema.fields.some(f => f.isAdvanced) && (
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full py-2 px-4 rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                      {showAdvanced ? (
                        <>
                          <span>Hide Advanced</span>
                          <span className="text-xs opacity-50">({activeSchema.fields.filter(f => f.isAdvanced).length})</span>
                        </>
                      ) : (
                        <>
                          <span>Show Advanced</span>
                          <span className="text-xs opacity-50">({activeSchema.fields.filter(f => f.isAdvanced).length})</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Advanced Fields - Separate section with clear visual distinction */}
                  <AnimatePresence>
                    {showAdvanced && activeSchema.fields.some(f => f.isAdvanced) && (
                      <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pt-2 border-t border-primary/20 mt-2">
                          <p className="text-xs text-primary/70 uppercase tracking-wider flex items-center gap-2 px-1">
                            <Sparkles className="w-3 h-3" />
                            Advanced Options
                          </p>
                          {activeSchema.fields
                            .filter(field => field.isAdvanced)
                            .map((field, index) => (
                            <m.div
                              key={field.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <DynamicField
                                ref={createRefCallback(field)}
                                field={field}
                                value={formValues[field.id]}
                                onChange={(v) => onFieldChange(field.id, v)}
                              />
                            </m.div>
                          ))}

                          {/* Add Custom Dimension Button - inside Advanced section */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={showAddDimensionDialog}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add Dimension</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Add custom form dimension</TooltipContent>
                          </Tooltip>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Follow-up Question + Custom Input */}
                  <div className="p-3 rounded-lg bg-card/30 border border-border/50 space-y-2">
                    <Label className="text-sm font-medium text-primary/80 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      {activeSchema.followUpQuestion || 'Additional details'}
                    </Label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder=""
                      className="w-full h-20 p-2 rounded-md bg-background/50 border border-border/50 text-sm resize-none focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                </div>
              </Card>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
