/**
 * Skill Builder Orchestrator
 *
 * 流程编排器：协调 3 个 Agent 完成 Skill 生成
 * 包含自动重试逻辑（最多 3 次）
 */

import { generateText } from '@/shared/services/gemini-text';
import {
  SKILL_ANALYZER_PROMPT,
  SKILL_BUILDER_PROMPT,
  SKILL_VALIDATOR_PROMPT,
} from '../agents';
import type {
  AnalysisResult,
  SkillOutput,
  ValidationResult,
  GenerationResult,
} from '../types';

const MAX_RETRIES = 3;

/**
 * 运行 skill-analyzer Agent
 */
async function runSkillAnalyzer(input: string): Promise<AnalysisResult> {
  const prompt = `${SKILL_ANALYZER_PROMPT}

## User Input

${input}

## Your Response

Analyze the input and return a JSON object following the format specified above.`;

  const response = await generateText(prompt, {
    model: 'gemini-3-flash-preview',
    temperature: 0.3,
    maxOutputTokens: 2048,
    jsonMode: true,
  });

  try {
    return JSON.parse(response) as AnalysisResult;
  } catch {
    throw new Error(`Failed to parse skill-analyzer response: ${response}`);
  }
}

/**
 * 运行 skill-builder Agent
 */
async function runSkillBuilder(
  analysis: AnalysisResult,
  previousIssues: string[] = []
): Promise<SkillOutput> {
  const issuesSection = previousIssues.length > 0
    ? `

## Previous Issues to Fix

The following issues were found in a previous attempt. You MUST fix them:

${previousIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}
`
    : '';

  const prompt = `${SKILL_BUILDER_PROMPT}

## Analysis Result

\`\`\`json
${JSON.stringify(analysis, null, 2)}
\`\`\`
${issuesSection}

## Your Response

Generate the skill files and return a JSON object following the format specified above.`;

  const response = await generateText(prompt, {
    model: 'gemini-3-flash-preview',
    temperature: 0.5,
    maxOutputTokens: 8192,
    jsonMode: true,
  });

  try {
    return JSON.parse(response) as SkillOutput;
  } catch {
    throw new Error(`Failed to parse skill-builder response: ${response}`);
  }
}

/**
 * 运行 skill-validator Agent
 */
async function runSkillValidator(
  skill: SkillOutput,
  expectedDomains?: string[]
): Promise<ValidationResult> {
  const domainsSection = expectedDomains && expectedDomains.length > 0
    ? `

## Expected Reference Files

Based on the analysis, the skill should have ${expectedDomains.length} reference files:
${expectedDomains.map(d => `- references/${d}-checklist.md or references/${d}.md`).join('\n')}

Deduct 0.5 points from Resource Separation if the number of reference files doesn't match.`
    : '';

  const prompt = `${SKILL_VALIDATOR_PROMPT}

## Skill to Validate

\`\`\`json
${JSON.stringify(skill, null, 2)}
\`\`\`
${domainsSection}

## Your Response

Validate the skill and return a JSON object following the format specified above.`;

  const response = await generateText(prompt, {
    model: 'gemini-3-flash-preview',
    temperature: 0.1,
    maxOutputTokens: 2048,
    jsonMode: true,
  });

  try {
    return JSON.parse(response) as ValidationResult;
  } catch {
    throw new Error(`Failed to parse skill-validator response: ${response}`);
  }
}

/**
 * 主编排函数：生成 Skill
 *
 * 流程：
 * 1. skill-analyzer: 分析用户输入
 * 2. skill-builder: 生成 SKILL.md
 * 3. skill-validator: 验证评分
 * 4. 如果验证失败，重试 skill-builder（最多 3 次）
 */
export async function generateSkill(userInput: string): Promise<GenerationResult> {
  // Phase 1: 分析
  console.log('[orchestrator] Phase 1: Analyzing input...');
  const analysis = await runSkillAnalyzer(userInput);
  console.log('[orchestrator] Analysis complete:', {
    intent: analysis.intent,
    suggestedName: analysis.suggestedName,
  });

  // Phase 2 + 3: 构建 + 验证（含自动重试）
  let iteration = 0;
  let skill: SkillOutput;
  let validation: ValidationResult;
  let previousIssues: string[] = [];

  do {
    iteration++;
    console.log(`[orchestrator] Phase 2: Building skill (iteration ${iteration})...`);
    skill = await runSkillBuilder(analysis, previousIssues);
    console.log('[orchestrator] Build complete:', {
      name: skill.name,
      fileCount: skill.files.length,
    });

    console.log(`[orchestrator] Phase 3: Validating skill (iteration ${iteration})...`);
    validation = await runSkillValidator(skill, analysis.knowledgeDomains);
    console.log('[orchestrator] Validation complete:', {
      passed: validation.passed,
      score: validation.score,
      issueCount: validation.issues.length,
    });

    previousIssues = validation.issues;
  } while (!validation.passed && iteration < MAX_RETRIES);

  const result: GenerationResult = {
    skill,
    validation,
    iterations: iteration,
    needsManualReview: !validation.passed,
  };

  if (result.needsManualReview) {
    console.warn('[orchestrator] ⚠️ Skill failed validation after max retries');
  } else {
    console.log('[orchestrator] ✅ Skill generation complete');
  }

  return result;
}
