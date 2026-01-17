// ============================================
// Skill Builder Types
// ============================================

// ============================================
// Agent Types
// ============================================

/** 用户意图类型 */
export type SkillIntent = 'CREATE' | 'REFACTOR';

/** Phase 1: skill-analyzer 输出 */
export interface AnalysisResult {
  intent: SkillIntent;

  // CREATE 模式
  trigger?: string;       // 触发场景 (WHEN)
  outcome?: string;       // 交付物 (WHAT)
  knowledge?: string;     // 外部知识需求 (HOW)
  knowledgeDomains?: string[];  // 知识域列表，每个域生成一个 reference 文件

  // REFACTOR 模式
  issues?: string[];      // 合规性问题列表
  originalSkill?: string; // 原始 Skill 内容

  // 通用
  suggestedName: string;
  suggestedDescription: string;  // Trigger-First 格式
  needsScripts: boolean;
  needsReferences: boolean;
  needsAssets: boolean;
}

/** 单个文件 */
export interface SkillFile {
  path: string;           // 如 "SKILL.md", "scripts/main.py"
  content: string;
}

/** Phase 2: skill-builder 输出 */
export interface SkillOutput {
  name: string;           // kebab-case
  files: SkillFile[];     // 所有文件
}

/** 六维评分维度 */
export interface ValidationDimensions {
  frontmatter: number;    // 20% - name/description 存在且格式正确
  nameFormat: number;     // 10% - 严格 kebab-case
  description: number;    // 30% - 包含 WHEN + FOR
  structure: number;      // 20% - 有 Overview/Protocols
  separation: number;     // 10% - 资源正确分离
  safety: number;         // 10% - 无危险命令
}

/** Phase 3: skill-validator 输出 */
export interface ValidationResult {
  passed: boolean;        // 总分 >= 8.0
  score: number;          // 0-10
  dimensions: ValidationDimensions;
  issues: string[];       // 具体问题列表
}

// ============================================
// Orchestrator Types
// ============================================

/** 生成阶段 */
export type GenerationPhase =
  | 'IDLE'
  | 'ANALYZING'
  | 'BUILDING'
  | 'VALIDATING'
  | 'COMPLETE'
  | 'ERROR';

/** 生成结果 */
export interface GenerationResult {
  skill: SkillOutput;
  validation: ValidationResult;
  iterations: number;           // 重试次数
  needsManualReview: boolean;   // 3 次重试后仍未通过
}

/** API 请求 */
export interface GenerateRequest {
  input: string;                // 用户输入（自然语言或现有 Skill）
}

/** API 响应 */
export interface GenerateResponse {
  success: boolean;
  data?: GenerationResult;
  error?: string;
}

// ============================================
// UI State Types
// ============================================

/** 生成进度状态 */
export interface GenerationProgress {
  phase: GenerationPhase;
  message: string;
  iteration?: number;           // 当前重试次数
}

/** Hook 状态 */
export interface SkillBuilderState {
  input: string;
  progress: GenerationProgress;
  result: GenerationResult | null;
  error: string | null;
}

/** Hook Actions */
export interface SkillBuilderActions {
  setInput: (input: string) => void;
  generate: () => Promise<void>;
  reset: () => void;
  downloadZip: () => Promise<void>;
}
