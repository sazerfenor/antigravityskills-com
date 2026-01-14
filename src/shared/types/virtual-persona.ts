/**
 * 虚拟用户人格机器人系统 - 类型定义
 *
 * @description 定义虚拟人格、互动、发帖计划等核心类型
 */

import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import type {
  promptQueue,
  virtualInteractionLog,
  virtualPersona,
  virtualPostSchedule,
} from '@/config/db/schema.sqlite';

// ============================================
// 基础类型（从 Schema 推断）
// ============================================

export type VirtualPersona = InferSelectModel<typeof virtualPersona>;
export type NewVirtualPersona = InferInsertModel<typeof virtualPersona>;

export type PromptQueueItem = InferSelectModel<typeof promptQueue>;
export type NewPromptQueueItem = InferInsertModel<typeof promptQueue>;

export type VirtualInteractionLog = InferSelectModel<typeof virtualInteractionLog>;
export type NewVirtualInteractionLog = InferInsertModel<typeof virtualInteractionLog>;

export type VirtualPostSchedule = InferSelectModel<typeof virtualPostSchedule>;
export type NewVirtualPostSchedule = InferInsertModel<typeof virtualPostSchedule>;

// ============================================
// 枚举类型
// ============================================

/**
 * 人格分类
 */
export type PersonaCategory =
  | 'photography'        // 电商视觉/商业修图
  | 'art-illustration'   // 游戏概念画师/书籍插画
  | 'design'             // 品牌设计/UI设计
  | 'commercial-product' // 电商卖家/供应商
  | 'character-design'   // VTuber/盲盒/IP设计
  // 新增类型
  | 'experimental'       // 灵感创作者：游戏卡片/3D建筑/抽象艺术
  | 'infographic'        // 信息图表/PPT/数据可视化
  | 'indie-illustration' // 独立插画师：各种风格探索
  | '3d-visualization';  // 3D渲染/建筑可视化/产品渲染

/**
 * 所有人格分类列表（用于完全平均随机）
 */
export const ALL_PERSONA_CATEGORIES: PersonaCategory[] = [
  'photography',
  'art-illustration',
  'design',
  'commercial-product',
  'character-design',
  'experimental',
  'infographic',
  'indie-illustration',
  '3d-visualization',
];

/**
 * 活跃度级别
 */
export type ActivityLevel = 'low' | 'moderate' | 'high' | 'very_high';

/**
 * 沟通风格
 */
export type CommunicationStyle = 'formal' | 'casual' | 'enthusiastic' | 'reserved';

/**
 * 创作工作流类型
 */
export type WorkflowType = 'pure_ai' | 'ai_enhanced' | 'hybrid';

/**
 * 工作流类型标签（用于 UI 展示）
 */
export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  'pure_ai': '纯 AI 生成',
  'ai_enhanced': 'AI 增强',
  'hybrid': '混合创作',
};

/**
 * 互动类型
 */
export type InteractionType = 'comment' | 'follow' | 'like';

/**
 * Prompt 队列状态
 */
export type PromptQueueStatus = 'pending' | 'assigned' | 'processing' | 'completed' | 'failed';

/**
 * 发帖计划状态（状态机）
 */
export type PostScheduleStatus =
  | 'pending'  // 等待执行
  | 'prompt'   // 生成 Prompt
  | 'image'    // 生成图片
  | 'post'     // 创建帖子
  | 'seo'      // 生成 SEO
  | 'completed' // 完成
  | 'failed';  // 失败

// ============================================
// JSON 字段类型
// ============================================

/**
 * 人格特质（存储为 JSON）
 */
export interface PersonalityTraits {
  warmth: number;        // 热情度 1-10
  professionalism: number; // 专业度 1-10
  humor: number;         // 幽默感 1-10
  creativity: number;    // 创意性 1-10
  helpfulness: number;   // 乐于助人 1-10
}

/**
 * 响应模式（存储为 JSON）
 */
export interface ResponsePatterns {
  greetings: string[];   // 问候语模板
  closings: string[];    // 结束语模板
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'frequent';
  typicalPhrases: string[]; // 常用短语（使用具体参数概念）
  industryBanter?: string[]; // 行业梗/职业吐槽（增加烟火气）
}

/**
 * 冷却追踪 Map（存储为 JSON）
 */
export interface LastInteractionMap {
  [userId: string]: number; // userId -> Unix timestamp (ms)
}

