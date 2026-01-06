'use client';

import { useState, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Slider } from '@/shared/components/ui/slider';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { CharacterMapper } from '@/shared/components/schema/character-mapper';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { m } from 'framer-motion';
import type { SchemaField, DynamicFieldRef } from '../types';

// ============================================
// Dynamic Field Component (Enhanced with Keyboard + Ref)
// ============================================

interface DynamicFieldProps {
  field: SchemaField;
  value: any;
  onChange: (val: any) => void;
  isFocused?: boolean;
  onFocus?: () => void;
}

export const DynamicField = forwardRef<DynamicFieldRef, DynamicFieldProps>(
  function DynamicField(
    { field, value, onChange, isFocused, onFocus },
    ref
  ) {
    // Use defaultValue as fallback for empty values
    const safeValue = value ?? field.defaultValue ?? (field.type === 'slider' ? 0 : '');
    const fieldRef = useRef<HTMLDivElement>(null);
    const [isHighlighted, setIsHighlighted] = useState(false);

    // Expose ref methods for highlight interaction
    useImperativeHandle(ref, () => ({
      focus: () => {
        fieldRef.current?.focus();
      },
      scrollIntoView: () => {
        fieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      highlight: () => {
        setIsHighlighted(true);
        // Auto-clear after animation
        setTimeout(() => setIsHighlighted(false), 2000);
      },
      clearHighlight: () => {
        setIsHighlighted(false);
      },
    }), []);

    // AC 1.2: Keyboard support for sliders
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (field.type === 'slider') {
        const step = field.step || 0.1;
        const currentValue = Number(safeValue);

        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          const newValue = Math.min(currentValue + step, field.max || 1);
          onChange(Number(newValue.toFixed(2)));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          const newValue = Math.max(currentValue - step, field.min || 0);
          onChange(Number(newValue.toFixed(2)));
        }
      }
    };

    // V3.3: Detect if this is an ambiguity resolution field
    const isAmbiguityField = field.source === 'ambiguity_resolution';

    return (
      <m.div
        ref={fieldRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        tabIndex={0}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        className={cn(
          "space-y-2 p-3 rounded-lg bg-card/20 border transition-all duration-300 outline-none",
          isFocused
            ? "border-primary ring-2 ring-primary/30"
            : "border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/30",
          // Highlight animation for field location from prompt click
          isHighlighted && "ring-4 ring-primary/50 border-primary animate-pulse"
        )}
      >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* V3.3: Subtle icon for ambiguity resolution fields */}
          {isAmbiguityField && (
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
          )}
          <Label className="text-sm font-medium text-foreground/90">
            {field.label}
          </Label>
        </div>
        {field.type === 'slider' && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {safeValue}
            {isFocused && <span className="ml-1 text-primary">←→</span>}
          </Badge>
        )}
      </div>

      {field.type === 'slider' && (
        <div className="space-y-1">
          <Slider
            value={[Number(safeValue)]}
            onValueChange={([v]) => onChange(v)}
            max={field.max}
            step={field.step}
            className="w-full py-2"
          />
          {/* Semantic labels for slider endpoints */}
          {(field.minLabel || field.maxLabel) && (
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>{field.minLabel || ''}</span>
              <span>{field.maxLabel || ''}</span>
            </div>
          )}
        </div>
      )}

      {field.type === 'select' && field.options && (
        <SelectFieldContent
          field={field}
          safeValue={safeValue}
          onChange={onChange}
        />
      )}

      {field.type === 'text' && (
        <Input
          value={String(safeValue)}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 bg-background/50"
          tabIndex={-1}
        />
      )}

      {/* V2: Toggle type for boolean constraints */}
      {field.type === 'toggle' && (
        <button
          type="button"
          onClick={() => onChange(!safeValue)}
          className={cn(
            "w-14 h-8 rounded-full transition-all relative",
            safeValue
              ? "bg-primary"
              : "bg-muted"
          )}
        >
          <span
            className={cn(
              "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all",
              safeValue ? "left-7" : "left-1"
            )}
          />
        </button>
      )}

      {/* V3: Character Mapper for multi-character support */}
      {field.type === 'character_mapper' && field.images && (
        <CharacterMapper
          images={field.images.map(img => ({
            index: img.index,
            dataUrl: '', // Will be populated from actual uploaded images
          }))}
          value={Array.isArray(safeValue) ? safeValue : []}
          onChange={(roles) => onChange(roles)}
        />
      )}
    </m.div>
  );
});

// ============================================
// Select Field Content (Extracted for cleaner code)
// ============================================

interface SelectFieldContentProps {
  field: SchemaField;
  safeValue: any;
  onChange: (val: any) => void;
}

