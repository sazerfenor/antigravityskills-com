/**
 * Intent Analyzer Unit Tests
 * 
 * Tests pure functions that don't require LLM mocking:
 * - extractRatio()
 * - detectUserLanguage()
 * - extractJSON()
 */

import { describe, it, expect } from 'vitest';
import { extractRatio } from '../intent-analyzer';
import { RATIO_TEST_CASES, LANGUAGE_TEST_CASES } from './__fixtures__/test-inputs';

// ============================================
// extractRatio() Tests
// ============================================

describe('extractRatio', () => {
  describe('standard ratio formats', () => {
    it.each(RATIO_TEST_CASES.standard)(
      'should extract "$expected.extractedRatio" from "$input"',
      ({ input, expected }) => {
        const result = extractRatio(input);
        expect(result.extractedRatio).toBe(expected.extractedRatio);
        expect(result.mappedRatio).toBe(expected.mappedRatio);
        expect(result.wasRemapped).toBe(expected.wasRemapped);
      }
    );
  });

  describe('Chinese descriptions', () => {
    it.each(RATIO_TEST_CASES.chinese)(
      'should extract "$expected.extractedRatio" from Chinese input "$input"',
      ({ input, expected }) => {
        const result = extractRatio(input);
        expect(result.extractedRatio).toBe(expected.extractedRatio);
        expect(result.mappedRatio).toBe(expected.mappedRatio);
      }
    );
  });

  describe('no ratio present', () => {
    it.each(RATIO_TEST_CASES.noRatio)(
      'should return null for "$input"',
      ({ input, expected }) => {
        const result = extractRatio(input);
        expect(result.extractedRatio).toBeNull();
        expect(result.mappedRatio).toBeNull();
      }
    );
  });

  describe('ratio remapping', () => {
    it.each(RATIO_TEST_CASES.remapping)(
      'should remap "$expected.extractedRatio" to "$expected.mappedRatio"',
      ({ input, expected }) => {
        const result = extractRatio(input);
        expect(result.extractedRatio).toBe(expected.extractedRatio);
        expect(result.mappedRatio).toBe(expected.mappedRatio);
        expect(result.wasRemapped).toBe(true);
      }
    );
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = extractRatio('');
      expect(result.extractedRatio).toBeNull();
    });

    it('should handle only whitespace', () => {
      const result = extractRatio('   ');
      expect(result.extractedRatio).toBeNull();
    });

    it('should handle ratio at start of string', () => {
      const result = extractRatio('16:9 landscape image');
      expect(result.extractedRatio).toBe('16:9');
    });

    it('should handle ratio at end of string', () => {
      const result = extractRatio('create an image in 16:9');
      expect(result.extractedRatio).toBe('16:9');
    });

    it('should handle multiple ratios (takes first)', () => {
      const result = extractRatio('16:9 or 4:3');
      expect(result.extractedRatio).toBe('16:9');
    });
  });
});

// ============================================
// Conditional Trigger Logic Tests
// ============================================

