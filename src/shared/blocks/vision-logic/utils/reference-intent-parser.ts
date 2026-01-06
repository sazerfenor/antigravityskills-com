/**
 * Reference Intent Parser
 *
 * 解析用户选择的 Reference Intent 字符串为标准化的枚举值
 * 支持中英文双语匹配
 *
 * @see PRD: VisionLogic Image-to-Image Reference Intent
 */

// ============================================
// Types
// ============================================

/**
 * Reference Intent 枚举
 * V1 Core: malleable, structure, subject, style_ref
 * V2 Extended: face_swap, pose_transfer, inpaint, outpaint
 */
export type ReferenceIntent =
  | 'malleable'
  | 'structure'
  | 'subject'
  | 'style_ref'
  | 'face_swap'
  | 'pose_transfer'
  | 'inpaint'
  | 'outpaint';

// ============================================
// Intent Mapping Configuration
// ============================================

interface IntentPattern {
  intent: ReferenceIntent;
  patterns: string[];
}

/**
 * Intent 匹配规则 (中英文双语)
 * 按优先级排序: 越具体的模式越靠前
 */
const INTENT_PATTERNS: IntentPattern[] = [
  // V2 Extended intents (more specific, check first)
  { intent: 'face_swap', patterns: ['Face Swap', '换脸'] },
  { intent: 'pose_transfer', patterns: ['Pose', '姿势'] },
  { intent: 'inpaint', patterns: ['Inpaint', '局部'] },
  { intent: 'outpaint', patterns: ['Outpaint', '扩展'] },

  // V1 Core intents
  { intent: 'malleable', patterns: ['Redraw', '重绘'] },
  { intent: 'structure', patterns: ['Structure', '构图'] },
  { intent: 'subject', patterns: ['Subject', '主体'] },
  { intent: 'style_ref', patterns: ['Style', '风格'] },
];

// ============================================
// Parser Function
// ============================================

/**
 * 解析 Reference Intent 字符串为标准化枚举值
 *
 * @param value - 用户选择的 Intent 值 (可能是 UI 显示文本)
 * @returns 标准化的 ReferenceIntent 或 undefined
 *
 * @example
 * parseReferenceIntent('Style Reference') // => 'style_ref'
 * parseReferenceIntent('重绘') // => 'malleable'
 * parseReferenceIntent(null) // => undefined
 */
export function parseReferenceIntent(value: unknown): ReferenceIntent | undefined {
  if (!value) return undefined;

  const str = String(value);

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (str.includes(pattern)) {
        return intent;
      }
    }
  }

  return undefined;
}

/**
 * 获取 Intent 的默认值 (当无法解析时使用)
 */
export const DEFAULT_REFERENCE_INTENT: ReferenceIntent = 'malleable';
