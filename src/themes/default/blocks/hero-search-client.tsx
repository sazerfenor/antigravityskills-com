'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { FormEvent, useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface HeroSearchClientProps {
  placeholder: string;
  buttonText: string;
}

// 预设类型
interface PresetOption {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl: string | null;
}

/**
 * Client-only search form for Hero section.
 * Features:
 * - Preset options dropdown on focus (loaded from API)
 * - Click preset to scroll & trigger VisionLogic with full preset data
 * - Manual input also supported
 */
export function HeroSearchClient({ placeholder, buttonText }: HeroSearchClientProps) {
  const [inputValue, setInputValue] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<PresetOption[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [hasLoadedPresets, setHasLoadedPresets] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 预加载预设数据（页面加载时立即请求，消除 focus 时的 Loading 延迟）
  useEffect(() => {
    const loadPresets = async () => {
      if (hasLoadedPresets) return;

      setIsLoadingPresets(true);
      try {
        const response = await fetch('/api/logic/presets');
        const data = await response.json() as {
          code: number;
          data?: { system: PresetOption[] };
        };

        if (data.code === 0 && data.data?.system) {
          // 显示所有系统预设
          setPresets(data.data.system);
          setHasLoadedPresets(true);
        }
      } catch (error) {
        console.error('[HeroSearchClient] Failed to load presets:', error);
      } finally {
        setIsLoadingPresets(false);
      }
    };

    loadPresets();
  }, [hasLoadedPresets]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    navigateToGenerator(inputValue);
  };

  const handlePresetClick = (preset: PresetOption) => {
    setInputValue(preset.slug);
    setShowPresets(false);
    // 使用 preset slug 导航，VisionLogic 会通过 API 加载完整预设数据
    navigateToGenerator(preset.slug, true);
  };

  const navigateToGenerator = (intent: string, isPresetSlug = false) => {
    // First, scroll to generator section
    const generatorSection = document.getElementById('generator');
    if (generatorSection) {
      generatorSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Dispatch custom event to trigger VisionLogic Build directly (no page reload)
    // This is much faster than router.push() which causes full page re-render
    const event = new CustomEvent('visionlogic:build', {
      detail: { intent, isPresetSlug },
    });
    window.dispatchEvent(event);

    // Update URL without navigation (for bookmarking/sharing)
    const param = isPresetSlug ? 'preset' : 'intent';
    window.history.replaceState(null, '', `/?${param}=${encodeURIComponent(intent)}&auto_build=true#generator`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <form
        role="search"
        aria-label="AI Prompt Generator Form"
        className="relative flex items-center group"
        onSubmit={handleSubmit}
      >
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-purple-600/50 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt" />

        <input
          ref={inputRef}
          type="text"
          id="hero-prompt-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowPresets(true)}
          aria-label="Enter your creative idea"
          placeholder={placeholder}
          autoComplete="off"
          inputMode="search"
          enterKeyHint="search"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="relative border-border-medium bg-glass-strong backdrop-blur-xl ring-offset-background placeholder:text-muted-foreground focus-visible:ring-primary/50 flex h-16 w-full rounded-full border px-8 py-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-32 sm:pr-40 shadow-2xl transition-all"
        />

        <Button
          type="submit"
          size="lg"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6 sm:px-8"
        >
          <Sparkles className="mr-2 size-4" />
          {buttonText}
        </Button>
      </form>

      {/* Preset Options Dropdown */}
      <AnimatePresence>
        {showPresets && (
          <m.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-3 z-50"
          >
            <div className="bg-card/95 backdrop-blur-xl border border-border-medium rounded-2xl p-3 shadow-2xl shadow-black/50">
              <p className="text-xs text-muted-foreground px-2 mb-2">
                Quick start with a preset:
              </p>
              {isLoadingPresets ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className={cn(
                        "flex flex-col items-center gap-2 px-3 py-3 rounded-xl",
                        "bg-background/50 hover:bg-primary/10 border border-transparent hover:border-primary/30",
                        "transition-all duration-200",
                        "text-xs font-medium text-foreground"
                      )}
                    >
                      {preset.thumbnailUrl ? (
                        <Image
                          src={preset.thumbnailUrl}
                          alt={preset.name}
                          width={56}
                          height={56}
                          className="rounded-lg object-cover shrink-0"
                          loading="eager"
                          unoptimized={false}
                        />
                      ) : (
                        <span className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </span>
                      )}
                      <span className="truncate text-center w-full">{preset.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