/**
 * Prompt 队列来源元数据
 */
export interface PromptSourceMetadata {
  keywords?: string[];
  styles?: string[];
  subjects?: string[];
  originalSource?: string;
}

// ============================================
// 令牌桶调度配置
// ============================================

/**
 * 活跃度配置
 */
export interface ActivityLevelConfig {
  dailyTokensMin: number;
  dailyTokensVariance: number;
  replyProbability: number;
  followProbability: number;
}

/**
 * 活跃度配置表
 */
export const ACTIVITY_LEVEL_CONFIG: Record<ActivityLevel, ActivityLevelConfig> = {
  low: {
    dailyTokensMin: 0,
    dailyTokensVariance: 0,
    replyProbability: 0.3,
    followProbability: 0.1,
  },
  moderate: {
    dailyTokensMin: 1,
    dailyTokensVariance: 0,
    replyProbability: 0.5,
    followProbability: 0.2,
  },
  high: {
    dailyTokensMin: 1,
    dailyTokensVariance: 1,
    replyProbability: 0.7,
    followProbability: 0.3,
  },
  very_high: {
    dailyTokensMin: 2,
    dailyTokensVariance: 1,
    replyProbability: 0.9,
    followProbability: 0.5,
  },
};

/**
 * 时段权重配置（用于发帖时间分布）
 */
export const HOUR_WEIGHTS: Record<number, number> = {
  0: 0.05, 1: 0.02, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
  6: 0.05, 7: 0.10, 8: 0.15, 9: 0.20, 10: 0.25, 11: 0.30,
  12: 0.35, 13: 0.30, 14: 0.25, 15: 0.30, 16: 0.35, 17: 0.40,
  18: 0.50, 19: 0.60, 20: 0.70, 21: 0.60, 22: 0.40, 23: 0.20,
};

// ============================================
// 互动裁判服务类型
// ============================================

/**
 * 互动检查结果
 */
export interface ArbiterCheckResult {
  allowed: boolean;
  reason?: 'thread_depth_exceeded' | 'v2v_daily_limit' | 'cooldown_active' | 'daily_limit_reached';
}

/**
 * 互动限制配置
 */
export const INTERACTION_LIMITS = {
  // 每日总互动上限
  dailyMaxInteractions: 30,

  // 单个目标用户的互动上限
  perUserMaxInteractions: 3,

  // 对话深度上限
  maxThreadDepth: 3,

  // 冷却时间（毫秒）
  cooldownMs: 30 * 60 * 1000, // 30 分钟

  // 虚拟对虚拟互动限制
  v2v: {
    enabled: true,
    dailyLimit: 5,
    replyDepthLimit: 2,
  },
} as const;

// ============================================
// 人格生成相关类型
// ============================================

/**
 * 分类子类型 Variants（用于引导差异化生成）
 */