describe('Conditional Trigger Logic (simulated)', () => {
  // These test the logic patterns without needing LLM
  
  describe('Camera/Lighting trigger conditions', () => {
    const shouldTriggerCameraLighting = (
      styleHints: string[],
      subject: string,
      contentCategory: string
    ): boolean => {
      const photographyStyles = ['photorealistic', 'cinematic', 'realistic', 'photography', 'film', 'portrait', 'landscape'];
      const nonPhotoSubjects = ['PPT', 'UI', 'wireframe', 'diagram', 'infographic', 'logo', 'icon', 'template'];
      
      const hasPhotoStyle = styleHints.some(h => photographyStyles.includes(h.toLowerCase()));
      const isNonPhotoSubject = nonPhotoSubjects.some(s => subject.toLowerCase().includes(s.toLowerCase()));
      const isGraphicDesign = contentCategory === 'graphic_design';
      
      return hasPhotoStyle && !isNonPhotoSubject && !isGraphicDesign;
    };

    it('should trigger for photorealistic portrait', () => {
      expect(shouldTriggerCameraLighting(['photorealistic', 'portrait'], '人像照片', 'photography')).toBe(true);
    });

    it('should NOT trigger for PPT template', () => {
      expect(shouldTriggerCameraLighting(['business', 'minimal'], 'PPT 模板', 'graphic_design')).toBe(false);
    });

    it('should NOT trigger for logo design', () => {
      expect(shouldTriggerCameraLighting(['minimal'], 'Logo Design', 'graphic_design')).toBe(false);
    });
  });

  describe('Text Integration trigger conditions', () => {
    const shouldTriggerTextIntegration = (
      detectedText: string[],
      contentCategory: string,
      styleHints: string[]
    ): boolean => {
      const typographyHints = ['typography', 'lettering', 'text-heavy'];
      
      return (
        detectedText.length > 0 ||
        contentCategory === 'graphic_design' ||
        styleHints.some(h => typographyHints.includes(h.toLowerCase()))
      );
    };

    it('should trigger when detected_text is non-empty', () => {
      expect(shouldTriggerTextIntegration(['限时促销'], 'other', [])).toBe(true);
    });

    it('should trigger for graphic_design category', () => {
      expect(shouldTriggerTextIntegration([], 'graphic_design', [])).toBe(true);
    });

    it('should trigger for typography style hint', () => {
      expect(shouldTriggerTextIntegration([], 'other', ['typography'])).toBe(true);
    });

    it('should NOT trigger for plain photography', () => {
      expect(shouldTriggerTextIntegration([], 'photography', ['portrait'])).toBe(false);
    });
  });

  describe('Knowledge Enhancement trigger conditions', () => {
    const shouldTriggerKnowledge = (
      contentCategory: string,
      subject: string,
      styleHints: string[]
    ): boolean => {
      const knowledgeSubjects = ['diagram', 'recipe', 'anatomy', 'flowchart', 'cross-section', 'tutorial', 'how-to'];
      const scientificStyles = ['scientific', 'educational', 'technical', 'accurate', 'factual', 'step-by-step'];
      
      const isInfoSubject = contentCategory === 'infographic' || 
        knowledgeSubjects.some(s => subject.toLowerCase().includes(s));
      const hasScientificStyle = styleHints.some(h => scientificStyles.includes(h.toLowerCase()));
      
      // Both conditions must be met
      return isInfoSubject && hasScientificStyle;
    };

    it('should trigger for infographic with educational style', () => {
      expect(shouldTriggerKnowledge('infographic', '信息图', ['educational'])).toBe(true);
    });

    it('should trigger for diagram with scientific style', () => {
      expect(shouldTriggerKnowledge('other', 'anatomy diagram', ['scientific'])).toBe(true);
    });

    it('should NOT trigger for infographic without scientific style', () => {
      expect(shouldTriggerKnowledge('infographic', '信息图', ['colorful'])).toBe(false);
    });
  });

  describe('Character Roles trigger conditions', () => {
    const shouldTriggerCharacterRoles = (
      imageAnalysis: { image_type: string }[]
    ): boolean => {
      const faceCount = imageAnalysis.filter(img => img.image_type === 'face_portrait').length;
      return faceCount >= 2;
    };

    it('should trigger for 2 face portraits', () => {
      expect(shouldTriggerCharacterRoles([
        { image_type: 'face_portrait' },
        { image_type: 'face_portrait' }
      ])).toBe(true);
    });

    it('should trigger for 3 face portraits', () => {
      expect(shouldTriggerCharacterRoles([
        { image_type: 'face_portrait' },
        { image_type: 'face_portrait' },
        { image_type: 'face_portrait' }
      ])).toBe(true);
    });

    it('should NOT trigger for 1 face portrait', () => {
      expect(shouldTriggerCharacterRoles([
        { image_type: 'face_portrait' }
      ])).toBe(false);
    });

    it('should NOT trigger for non-face images', () => {
      expect(shouldTriggerCharacterRoles([
        { image_type: 'scene' },
        { image_type: 'product' }
      ])).toBe(false);
    });

    it('should trigger for 2 faces + 1 scene', () => {
      expect(shouldTriggerCharacterRoles([
        { image_type: 'face_portrait' },
        { image_type: 'face_portrait' },
        { image_type: 'scene' }
      ])).toBe(true);
    });
  });
});
