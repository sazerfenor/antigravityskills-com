'use client';

import { useRef, useCallback } from 'react';
import type { DynamicFieldRef, SchemaField } from '../types';

/**
 * Hook 管理 DynamicField 组件的 ref 注册和高亮交互
 *
 * 解决的问题：
 * - 消除 DynamicField ref 注册的重复代码 (原本在两处重复)
 * - 统一 fieldId 和 label-derived key 的双重注册
 * - 提供高亮交互功能 (handleHighlightClick)
 */

export interface UseFieldRefsReturn {
  /** 存储所有字段 ref 的 Map */
  fieldRefs: React.MutableRefObject<Map<string, DynamicFieldRef>>;
  /** 创建 ref 回调函数，用于 DynamicField 的 ref 属性 */
  createRefCallback: (field: SchemaField) => (ref: DynamicFieldRef | null) => void;
  /** 高亮点击处理函数 */
  handleHighlightClick: (fieldId: string, showAdvanced: boolean, setShowAdvanced: (v: boolean) => void) => void;
  /** 清除所有高亮 */
  clearAllHighlights: () => void;
}

export function useFieldRefs(): UseFieldRefsReturn {
  const fieldRefs = useRef<Map<string, DynamicFieldRef>>(new Map());

  /**
   * 创建 ref 回调函数
   * 同时注册 field.id 和 label-derived key (用于 PLO/Compile)
   */
  const createRefCallback = useCallback(
    (field: SchemaField) => (ref: DynamicFieldRef | null) => {
      if (ref) {
        // 注册 field.id
        fieldRefs.current.set(field.id, ref);
        // 同时注册 label-derived key (编译器使用)
        const labelKey = field.label.toLowerCase().replace(/\s+/g, '_');
        if (labelKey !== field.id) {
          fieldRefs.current.set(labelKey, ref);
        }
      } else {
        // 清理
        fieldRefs.current.delete(field.id);
        const labelKey = field.label.toLowerCase().replace(/\s+/g, '_');
        fieldRefs.current.delete(labelKey);
      }
    },
    []
  );

  /**
   * 清除所有字段高亮
   */
  const clearAllHighlights = useCallback(() => {
    for (const ref of fieldRefs.current.values()) {
      ref.clearHighlight();
    }
  }, []);

  /**
   * 查找字段 ref (支持精确匹配和模糊匹配)
   */
  const findFieldRef = useCallback((fieldId: string): DynamicFieldRef | null => {
    // 精确匹配
    let ref = fieldRefs.current.get(fieldId);
    if (ref) return ref;

    // 模糊匹配 (lowercase, 移除分隔符)
    const normalizedId = fieldId.toLowerCase().replace(/[_\s-]/g, '');
    for (const [key, refItem] of fieldRefs.current.entries()) {
      const normalizedKey = key.toLowerCase().replace(/[_\s-]/g, '');
      if (
        normalizedKey === normalizedId ||
        normalizedKey.includes(normalizedId) ||
        normalizedId.includes(normalizedKey)
      ) {
        return refItem;
      }
    }
    return null;
  }, []);

  /**
   * 执行高亮动画 (滚动 + 聚焦 + 闪烁)
   */
  const executeHighlight = useCallback(
    (fieldId: string): boolean => {
      const fieldRef = findFieldRef(fieldId);
      if (fieldRef) {
        clearAllHighlights();
        fieldRef.scrollIntoView();
        fieldRef.focus();
        fieldRef.highlight();
        return true;
      }
      return false;
    },
    [findFieldRef, clearAllHighlights]
  );

  /**
   * 高亮点击处理
   * 如果字段在 Advanced 区域且未展开，先展开再高亮
   */
  const handleHighlightClick = useCallback(
    (
      fieldId: string,
      showAdvanced: boolean,
      setShowAdvanced: (v: boolean) => void
    ) => {
      // DEBUG: Log click event and available refs
      console.log('[useFieldRefs] handleHighlightClick called:', {
        fieldId,
        showAdvanced,
        availableRefs: Array.from(fieldRefs.current.keys()),
      });

      // 先尝试直接执行
      const found = executeHighlight(fieldId);
      console.log('[useFieldRefs] executeHighlight result:', { fieldId, found });

      if (found) return;

      // 字段未找到，可能在 Advanced 区域
      // 由于我们无法在这里检测 activeSchema，调用者需要自行判断
      // 这里只提供展开后重试的逻辑
      if (!showAdvanced) {
        console.log('[useFieldRefs] Field not found, expanding Advanced section...');
        setShowAdvanced(true);
        // 等待 AnimatePresence 动画完成 (400ms)
        setTimeout(() => {
          const retryFound = executeHighlight(fieldId);
          console.log('[useFieldRefs] Retry after expand:', { fieldId, retryFound });
        }, 400);
      } else {
        console.log('[useFieldRefs] Field not found and Advanced already expanded. fieldId mismatch?');
      }
    },
    [executeHighlight]
  );

  return {
    fieldRefs,
    createRefCallback,
    handleHighlightClick,
    clearAllHighlights,
  };
}
