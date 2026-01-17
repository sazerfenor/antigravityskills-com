'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Sparkles, Copy, Check, RefreshCw, X, Zap } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

export interface PromptOptimizationInlineProps {
  originalPrompt: string;
  optimizedPrompt: string;
  enhancementLogic: string;
  referenceCase: {
    id: string;
    title: string;
    thumbnail: string;
    relevanceReason: string;
  };
  modelAdvantage: string;
  suggestedModifiers: string[];
  tagExplanations?: Array<{
    content: string;
    type: string;
    why: string;
  }>;
  // 🆕 External platform formats
  externalFormats?: {
    midjourney: string;
    dalle: string;
    sd: string;
  };
  onUseOptimized: () => void;
  onReOptimize?: () => void;
  onVibeSelect?: (vibe: string) => void;
  onClose: () => void;
  standalone?: boolean;
}

export function PromptOptimizationInline({
  originalPrompt,
  optimizedPrompt,
  enhancementLogic,
  referenceCase,
  modelAdvantage,
  suggestedModifiers,
  tagExplanations,
  externalFormats,
  onUseOptimized,
  onReOptimize,
  onVibeSelect,
  onClose,
  standalone = false,
}: PromptOptimizationInlineProps) {
  const [copied, setCopied] = useState(false);

  // Tag Styles (Smart Abbreviations)
  const TAGS = {
    anchor: {
      label: 'Subject',
      color: 'border-b-2 border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary shadow-[0_0_10px_-3px_var(--color-primary)]',
      tooltip: 'Core subject of the image'
    },
    subject: {
      label: 'Subject',
      color: 'border-b-2 border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary shadow-[0_0_10px_-3px_var(--color-primary)]',
      tooltip: 'Core subject of the image'
    },
    atmos: { 
      label: 'Atmos', 
      color: 'border-b-2 border-purple-400/50 bg-purple-400/10 hover:bg-purple-400/20 text-purple-300 shadow-[0_0_10px_-3px_rgba(192,132,252,0.3)]',
      tooltip: 'Mood, lighting, and texture'
    },
    detail: { 
      label: 'Detail', 
      color: 'border-b-2 border-emerald-400/50 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 shadow-[0_0_10px_-3px_rgba(52,211,153,0.3)]',
      tooltip: 'Environment and intricate details'
    },
    tech: { 
      label: 'Tech', 
      color: 'border-b-2 border-cyan-400/50 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 shadow-[0_0_10px_-3px_rgba(34,211,238,0.3)]',
      tooltip: 'Camera settings and render style'
    },
  };

  // ===== CategoryTag Helper Component =====
  const CategoryTag = ({
    tagKey,
    config,
    isSelected,
    isActive,
    onClick,
  }: {
    tagKey: string;
    config: { label: string; color: string; tooltip: string };
    isSelected: boolean;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center text-[10px] uppercase font-bold px-2 py-2 rounded-md transition-all duration-300 w-full min-h-[36px] outline-none ${
        isSelected
          ? // 选中态：彩色背景 + 光晕
            `${config.color.split(' ').slice(0, 5).join(' ')} border border-current/30 shadow-[0_0_12px_-3px_currentColor]`
          : // 默认态：只有彩色文字，无背景无光晕
            `${config.color.split(' ').filter(c => c.startsWith('text-')).join(' ')} bg-transparent border border-transparent hover:bg-glass-hint hover:border-border-medium`
      }`}
    >
      <span className="tracking-normal whitespace-nowrap">{config.label}</span>
    </button>
  );

  // ===== ExportFormatItem Helper Component =====
  const ExportFormatItem = ({
    label,
    emoji,
    value,
    color,
  }: {
    label: string;
    emoji: string;
    value: string;
    color: string;
  }) => {
    const [copiedFormat, setCopiedFormat] = useState(false);
    
    const handleCopyFormat = async () => {
      await navigator.clipboard.writeText(value);
      setCopiedFormat(true);
      setTimeout(() => setCopiedFormat(false), 2000);
    };

    return (
      <div className="group relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{emoji}</span>
          <span className={`text-xs font-bold ${color}`}>{label}</span>
        </div>
        <div className="relative bg-background/40 rounded-lg p-3 border border-border-subtle">
          <p className="text-xs text-muted-foreground leading-relaxed pr-12 font-mono break-all">{value}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyFormat}
            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copiedFormat ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    );
  };

  const STYLE_EMOJI: Record<string, string> = {
    'cinematic': '🎬',
    'cyberpunk': '🔮',
    'watercolor': '🎨',
    '3d': '🧸',
    'anime': '✨',
    'realistic': '📷',
    'noir': '🎞️',
    'fantasy': '🧙',
    'minimal': '◻️',
  };

  const getStyleEmoji = (modifier: string): string => {
    const lowerMod = modifier.toLowerCase();
    for (const [key, emoji] of Object.entries(STYLE_EMOJI)) {
      if (lowerMod.includes(key)) return emoji;
    }
    return '🎯';
  };

  const getTooltipForContent = (content: string, type: string): string => {
    const exactMatch = tagExplanations?.find(e => e.content === content);
    if (exactMatch) return exactMatch.why;
    
    const partialMatch = tagExplanations?.find(e => 
      content.includes(e.content) || e.content.includes(content)
    );
    if (partialMatch) return partialMatch.why;
    
    return TAGS[type as keyof typeof TAGS]?.tooltip || '';
  };

  const CATEGORY_SUGGESTIONS: Record<string, { label: string; emoji: string }[]> = {
    subject: [
      { label: 'Character', emoji: '👤' },
      { label: 'Landscape', emoji: '🏔️' },
      { label: 'Portrait', emoji: '👩' },
      { label: 'Architecture', emoji: '🏛️' },
      { label: 'Anime', emoji: '✨' },
      { label: 'Cyberpunk', emoji: '🤖' },
      { label: 'Sci-Fi', emoji: '🚀' },
      { label: 'Fantasy', emoji: '🐉' },
    ],
    atmos: [
      { label: 'Cinematic', emoji: '🎬' },
      { label: 'Golden Hour', emoji: '🌅' },
      { label: 'Studio Lighting', emoji: '💡' },
      { label: 'Neon', emoji: '🌈' },
      { label: 'Dark', emoji: '🌑' },
      { label: 'Ethereal', emoji: '☁️' },
      { label: 'Vintage', emoji: '📼' },
      { label: 'Horror', emoji: '👻' },
    ],
    detail: [
      { label: '8k Resolution', emoji: '💎' },
      { label: 'Masterpiece', emoji: '🏆' },
      { label: 'Highly Detailed', emoji: '🔍' },
      { label: 'Sharp Focus', emoji: '👁️' },
      { label: 'Oil Painting', emoji: '🎨' },
      { label: 'Watercolor', emoji: '🖌️' },
      { label: 'Sketch', emoji: '✏️' },
      { label: 'Minimalist', emoji: '⬜' },
    ],
    tech: [
      { label: 'Macro Lens', emoji: '📷' },
      { label: 'Wide Angle', emoji: '🔭' },
      { label: 'Bokeh', emoji: '🌫️' },
      { label: 'Unreal Engine', emoji: '🎮' },
      { label: 'Octane Render', emoji: '🧊' },
      { label: 'Ray Tracing', emoji: '🔦' },
      { label: 'Long Exposure', emoji: '⌛' },
    ],
  };

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  // Deprecated usage of activeTags for visibility toggling
  // We keep it true to maintain highlight visibility
  const [activeTags] = useState<Record<string, boolean>>({
    anchor: true,
    subject: true,
    atmos: true,
    detail: true,
    tech: true,
  });

  const toggleTag = (key: string) => {
    // If clicking the same category, toggle off (return to default view)
    // If clicking a new category, select it
    setSelectedCategory(prev => prev === key ? null : key);
  };

  const toggleModifier = (modifier: string) => {
    setSelectedModifiers(prev => {
      if (prev.includes(modifier)) {
        return prev.filter(m => m !== modifier);
      } else {
        return [...prev, modifier];
      }
    });
  };

  const handleApplyModifiers = () => {
    if (selectedModifiers.length > 0) {
      const joinedModifiers = selectedModifiers.join(', ');
      onVibeSelect?.(joinedModifiers);
      setSelectedModifiers([]); // Clear selection after applying
    }
  };

  const renderHighlightedPrompt = (text: string) => {
    // Improved regex to handle case-insensitive tags and capture content
    const parts = text.split(/(<\/?(?:anchor|subject|atmos|detail|tech)>)/gi);
    
    const elements: React.JSX.Element[] = [];
    let currentTag: string | null = null;
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        // Check if it is a tag
        const tagMatch = part.match(/^<(\/?)(anchor|subject|atmos|detail|tech)>$/i);
        
        if (tagMatch) {
            const isClosing = tagMatch[1] === '/';
            const tagName = tagMatch[2].toLowerCase();
            
            if (isClosing) {
                currentTag = null;
            } else {
                currentTag = tagName;
            }
            continue; // Don't render the tag itself
        }
        
        // It's content
        if (!part.trim()) {
             if (part) elements.push(<span key={i}>{part}</span>);
             continue;
        }

        if (currentTag) {
             const key = currentTag === 'subject' ? 'subject' : currentTag as keyof typeof TAGS;
             const isActive = activeTags[key];
             const tagConfig = TAGS[key] || TAGS.anchor;
             
             if (!isActive) {
                 elements.push(<span key={i} className="text-muted-foreground transition-colors duration-300">{part}</span>);
             } else {
                 elements.push(
                    <Tooltip key={i}>
                        <TooltipTrigger asChild>
                        <span
                            className={`cursor-help transition-all duration-300 rounded px-1.5 py-0.5 mx-0.5 font-medium ${tagConfig.color}`}
                        >
                            {part}
                        </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-tooltip-bg border-border-medium text-foreground backdrop-blur-md shadow-xl">
                        <p className="text-xs font-medium">{getTooltipForContent(part, currentTag)}</p>
                        </TooltipContent>
                    </Tooltip>
                 );
             }
        } else {
            elements.push(<span key={i} className="text-foreground">{part}</span>);
        }
    }
    
    return elements;
  };

  const cleanPrompt = optimizedPrompt.replace(/<\/?(?:anchor|subject|atmos|detail|tech)>/gi, '');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`w-full h-full flex flex-col gap-6 ${!standalone ? 'mt-6' : ''}`}
    >
      {/* Content Area */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* Transformation Card */}
        <div className="rounded-xl border border-border-subtle overflow-hidden bg-glass-subtle shadow-inner">
          {/* Header & Tags */}
          <div className="p-5 sm:p-6 pb-2 relative bg-gradient-to-b from-glass-hint to-transparent space-y-4">
            <div className="flex items-center justify-between">
              <Badge>✨ Optimized Result</Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              {['subject', 'atmos', 'detail', 'tech'].map((key) => {
                  const config = TAGS[key as keyof typeof TAGS];
                  return (
                    <CategoryTag
                      key={key}
                      tagKey={key}
                      config={config}
                      isSelected={selectedCategory === key}
                      isActive={activeTags[key]}
                      onClick={() => toggleTag(key)}
                    />
                  );
              })}
            </div>
            
             <div className="relative group min-h-[120px] bg-glass-hint rounded-xl p-4 border border-border-subtle">
              <div className="text-base sm:text-lg leading-[1.8] font-serif tracking-wide text-foreground selection:bg-primary/30 selection:text-primary-foreground">
                {renderHighlightedPrompt(optimizedPrompt)}
              </div>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="absolute top-2 right-2 h-7 text-[10px] bg-tooltip-bg backdrop-blur border border-border-medium opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-select-hover hover:text-foreground shadow-lg uppercase tracking-wider"
              >
                {copied ? <Check className="h-3 w-3 mr-1.5 text-green-400" /> : <Copy className="h-3 w-3 mr-1.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        {/* Insight & Suggestions */}
        {/* Insight & Suggestions */}
        <div className="space-y-4">
          {/* Vibe Selection (Now Top) */}
          <div className="flex flex-col gap-3 p-5 rounded-xl border border-border-subtle bg-glass-hint hover:bg-glass-hint-alt transition-colors relative">
             <div className="flex items-center justify-between h-6">
               <div className="flex items-center gap-2">
                 <span className="text-lg">✨</span>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                   {selectedCategory ? `Select ${TAGS[selectedCategory as keyof typeof TAGS]?.label || selectedCategory} Vibes` : 'Select Vibes'}
                 </p>
               </div>
               {selectedModifiers.length > 0 && (
                 <Button
                    size="sm"
                    variant="default"
                    onClick={handleApplyModifiers}
                    className="h-6 text-[10px] px-2 bg-primary text-primary-foreground font-bold shadow-[0_0_10px_-3px_var(--color-primary)] animate-in fade-in zoom-in duration-200"
                 >
                    Apply ({selectedModifiers.length})
                 </Button>
               )}
             </div>
             <div className="flex flex-wrap gap-2">
                {selectedCategory ? (
                  (CATEGORY_SUGGESTIONS[selectedCategory] || []).map((item, i) => {
                    const isSelected = selectedModifiers.includes(item.label);
                    return (
                      <Button 
                        key={i} 
                        variant={isSelected ? "default" : "outline"}
                        size="xs"
                        onClick={() => toggleModifier(item.label)}
                        className="group select-none font-medium"
                      >
                        <span className="flex items-center justify-center w-4 h-4 shrink-0">
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <span className="opacity-50">{item.emoji}</span>
                          )}
                        </span>
                        {item.label}
                      </Button>
                    );
                  })
                ) : (
                  suggestedModifiers.slice(0, 6).map((modifier, i) => {
                    const isSelected = selectedModifiers.includes(modifier);
                    return (
                      <Button 
                        key={i} 
                        variant={isSelected ? "default" : "outline"}
                        size="xs"
                        onClick={() => toggleModifier(modifier)}
                        className="group select-none font-medium"
                      >
                        <span className="flex items-center justify-center w-4 h-4 shrink-0">
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <span className="opacity-50">{getStyleEmoji(modifier)}</span>
                          )}
                        </span>
                        {modifier}
                      </Button>
                    );
                  })
                )}
             </div>
          </div>

          {/* Mentor's Insight (Now Bottom) */}
          <div className="flex flex-col gap-3 p-5 rounded-xl border border-border-subtle bg-glass-hint hover:bg-glass-hint-alt transition-colors relative">
             <div className="flex items-center gap-2 h-6">
                <span className="text-lg">💡</span>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                  Mentor's Insight
                </p>
             </div>
             <p className="text-sm text-text-tertiary/80 leading-relaxed font-light pl-1">{enhancementLogic}</p>
          </div>

          {/* 🆕 External Platform Formats */}
          {externalFormats && (
            <div className="flex flex-col gap-3 p-5 rounded-xl border border-border-subtle bg-glass-hint hover:bg-glass-hint-alt transition-colors relative">
              <div className="flex items-center gap-2 h-6">
                <span className="text-lg">📤</span>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                  Export for Other Platforms
                </p>
              </div>
              <div className="space-y-3">
                {/* CLI Syntax */}
                <ExportFormatItem
                  label="CLI Syntax"
                  emoji="🎨"
                  value={externalFormats.midjourney}
                  color="text-blue-400"
                />
                {/* Natural Language */}
                <ExportFormatItem
                  label="Natural Language"
                  emoji="🖼️"
                  value={externalFormats.dalle}
                  color="text-green-400"
                />
                {/* Weighted Tags */}
                <ExportFormatItem
                  label="Weighted Tags"
                  emoji="🔧"
                  value={externalFormats.sd}
                  color="text-purple-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-border-subtle bg-glass-hint flex justify-between gap-3 mt-auto">
         {onReOptimize && (
          <Button 
            onClick={onReOptimize}
            variant="ghost"
            className="h-10 rounded-lg gap-2 text-text-tertiary hover:bg-glass-hint hover:text-foreground transition-all text-xs uppercase tracking-wider font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-Optimize
          </Button>
        )}
        <Button 
          variant="outline"
          size="default"
          onClick={onUseOptimized} 
          className="flex-1 gap-2"
        >
          <Zap className="h-4 w-4" />
          Use & Generate
        </Button>
      </div>
    </m.div>
  );
}
