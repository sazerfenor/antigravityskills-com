'use client';

/**
 * Skill Builder Hook
 *
 * 状态管理：处理生成流程和 UI 状态
 */

import { useState, useCallback } from 'react';
import type {
  SkillBuilderState,
  SkillBuilderActions,
  GenerationProgress,
  GenerationResult,
  GenerateResponse,
} from '../types';
import { downloadSkillZip } from '../utils/zip-generator';

const initialProgress: GenerationProgress = {
  phase: 'IDLE',
  message: '',
};

const initialState: SkillBuilderState = {
  input: '',
  progress: initialProgress,
  result: null,
  error: null,
};

export function useSkillBuilder(): SkillBuilderState & SkillBuilderActions {
  const [state, setState] = useState<SkillBuilderState>(initialState);

  const setInput = useCallback((input: string) => {
    setState(prev => ({ ...prev, input }));
  }, []);

  const generate = useCallback(async () => {
    if (!state.input.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a description' }));
      return;
    }

    // Reset state
    setState(prev => ({
      ...prev,
      result: null,
      error: null,
      progress: { phase: 'ANALYZING', message: 'Analyzing your request...' },
    }));

    try {
      const response = await fetch('/api/skill-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: state.input }),
      });

      // API 返回格式: { code: 0, message: 'ok', data: GenerateResponse }
      const apiResponse = await response.json() as {
        code: number;
        message: string;
        data: GenerateResponse;
      };

      if (!response.ok || apiResponse.code !== 0) {
        throw new Error(apiResponse.message || 'Failed to generate skill');
      }

      // 提取嵌套的 GenerateResponse
      const data = apiResponse.data;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate skill');
      }

      setState(prev => ({
        ...prev,
        result: data.data as GenerationResult,
        progress: { phase: 'COMPLETE', message: 'Skill generated successfully!' },
      }));
    } catch (e: any) {
      setState(prev => ({
        ...prev,
        error: e.message || 'An error occurred',
        progress: { phase: 'ERROR', message: e.message },
      }));
    }
  }, [state.input]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const downloadZip = useCallback(async () => {
    if (!state.result) return;

    try {
      await downloadSkillZip(state.result.skill.name, state.result.skill.files);
    } catch (e: any) {
      setState(prev => ({ ...prev, error: e.message }));
    }
  }, [state.result]);

  return {
    ...state,
    setInput,
    generate,
    reset,
    downloadZip,
  };
}
