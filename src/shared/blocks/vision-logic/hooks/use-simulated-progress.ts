'use client';

import { useState, useRef, useEffect } from 'react';

interface UseSimulatedProgressOptions {
  /** 是否激活（当 true 时开始模拟） */
  isActive: boolean;
  /** 起始进度，默认 15 */
  startProgress?: number;
  /** 最大进度（刹车点），默认 85 */
  maxProgress?: number;
  /**
   * 槽位时间阈值 (ms)，与 useLoadingMessage 的 slotThresholds 保持一致
   * 例如 [10000, 28000] 表示：
   * - 0-10s: 第一槽位
   * - 10-28s: 第二槽位
   * - 28s+: 第三槽位
   */
  slotThresholds?: readonly number[] | number[];
  /** 预估总耗时 (ms)，用于计算 85% 刹车点的时间，默认自动计算 */
  estimatedDuration?: number;
  /** 更新间隔 (ms)，默认 300 */
  updateInterval?: number;
  /** 外部完成信号（当为 true 时直接跳到 100） */
  isComplete?: boolean;
}

/**
 * 统一进度模拟 Hook（基于时间）
 *
 * 与 useLoadingMessage 使用相同的时间阈值逻辑，确保进度条和消息同步变化。
 *
 * 进度计算逻辑：
 * 1. 根据经过时间和 slotThresholds 计算当前处于哪个槽位
 * 2. 在每个槽位内线性插值计算进度
 * 3. 最后槽位到达 maxProgress (85%) 后刹车，等待实际完成
 *
 * @example
 * const buildProgress = useSimulatedProgress({
 *   isActive: uiState === 'ANALYZING',
 *   startProgress: 15,
 *   maxProgress: 85,
 *   slotThresholds: [10000, 28000], // 与 useLoadingMessage 相同
 *   estimatedDuration: 35000,       // 预估 35 秒完成
 * });
 */
export function useSimulatedProgress(options: UseSimulatedProgressOptions): number {
  const {
    isActive,
    startProgress = 15,
    maxProgress = 85,
    slotThresholds = [],
    estimatedDuration,
    updateInterval = 300,
    isComplete = false,
  } = options;

  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // 使用 useRef 存储配置值，避免在 useEffect 依赖数组中引起重新执行
  const configRef = useRef({
    startProgress,
    maxProgress,
    slotThresholds,
    estimatedDuration,
    updateInterval,
  });
  configRef.current = {
    startProgress,
    maxProgress,
    slotThresholds,
    estimatedDuration,
    updateInterval,
  };

  useEffect(() => {
    // 完成信号：立即跳到 100
    if (isComplete) {
      setProgress(100);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 非激活状态：重置
    if (!isActive) {
      setProgress(0);
      startTimeRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 首次激活：初始化
    const now = Date.now();
    startTimeRef.current = now;
    const config = configRef.current;
    setProgress(config.startProgress);

    // 启动基于时间的进度更新
    intervalRef.current = setInterval(() => {
      const {
        startProgress: start,
        maxProgress: max,
        slotThresholds: thresholds,
        estimatedDuration: estDuration,
      } = configRef.current;

      const elapsed = Date.now() - startTimeRef.current;

      // 计算预估总时间
      // 默认为最后一个阈值 * 1.25（留出 25% 缓冲）
      const totalDuration =
        estDuration ||
        (thresholds.length > 0
          ? thresholds[thresholds.length - 1] * 1.25
          : 30000); // 默认 30 秒

      // 基于时间线性计算进度（带少量随机波动）
      const rawProgress = (elapsed / totalDuration) * (max - start) + start;

      // 添加少量随机波动（±1%），模拟自然感
      const jitter = (Math.random() - 0.5) * 2;
      const targetProgress = Math.min(rawProgress + jitter, max);

      setProgress((prev) => {
        // 进度只能增加，不能减少（防止抖动）
        if (targetProgress <= prev) return prev;
        // 刹车在 maxProgress
        if (prev >= max) return prev;
        return Math.min(targetProgress, max);
      });
    }, config.updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isComplete]); // 只依赖这两个关键状态

  return progress;
}
