/**
 * Skill Schemas
 * Zod schemas for Skill-related API validation
 */

import { z } from 'zod';

/**
 * Skill Convert Schema
 * 用于 /api/skills/convert 的请求校验
 */
export const skillConvertSchema = z.object({
  input: z
    .string()
    .min(10, 'Input must be at least 10 characters')
    .max(50000, 'Input is too long (max 50,000 characters)'),
  sourceType: z
    .enum(['claude-skill', 'user-idea', 'other'])
    .default('other'),
  saveToDatabase: z.boolean().optional().default(true),
});

export type SkillConvertInput = z.infer<typeof skillConvertSchema>;
