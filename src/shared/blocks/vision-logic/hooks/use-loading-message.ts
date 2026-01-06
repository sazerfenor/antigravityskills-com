'use client';

import { useState, useRef, useEffect } from 'react';
import { pickRandom } from '../constants/loading-messages';

/**
 * 消息池配置接口
 */
interface MessagePoolSlot {
  messages: string[];
  minDuration: number;
}

type MessagePool<T extends string> = Record<T, MessagePoolSlot>;

/**
 * 动态选项（用于场景化消息）
 */
interface DynamicOptions {
  /** 是否有图片 */
  hasImages: boolean;
  /** 图片数量 */
  imageCount: number;
}

/**
 * Hook 参数
 */
interface UseLoadingMessageOptions<T extends string> {
  /** 是否激活（当 true 时开始运行状态机） */
  isActive: boolean;
  /** 消息池配置 */
  messagePool: MessagePool<T>;
  /** 槽位列表（按时间顺序） */
  slots: readonly T[];
  /** 槽位切换时间阈值 (ms) */
  slotThresholds: readonly number[] | number[];
  /** 检查间隔 (ms)，默认 300 */
  checkInterval?: number;
  /** 消息轮换间隔 (ms)，默认 4000 (4秒换一次消息) */
  messageRotateInterval?: number;
  /** 动态选项（有图片时使用） */
  dynamicOptions?: DynamicOptions;
  /** 图片分析消息模板（有图片时在 PROCESSING 阶段使用） */
  imageAnalysisTemplate?: (current: number, total: number) => string;
}

/**
 * Hook 返回值
 */
interface UseLoadingMessageReturn<T extends string> {
  /** 当前槽位 */
  slot: T;
  /** 当前显示的消息 */
  message: string;
}

/**
 * 通用 Loading 消息状态机 Hook
 *
 * 基于时间自动切换槽位，从对应消息池随机选择消息。
 * 适用于 Build、Optimize、Generate 等多阶段加载场景。
 *
 * V2 新特性：
 * - 支持动态阈值（根据是否有图片调整）
 * - 支持图片分析进度模拟（在 PROCESSING 阶段显示 "Analyzing image 1/3..."）
 * - 支持阶段内消息轮换（每 4 秒更换一次消息，增加动态感）
 *
 * @example
 * const { message } = useLoadingMessage({
 *   isActive: uiState === 'ANALYZING',
 *   messagePool: BUILD_MESSAGE_POOL_WITH_IMAGES,
 *   slots: ['STARTUP', 'PROCESSING', 'FINALIZING'],
 *   slotThresholds: [15000, 40000],
 *   dynamicOptions: { hasImages: true, imageCount: 3 },
 *   imageAnalysisTemplate: IMAGE_ANALYSIS_MESSAGES.getAnalyzingMessage,
 * });
 */
export function useLoadingMessage<T extends string>(
  options: UseLoadingMessageOptions<T>
): UseLoadingMessageReturn<T> {
  const {
    isActive,
    messagePool,
    slots,
    slotThresholds,
    checkInterval = 300,
    messageRotateInterval = 4000,
    dynamicOptions,
    imageAnalysisTemplate,
  } = options;

  const initialSlot = slots[0];
  const [slot, setSlot] = useState<T>(initialSlot);
  const [message, setMessage] = useState('');

  const startTimeRef = useRef<number>(0);
  const lastSlotChangeRef = useRef<number>(0);
  const lastMessageChangeRef = useRef<number>(0);
  const lastImageIndexRef = useRef<number>(0);

  useEffect(() => {
    // 非激活状态：重置
    if (!isActive) {
      startTimeRef.current = 0;
      lastMessageChangeRef.current = 0;
      setSlot(initialSlot);
      lastImageIndexRef.current = 0;
      return;
    }

    // 首次激活：初始化
    if (startTimeRef.current === 0) {
      const now = Date.now();
      startTimeRef.current = now;
      lastSlotChangeRef.current = now;
      lastMessageChangeRef.current = now;
      setMessage(pickRandom(messagePool[initialSlot].messages));
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const timeSinceLastSlot = now - lastSlotChangeRef.current;
      const timeSinceLastMessage = now - lastMessageChangeRef.current;

      // 根据经过时间确定目标槽位索引
      let targetSlotIndex = 0;
      for (let i = 0; i < slotThresholds.length; i++) {
        if (elapsed > slotThresholds[i]) {
          targetSlotIndex = i + 1;
        }
      }
      const targetSlot = slots[Math.min(targetSlotIndex, slots.length - 1)];

      // ✨ 图片分析进度模拟（在 PROCESSING 阶段，即 targetSlotIndex === 1）
      const isImageAnalysisActive =
        dynamicOptions?.hasImages &&
        imageAnalysisTemplate &&
        targetSlotIndex === 1 &&
        dynamicOptions.imageCount > 0;

      if (isImageAnalysisActive) {
        const imageCount = dynamicOptions.imageCount;
        const processingStart = slotThresholds[0];
        const processingEnd = slotThresholds[1] || processingStart * 3;
        const processingDuration = processingEnd - processingStart;
        const processingElapsed = elapsed - processingStart;

        if (processingElapsed > 0 && processingElapsed < processingDuration) {
          const progress = processingElapsed / processingDuration;
          // 计算当前应该显示的图片索引（从 0 开始）
          const newImageIndex = Math.min(
            Math.floor(progress * imageCount),
            imageCount - 1
          );

          // 只在图片索引变化时更新消息
          if (newImageIndex !== lastImageIndexRef.current) {
            lastImageIndexRef.current = newImageIndex;
            lastMessageChangeRef.current = now;
            // 使用图片分析模板生成消息（current 从 1 开始）
            setMessage(imageAnalysisTemplate(newImageIndex + 1, imageCount));
          }
        }
      }

      // 切换槽位（需满足最小持续时间）
      if (targetSlot !== slot && timeSinceLastSlot >= messagePool[slot].minDuration) {
        setSlot(targetSlot);
        // 如果不是在图片分析中，使用随机消息
        if (!isImageAnalysisActive) {
          setMessage(pickRandom(messagePool[targetSlot].messages));
          lastMessageChangeRef.current = now;
        }
        lastSlotChangeRef.current = now;
      }
      // ✨ 阶段内消息轮换（每 messageRotateInterval 更换一次消息）
      else if (!isImageAnalysisActive && timeSinceLastMessage >= messageRotateInterval) {
        // 在当前阶段内轮换消息，增加动态感
        setMessage(pickRandom(messagePool[slot].messages));
        lastMessageChangeRef.current = now;
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [
    isActive,
    slot,
    messagePool,
    slots,
    slotThresholds,
    checkInterval,
    messageRotateInterval,
    initialSlot,
    dynamicOptions,
    imageAnalysisTemplate,
  ]);

  return { slot, message };
}
