'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Loader2, Sparkles, BrainCircuit, Layers, CheckCircle, Pencil } from 'lucide-react';
import { CopyButton } from '@/shared/components/copy-button';
import { GlassOverlay } from '@/shared/components/ui/glass-overlay';
import { ShareDialog } from '@/shared/components/share-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { AddDimensionDialog } from './components/add-dimension-dialog';
import { cn } from '@/shared/lib/utils';
import { m, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { showCreditsUpsell } from '@/shared/lib/toast-utils';
import { uploadImageFile } from '../common/image-uploader';

// Image Generation imports
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import {
  MODEL_OPTIONS,
  POLL_INTERVAL,
  GENERATION_TIMEOUT,
  parseTaskResult,
  extractImageUrls,
  calculateCreditCost,
} from '@/shared/hooks/use-image-generation';
import { parseApiResponse } from '@/shared/types/api';
import { useAppContext } from '@/shared/contexts/app';
import { useDebug } from '@/shared/contexts/debug';
import type { CommunityPost } from '@/shared/models/community_post';

// Refactored imports
import type { SchemaField, DynamicSchema, UIState, GeneratePhase, PromptHighlights } from './types';
import { buildPLO, parseReferenceIntent } from './utils';
import { useReducedMotion, useFieldRefs, useLoadingMessage, useSimulatedProgress, useSmartScroll, usePhaseTimer } from './hooks';

// ============================================
// State Persistence Types (Login Recovery)
// ============================================
interface VLPendingState {
  input: string;
  activeSchema: DynamicSchema | null;
  formValues: Record<string, any>;
  touchedFieldIds?: string[];  // V3.2: Array of touched field IDs (Set<string> converted for JSON)
  promptNative: string;
  promptEnglish: string;
  detectedLang: string;
  model: string;
  aspectRatio: string;
  uploadedImageUrls: string[];
  useReferenceImages: boolean;
  customInput: string;
  timestamp: number;
}

const VL_PENDING_STATE_KEY = 'vl-pending-login-state';
const VL_STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

import { DynamicField, DynamicFieldSkeleton, DynamicFormPanel, ReferenceImagesPanel, ImagePreviewDialog, PromptOutputPanel, HeroInputSection, PresetSelector, type PresetItem } from './components';
import { HighlightedPrompt } from './components/HighlightedPrompt';
import {
  BUILD_MESSAGE_POOL_TEXT,
  BUILD_MESSAGE_POOL_WITH_IMAGES,
  OPTIMIZE_MESSAGE_POOL_TEXT,
  OPTIMIZE_MESSAGE_POOL_WITH_IMAGES,
  GENERATE_MESSAGE_POOL,
  INTENT_SUGGESTIONS,
  BUILD_THRESHOLDS,
  OPTIMIZE_THRESHOLDS,
  IMAGE_ANALYSIS_MESSAGES,
  pickRandom,
} from './constants/loading-messages';

// ============================================
// Smart Remix: Content Field IDs to Reset
// ============================================
// Content fields describe "what to draw" (subject/scene).
// When user uploads new reference image in Remix mode, these should be cleared.
// Style fields (art_style, lighting, etc.) are preserved.
const CONTENT_FIELD_IDS = [
  'main_subject_description',
  'scene_description',
  'preservedDetails',
  // Future: Add pattern-based matching for /^character_/i, /^clothing/i
] as const;

// Smart Remix V2: Field patterns for intelligent merge during Build
const STYLE_FIELD_PATTERNS = [
  /^art_style/i, /^ghibli/i, /^color_/i, /^lighting/i,
  /^stylization/i, /^style_/i, /^composition/i, /^reference_intent/i,
  /^camera/i, /^lens/i, /^mood/i, /^atmosphere/i
];

const CONTENT_FIELD_PATTERNS = [
  /^scene_description/i, /^family_/i, /^subject_/i,
  /^character_/i, /^preservedDetails/i, /^main_subject/i,
  /^person_/i, /^clothing/i, /^pose/i, /^expression/i
];

/**
 * Smart Remix V2.1: Merge form values during Build in Remix mode
 * - Style fields: Keep previous value UNLESS user explicitly requested a new style
 * - Content fields: Use new AI-analyzed values (based on new image)
 *
 * Fix: Detect explicit style change intent by comparing AI-analyzed newDefaults
 *      with previous values. If different, user likely wants the new style.
 */
function mergeFormValuesForRemix(
  prevValues: Record<string, any>,
  newDefaults: Record<string, any>,
  newSchema: DynamicSchema
): Record<string, any> {
  const merged: Record<string, any> = { ...newDefaults };

  for (const [fieldId, prevValue] of Object.entries(prevValues)) {
    // Skip if field doesn't exist in new schema
    const newField = newSchema.fields.find(f => f.id === fieldId);
    if (!newField) continue;

    // Skip if previous value is empty
    if (prevValue === undefined || prevValue === null || prevValue === '') continue;

    // Check field category
    const isStyleField = STYLE_FIELD_PATTERNS.some(p => p.test(fieldId));
    const isContentField = CONTENT_FIELD_PATTERNS.some(p => p.test(fieldId));

    if (isStyleField && !isContentField) {
      const newValue = newDefaults[fieldId];
      // Check if AI analyzed a different style from user's new prompt
      const hasExplicitStyleChange = newValue && newValue !== prevValue;

      if (hasExplicitStyleChange) {
        // User explicitly requested a new style (e.g., "Make it Studio Ghibli")
        // Use the AI-analyzed new value instead of preserving old style
        merged[fieldId] = newValue;
        console.log(`[SmartRemix] Style field "${fieldId}" updated: "${prevValue}" → "${newValue}" (user intent detected)`);
      } else {
        // No explicit style change, preserve previous value
        merged[fieldId] = prevValue;
      }
    }
    // Content Fields use newDefaults (already set)
  }

  return merged;
}

// ============================================
// Props Interface (Remix Support)
// ============================================

interface VisionLogicPlaygroundProps {
  remixData?: CommunityPost | null;
}

// ============================================
// Main Component: VisionLogic Playground v2.1
// ============================================

export function VisionLogicPlayground({ remixData }: VisionLogicPlaygroundProps = {}) {
  // App Context (for user/credits)
  const { user, isCheckSign, setIsShowSignModal, fetchUserCredits } = useAppContext();
  // Debug Panel
  const { pushDebug } = useDebug();
  // URL Parameters (for Hero input integration)
  const searchParams = useSearchParams();
  // Track last processed intent to detect URL changes (not just processed once)
  const [lastProcessedIntent, setLastProcessedIntent] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [uiState, setUIState] = useState<UIState>('IDLE');
  const [activeSchema, setActiveSchema] = useState<DynamicSchema | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  // V3.2: Track which fields user has touched (for defaultValue fallback logic)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  // Track last compiled state to skip redundant recompiles
  const [lastCompiledFormValues, setLastCompiledFormValues] = useState<Record<string, any> | null>(null);
  const [lastCompiledCustomInput, setLastCompiledCustomInput] = useState<string | null>(null);
  // Bilingual prompt states
  const [promptNative, setPromptNative] = useState('');
  const [promptEnglish, setPromptEnglish] = useState('');
  const [detectedLang, setDetectedLang] = useState('English');
  // Prompt Highlights for interactive UI (PRD: Prompt 高亮交互系统)
  const [promptHighlights, setPromptHighlights] = useState<PromptHighlights>({ native: [], english: [] });
  // Field refs for highlight click navigation (extracted to hook)
  const { createRefCallback, handleHighlightClick: fieldRefsHandleHighlight } = useFieldRefs();
  const [useEnglishForGeneration, setUseEnglishForGeneration] = useState(true);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const [focusedFieldIndex, setFocusedFieldIndex] = useState<number>(-1);
  const [commandOpen, setCommandOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customInput, setCustomInput] = useState(''); // User text for brand names, details, etc.
  const [images, setImages] = useState<File[]>([]); // V3: Image uploads for multimodal analysis
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image Generation States
  const [model, setModel] = useState(MODEL_OPTIONS[0]?.value ?? '');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ id: string; url: string; aiTaskId?: string }[]>([]);
  const [imageTaskId, setImageTaskId] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState(0);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  // Auto-generate flag: trigger generation after login state restore
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(false);
  
  // Generate Flow State Machine (PRD V4: Accordion Mode & Unified Loading)
  const [generatePhase, setGeneratePhase] = useState<GeneratePhase>('IDLE');
  
  // Download & Share States
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(null);
  const [currentAiTaskId, setCurrentAiTaskId] = useState<string | null>(null);
  const [isSharingToCommunity, setIsSharingToCommunity] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string>('');
  const [showAddDimensionDialog, setShowAddDimensionDialog] = useState(false);
  
  // Image-to-Image: Uploaded image URLs for generation
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  
  // Image-to-Image: Reference images state
  const [useReferenceImages, setUseReferenceImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [refSectionOpen, setRefSectionOpen] = useState(false);

  // Smart Remix: Track if remix data has been initialized (to prevent clearing on first load)
  const isRemixInitialized = useRef(false);

  // Track if preset was loaded via event (to prevent Smart Default from overwriting)
  const isPresetLoadedViaEvent = useRef(false);

  // Smart Remix V2: Track Remix mode for intelligent Build merging
  const [isRemixMode, setIsRemixMode] = useState(false);
  const remixFormValuesRef = useRef<Record<string, any> | null>(null);
  const remixSchemaRef = useRef<DynamicSchema | null>(null);
  const prevUploadedImageUrlsRef = useRef<string[]>([]);

  // ✅ PRD V6: prefers-reduced-motion 检测 (extracted to hook)
  const prefersReducedMotion = useReducedMotion();

  // ✅ 开发调试计时器 (只在开发环境输出)
  const buildTimer = usePhaseTimer({ phaseName: 'Build' });
  const optimizeTimer = usePhaseTimer({ phaseName: 'Optimize' });
  const generateTimer = usePhaseTimer({ phaseName: 'Generate' });

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const commandCardRef = useRef<HTMLDivElement>(null);

  // ================================================
  // State Persistence: Save before login, restore after
  // ================================================

  // Save current state to sessionStorage (called before login redirect)
  const saveStateBeforeLogin = useCallback(() => {
    if (typeof window === 'undefined') return;

    const stateToSave: VLPendingState = {
      input,
      activeSchema,
      formValues,
      touchedFieldIds: Array.from(touchedFields),  // V3.2: Convert Set to Array for JSON
      promptNative,
      promptEnglish,
      detectedLang,
      model,
      aspectRatio,
      uploadedImageUrls,
      useReferenceImages,
      customInput,
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(VL_PENDING_STATE_KEY, JSON.stringify(stateToSave));
      pushDebug('vision-logic', 'State Saved Before Login', {
        hasSchema: !!activeSchema,
        fieldsCount: activeSchema?.fields.length ?? 0,
        hasPrompt: !!(promptNative || promptEnglish),
      });
    } catch (e) {
      console.warn('[VisionLogic] Failed to save state:', e);
    }
  }, [input, activeSchema, formValues, touchedFields, promptNative, promptEnglish, detectedLang, model, aspectRatio, uploadedImageUrls, useReferenceImages, customInput, pushDebug]);

  // Restore state from sessionStorage after login
  useEffect(() => {
    // Only attempt restore when user becomes available
    if (!user?.id) return;
    if (typeof window === 'undefined') return;

    try {
      const savedStateJson = sessionStorage.getItem(VL_PENDING_STATE_KEY);
      if (!savedStateJson) return;

      const savedState: VLPendingState = JSON.parse(savedStateJson);

      // Check if state is still valid (within expiry window)
      if (Date.now() - savedState.timestamp > VL_STATE_EXPIRY_MS) {
        sessionStorage.removeItem(VL_PENDING_STATE_KEY);
        pushDebug('vision-logic', 'Saved State Expired', {
          savedAt: new Date(savedState.timestamp).toISOString(),
        });
        return;
      }

      // Check if there's meaningful state to restore
      const hasMeaningfulState = savedState.activeSchema || savedState.promptNative || savedState.promptEnglish;
      if (!hasMeaningfulState) {
        sessionStorage.removeItem(VL_PENDING_STATE_KEY);
        return;
      }

      // Restore all state
      if (savedState.input) setInput(savedState.input);
      if (savedState.activeSchema) {
        setActiveSchema(savedState.activeSchema);
        setUIState('FORM_ACTIVE');
      }
      if (savedState.formValues) {
        setFormValues(savedState.formValues);
        setLastCompiledFormValues(savedState.formValues);
      }
      // V3.2: Restore touched fields (convert array back to Set)
      if (savedState.touchedFieldIds?.length) {
        setTouchedFields(new Set(savedState.touchedFieldIds));
      }
      if (savedState.promptNative) setPromptNative(savedState.promptNative);
      if (savedState.promptEnglish) setPromptEnglish(savedState.promptEnglish);
      if (savedState.detectedLang) setDetectedLang(savedState.detectedLang);
      if (savedState.model) setModel(savedState.model);
      if (savedState.aspectRatio) setAspectRatio(savedState.aspectRatio);
      if (savedState.uploadedImageUrls?.length > 0) {
        setUploadedImageUrls(savedState.uploadedImageUrls);
        setRefSectionOpen(true);
      }
      if (savedState.useReferenceImages) setUseReferenceImages(savedState.useReferenceImages);
      if (savedState.customInput) setCustomInput(savedState.customInput);

      // Clear saved state after successful restore
      sessionStorage.removeItem(VL_PENDING_STATE_KEY);

      pushDebug('vision-logic', 'State Restored After Login', {
        input: savedState.input,
        hasSchema: !!savedState.activeSchema,
        hasPrompt: !!(savedState.promptNative || savedState.promptEnglish),
      });

      toast.success('Resuming your generation...');

      // Scroll to the VisionLogic component after restore
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 100);

      // Set flag to auto-generate after state is restored
      // Only auto-generate if we have a schema (user was ready to generate)
      if (savedState.activeSchema) {
        setPendingAutoGenerate(true);
      }
    } catch (e) {
      console.warn('[VisionLogic] Failed to restore state:', e);
      sessionStorage.removeItem(VL_PENDING_STATE_KEY);
    }
  }, [user?.id, pushDebug]);

  // ================================================
  // Credit Cost Calculation (Dynamic based on model & form state)
  // ================================================

  // 方案 D 核心逻辑：
  // - Generate Image (One-Click): compile 免费，只收图片生成费用
  // - Refine Prompt (单独使用): 收取 1 credit
  // - Use This Prompt (单独使用): 收取图片生成费用

  const compileCost = 1; // Refine Prompt 单独使用时的费用

  // 🔴 Bug Fix: 必须根据当前 scene 动态计算积分
  // image-to-image 场景需要 2x 积分（sceneMultiplier = 2）
  const currentScene = useReferenceImages && uploadedImageUrls.length > 0
    ? 'image-to-image'
    : 'text-to-image';

  const generateCost = useMemo(() => {
    return calculateCreditCost(model, 1, resolution, currentScene);
  }, [model, resolution, currentScene]);

  // One-Click Generate 只需要 generateCost（compile 免费）
  const totalCost = generateCost;

  // Check if credits are still loading (user exists but credits not yet fetched)
  const isCreditsLoading = !!(user?.id && user?.credits?.remainingCredits === undefined);
  const remainingCredits = user?.credits?.remainingCredits ?? 0;
  const insufficientCredits = !isCreditsLoading && remainingCredits < totalCost;

  // ================================================
  // 动态上下文：图片相关状态 (用于进度条阈值和消息池选择)
  // ================================================
  const buildContext = useMemo(() => ({
    hasImages: images.length > 0 || (useReferenceImages && uploadedImageUrls.length > 0),
    imageCount: images.length || uploadedImageUrls.length,
  }), [images.length, useReferenceImages, uploadedImageUrls.length]);

  // Build 阶段阈值（根据图片数量动态调整）
  const buildThresholds = useMemo(() => {
    if (!buildContext.hasImages) return [...BUILD_THRESHOLDS.TEXT_ONLY];
    if (buildContext.imageCount === 1) return [...BUILD_THRESHOLDS.SINGLE_IMAGE];
    // 多图：每张额外 +3秒
    return [
      BUILD_THRESHOLDS.MULTI_IMAGE_BASE[0] + (buildContext.imageCount - 1) * 1500,
      BUILD_THRESHOLDS.MULTI_IMAGE_BASE[1] + (buildContext.imageCount - 1) * 3000,
    ];
  }, [buildContext]);

  // Optimize 阶段阈值（区分有图/无图）
  const optimizeThresholds = useMemo(() => {
    return buildContext.hasImages
      ? [...OPTIMIZE_THRESHOLDS.WITH_IMAGES]
      : [...OPTIMIZE_THRESHOLDS.TEXT_ONLY];
  }, [buildContext.hasImages]);

  // 动态消息池选择（有图/无图场景）
  const buildMessagePool = useMemo(() => {
    return buildContext.hasImages
      ? BUILD_MESSAGE_POOL_WITH_IMAGES
      : BUILD_MESSAGE_POOL_TEXT;
  }, [buildContext.hasImages]);

  const optimizeMessagePool = useMemo(() => {
    return buildContext.hasImages
      ? OPTIMIZE_MESSAGE_POOL_WITH_IMAGES
      : OPTIMIZE_MESSAGE_POOL_TEXT;
  }, [buildContext.hasImages]);

  // ================================================
  // Build Phase Loading Message (extracted to hook)
  // ================================================
  const { message: buildMessage } = useLoadingMessage({
    isActive: uiState === 'ANALYZING',
    messagePool: buildMessagePool,
    slots: ['STARTUP', 'PROCESSING', 'FINALIZING'] as const,
    slotThresholds: buildThresholds,
    dynamicOptions: buildContext,
    imageAnalysisTemplate: buildContext.hasImages
      ? IMAGE_ANALYSIS_MESSAGES.getAnalyzingMessage
      : undefined,
  });

  // ================================================
  // Build Phase Progress (unified Hook - external control)
  // 使用与 useLoadingMessage 相同的阈值，确保进度和消息同步
  // ================================================
  const buildProgress = useSimulatedProgress({
    isActive: uiState === 'ANALYZING',
    startProgress: 15,
    maxProgress: 85,
    slotThresholds: buildThresholds,
    // 预估时间：最后阈值 + 20% 缓冲
    estimatedDuration: buildThresholds[buildThresholds.length - 1] * 1.2,
  });

  // ================================================
  // Optimize Phase Loading Message (extracted to hook)
  // ================================================
  const { message: optimizeMessage } = useLoadingMessage({
    isActive: generatePhase === 'OPTIMIZING',
    messagePool: optimizeMessagePool,
    slots: ['ANALYZING', 'CRAFTING', 'POLISHING'] as const,
    slotThresholds: optimizeThresholds,
  });

  // ================================================
  // Optimize Phase Progress (unified Hook - external control)
  // 使用与 useLoadingMessage 相同的阈值，确保进度和消息同步
  // ================================================
  const optimizeProgress = useSimulatedProgress({
    isActive: generatePhase === 'OPTIMIZING',
    startProgress: 20,
    maxProgress: 85,
    slotThresholds: optimizeThresholds,
    // 预估时间：最后阈值 + 20% 缓冲
    estimatedDuration: optimizeThresholds[optimizeThresholds.length - 1] * 1.2,
  });

  // ================================================
  // Remix Support: Auto-fill from server-provided data
  // ================================================
  useEffect(() => {
    if (!remixData) return;

    // Try to parse params to check for VisionLogic v2 format
    let parsedParams: any = null;
    if (remixData.params) {
      try {
        parsedParams = JSON.parse(remixData.params);
      } catch (e) {
        console.warn('[Remix] Failed to parse params:', e);
      }
    }

    // V2 Format: Complete form state saved - instant restore!
    if (parsedParams?.version === 2 && parsedParams.schema) {
      // Restore schema
      setActiveSchema(parsedParams.schema);

      // Restore form values
      if (parsedParams.formValues) {
        setFormValues(parsedParams.formValues);
        // Also set lastCompiledFormValues so needsRecompile = false
        setLastCompiledFormValues(parsedParams.formValues);
      }

      // Restore prompts
      if (parsedParams.promptNative) {
        setPromptNative(parsedParams.promptNative);
      }
      if (parsedParams.promptEnglish) {
        setPromptEnglish(parsedParams.promptEnglish);
      }
      if (parsedParams.detectedLang) {
        setDetectedLang(parsedParams.detectedLang);
      }

      // Remix mode: clear input - user should enter new idea
      // Original prompt is already displayed in GENERATED PROMPT section below
      setInput('');

      // Set UI state to show form
      setUIState('FORM_ACTIVE');

      // Smart Remix: Mark as initialized to enable content field clearing on image change
      isRemixInitialized.current = true;

      // Smart Remix V2: Enable intelligent merge mode for subsequent Builds
      setIsRemixMode(true);
      remixFormValuesRef.current = parsedParams.formValues || {};
      remixSchemaRef.current = parsedParams.schema;
      prevUploadedImageUrlsRef.current = parsedParams.uploadedImageUrls || [];

      // Smart Remix V3: Restore model, aspectRatio, and promptHighlights for complete state restoration
      if (parsedParams.model) {
        const validModel = MODEL_OPTIONS.find(m => m.value === parsedParams.model);
        if (validModel) {
          setModel(parsedParams.model);
        }
      }
      if (parsedParams.aspectRatio) {
        setAspectRatio(parsedParams.aspectRatio);
      }
      // PRIVACY: Do NOT restore uploadedImageUrls - original author's reference images are private
      // Remix users should upload their own reference images if needed
      if (parsedParams.promptHighlights) {
        setPromptHighlights(parsedParams.promptHighlights);
      }

      // Display original post's generated image as reference preview
      // This is public content (already shared to community), not private reference images
      if (remixData.imageUrl) {
        setGeneratedImages([{
          id: `remix-source-${remixData.id}`,
          url: remixData.imageUrl,
          aiTaskId: remixData.aiTaskId || undefined,
        }]);
      }

      // Show helpful toast based on whether original had reference images
      if (parsedParams.uploadedImageUrls?.length > 0) {
        toast.success('Remix loaded! Upload your own reference image to create a similar style.');
      } else {
        toast.success('Remix loaded! Adjust parameters and regenerate.');
      }
      return;
    }

    // V1 / Legacy Format: Need to re-analyze
    // Fill input with remix prompt
    if (remixData.prompt) {
      setInput(remixData.prompt);
    }

    // Fill model (validate against MODEL_OPTIONS)
    if (remixData.model) {
      const validModel = MODEL_OPTIONS.find(m => m.value === remixData.model);
      if (validModel) {
        setModel(remixData.model);
      }
    }

    // Fill aspectRatio
    if (remixData.aspectRatio) {
      setAspectRatio(remixData.aspectRatio);
    }

    // Display original post's generated image as reference preview (V1/Legacy)
    if (remixData.imageUrl) {
      setGeneratedImages([{
        id: `remix-source-${remixData.id}`,
        url: remixData.imageUrl,
        aiTaskId: remixData.aiTaskId || undefined,
      }]);
    }

    toast.success('Remix loaded! Adjust parameters below.');

    // Auto-trigger intent analysis to generate dynamic form
    if (remixData.prompt) {
      setTimeout(() => analyzeIntent(remixData.prompt!), 300);
    }
  }, [remixData]);

  // ================================================
  // Smart Remix: Clear content fields when reference image changes
  // ================================================
  useEffect(() => {
    // Skip if not initialized (avoid clearing on first Remix load)
    if (!isRemixInitialized.current) return;

    // Skip if no active schema
    if (!activeSchema) return;

    // Skip if no uploaded images (user removed all images - keep form values)
    if (uploadedImageUrls.length === 0) return;

    // Smart Remix V2: Check for actual URL content change (not just count)
    // This handles cases like: delete 1 image + upload 1 new image (count stays same)
    const arraysEqual = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    };

    const hasRealChange = !arraysEqual(uploadedImageUrls, prevUploadedImageUrlsRef.current);
    if (!hasRealChange) return;

    // Update the ref for next comparison
    prevUploadedImageUrlsRef.current = [...uploadedImageUrls];

    // Clean content fields (preserve style fields)
    setFormValues(prev => {
      const cleaned = { ...prev };
      let clearedCount = 0;
      CONTENT_FIELD_IDS.forEach(id => {
        if (id in cleaned && cleaned[id]) {
          cleaned[id] = '';
          clearedCount++;
        }
      });

      // Only log if something was actually cleared
      if (clearedCount > 0) {
        console.log(`[SmartRemix] Cleared ${clearedCount} content field(s)`);
      }

      return cleaned;
    });

    // Reset initialization flag (one-time trigger per image change)
    isRemixInitialized.current = false;

    // Notify user with toast
    toast.info('Style preserved. Please describe your new subject.');

    // Auto-focus to first content field
    setTimeout(() => {
      const firstContentField = activeSchema.fields.find(
        f => CONTENT_FIELD_IDS.includes(f.id as typeof CONTENT_FIELD_IDS[number]) && f.type === 'text'
      );
      if (firstContentField) {
        const fieldEl = document.querySelector(`[data-field-id="${firstContentField.id}"]`) as HTMLInputElement;
        fieldEl?.focus();
      }
    }, 100);

  }, [uploadedImageUrls, activeSchema]); // Trigger on actual URL array change

  // ================================================
  // URL Intent Parameter: Auto-trigger Build from Hero input
  // Enhanced for Smart Remix Access (PRD-Smart-Remix-Access-v1.0)
  // ================================================
  useEffect(() => {
    // Skip if remix data takes priority
    if (remixData) return;

    const intentParam = searchParams.get('intent');
    const autoBuild = searchParams.get('auto_build') === 'true';

    // Only process if intent has changed (allows re-triggering with new intent)
    if (intentParam && autoBuild && intentParam !== lastProcessedIntent) {
      // Mark this intent as processed
      setLastProcessedIntent(intentParam);

      // ===== Smart Remix Access: Enhanced URL parameter handling =====
      const isRemixIntent = intentParam === 'remix';
      const promptParam = searchParams.get('prompt');
      const modelParam = searchParams.get('model');
      const aspectRatioParam = searchParams.get('aspect_ratio');
      const sourceId = searchParams.get('source_id');

      // For remix intent, use prompt param; otherwise use intent as input
      const inputValue = isRemixIntent && promptParam ? promptParam : intentParam;
      setInput(inputValue);

      // Set model if provided and valid
      if (modelParam) {
        const validModel = MODEL_OPTIONS.find(m => m.value === modelParam);
        if (validModel) {
          setModel(modelParam);
        }
      }

      // Set aspectRatio if provided
      if (aspectRatioParam) {
        setAspectRatio(aspectRatioParam);
      }

      pushDebug('vision-logic', 'URL Intent Detected', {
        intent: intentParam,
        isRemix: isRemixIntent,
        prompt: promptParam?.slice(0, 50),
        model: modelParam,
        aspectRatio: aspectRatioParam,
        sourceId,
        autoBuild,
        previousIntent: lastProcessedIntent
      });

      // Show welcome toast for remix
      if (isRemixIntent) {
        toast.success('Remix loaded! Adjust parameters and generate.');
      }

      // Trigger Build after a short delay
      setTimeout(() => analyzeIntent(inputValue), 300);
    }
  }, [searchParams, lastProcessedIntent, remixData, pushDebug]);

  // ================================================
  // Custom Event Listener: Direct Build trigger from Hero (no page reload)
  // ================================================
  useEffect(() => {
    const handleHeroBuild = async (e: Event) => {
      const customEvent = e as CustomEvent<{ intent: string; isPresetSlug?: boolean }>;
      const { intent, isPresetSlug } = customEvent.detail;
      if (!intent) return;

      pushDebug('vision-logic', 'Hero Build Event Received', { intent, isPresetSlug });

      // V15.0: If it's a preset slug, load from API and apply directly
      if (isPresetSlug) {
        // Mark that preset was loaded via event (prevent Smart Default from overwriting)
        isPresetLoadedViaEvent.current = true;
        try {
          const response = await fetch(`/api/logic/presets/${intent}`);
          const data = await response.json() as {
            code: number;
            data?: {
              id: string;
              name: string;
              params: {
                version?: number;
                schema?: DynamicSchema;
                formValues?: Record<string, unknown>;
                promptEnglish?: string;
                promptNative?: string;
                promptHighlights?: PromptHighlights;
                model?: string;
                aspectRatio?: string;
              };
              thumbnailUrl?: string;
              imageUrl?: string;
            };
          };

          if (data.code === 0 && data.data?.params?.schema) {
            const params = data.data.params;
            const schema = params.schema!;
            // Apply preset directly (same logic as applyPresetData)
            setActiveSchema(schema);
            setFormValues(params.formValues || {});
            if (params.promptEnglish) setPromptEnglish(params.promptEnglish);
            if (params.promptNative) setPromptNative(params.promptNative);
            if (params.promptHighlights) setPromptHighlights(params.promptHighlights);
            if (params.model) setModel(params.model);
            if (params.aspectRatio) setAspectRatio(params.aspectRatio);
            // 将预设图片显示在生成区域（而不是弹窗）
            if (data.data.imageUrl || data.data.thumbnailUrl) {
              const presetImageUrl = data.data.imageUrl || data.data.thumbnailUrl || '';
              setGeneratedImages([{ id: 'preset-preview', url: presetImageUrl }]);
            }
            setInput(schema.context || intent);
            toast.success(`Applied: ${data.data.name}`);
            return;
          }
        } catch (error) {
          console.error('[VisionLogic] Failed to load preset:', error);
        }
      }

      // Fallback: Set input and trigger Build
      setInput(intent);
      setTimeout(() => analyzeIntent(intent), 50);
    };

    window.addEventListener('visionlogic:build', handleHeroBuild);
    return () => window.removeEventListener('visionlogic:build', handleHeroBuild);
  }, [pushDebug]);

  // ================================================
  // Smart Default: Pre-fill form on mount
  // ================================================
  useEffect(() => {
    // Skip if remix data is provided
    if (remixData) return;
    // Skip if preset was already loaded via event (e.g., user clicked preset before generator loaded)
    if (isPresetLoadedViaEvent.current) {
      pushDebug('vision-logic', 'Smart Default Skipped', { reason: 'Preset loaded via event' });
      return;
    }
    // Skip if URL has intent parameter (will be handled by Intent useEffect)
    // NOTE: Check searchParams directly instead of hasProcessedIntent state
    // to avoid race condition between useEffects on mount
    const hasUrlIntent = searchParams.get('intent') && searchParams.get('auto_build') === 'true';
    // Also check for preset parameter
    const hasPresetParam = searchParams.get('preset') && searchParams.get('auto_build') === 'true';
    if (hasUrlIntent || hasPresetParam) return;
    // Skip if already has schema (e.g., user already interacted)
    if (activeSchema) return;

    // Skip if there's pending state to restore (login recovery)
    if (typeof window !== 'undefined' && sessionStorage.getItem(VL_PENDING_STATE_KEY)) {
      pushDebug('vision-logic', 'Smart Default Skipped', { reason: 'Pending login state exists' });
      return;
    }

    // V15.0: Load default preset from API (first system preset)
    const loadDefaultPreset = async () => {
      try {
        const response = await fetch('/api/logic/presets?type=system');
        const data = await response.json() as {
          code: number;
          data?: { system: Array<{ id: string; slug: string; name: string; params: unknown }> };
        };

        if (data.code === 0 && data.data?.system?.[0]) {
          const firstPreset = data.data.system[0];
          // Fetch full preset data
          const presetResponse = await fetch(`/api/logic/presets/${firstPreset.id}`);
          const presetData = await presetResponse.json() as {
            code: number;
            data?: {
              id: string;
              params?: {
                version?: number;
                schema?: unknown;
                formValues?: Record<string, unknown>;
                promptEnglish?: string;
                promptNative?: string;
                promptHighlights?: unknown;
              };
              imageUrl?: string;
            };
          };

          if (presetData.code === 0 && presetData.data?.params) {
            const params = presetData.data.params;
            if (params.version === 2 && params.schema) {
              setInput(firstPreset.slug || 'preset');
              setActiveSchema(params.schema as DynamicSchema);
              setFormValues(params.formValues || {});
              if (params.promptEnglish) {
                setPromptEnglish(params.promptEnglish);
                setPromptNative(params.promptNative || params.promptEnglish);
                setDetectedLang('English');
              }
              if (params.promptHighlights) {
                setPromptHighlights(params.promptHighlights as PromptHighlights);
              }
              if (presetData.data.imageUrl) {
                setGeneratedImages([{ id: 'preset-example', url: presetData.data.imageUrl }]);
              }
              setUIState('FORM_ACTIVE');

              pushDebug('vision-logic', 'Smart Default Applied (API)', {
                preset: firstPreset.slug,
                fieldsCount: (params.schema as DynamicSchema).fields?.length || 0,
              });
              return;
            }
          }
        }

        // Fallback: Show IDLE state if no preset available
        pushDebug('vision-logic', 'Smart Default Skipped', { reason: 'No system preset available' });
      } catch (error) {
        console.error('[VisionLogic] Failed to load default preset:', error);
        pushDebug('vision-logic', 'Smart Default Error', { error: String(error) });
      }
    };

    loadDefaultPreset();
  }, []); // Only run once on mount

  // ================================================
  // Click Outside Handler - Close command on outside click
  // ================================================
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (commandOpen && commandCardRef.current && !commandCardRef.current.contains(e.target as Node)) {
        setCommandOpen(false);
        setUIState(activeSchema ? 'FORM_ACTIVE' : 'IDLE');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [commandOpen, activeSchema]);

  // ================================================
  // AC 1.3: Global Keyboard Shortcuts
  // ================================================
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+K: Open Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
        setUIState('COMMAND_OPEN');
      }
      
      // Cmd+Enter: Compile
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && activeSchema) {
        e.preventDefault();
        handleCompile();
      }
      
      // Cmd+Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && previousPrompt) {
        e.preventDefault();
        handleUndo();
      }

      // Escape: Close command or reset
      if (e.key === 'Escape') {
        if (commandOpen) {
          setCommandOpen(false);
          setUIState(activeSchema ? 'FORM_ACTIVE' : 'IDLE');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeSchema, previousPrompt, commandOpen]);

  // ================================================
  // P0: beforeunload Warning - Prevent accidental data loss
  // Only trigger when user has actively generated content (not just loaded preset)
  // ================================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if:
      // 1. User has generated images (not preset example)
      // 2. OR user is in the middle of generating
      const hasUserGeneratedImages = generatedImages.some(img => img.id !== 'preset-example');
      const isActivelyWorking = isGeneratingImage;

      if (hasUserGeneratedImages || isActivelyWorking) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [generatedImages, isGeneratingImage]);

  // ================================================
  // Intent Analysis with AI (V3: Multimodal Support)
  // Refactored: Returns schema + form defaults for chaining (Build -> Generate flow)
  // ================================================
  const analyzeIntent = async (intentInput: string): Promise<{
    schema: DynamicSchema;
    defaults: Record<string, unknown>;
  } | null> => {
    if (!intentInput || intentInput.trim().length < 1) return null;

    buildTimer.start(); // ✨ 开始计时
    setUIState('ANALYZING');
    setCommandOpen(false);

    // PRD V4: Clear old content to avoid psychological confusion
    // User should see fresh slate when starting new Build
    setGeneratedImages([]);       // Clear old images
    setPromptNative('');          // Clear old native prompt
    setPromptEnglish('');         // Clear old English prompt
    setGeneratePhase('IDLE');     // Reset generate phase
    // FIX: Clear form state to prevent residual values from previous builds
    setFormValues({});            // Clear old form values
    setTouchedFields(new Set());  // V3.2: Clear touched fields on new build
    setLastCompiledFormValues(null); // Force recompile
    setPromptHighlights({ native: [], english: [] }); // Clear old highlights

    // Determine if we have images to analyze
    // Priority: 1) File uploads (images state) 2) Already uploaded URLs (uploadedImageUrls with toggle ON)
    const hasFileUploads = images.length > 0;
    const hasReferenceImages = useReferenceImages && uploadedImageUrls.length > 0;
    const hasAnyImages = hasFileUploads || hasReferenceImages;

    // Debug: Log analysis start with image count
    if (hasAnyImages) {
      pushDebug('vision-logic', 'Analysis Started', {
        input: intentInput,
        fileUploadsCount: images.length,
        referenceImagesCount: uploadedImageUrls.length,
        useReferenceImages,
        imageNames: images.map(f => f.name),
        referenceUrls: uploadedImageUrls,
      });
    }

    try {
      let response: Response;

      if (hasFileUploads) {
        // Use FormData for multimodal (new file uploads)
        const formData = new FormData();
        formData.append('input', intentInput);
        images.forEach(img => formData.append('images', img));

        response = await fetch('/api/logic/intent', {
          method: 'POST',
          body: formData,
        });
      } else if (hasReferenceImages) {
        // FIX: Pass reference image URLs to intent API for multimodal analysis
        // This ensures the AI can "see" the reference images when analyzing intent
        response = await fetch('/api/logic/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: intentInput,
            imageUrls: uploadedImageUrls,  // Pass existing reference image URLs
          }),
        });
      } else {
        // Use JSON for text-only (legacy)
        response = await fetch('/api/logic/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: intentInput }),
        });
      }

      // 🛡️ Handle Rate Limits (429)
      if (response.status === 429) {
        const errorData = await response.json() as { message?: string };
        if (errorData.message === 'GUEST_BUILD_LIMIT') {
          saveStateBeforeLogin();
          setIsShowSignModal?.(true);
          toast.error('Sign in to continue building prompts');
        } else {
          // 💰 Rate limit with pricing upsell (friendly, not error)
          showCreditsUpsell('Daily limit reached. Get more credits to continue.');
        }
        setUIState('IDLE');
        return null;
      }

      const data = await response.json() as { code: number; message?: string; data?: { schema: DynamicSchema } };

      if (data.code === 0 && data.data?.schema) {
        buildTimer.end(); // ✨ 成功时结束计时
        const rawSchema = data.data.schema;
        
        // Filter out model-level fields that should not be user-facing
        const FILTERED_FIELD_PATTERNS = [
          /^aspect_ratio$/i, /^composition_ratio$/i, /ratio$/i, /比例/,
          /^canvas$/i, /^image_size$/i, /^resolution$/i, /^dimensions$/i,
          /^seed$/i, /^random_seed$/i, /^num_inference_steps$/i, /^sampling_steps$/i, /^cfg_scale$/i
        ];
        
        const filteredFields = rawSchema.fields.filter(f => 
          !FILTERED_FIELD_PATTERNS.some(pattern => pattern.test(f.id) || pattern.test(f.label))
        );
        
        const schema = { ...rawSchema, fields: filteredFields };
        setActiveSchema(schema);

        // Push to Debug Panel - Build (with image info and Stage 1 debug data)
        pushDebug('vision-logic', 'Build Complete', {
          input: intentInput,
          imagesCount: images.length,
          schema: schema,
          extractedRatio: schema.extractedRatio,
          fieldsCount: schema.fields.length,
          // Include Stage 1 debug info if available
          ...(rawSchema._debug && {
            stage1_intent: rawSchema._debug.stage1_intent,
            detectedLanguage: rawSchema._debug.detectedLanguage,
          }),
        });
        
        // Sync extracted ratio if available
        if (schema.extractedRatio) {
          setAspectRatio(schema.extractedRatio);
          toast.info(`Ratio detected: ${schema.extractedRatio}`);
        }
        
        const defaults: Record<string, any> = {};
        schema.fields.forEach(f => {
          if (f.type === 'select') {
            // FIX: Single-select uses string, multi-select uses array
            if (f.multiSelect === false) {
              defaults[f.id] = f.defaultValue || '';
            } else {
              defaults[f.id] = f.defaultValue ? [f.defaultValue] : [];
            }
          } else {
            defaults[f.id] = f.defaultValue;
          }
        });

        // Smart Remix V2: Use intelligent merge in Remix mode
        if (isRemixMode && remixFormValuesRef.current) {
          const mergedValues = mergeFormValuesForRemix(
            remixFormValuesRef.current,
            defaults,
            schema
          );
          setFormValues(mergedValues);
          console.log('[SmartRemix] Merged form values - Style fields preserved, Content fields updated');
        } else {
          setFormValues(defaults);
        }

        setUIState('FORM_ACTIVE');
        setFocusedFieldIndex(0);
        
        // Image-to-Image: Upload images for generation after Build success
        if (images.length > 0) {
          setIsUploadingImages(true);
          try {
            const uploadPromises = images.map(file =>
              uploadImageFile(file, 'ai-image-reference')
            );
            const urls = await Promise.all(uploadPromises);
            setUploadedImageUrls(urls);
            pushDebug('vision-logic', 'Images Uploaded for Generation', {
              count: urls.length,
              urls
            });
            toast.success(`${urls.length} image(s) ready for generation`);
          } catch (uploadError: any) {
            console.error('[ImageUpload] Failed:', uploadError);
            toast.error('Failed to upload images for generation');
            setUploadedImageUrls([]);
          } finally {
            setIsUploadingImages(false);
          }
        }
        // FIX: Do NOT clear uploadedImageUrls when no new files are uploaded
        // This preserves existing reference images that user already added

        return { schema, defaults }; // Success: Return schema + defaults for chaining
      } else {
        buildTimer.end(); // ✨ 失败时也结束计时
        pushDebug('vision-logic', 'Build Failed', { code: data.code, message: data.message });
        toast.error('Could not analyze intent');
        setUIState('IDLE');
        return null; // Failed: No schema
      }
    } catch (error) {
      buildTimer.end(); // ✨ 异常时也结束计时
      console.error('[IntentAnalyzer] Failed:', error);
      toast.error('Analysis failed');
      setUIState('IDLE');
      return null; // Failed: Exception
    }
  };

  const handleFieldChange = (id: string, val: any) => {
    // V3.2: Mark field as touched (user explicitly interacted with it)
    setTouchedFields(prev => new Set(prev).add(id));
    setFormValues(prev => ({ ...prev, [id]: val }));
  };

  // Handle adding custom dimensions from AddDimensionDialog
  const handleAddCustomFields = (fields: SchemaField[]) => {
    if (!activeSchema || fields.length === 0) return;

    // Add the new fields to the schema (insert before advanced fields)
    const basicFields = activeSchema.fields.filter(f => !f.isAdvanced);
    const advancedFields = activeSchema.fields.filter(f => f.isAdvanced);

    const newFields = fields.map(field => ({ ...field, isAdvanced: false }));

    setActiveSchema({
      ...activeSchema,
      fields: [...basicFields, ...newFields, ...advancedFields],
    });

    // Initialize the field values
    const newFormValues: Record<string, unknown> = {};
    for (const field of fields) {
      newFormValues[field.id] = field.defaultValue ?? (field.type === 'select' ? field.options?.[0] : '');
    }
    setFormValues(prev => ({ ...prev, ...newFormValues }));

    if (fields.length === 1) {
      toast.success(`Added "${fields[0].label}" dimension`);
    } else {
      toast.success(`Added ${fields.length} dimensions`);
    }
  };

  // ================================================
  // Compile Handler (Refactored: Returns PromptData for chaining)
  // ================================================
  const handleCompile = async (options?: {
    skipCreditDeduction?: boolean;
    overrideFormValues?: Record<string, unknown>;  // FIX: Allow passing form values directly
    overrideSchema?: DynamicSchema;  // FIX: Allow passing schema directly to avoid stale state
  }): Promise<{ native: string; english: string } | null> => {
    // FIX: Use override schema if provided (avoids React async state sync issues)
    const effectiveSchema = options?.overrideSchema ?? activeSchema;
    if (!effectiveSchema) return null;

    optimizeTimer.start(); // ✨ 开始计时
    setUIState('COMPILING');
    setGeneratePhase('OPTIMIZING');  // Show loading overlay on Prompt area
    setPreviousPrompt(promptNative || null);

    try {
      // FIX: Use override values if provided (for Build -> Generate flow)
      // This ensures we use the freshly set form values, not stale closure values
      const effectiveFormValues = options?.overrideFormValues ?? formValues;

      // Use buildPLO utility to construct the PLO object
      const plo = buildPLO({
        input,
        schema: effectiveSchema,
        formValues: effectiveFormValues,
        touchedFields,  // V3.2: Pass touched fields for defaultValue fallback logic
        customInput,
        aspectRatio: '1:1',
      });

      const response = await fetch('/api/logic/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plo,
          // 方案 D: 如果是 One-Click Generate 流程，免费 compile
          skipCreditDeduction: options?.skipCreditDeduction ?? false,
        }),
      });

      // 🛡️ Handle Rate Limits (429)
      if (response.status === 429) {
        const errorData = await response.json() as { message?: string };
        if (errorData.message === 'GUEST_BUILD_LIMIT') {
          saveStateBeforeLogin();
          setIsShowSignModal?.(true);
          toast.error('Sign in to continue');
        } else {
          // 💰 Rate limit with pricing upsell (friendly, not error)
          showCreditsUpsell('Daily limit reached. Get more credits to continue.');
        }
        setUIState('FORM_ACTIVE'); // Stay in form to retry
        return null;
      }

      const data = await response.json() as { code: number; message?: string; data?: { native: string; english: string; detectedLang: string; highlights?: PromptHighlights } };

      if (data.code === 0 && data.data?.native) {
        optimizeTimer.end(); // ✨ 成功时结束计时
        setPromptNative(data.data.native);
        setPromptEnglish(data.data.english);
        setDetectedLang(data.data.detectedLang);
        // Set prompt highlights for interactive UI
        setPromptHighlights(data.data.highlights || { native: [], english: [] });

        // Push to Debug Panel
        pushDebug('vision-logic', 'Prompt Generated', {
          input,
          detectedLang: data.data.detectedLang,
          native: data.data.native,
          english: data.data.english,
          highlights: data.data.highlights,
          plo,
        });

        // Save the form values snapshot after successful compile
        setLastCompiledFormValues({ ...formValues });
        // FIX: Also save customInput snapshot for change detection
        setLastCompiledCustomInput(customInput);

        // Return data for chaining (One-Click flow)
        return { native: data.data.native, english: data.data.english };
      } else {
        optimizeTimer.end(); // ✨ 失败时也结束计时
        pushDebug('vision-logic', 'Generation Failed', {
          code: data.code,
          message: data.message,
          plo,
        });
        toast.error(data.message || 'Compilation failed');
        return null;
      }
    } catch (error: any) {
      optimizeTimer.end(); // ✨ 异常时也结束计时
      toast.error('Failed to compile: ' + (error.message || 'Unknown error'));
      return null;
    } finally {
      setUIState('FORM_ACTIVE');
      // Reset generatePhase only if NOT in OneClick flow (standalone Refine Prompt)
      // In OneClick flow, generatePhase will be set to GENERATING by handleGenerateImage
      if (!isOneClickProcessing) {
        setGeneratePhase('IDLE');
      }
    }
  };

  // AC 1.3: Undo functionality (keyboard: Cmd+Z)
  const handleUndo = () => {
    if (previousPrompt) {
      setPromptNative(previousPrompt);
      setPreviousPrompt(null);
      toast.success('Changes reverted');
    }
  };

  // PRD: Prompt 高亮交互系统 - 点击高亮跳转表单字段
  // Uses fieldRefsHandleHighlight from useFieldRefs hook
  const handleHighlightClick = useCallback((fieldId: string) => {
    // Helper: Check if fieldId corresponds to an Advanced field
    const isAdvancedField = () => {
      if (!activeSchema) return false;
      const normalizedId = fieldId.toLowerCase().replace(/[_\s-]/g, '');
      return activeSchema.fields.some(f => {
        if (!f.isAdvanced) return false;
        const fieldNormalized = f.id.toLowerCase().replace(/[_\s-]/g, '');
        const labelNormalized = f.label.toLowerCase().replace(/[_\s-]/g, '');
        return fieldNormalized === normalizedId ||
               labelNormalized === normalizedId ||
               fieldNormalized.includes(normalizedId) ||
               normalizedId.includes(fieldNormalized);
      });
    };

    // If field is in Advanced section and not expanded, expand first
    if (isAdvancedField() && !showAdvanced) {
      fieldRefsHandleHighlight(fieldId, showAdvanced, setShowAdvanced);
    } else {
      fieldRefsHandleHighlight(fieldId, showAdvanced, setShowAdvanced);
    }
  }, [activeSchema, showAdvanced, fieldRefsHandleHighlight]);

  // PRD: 清空高亮当用户编辑 Prompt
  const handlePromptChange = useCallback((newPrompt: string) => {
    setPromptEnglish(newPrompt);
    setPromptNative(newPrompt);
    // Clear highlights when user edits (they become invalid)
    setPromptHighlights({ native: [], english: [] });
  }, []);

  // ================================================
  // V15.0: Preset System (API-based + Legacy fallback)
  // ================================================

  /**
   * Apply preset data from legacy PRESETS object or API response
   * Unified function for both old hardcoded presets and new API-based presets
   */
  const applyPresetData = useCallback((preset: {
    input?: string;
    schema: DynamicSchema;
    formValues: Record<string, any>;
    promptEnglish?: string;
    promptNative?: string;
    promptHighlights?: PromptHighlights;
    presetImageUrl?: string;
  }) => {
    if (preset.input) setInput(preset.input);
    setActiveSchema(preset.schema);
    setFormValues(preset.formValues);
    setLastCompiledFormValues(preset.formValues); // Prevent needsRecompile

    if (preset.promptEnglish) {
      setPromptEnglish(preset.promptEnglish);
      setPromptNative(preset.promptNative || preset.promptEnglish);
      setDetectedLang('English');
    }
    if (preset.promptHighlights) {
      setPromptHighlights(preset.promptHighlights);
    }
    if (preset.presetImageUrl) {
      setGeneratedImages([{ id: `preset-${Date.now()}`, url: preset.presetImageUrl }]);
    }
    setUIState('FORM_ACTIVE');

    pushDebug('vision-logic', 'Preset Applied', {
      context: preset.schema.context,
      fieldsCount: preset.schema.fields.length,
      hasPrompt: !!preset.promptEnglish,
      hasHighlights: (preset.promptHighlights?.english?.length ?? 0) > 0,
    });
  }, [pushDebug]);

  /**
   * Handle preset selection from API-based PresetSelector
   * Extracts V2 params from preset.params and applies to state
   */
  const handleApiPresetSelect = useCallback(async (preset: PresetItem) => {
    if (!preset.params) {
      toast.error('Invalid preset data');
      return;
    }

    const params = preset.params as any;

    // V2 format check
    if (params.version !== 2 || !params.schema) {
      toast.error('Unsupported preset format');
      return;
    }

    // Apply the preset using unified function
    applyPresetData({
      schema: params.schema,
      formValues: params.formValues || {},
      promptEnglish: params.promptEnglish,
      promptNative: params.promptNative,
      promptHighlights: params.promptHighlights,
      presetImageUrl: preset.thumbnailUrl || preset.imageUrl,
    });

    toast.success(`Applied: ${preset.name}`);
  }, [applyPresetData]);

  /**
   * Save current state as user template
   * Called from PresetSelector when user clicks "Save as Template"
   */
  const handleSaveAsTemplate = useCallback(async (name: string) => {
    if (!activeSchema) {
      throw new Error('No active form to save');
    }

    // Build V2 params object (same format as community post)
    const params = {
      version: 2,
      schema: activeSchema,
      formValues,
      originalInput: input,
      promptNative,
      promptEnglish,
      detectedLang,
      promptHighlights,
      model,
      aspectRatio,
    };

    // Get current image URL if available
    const imageUrl = generatedImages[0]?.url || '';
    const thumbnailUrl = generatedImages[0]?.url || '';

    const response = await fetch('/api/logic/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        params,
        imageUrl,
        thumbnailUrl,
      }),
    });

    const data = await response.json() as { code: number; message?: string };
    if (data.code !== 0) {
      throw new Error(data.message || 'Failed to save template');
    }
  }, [activeSchema, formValues, input, promptNative, promptEnglish, detectedLang, promptHighlights, model, aspectRatio, generatedImages]);

  // ================================================
  // One-Click Generate (Scheme C: Auto Compile -> Auto Generate)
  // ================================================
  const [isOneClickProcessing, setIsOneClickProcessing] = useState(false);
  const imageSectionRef = useRef<HTMLDivElement>(null);

  // ✅ PRD V6: 智能滚动 Hook (条件触发 + 键盘处理 + reduced-motion 支持)
  const { smartScrollTo } = useSmartScroll({ prefersReducedMotion });
  const smartScrollToImage = useCallback(() => smartScrollTo(imageSectionRef), [smartScrollTo]);

  // FIX: Accept override options to bypass React state sync issues
  const handleOneClickGenerate = async (overrides?: {
    overrideSchema?: DynamicSchema;
    overrideFormValues?: Record<string, unknown>;
  }) => {
    // FIX: Use override schema if provided (for Build -> Generate flow)
    const effectiveSchema = overrides?.overrideSchema ?? activeSchema;
    if (!effectiveSchema) return;
    if (!user) {
      saveStateBeforeLogin();
      setIsShowSignModal?.(true);
      return;
    }

    setIsOneClickProcessing(true);

    // ✅ PRD V6: 收起键盘，避免 layout thrashing
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      // FIX: If override values provided (from Build -> Generate flow), always recompile
      // This ensures we use the freshly generated schema's defaults
      const overrideFormValues = overrides?.overrideFormValues;
      const overrideSchema = overrides?.overrideSchema;
      const shouldForceRecompile = overrideFormValues !== undefined || overrideSchema !== undefined;

      // Check if form values have changed since last compile
      const effectiveFormValues = overrideFormValues ?? formValues;
      const formValuesUnchanged = !shouldForceRecompile &&
        lastCompiledFormValues !== null &&
        JSON.stringify(effectiveFormValues) === JSON.stringify(lastCompiledFormValues);

      // FIX: Also check if customInput has changed since last compile
      const customInputUnchanged = lastCompiledCustomInput === customInput;
      const canSkipCompile = formValuesUnchanged && customInputUnchanged;

      let promptData: { native: string; english: string } | null = null;

      if (canSkipCompile && promptNative && promptEnglish) {
        // Form and customInput unchanged - reuse existing prompt (skip compile API call)
        promptData = { native: promptNative, english: promptEnglish };
        pushDebug('vision-logic', 'Skipping Compile', {
          reason: 'Form values and customInput unchanged since last compile',
        });
      } else {
        // Form changed - need to recompile
        // 方案 D: One-Click Generate 流程中，compile 免费（费用已包含在图片生成中）
        setGeneratePhase('OPTIMIZING');
        // FIX: Pass both override schema and form values to avoid stale closure issues
        promptData = await handleCompile({
          skipCreditDeduction: true,
          overrideSchema: overrideSchema,
          overrideFormValues: overrideFormValues,
        });
      }

      if (!promptData) {
        // Compile failed - error already shown by handleCompile
        setGeneratePhase('IDLE');
        setIsOneClickProcessing(false);
        return;
      }

      // ✅ 方案 E: Compile 成功后检查积分，积分不足时显示友善提示
      // 此时用户已经看到了 Prompt，可以决定是否付费生成图片
      if (remainingCredits < generateCost) {
        setGeneratePhase('IDLE');
        setIsOneClickProcessing(false);

        // 滚动到积分提示区域
        smartScrollToImage();

        toast('Your prompt is ready! Get credits to generate the image.', {
          duration: 5000,
          action: {
            label: 'Get Credits',
            onClick: () => window.open('/pricing', '_blank'),
          },
          classNames: {
            actionButton: 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50',
          },
        });
        return;
      }

      // Step 2: Generate Image with compiled data (no state race)
      // ✅ PRD V6: 智能滚动 (条件触发 + 键盘已收起)
      smartScrollToImage();

      // V3 FIX: Extract reference_intent from form values for i2i generation
      // Use parseReferenceIntent utility (shared with buildPLO)
      const extractedReferenceIntent = parseReferenceIntent(effectiveFormValues['reference_intent']);

      await handleGenerateImage(promptData, extractedReferenceIntent);

    } finally {
      setIsOneClickProcessing(false);
    }
  };

  // ================================================
  // Use as Reference Handler
  // ================================================
  const handleUseAsReference = (imageUrl: string) => {
    // Check limit (max 4)
    if (uploadedImageUrls.length >= 4) {
      toast.error('Maximum 4 reference images allowed');
      return;
    }
    // Check duplicate
    if (uploadedImageUrls.includes(imageUrl)) {
      toast.info('Image already in references');
      return;
    }
    // Add to references
    setUploadedImageUrls(prev => [...prev, imageUrl]);
    setUseReferenceImages(true);
    setRefSectionOpen(true);
    toast.success('Added to reference images');
    // Scroll to top (reference section)
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ================================================
  // Auto-generate after login state restore
  // ================================================
  useEffect(() => {
    if (!pendingAutoGenerate) return;
    if (!user?.id) return;
    if (!activeSchema) return;

    // Reset flag immediately to prevent re-triggering
    setPendingAutoGenerate(false);

    // Small delay to ensure state is fully updated
    setTimeout(() => {
      handleOneClickGenerate();
    }, 300);
  }, [pendingAutoGenerate, user?.id, activeSchema]);

  // ================================================
  // Image Generation Functions
  // ================================================
  
  const resetImageState = (toComplete = true) => {
    generateTimer.end(); // ✨ 结束计时
    setIsGeneratingImage(false);
    setImageProgress(0);
    setImageTaskId(null);
    setGenerationStartTime(null);
    // PRD V4: Transition to COMPLETE or IDLE based on context
    setGeneratePhase(toComplete ? 'COMPLETE' : 'IDLE');
  };

  // Generate Image Handler (Refactored: Accepts promptOverride for One-Click flow)
  // V3: Added referenceIntent parameter for i2i generation
  const handleGenerateImage = async (
    promptOverride?: { native: string; english: string },
    referenceIntent?: 'malleable' | 'structure' | 'subject' | 'style_ref' | 'face_swap' | 'pose_transfer' | 'inpaint' | 'outpaint'
  ) => {
    // Use override if provided (One-Click flow), otherwise fallback to state
    const effectiveNative = promptOverride?.native || promptNative;
    const effectiveEnglish = promptOverride?.english || promptEnglish;
    
    if (!effectiveEnglish && !effectiveNative) return;
    if (!user) {
      saveStateBeforeLogin();
      setIsShowSignModal?.(true);
      return;
    }

    generateTimer.start(); // ✨ 开始计时
    setIsGeneratingImage(true);
    setImageProgress(15);
    setGeneratedImages([]);
    setGenerationStartTime(Date.now());
    // PRD V4: Transition to GENERATING phase (image loading)
    setGeneratePhase('GENERATING');

    try {
      const modelConfig = MODEL_OPTIONS.find(m => m.value === model);
      const provider = modelConfig?.provider ?? 'gemini';
      
      // Determine scene based on reference images toggle (not just presence of images)
      const scene = useReferenceImages && uploadedImageUrls.length > 0 ? 'image-to-image' : 'text-to-image';
      
      // Use English prompt for better generation quality (default), or native if user unchecked
      const promptToUse = useEnglishForGeneration ? effectiveEnglish : effectiveNative;
      
      const options: any = { aspectRatio };
      
      // Add image_input only when toggle is ON
      if (useReferenceImages && uploadedImageUrls.length > 0) {
        options.image_input = uploadedImageUrls;
        // V3 FIX: Use user-selected reference_intent instead of hardcoded value
        // If no intent provided, default to 'malleable' (complete redraw)
        options.reference_intent = referenceIntent || 'malleable';
      }

      // Debug: Log generation request (with prompt for debugging)
      pushDebug('vision-logic', 'Generation Request', {
        scene,
        hasImages: uploadedImageUrls.length > 0,
        imageUrls: uploadedImageUrls,
        model,
        aspectRatio,
        referenceIntent: referenceIntent || 'malleable',
        prompt: promptToUse, // Added for debugging
        promptLength: promptToUse?.length || 0,
      });

      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: AIMediaType.IMAGE,
          scene,
          provider,
          model,
          prompt: promptToUse,
          options,
          seoHints: (effectiveEnglish || input || '').slice(0, 200), // SEO image naming: truncate to 200 chars
        }),
      });

      const parsed = await resp.json();
      const { code, message, data } = parseApiResponse(parsed);
      
      if (!resp.ok || code !== 0) {
        throw new Error(message || 'Failed to start generation');
      }

      // Handle synchronous success (Gemini models)
      if (data.status === AITaskStatus.SUCCESS && data.taskInfo) {
        const urls = extractImageUrls(parseTaskResult(data.taskInfo));
        if (urls.length > 0) {
          setGeneratedImages(urls.map((url, i) => ({ id: `${data.id}-${i}`, url, aiTaskId: data.id })));
          setCurrentAiTaskId(data.id);
          
          // Push to Debug Panel - Create Image
          pushDebug('vision-logic', 'Create Image Complete', {
            model,
            aspectRatio,
            prompt: promptToUse,
            imagesCount: urls.length,
            taskId: data.id,
          });
          
          toast.success('Image created!');
          resetImageState();
          fetchUserCredits?.();
          return;
        }
      }

      // Async generation - start polling
      setImageTaskId(data.id);
      setImageProgress(25);
      fetchUserCredits?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create image');
      resetImageState(false); // Error: reset to IDLE
    }
  };

  // PRD V4: Auto-scroll to image section when generation starts
  useEffect(() => {
    if (generatePhase === 'GENERATING' && imageSectionRef.current) {
      // Slight delay to ensure the image section has expanded
      setTimeout(() => {
        imageSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [generatePhase]);

  // PRD V4: Simulated progress animation for better UX
  // This ensures the progress bar moves smoothly even for sync (Gemini) models
  useEffect(() => {
    if (!isGeneratingImage) return;
    
    const interval = setInterval(() => {
      setImageProgress(prev => {
        // Stop at 85 to leave room for actual completion
        if (prev >= 85) return prev;
        // Increment by 3-5 randomly for organic feel
        return Math.min(prev + Math.random() * 2 + 3, 85);
      });
    }, 800); // Update every 800ms
    
    return () => clearInterval(interval);
  }, [isGeneratingImage]);

  // Polling effect for async image generation
  useEffect(() => {
    if (!imageTaskId || !isGeneratingImage) return;

    const poll = async () => {
      if (generationStartTime && Date.now() - generationStartTime > GENERATION_TIMEOUT) {
        toast.error('Generation timed out');
        resetImageState(false); // Timeout: reset to IDLE
        return true;
      }

      try {
        const resp = await fetch('/api/ai/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: imageTaskId }),
        });
        
        const parsed = await resp.json();
        const { data } = parseApiResponse(parsed);

        if (data.status === AITaskStatus.SUCCESS) {
          const urls = extractImageUrls(parseTaskResult(data.taskResult));
          setGeneratedImages(urls.map((url, i) => ({ id: `${data.id}-${i}`, url, aiTaskId: data.id })));
          setCurrentAiTaskId(data.id);
          toast.success('Image created!');
          resetImageState();
          return true;
        }
        if (data.status === AITaskStatus.FAILED) {
          toast.error('Generation failed');
          resetImageState(false); // Failure: reset to IDLE
          return true;
        }
        setImageProgress(prev => Math.min(prev + 10, 90));
        return false;
      } catch {
        return false;
      }
    };

    poll();
    const interval = setInterval(async () => {
      if (await poll()) clearInterval(interval);
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [imageTaskId, isGeneratingImage, generationStartTime]);

  const handleDownloadImage = async (image: { id: string; url: string }) => {
    if (!image.url) return;

    try {
      setDownloadingImageId(image.id);
      
      // Generate SEO-friendly filename
      const sourceText = promptEnglish || promptNative || input || 'vision-logic';
      const safePrompt = sourceText
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '-')
        .trim()
        .substring(0, 30)
        .replace(/-+$/g, '');
      
      const timestamp = Date.now();
      // TODO: 自定义你的下载文件名
      const filename = `${safePrompt}-ai-prompts-${timestamp}.png`.toLowerCase();
      
      pushDebug('vision-logic', 'Download: Starting', {
        sourceText: sourceText.slice(0, 50),
        filename,
        imageUrl: image.url,
      });
      
      // Fetch image via proxy
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(image.url)}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      
      // Try showSaveFilePicker API (Chrome 86+, Edge 86+)
     if ('showSaveFilePicker' in window) {
        pushDebug('vision-logic', 'Download: Using showSaveFilePicker', { filename });
        
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'PNG Image',
              accept: { 'image/png': ['.png'] },
            }],
          });
          
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          pushDebug('vision-logic', 'Download: Success via showSaveFilePicker', { filename });
          toast.success('Image saved successfully!');
          return;
        } catch (pickerError: any) {
          // User cancelled or error - fall through to fallback
          if (pickerError.name === 'AbortError') {
            pushDebug('vision-logic', 'Download: User cancelled', {});
            return;
          }
          pushDebug('vision-logic', 'Download: showSaveFilePicker failed, using fallback', {
            error: pickerError.message,
          });
        }
      }
      
      // Fallback: Traditional download method
      pushDebug('vision-logic', 'Download: Using fallback method', { filename });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      toast.success('Image saved to your Downloads folder');
    } catch (error) {
      console.error('Failed to download image:', error);
      pushDebug('vision-logic', 'Download: ERROR', {
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to download image');
    } finally {
      setDownloadingImageId(null);
    }
  };

  // Share to Community Handler
  const handleShareToCommunity = async () => {
    if (!currentAiTaskId) {
      toast.error('No image to share');
      return;
    }

    try {
      setIsSharingToCommunity(true);
      
      // Build VisionLogic-specific data for better Remix experience
      const visionLogicData = activeSchema ? {
        version: 2, // Mark as new format for compatibility
        schema: activeSchema,
        formValues: formValues,
        originalInput: input, // Smart Remix V2: Save user's original input for accurate restoration
        promptNative: promptNative,
        promptEnglish: promptEnglish,
        detectedLang: detectedLang,
        uploadedImageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        // Smart Remix V3: Save model, aspectRatio, and promptHighlights for complete state restoration
        model,
        aspectRatio,
        promptHighlights,
      } : undefined;
      
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiTaskId: currentAiTaskId,
          shareToPublic: true,
          visionLogicData, // NEW: Send complete form state for Remix
        }),
      });

      const data = await response.json() as { code: number; message?: string };
      
      if (!response.ok || data.code !== 0) {
        throw new Error(data.message || 'Failed to share to community');
      }

      toast.success('🎉 Shared to community! Your image is pending review.');
    } catch (error: any) {
      console.error('Failed to share to community:', error);
      toast.error(error.message || 'Failed to share to community');
    } finally {
      setIsSharingToCommunity(false);
    }
  };

  // ================================================
  // Psychological Progress Bar (Fast → Slow → Jump)
  // ================================================
  const calculateDisplayProgress = (realProgress: number): number => {
    if (realProgress >= 100) return 100;
    if (realProgress < 30) {
      return realProgress * 1.5; // Fast: 0→45
    } else if (realProgress < 70) {
      return 45 + (realProgress - 30) * 0.75; // Medium: 45→75
    } else {
      return 75 + (realProgress - 70) * 0.5; // Slow: 75→90
    }
  };
  
  const displayProgress = useMemo(() => calculateDisplayProgress(imageProgress), [imageProgress]);
  
  // Generate Phase: Progress-based slot with random message selection
  type GenerateSlot = 'INIT' | 'DREAMING' | 'CREATING' | 'REFINING' | 'FINISHING';
  const generateSlot = useMemo((): GenerateSlot => {
    if (displayProgress < 15) return 'INIT';
    if (displayProgress < 40) return 'DREAMING';
    if (displayProgress < 65) return 'CREATING';
    if (displayProgress < 85) return 'REFINING';
    return 'FINISHING';
  }, [displayProgress]);
  
  const [generateMessage, setGenerateMessage] = useState('Initializing generation...');
  const lastGenerateSlotRef = useRef<string>('');
  
  useEffect(() => {
    if (isGeneratingImage && generateSlot !== lastGenerateSlotRef.current) {
      setGenerateMessage(pickRandom(GENERATE_MESSAGE_POOL[generateSlot].messages));
      lastGenerateSlotRef.current = generateSlot;
    }
    if (!isGeneratingImage) {
      lastGenerateSlotRef.current = '';
    }
  }, [isGeneratingImage, generateSlot]);
  
  // Fallback to static if effect hasn't run yet
  const progressMessage = generateMessage;

  // ================================================
  // Dynamic Ambient Glow Color - Use primary theme color
  // ================================================
  const getAmbientGradient = () => {
    if (!activeSchema) return '';
    return `bg-gradient-to-br from-primary/10 via-transparent to-transparent`;
  };

  return (
    <div ref={containerRef} className="w-full max-w-6xl mx-auto space-y-6 p-6 md:p-8 relative scroll-smooth">
      {/* Reference Images Section - Collapsible */}
      <ReferenceImagesPanel
        uploadedImageUrls={uploadedImageUrls}
        setUploadedImageUrls={setUploadedImageUrls}
        isUploadingImages={isUploadingImages}
        setIsUploadingImages={setIsUploadingImages}
        useReferenceImages={useReferenceImages}
        setUseReferenceImages={setUseReferenceImages}
        isOpen={refSectionOpen}
        setIsOpen={setRefSectionOpen}
        onImagePreview={setPreviewImage}
      />

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* Hero-style Input */}
      <HeroInputSection
        input={input}
        setInput={setInput}
        activeSchema={activeSchema}
        uiState={uiState}
        isOneClickProcessing={isOneClickProcessing}
        isGeneratingImage={isGeneratingImage}
        uploadedImageUrls={uploadedImageUrls}
        setUploadedImageUrls={setUploadedImageUrls}
        isUploadingImages={isUploadingImages}
        setIsUploadingImages={setIsUploadingImages}
        setUseReferenceImages={setUseReferenceImages}
        setRefSectionOpen={setRefSectionOpen}
        fileInputRef={fileInputRef}
        onAnalyzeIntent={analyzeIntent}
      />

      {/* ✅ PRD V6: 移动端 Sticky Mini Header - 生成过程中显示状态 */}
      {generatePhase !== 'IDLE' && (
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/30 px-4 py-3 -mx-4 mb-4 md:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              {generatePhase === 'OPTIMIZING' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Optimizing prompt...</span>
                </>
              )}
              {generatePhase === 'GENERATING' && (
                <>
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>Dreaming your image...</span>
                </>
              )}
              {generatePhase === 'COMPLETE' && (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Generation complete!</span>
                </>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGeneratePhase('IDLE');
                // ✅ PRD V6: reduced-motion 支持
                formRef.current?.scrollIntoView({
                  behavior: prefersReducedMotion ? 'instant' : 'smooth',
                  block: 'start'
                });
              }}
              className="h-8 px-2"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* Left Column: Dynamic Form */}
        <DynamicFormPanel
          ref={formRef}
          activeSchema={activeSchema}
          formValues={formValues}
          onFieldChange={handleFieldChange}
          customInput={customInput}
          setCustomInput={setCustomInput}
          uiState={uiState}
          generatePhase={generatePhase}
          buildMessage={buildMessage}
          buildProgress={buildProgress}
          prefersReducedMotion={prefersReducedMotion === true}
          focusedFieldIndex={focusedFieldIndex}
          setFocusedFieldIndex={setFocusedFieldIndex}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          showAddDimensionDialog={() => setShowAddDimensionDialog(true)}
          createRefCallback={createRefCallback}
          getAmbientGradient={getAmbientGradient}
        />

        {/* Right Column: Output */}
        <PromptOutputPanel
          ref={imageSectionRef}
          // Prompt State
          promptNative={promptNative}
          promptEnglish={promptEnglish}
          detectedLang={detectedLang}
          promptHighlights={promptHighlights}
          useEnglishForGeneration={useEnglishForGeneration}
          setPromptNative={setPromptNative}
          setPromptEnglish={setPromptEnglish}
          setUseEnglishForGeneration={setUseEnglishForGeneration}
          onPromptChange={handlePromptChange}
          onHighlightClick={handleHighlightClick}
          // UI State
          uiState={uiState}
          generatePhase={generatePhase}
          optimizeMessage={optimizeMessage}
          optimizeProgress={optimizeProgress}
          activeSchema={activeSchema}
          // Model & Ratio
          model={model}
          aspectRatio={aspectRatio}
          resolution={resolution}
          setModel={setModel}
          setAspectRatio={setAspectRatio}
          setResolution={setResolution}
          // Credits
          generateCost={generateCost}
          compileCost={compileCost}
          remainingCredits={remainingCredits}
          insufficientCredits={insufficientCredits}
          isCheckSign={isCheckSign}
          isCreditsLoading={isCreditsLoading}
          // User & Auth
          userId={user?.id}
          onSignIn={() => {
            saveStateBeforeLogin();
            setIsShowSignModal(true);
          }}
          // Actions
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          isOneClickProcessing={isOneClickProcessing}
          isGeneratingImage={isGeneratingImage}
          onOneClickGenerate={handleOneClickGenerate}
          onCompile={handleCompile}
          onGenerateImage={handleGenerateImage}
          // Generated Images
          generatedImages={generatedImages}
          displayProgress={displayProgress}
          progressMessage={progressMessage}
          uploadedImageUrls={uploadedImageUrls}
          downloadingImageId={downloadingImageId}
          onImagePreview={setPreviewImage}
          onUseAsReference={handleUseAsReference}
          onDownload={handleDownloadImage}
          onShare={(imageUrl) => {
            setShareImageUrl(imageUrl);
            setShowShareDialog(true);
          }}
        />

      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        imageUrl={shareImageUrl}
        prompt={promptEnglish || promptNative}
        aiTaskId={currentAiTaskId ?? undefined}
        onShareToCommunity={async () => {
          await handleShareToCommunity();
          setShowShareDialog(false);
        }}
        isSharing={isSharingToCommunity}
      />

      {/* Add Custom Dimension Dialog */}
      <AddDimensionDialog
        open={showAddDimensionDialog}
        onOpenChange={setShowAddDimensionDialog}
        onAddFields={handleAddCustomFields}
        existingFields={activeSchema?.fields.map(f => ({ id: f.id, label: f.label, type: f.type })) || []}
        context={activeSchema?.context || ''}
      />
    </div>
  );
}
