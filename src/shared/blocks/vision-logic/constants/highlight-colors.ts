/**
 * Prompt Highlight Colors
 * 定义不同类别高亮的颜色映射
 *
 * @see PRD: Prompt 高亮交互系统
 */

import type { HighlightCategory } from '../types';

export interface HighlightColorConfig {
  /** 文字颜色 */
  text: string;
  /** 背景颜色 */
  bg: string;
  /** 下划线装饰颜色 */
  decoration: string;
  /** 悬浮 ring 颜色 */
  ring: string;
}

/**
 * 高亮颜色映射表
 * 每个类别对应一套颜色配置
 */
export const HIGHLIGHT_COLORS: Record<HighlightCategory, HighlightColorConfig> = {
  // 主题 - 黄色 (primary)
  subject: {
    text: 'text-yellow-200',
    bg: 'bg-yellow-500/10',
    decoration: 'decoration-yellow-500/50',
    ring: 'ring-yellow-500/30',
  },
  // 风格 - 紫色
  style: {
    text: 'text-purple-300',
    bg: 'bg-purple-500/10',
    decoration: 'decoration-purple-500/50',
    ring: 'ring-purple-500/30',
  },
  // 光照 - 蓝色
  lighting: {
    text: 'text-blue-300',
    bg: 'bg-blue-500/10',
    decoration: 'decoration-blue-500/50',
    ring: 'ring-blue-500/30',
  },
  // 环境 - 绿色
  environment: {
    text: 'text-green-300',
    bg: 'bg-green-500/10',
    decoration: 'decoration-green-500/50',
    ring: 'ring-green-500/30',
  },
  // 氛围 - 粉色
  mood: {
    text: 'text-pink-300',
    bg: 'bg-pink-500/10',
    decoration: 'decoration-pink-500/50',
    ring: 'ring-pink-500/30',
  },
  // 技术参数 - 青色 (更明显)
  technical: {
    text: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    decoration: 'decoration-cyan-500/50',
    ring: 'ring-cyan-500/30',
  },
};

/**
 * 获取高亮颜色配置
 * @param category 高亮类别
 * @returns 颜色配置对象
 */
export function getHighlightColors(category: HighlightCategory): HighlightColorConfig {
  return HIGHLIGHT_COLORS[category] || HIGHLIGHT_COLORS.technical;
}
