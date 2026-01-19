'use client';

/**
 * SkillPresets - Preset/Theme showcase
 *
 * Shows: Color palettes, fonts, and best-for use cases
 */

import { Palette, Type } from 'lucide-react';

interface PresetData {
  name: string;
  colors: string[];
  fonts: {
    heading: string;
    body: string;
  };
  bestFor: string;
}

interface SkillPresetsProps {
  presets: PresetData[];
}

export function SkillPresets({ presets }: SkillPresetsProps) {
  if (!presets || presets.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Palette className="w-5 h-5" />
        Available Presets
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border-subtle bg-card overflow-hidden hover:border-primary/30 transition-colors"
          >
            {/* Color Strip */}
            {preset.colors && Array.isArray(preset.colors) && preset.colors.length > 0 && (
              <div className="h-3 flex">
                {preset.colors.map((color, colorIdx) => (
                  <div
                    key={colorIdx}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <h3 className="font-medium text-foreground mb-2">{preset.name}</h3>

              {/* Fonts */}
              {preset.fonts && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Type className="w-3.5 h-3.5" />
                  <span>
                    {preset.fonts.heading || 'Default'} / {preset.fonts.body || 'Default'}
                  </span>
                </div>
              )}

              {/* Best For */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium">Best for:</span> {preset.bestFor}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
