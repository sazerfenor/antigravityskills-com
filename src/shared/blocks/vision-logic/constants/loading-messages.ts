// ============================================
// Loading Message Pools (Psychology-Driven)
// ============================================

import type { BuildSlot, OptimizeSlot, GenerateSlot } from '../types';

export interface MessageSlot {
  minDuration: number;  // Minimum display time in ms
  messages: string[];   // Pool of messages for random selection
}

// ============================================
// Phase Time Thresholds (Based on 2026-01-03 Benchmark)
// ============================================

/**
 * Build 阶段阈值配置
 *
 * 实测数据:
 * - 纯文本: P50=30224ms, P90=35237ms
 * - 单图: ~44秒
 * - 多图(3张): ~39秒
 */
export const BUILD_THRESHOLDS = {
  /** 纯文本场景阈值 (30-35秒) */
  TEXT_ONLY: [10000, 28000] as const,      // STARTUP 0-10s, PROCESSING 10-28s, FINALIZING 28s+
  /** 单张图片场景阈值 (~44秒) */
  SINGLE_IMAGE: [15000, 40000] as const,   // STARTUP 0-15s, PROCESSING 15-40s, FINALIZING 40s+
  /** 多张图片场景阈值 (~39-50秒) */
  MULTI_IMAGE_BASE: [15000, 35000] as const, // 多图基础值，每张额外 +3秒
};

/**
 * Optimize 阶段阈值配置
 *
 * 实测数据:
 * - 纯文本: P50=267ms, P90=533ms (几乎瞬间)
 * - 有图: 11-15秒 (显著变慢)
 */
export const OPTIMIZE_THRESHOLDS = {
  /** 纯文本场景阈值 (0.3-0.5秒) */
  TEXT_ONLY: [150, 400] as const,          // ANALYZING 0-150ms, CRAFTING 150-400ms, POLISHING 400ms+
  /** 有图场景阈值 (11-15秒) */
  WITH_IMAGES: [5000, 12000] as const,     // ANALYZING 0-5s, CRAFTING 5-12s, POLISHING 12s+
};

// ============================================
// Image Analysis Messages (逐张图片进度)
// ============================================

