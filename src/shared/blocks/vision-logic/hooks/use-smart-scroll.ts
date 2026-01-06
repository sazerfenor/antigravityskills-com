'use client';

import { useCallback, RefObject } from 'react';

/**
 * 智能滚动 Hook
 *
 * PRD V6: 条件触发 + 键盘处理 + reduced-motion 支持
 * - 等待键盘收起动画后再滚动
 * - 检测目标是否已在视口内（避免不必要滚动）
 * - 移动端和桌面端使用不同滚动策略
 * - 尊重 prefers-reduced-motion 设置
 */

interface UseSmartScrollOptions {
  /** 是否启用 reduced-motion 模式 */
  prefersReducedMotion: boolean;
}

interface UseSmartScrollReturn {
  /**
   * 智能滚动到目标元素
   * @param targetRef 目标元素的 ref
   */
  smartScrollTo: (targetRef: RefObject<HTMLElement | null>) => void;
}

export function useSmartScroll(options: UseSmartScrollOptions): UseSmartScrollReturn {
  const { prefersReducedMotion } = options;

  const smartScrollTo = useCallback(
    (targetRef: RefObject<HTMLElement | null>) => {
      // Step 1: 等待键盘收起动画 (约 300ms)，reduced-motion 模式下立即执行
      const delay = prefersReducedMotion ? 0 : 300;

      setTimeout(() => {
        const target = targetRef.current;
        if (!target) return;

        // Step 2: 检测目标是否已在视口内
        const rect = target.getBoundingClientRect();
        const isFullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

        if (!isFullyVisible) {
          // Step 3: 移动端用 'start'，桌面端用 'nearest'
          const isMobile = window.innerWidth < 768;
          target.scrollIntoView({
            // PRD V6: reduced-motion 模式下使用 instant
            behavior: prefersReducedMotion ? 'instant' : 'smooth',
            block: isMobile ? 'start' : 'nearest',
          });
        }
      }, delay);
    },
    [prefersReducedMotion]
  );

  return { smartScrollTo };
}
