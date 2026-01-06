'use client';

import { useRef, useCallback } from 'react';

interface PhaseTimerOptions {
  /** 阶段名称 (如 'Build', 'Optimize', 'Generate') */
  phaseName: string;
  /** 是否启用开发日志，默认 true */
  enableDevLog?: boolean;
}

interface PhaseTimerReturn {
  /** 开始计时 */
  start: () => void;
  /** 结束计时并返回耗时 (ms) */
  end: () => number;
  /** 获取当前已过时间 (ms) */
  getElapsed: () => number;
}

/**
 * 阶段计时 Hook - 用于开发环境调试
 *
 * 在开发环境下输出每个阶段的真实耗时，格式：
 * [PhaseTimer] Build started
 * [PhaseTimer] Build completed in 31234ms
 *
 * @example
 * const buildTimer = usePhaseTimer({ phaseName: 'Build' });
 *
 * // 开始 Build
 * buildTimer.start();
 * await analyzeIntent(input);
 * // 结束 Build
 * const duration = buildTimer.end();
 */
export function usePhaseTimer({
  phaseName,
  enableDevLog = true,
}: PhaseTimerOptions): PhaseTimerReturn {
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const isDev = process.env.NODE_ENV === 'development';

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    isRunningRef.current = true;
    if (isDev && enableDevLog) {
      console.log(`[PhaseTimer] ${phaseName} started`);
    }
  }, [phaseName, isDev, enableDevLog]);

  const end = useCallback((): number => {
    if (!isRunningRef.current) return 0;
    const duration = Date.now() - startTimeRef.current;
    isRunningRef.current = false;
    if (isDev && enableDevLog) {
      console.log(`[PhaseTimer] ${phaseName} completed in ${duration}ms`);
    }
    return duration;
  }, [phaseName, isDev, enableDevLog]);

  const getElapsed = useCallback((): number => {
    if (!isRunningRef.current) return 0;
    return Date.now() - startTimeRef.current;
  }, []);

  return { start, end, getElapsed };
}