export const IMAGE_ANALYSIS_MESSAGES = {
  /** 生成图片分析进度消息 */
  getAnalyzingMessage: (current: number, total: number): string => {
    if (total === 1) {
      // 单图场景：随机消息
      const messages = [
        'Analyzing your image...',
        'Reading visual details...',
        'Extracting features...',
        'Understanding composition...',
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
    // 多图场景：显示进度
    const templates = [
      `Analyzing image ${current}/${total}...`,
      `Processing image ${current} of ${total}...`,
      `Reading details from image ${current}...`,
    ];
    return templates[(current - 1) % templates.length];
  },
};

// ============================================
// Build Phase Message Pools (场景化)
// ============================================

/** Build 阶段消息池 - 纯文本场景 (30-35秒) */
export const BUILD_MESSAGE_POOL_TEXT: Record<BuildSlot, MessageSlot> = {
  STARTUP: {
    minDuration: 8000,
    messages: [
      'Initializing Neural Link...',
      'Warming up the creative engine...',
      'Connecting to AI core...',
      'Loading creative modules...',
    ],
  },
  PROCESSING: {
    minDuration: 15000,
    messages: [
      'Decoding your creative intent...',
      'Analyzing your vision...',
      'Understanding the context...',
      'Mapping creative parameters...',
      'Running intent analysis...',
      'Extracting key concepts...',
      'Interpreting your description...',
    ],
  },
  FINALIZING: {
    minDuration: 8000,
    messages: [
      'Almost there...',
      'Preparing your creative canvas...',
      'Finalizing the blueprint...',
      'Wrapping up analysis...',
    ],
  },
};

/** Build 阶段消息池 - 有图片场景 (39-50秒) */
export const BUILD_MESSAGE_POOL_WITH_IMAGES: Record<BuildSlot, MessageSlot> = {
  STARTUP: {
    minDuration: 10000,
    messages: [
      'Initializing visual analysis...',
      'Preparing image processor...',
      'Loading multimodal engine...',
      'Connecting to vision AI...',
    ],
  },
  PROCESSING: {
    minDuration: 20000,
    messages: [
      // 这些会被 imageAnalysisTemplate 覆盖（在有图片时）
      'Analyzing your images...',
      'Extracting visual features...',
      'Understanding image content...',
      'Reading visual elements...',
      'Processing reference images...',
      'Detecting styles and patterns...',
    ],
  },
  FINALIZING: {
    minDuration: 10000,
    messages: [
      'Combining text and visual insights...',
      'Merging analysis results...',
      'Finalizing visual parameters...',
      'Almost there...',
    ],
  },
};

// 保留原有的 BUILD_MESSAGE_POOL 作为默认（向后兼容）
export const BUILD_MESSAGE_POOL: Record<BuildSlot, MessageSlot> = BUILD_MESSAGE_POOL_TEXT;

// ============================================
// Optimize Phase Message Pools (场景化)
// ============================================

/** Optimize 阶段消息池 - 纯文本场景 (0.3-0.5秒，非常快) */
export const OPTIMIZE_MESSAGE_POOL_TEXT: Record<OptimizeSlot, MessageSlot> = {
  ANALYZING: {
    minDuration: 100,
    messages: [
      'Reading your parameters...',
      'Understanding your settings...',
    ],
  },
  CRAFTING: {
    minDuration: 150,
    messages: [
      'Crafting the perfect prompt...',
      'Weaving words together...',
    ],
  },
  POLISHING: {
    minDuration: 100,
    messages: [
      'Polishing final details...',
      'Almost ready...',
    ],
  },
};

/** Optimize 阶段消息池 - 有图片场景 (11-13秒) */
export const OPTIMIZE_MESSAGE_POOL_WITH_IMAGES: Record<OptimizeSlot, MessageSlot> = {
  ANALYZING: {
    minDuration: 3000,
    messages: [
      'Merging visual insights with your input...',
      'Combining image analysis with parameters...',
      'Integrating visual references...',
    ],
  },
  CRAFTING: {
    minDuration: 5000,
    messages: [
      'Crafting prompt with visual elements...',
      'Weaving image details into prompt...',
      'Building comprehensive description...',
      'Adding visual context to prompt...',
    ],
  },
  POLISHING: {
    minDuration: 3000,
    messages: [
      'Polishing visual descriptions...',
      'Fine-tuning reference details...',
      'Almost ready...',
    ],
  },
};

// 保留原有的 OPTIMIZE_MESSAGE_POOL 作为默认（向后兼容）
export const OPTIMIZE_MESSAGE_POOL: Record<OptimizeSlot, MessageSlot> = OPTIMIZE_MESSAGE_POOL_TEXT;

// ============================================
// Generate Phase Message Pool (通用，保持不变)
// ============================================

// Generate Phase: Progress-based message switching (10-60 seconds total)
export const GENERATE_MESSAGE_POOL: Record<GenerateSlot, MessageSlot> = {
  INIT: {
    minDuration: 3000,
    messages: [
      'Initializing generation...',
      'Setting up the canvas...',
      'Loading creative modules...',
    ],
  },
  DREAMING: {
    minDuration: 5000,
    messages: [
      'Dreaming in pixels...',
      'Sketching the composition...',
      'Laying the foundation...',
      'Exploring possibilities...',
    ],
  },
  CREATING: {
    minDuration: 5000,
    messages: [
      'Painting with light and shadow...',
      'Blending colors...',
      'Crafting textures...',
      'Rendering details...',
      'Mixing the palette...',
    ],
  },
  REFINING: {
    minDuration: 5000,
    messages: [
      'Perfecting every detail...',
      'Fine-tuning contrasts...',
      'Polishing the edges...',
      'Refining the glow...',
    ],
  },
  FINISHING: {
    minDuration: 3000,
    messages: [
      'Your masterpiece is almost ready!',
      'Sprinkling some magic',
      'Adding final touches...',
      'Nearly there, just a moment...',
    ],
  },
};

// ============================================
// Other Configurations
// ============================================

// Common Intent Suggestions for Command Palette
export const INTENT_SUGGESTIONS = [
  { value: 'portrait', label: 'Portrait', icon: '👤' },
  { value: 'landscape', label: 'Landscape', icon: '🏞️' },
  { value: 'logo', label: 'Logo', icon: '✨' },
  { value: 'food', label: 'Food', icon: '🍕' },
  { value: 'cyberpunk', label: 'Cyberpunk', icon: '🌆' },
  { value: 'anime', label: 'Anime', icon: '🎨' },
  { value: 'product', label: 'Product', icon: '📦' },
  { value: 'abstract', label: 'Abstract', icon: '🌀' },
];

// Helper: Pick random item from array
export const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