const SelectFieldContent = ({ field, safeValue, onChange }: SelectFieldContentProps) => {
  const VISIBLE_COUNT = 4; // Show first 4 options by default
  const [isExpanded, setIsExpanded] = useState(false);

  // Smart Initial Sort: Only sort ONCE on mount, freeze the order afterwards
  // This prevents visual jank when user selects/deselects options
  const frozenOptions = useMemo(() => {
    if (!field.options) return [];
    // Sort selected items first ONLY on initial render
    const initialValue = safeValue;
    return [...field.options].sort((a, b) => {
      const aSelected = Array.isArray(initialValue) ? initialValue.includes(a) : initialValue === a;
      const bSelected = Array.isArray(initialValue) ? initialValue.includes(b) : initialValue === b;
      return (bSelected ? 1 : 0) - (aSelected ? 1 : 0);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.options]); // Only re-sort when options change, NOT when selection changes

  // Single-select mode: multiSelect === false
  const isSingleSelect = field.multiSelect === false;

  // FIX: Detect custom values (values not in predefined options)
  const customValues = useMemo(() => {
    if (!field.options) return [];
    if (Array.isArray(safeValue)) {
      // Multi-select: filter out values not in options
      return safeValue.filter((v: string) => v && !field.options!.includes(v));
    } else {
      // Single-select: check if value is not in options
      if (safeValue && safeValue !== '' && !field.options.includes(safeValue)) {
        return [safeValue];
      }
      return [];
    }
  }, [safeValue, field.options]);

  if (!field.options) return null;

  const visibleOptions = isExpanded ? frozenOptions : frozenOptions.slice(0, VISIBLE_COUNT);
  const hiddenCount = frozenOptions.length - VISIBLE_COUNT;

  // FIX: Handle Other input submission
  const handleOtherSubmit = (newValue: string) => {
    // If input value is in options, just select it
    if (field.options?.includes(newValue)) {
      if (isSingleSelect) {
        onChange(newValue);
      } else {
        // Multi-select: add to array if not already selected
        const currentValues = Array.isArray(safeValue) ? safeValue : [];
        if (!currentValues.includes(newValue)) {
          onChange([...currentValues, newValue]);
        }
      }
      return;
    }

    // Custom value handling
    if (isSingleSelect) {
      // Single-select: replace with new custom value
      onChange(newValue);
    } else {
      // Multi-select: check existing custom values
      const currentCustomValues = customValues;

      if (currentCustomValues.length === 0) {
        // First custom value: clear presets, keep only new value
        onChange([newValue]);
      } else if (currentCustomValues.length < 3) {
        // Already has custom values and not at limit: append
        onChange([...currentCustomValues, newValue]);
      }
      // At 3 custom values limit: ignore
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* FIX: Display custom values as highlighted buttons at the top */}
      {customValues.map((customVal: string) => (
        <button
          key={`custom-${customVal}`}
          type="button"
          tabIndex={-1}
          aria-label={`Custom option: ${customVal}`}
          aria-pressed={true}
          onClick={() => {
            if (isSingleSelect) {
              // Single-select: clear the value
              onChange('');
            } else {
              // Multi-select: remove this custom value
              const remaining = customValues.filter((v: string) => v !== customVal);
              onChange(remaining.length > 0 ? remaining : []);
            }
          }}
          className={cn(
            "px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] flex items-center gap-1.5",
            "border",
            "bg-primary/20 border-primary text-primary shadow-primary/20"
          )}
        >
          <Check className="w-3.5 h-3.5 shrink-0" />
          {customVal}
        </button>
      ))}

      {visibleOptions.map((opt) => {
        const isSelected = Array.isArray(safeValue)
          ? safeValue.includes(opt)
          : safeValue === opt;

        return (
          <button
            key={opt}
            type="button"
            tabIndex={-1}
            aria-label={`Select ${opt}`}
            aria-pressed={isSelected}
            onClick={() => {
              if (isSingleSelect) {
                // Single-select: just set this option (toggle off if already selected)
                onChange(isSelected ? '' : opt);
              } else {
                // Multi-select: add/remove from array
                if (Array.isArray(safeValue)) {
                  if (isSelected) {
                    onChange(safeValue.filter((v: string) => v !== opt));
                  } else {
                    onChange([...safeValue, opt]);
                  }
                } else {
                  onChange(isSelected ? '' : opt);
                }
              }
            }}
            className={cn(
              "px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] flex items-center gap-1.5",
              "border",
              isSelected
                ? "bg-primary/20 border-primary text-primary shadow-primary/20"
                : "bg-card/30 border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
            {opt}
          </button>
        );
      })}

      {/* Expand/Collapse Button */}
      {hiddenCount > 0 && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={isExpanded ? "Collapse options" : "Expand more options"}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] flex items-center justify-center",
            "border",
            isExpanded
              ? "bg-muted/20 border-muted-foreground/50 text-muted-foreground"
              : "bg-card/40 border-primary/50 text-primary hover:bg-primary/10"
          )}
        >
          {isExpanded ? `−` : `+`}
        </button>
      )}

      {/* Custom Input when expanded (for options not in list) */}
      {isExpanded && (
        <input
          type="text"
          placeholder="Other..."
          aria-label="Enter custom option"
          className="px-4 py-2.5 rounded-lg text-sm bg-background/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none w-28 min-h-[44px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              e.preventDefault();
              handleOtherSubmit(e.currentTarget.value.trim());
              e.currentTarget.value = ''; // Clear input (value shown as button)
            }
          }}
        />
      )}
    </div>
  );
};

// ============================================
// Skeleton Component for ANALYZING State
// ============================================

export const DynamicFieldSkeleton = () => (
  <div className="space-y-2 p-3 rounded-lg bg-card/20 border border-border/50">
    <Skeleton className="h-4 w-24 mb-2" />
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-10 w-24 rounded-lg" />
      <Skeleton className="h-10 w-28 rounded-lg" />
      <Skeleton className="h-10 w-20 rounded-lg" />
      <Skeleton className="h-10 w-10 rounded-lg" />
    </div>
  </div>
);