export const CATEGORY_VARIANTS: Record<PersonaCategory, string[]> = {
  'photography': [
    '电商白底产品图专家 - 批量处理、一致性、白底抠图',
    '场景化产品摆拍师 - 生活化场景、氛围感、道具搭配',
    '人像精修师 - 肤质处理、光影调整、商业人像',
    '食品摄影师 - 食物造型、色彩饱和、食欲感',
    '房地产/建筑摄影 - 空间感、HDR合成、室内设计',
  ],
  'art-illustration': [
    '游戏概念画师 - 场景设计、角色原画、武器道具',
    '书籍插画师 - 封面设计、内页插图、儿童绘本',
    '动画分镜师 - 分镜脚本、动态构图、叙事画面',
  ],
  'design': [
    '品牌设计师 - VI系统、Logo设计、品牌调性',
    'UI/UX设计师 - 界面设计、交互原型、设计系统',
    '包装设计师 - 产品包装、礼盒设计、货架效果',
  ],
  'commercial-product': [
    '电商运营 - 主图设计、详情页、促销海报',
    '供应链视觉 - 产品目录、批发展示、B2B素材',
    '直播电商 - 直播间背景、产品卡片、价格标签',
  ],
  'character-design': [
    'VTuber设计师 - 虚拟形象、表情包、立绘',
    'IP角色设计 - 吉祥物、盲盒原型、衍生周边',
    '贴纸/表情包创作 - 社交表情、可爱贴纸、动态表情',
  ],
  'experimental': [
    '游戏卡片/TCG设计迷 - 卡牌框架、稀有度效果、收藏感',
    '3D建筑探索者 - impossible architecture、超现实建筑、概念空间',
    'Glitch art玩家 - 故障美学、数据损坏、赛博朋克',
    'AI合成艺术实验者 - 风格融合、意外效果、病毒式创意',
    '抽象视觉艺术家 - 几何构成、色彩实验、视觉冲击',
    'Meme创作者 - 病毒传播、幽默表达、网络文化',
  ],
  'infographic': [
    'PPT设计顾问 - 商业演示、数据呈现、高级模板',
    '数据可视化专家 - 图表设计、仪表盘、数据故事',
    '流程图/思维导图 - 逻辑梳理、知识架构、教程图解',
    '社交媒体信息图 - 知识卡片、长图科普、转发友好',
  ],
  'indie-illustration': [
    '头像/社交插画师 - 个人IP、风格化头像、粉丝互动',
    '日系二次元画师 - 动漫风格、角色设计、同人创作',
    '欧美卡通风格 - Cartoon、夸张表情、故事性',
    '复古/蒸汽波美学 - 80s/90s怀旧、霓虹色彩、赛博复古',
    '极简线条插画 - 单线条、留白美学、高级感',
    '绘本/儿童插画 - 温暖色调、童趣表达、故事绘本',
  ],
  '3d-visualization': [
    '建筑可视化 - 效果图、室内渲染、光影模拟',
    '产品渲染师 - 材质真实感、产品展示、电商3D',
    '室内设计渲染 - 空间布局、软装搭配、客户提案',
    '概念艺术3D - 科幻场景、概念设计、未来主义',
  ],
};

/**
 * 活跃度分布配置
 */
export const ACTIVITY_DISTRIBUTION: Record<ActivityLevel, number> = {
  'low': 10,
  'moderate': 20,
  'high': 15,
  'very_high': 5,
};

/**
 * 人格分类分布（基于 prompt 数据分布）
 * 用于 50 个虚拟用户的分配
 */
export const PERSONA_DISTRIBUTION: Partial<Record<PersonaCategory, number>> = {
  'photography': 25,        // 50%
  'art-illustration': 9,    // 18%
  'design': 8,              // 16%
  'commercial-product': 4,  // 8%
  'character-design': 4,    // 8%
};

/**
 * 人格生成输入
 */
export interface PersonaGenerationInput {
  category: PersonaCategory;
  activityLevel: ActivityLevel;
  existingPersonas?: Array<{ displayName: string; username: string; specialties: string[] }>;
}

/**
 * 样本互动（用于灵魂验证）
 */
export interface SampleInteraction {
  scenario: string;   // 场景描述
  response: string;   // 人格的回复
}

/**
 * 人格生成输出（AI 返回格式）
 */
export interface PersonaGenerationOutput {
  displayName: string;
  username: string;
  bio: string; // 皮肉层：像真人个性签名，不是简历式
  profession?: string; // 骨架层：实际职业（电商视觉师、游戏概念画师等）
  specialties: string[];
  styleKeywords: string[];

  // 新增：工作流相关
  workflowType: WorkflowType;
  workflowDescription: string;
  preferredTools: string[];
  dislikes: string[];

  // 人格特质
  personalityTraits: PersonalityTraits;
  communicationStyle: CommunicationStyle;
  responsePatterns: ResponsePatterns;

  // 新增：样本互动（用于灵魂验证）
  sampleInteraction: SampleInteraction;

  // 其他
  promptStyleGuide: string;
  siteReview: string;
  siteRating: number;
  avatarPrompt: string; // 用于生成头像的 Prompt
}

// ============================================
// 评论生成相关类型
// ============================================

/**
 * 评论生成上下文
 */
export interface CommentGenerationContext {
  persona: VirtualPersona;
  post: {
    id: string;
    prompt?: string | null;
    imageAlt?: string | null;
    category?: string | null;
    authorName?: string | null;
  };
  threadHistory: Array<{
    authorName: string;
    content: string;
    isPersona: boolean;
  }>;
  targetComment?: {
    id: string;
    content: string;
    authorName: string;
  };
}

/**
 * 评论生成结果
 */
export interface CommentGenerationResult {
  content: string;
  confidence: number; // 0-1，用于质量过滤
}
