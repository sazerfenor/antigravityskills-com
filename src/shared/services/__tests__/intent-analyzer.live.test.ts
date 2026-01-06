/**
 * Intent Analyzer Live Integration Tests
 * 
 * ⚠️ 这些测试会真实调用 Gemini 3.0 Flash API
 * 运行命令: pnpm test:live
 * 
 * 需要环境变量:
 * - GOOGLE_AI_API_KEY (在 .env.development 中配置)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { analyzeIntent } from '../intent-analyzer';

// 仅在 RUN_LIVE_TESTS=true 时运行
const shouldRun = process.env.RUN_LIVE_TESTS === 'true';

describe.runIf(shouldRun)('Live LLM Integration - Gemini 3.0 Flash', () => {
  
  // 增加超时时间，LLM 调用可能需要较长时间
  const TIMEOUT = 60000; // 60 seconds
  
  beforeAll(() => {
    console.log('[Live Test] 使用 Gemini 3.0 Flash 进行真实 API 调用');
  });

  // ============================================
  // Test 1: Camera/Lighting 条件触发
  // ============================================
  describe('Camera/Lighting Conditional Trigger', () => {
    
    it('should add Camera/Lighting fields for photorealistic portrait', async () => {
      const result = await analyzeIntent('一张专业人像照片');
      
      expect(result).not.toBeNull();
      expect(result?.fields).toBeDefined();
      
      // 检查是否生成了 camera 相关字段
      const hasCameraField = result?.fields.some(f => 
        f.id.toLowerCase().includes('camera') || 
        f.id.toLowerCase().includes('angle')
      );
      const hasLightingField = result?.fields.some(f => 
        f.id.toLowerCase().includes('lighting') || 
        f.id.toLowerCase().includes('light')
      );
      
      console.log('[Live Test] Portrait fields:', result?.fields.map(f => f.id));
      
      // 至少应该有 camera 或 lighting 其中一个
      expect(hasCameraField || hasLightingField).toBe(true);
    }, TIMEOUT);
    
    it('should NOT add Camera/Lighting fields for PPT template', async () => {
      const result = await analyzeIntent('PPT 模板，商务风');
      
      expect(result).not.toBeNull();
      
      const hasCameraField = result?.fields.some(f => 
        f.id.toLowerCase().includes('camera') || 
        f.id.toLowerCase().includes('depth_of_field')
      );
      
      console.log('[Live Test] PPT fields:', result?.fields.map(f => f.id));
      
      // PPT 不应该有相机设置
      expect(hasCameraField).toBe(false);
    }, TIMEOUT);
  });

  // ============================================
  // Test 2: Text Integration 条件触发
  // ============================================
  describe('Text Integration Conditional Trigger', () => {
    
    it('should detect quoted text and add text fields for poster', async () => {
      const result = await analyzeIntent("海报，标题'限时促销'");
      
      expect(result).not.toBeNull();
      
      const hasTextField = result?.fields.some(f => 
        f.id.toLowerCase().includes('text') ||
        f.label?.includes('文字') ||
        f.label?.includes('标题')
      );
      
      console.log('[Live Test] Poster fields:', result?.fields.map(f => ({ id: f.id, label: f.label })));
      
      expect(hasTextField).toBe(true);
    }, TIMEOUT);
  });

  // ============================================
  // Test 3: Knowledge Enhancement 条件触发
  // ============================================
  describe('Knowledge Enhancement Conditional Trigger', () => {
    
    it('should add knowledge fields for scientific infographic', async () => {
      const result = await analyzeIntent('科学信息图，展示细胞结构');
      
      expect(result).not.toBeNull();
      
      // 检查是否有 toggle 类型的字段 (factual_accuracy, knowledge_enhancement)
      const hasKnowledgeField = result?.fields.some(f => 
        f.type === 'toggle' ||
        f.id.toLowerCase().includes('accuracy') ||
        f.id.toLowerCase().includes('knowledge') ||
        f.id.toLowerCase().includes('factual')
      );
      
      console.log('[Live Test] Infographic fields:', result?.fields.map(f => ({ id: f.id, type: f.type })));
      
      // 科学信息图应该有知识增强相关字段
      expect(hasKnowledgeField).toBe(true);
    }, TIMEOUT);
  });

  // ============================================
  // Test 4: 基础功能验证
  // ============================================
  describe('Basic Functionality', () => {
    
    it('should return valid schema for simple input', async () => {
      const result = await analyzeIntent('一只可爱的猫');
      
      expect(result).not.toBeNull();
      expect(result?.context).toBeDefined();
      expect(result?.fields).toBeDefined();
      expect(Array.isArray(result?.fields)).toBe(true);
      expect(result?.fields.length).toBeGreaterThan(0);
      
      console.log('[Live Test] Cat fields count:', result?.fields.length);
      console.log('[Live Test] Cat context:', result?.context);
    }, TIMEOUT);

    it('should handle empty input gracefully', async () => {
      const result = await analyzeIntent('');
      
      // 空输入应该返回 null 或抛出错误
      expect(result).toBeNull();
    }, TIMEOUT);
  });

  // ============================================
  // Test 5: extractedRatio 验证
  // ============================================
  describe('Ratio Extraction', () => {
    
    it('should extract 16:9 ratio from input', async () => {
      const result = await analyzeIntent('16:9 的横版壁纸');
      
      expect(result).not.toBeNull();
      expect(result?.extractedRatio).toBe('16:9');
      
      console.log('[Live Test] Extracted ratio:', result?.extractedRatio);
    }, TIMEOUT);
  });
});

// ============================================
// 快速冒烟测试 (任何时候都可以运行)
// ============================================
describe('Smoke Test (always runs)', () => {
  it('should import analyzeIntent without errors', () => {
    expect(typeof analyzeIntent).toBe('function');
  });
});
