/**
 * Image Generation Constants - Re-exports from unified config
 * 
 * This file re-exports constants from the unified configuration.
 * All model configurations are now managed in @/shared/config/ai-models.ts
 */

// Re-export everything from unified config
export {
  // Types
  type ModelConfig,
  
  // Constants
  POLL_INTERVAL,
  GENERATION_TIMEOUT,
  MAX_PROMPT_LENGTH,
  MODEL_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  ASPECT_RATIO_OPTIONS_PRO,
  IMAGE_SIZE_OPTIONS,
  PERSON_GENERATION_OPTIONS,
  
  // Helper functions
  getModelByValue,
  getProviderFromModel,
  calculateCreditCost,
} from '@/shared/config/ai-models';
