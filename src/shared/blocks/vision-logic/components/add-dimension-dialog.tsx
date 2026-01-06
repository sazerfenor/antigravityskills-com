'use client';

import { useState } from 'react';
import { Plus, Loader2, AlertTriangle, Check, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';
import type { DynamicSchemaField } from '@/shared/services/intent-analyzer';

interface AddDimensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFields: (fields: DynamicSchemaField[]) => void;
  existingFields: Array<{ id: string; label: string; type: string }>;
  context: string;
}

interface GeneratedField {
  id: string;
  type: 'select';
  label: string;
  description?: string;
  options?: string[];
  defaultValue?: string;
  multiSelect?: boolean;
  selectedOptions?: string[]; // User's selected options in preview
}

const CREDIT_COST = 1; // 1 credit per batch (regardless of dimension count)
const MAX_DIMENSIONS = 10; // Maximum dimensions per generation

/**
 * Add custom dimension dialog
 * Supports multiple dimensions (comma-separated) with AI-generated options
 * Users can select options in preview before adding
 */
export function AddDimensionDialog({
  open,
  onOpenChange,
  onAddFields,
  existingFields,
  context,
}: AddDimensionDialogProps) {
  const [dimensionInput, setDimensionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [generatedFields, setGeneratedFields] = useState<GeneratedField[]>([]);

  // Parse comma-separated dimensions
  const parseDimensions = (input: string): string[] => {
    return input
      .split(/[,，、]/) // Support comma, Chinese comma, and Chinese enumeration comma
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const handleGenerate = async () => {
    const dimensions = parseDimensions(dimensionInput);
    if (dimensions.length === 0) {
      setError('Please enter at least one dimension name');
      return;
    }

    if (dimensions.length > MAX_DIMENSIONS) {
      setError(`Maximum ${MAX_DIMENSIONS} dimensions per generation`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setWarning(null);
    setGeneratedFields([]);

    try {
      // Single API call for all dimensions (batch generation)
      const response = await fetch('/api/logic/generate-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimensions, // Array of dimension names
          context,
          existingFields,
        }),
      });

      const data = await response.json() as {
        code: number;
        message?: string;
        data?: {
          results?: Array<{
            dimension: string;
            success: boolean;
            field?: GeneratedField;
            warning?: string;
            error?: string;
          }>;
        }
      };

      if (data.code !== 0) {
        setError(data.message || 'Failed to generate');
        return;
      }

      // Process batch results
      const fields: GeneratedField[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];

      for (const result of data.data?.results || []) {
        if (!result.success) {
          errors.push(`${result.dimension}: ${result.error}`);
        } else if (result.field) {
          fields.push({
            ...result.field,
            selectedOptions: result.field.defaultValue ? [result.field.defaultValue] : [],
          });
          if (result.warning) {
            warnings.push(result.warning);
          }
        }
      }

      if (errors.length > 0) {
        setError(errors.join('; '));
      }
      if (warnings.length > 0) {
        setWarning(warnings.join('; '));
      }
      setGeneratedFields(fields);

    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle option selection for a field
  const toggleOption = (fieldIndex: number, option: string) => {
    setGeneratedFields(prev => prev.map((field, i) => {
      if (i !== fieldIndex) return field;

      const selected = field.selectedOptions || [];
      const isSelected = selected.includes(option);

      if (field.multiSelect) {
        // Multi-select: toggle the option
        return {
          ...field,
          selectedOptions: isSelected
            ? selected.filter(o => o !== option)
            : [...selected, option],
        };
      } else {
        // Single-select: replace selection
        return {
          ...field,
          selectedOptions: isSelected ? [] : [option],
        };
      }
    }));
  };

  const handleConfirm = () => {
    if (generatedFields.length === 0) return;

    // Convert to DynamicSchemaField format
    const fields: DynamicSchemaField[] = generatedFields.map(field => ({
      id: field.id,
      type: 'select' as const,
      label: field.label,
      isAdvanced: false,
      multiSelect: field.multiSelect,
      defaultValue: field.selectedOptions?.[0] || field.defaultValue,
      options: field.options,
      source: 'user_constraint' as const,
    }));

    onAddFields(fields);
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setDimensionInput('');
    setError(null);
    setWarning(null);
    setGeneratedFields([]);
  };

  const dimensionCount = parseDimensions(dimensionInput).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* Plus icon with neon glow */}
            <Plus className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
            <span>Add Custom Dimensions</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dimension Name Input */}
          <div className="space-y-2">
            <Label htmlFor="dimension-name">Dimension Names</Label>
            <Input
              id="dimension-name"
              placeholder="e.g. Background, Lighting, Texture..."
              value={dimensionInput}
              onChange={(e) => setDimensionInput(e.target.value)}
              disabled={isLoading || generatedFields.length > 0}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple dimensions with commas to generate them at once
            </p>
          </div>

          {/* Credit Cost Info */}
          {dimensionCount > 0 && generatedFields.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span>Cost: {CREDIT_COST} credit (up to {MAX_DIMENSIONS} dimensions)</span>
            </div>
          )}

          {/* Dimension count warning */}
          {dimensionCount > MAX_DIMENSIONS && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Maximum {MAX_DIMENSIONS} dimensions per generation
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Warning Message */}
          {warning && (
            <div className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {/* Generated Fields Preview */}
          {generatedFields.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click options to select your preferences:
              </p>

              {generatedFields.map((field, fieldIndex) => (
                <div key={field.id} className="space-y-2 p-4 bg-glass-subtle backdrop-blur-sm rounded-xl border border-border-medium/50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{field.label}</span>
                    {field.multiSelect && (
                      <span className="text-xs text-muted-foreground">multi-select</span>
                    )}
                  </div>

                  {field.description && (
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  )}

                  {/* Clickable Options - matching DynamicField style */}
                  {field.options && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.options.map((option, i) => {
                        const isSelected = field.selectedOptions?.includes(option);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleOption(fieldIndex, option)}
                            className={cn(
                              "px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] flex items-center gap-1.5",
                              "border",
                              isSelected
                                ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_-3px_rgba(250,204,21,0.5)]"
                                : "bg-glass-subtle border-border-medium/50 text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-glass-hint"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <DialogClose asChild>
            <Button variant="ghost" disabled={isLoading}>Cancel</Button>
          </DialogClose>

          {generatedFields.length === 0 ? (
            <Button
              variant="glow-primary"
              onClick={handleGenerate}
              disabled={isLoading || dimensionCount === 0 || dimensionCount > MAX_DIMENSIONS}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate ({CREDIT_COST} credit)</>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setGeneratedFields([])}
              >
                Regenerate
              </Button>
              <Button
                variant="glow-primary"
                onClick={handleConfirm}
              >
                Add {generatedFields.length} Dimension{generatedFields.length > 1 ? 's' : ''}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
