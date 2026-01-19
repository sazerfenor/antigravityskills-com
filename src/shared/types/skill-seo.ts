/**
 * Skill SEO Schema Types (v19.0)
 *
 * 统一的 SEO Schema 类型定义，供以下场景使用：
 * 1. Agent 工作流 - seo-field-generator / schema-validator
 * 2. 前端组件 - skill-detail / skill-card
 * 3. API 层 - 数据校验
 *
 * 对应数据库表: community_post (Skill 落地页增强字段)
 */

// ============================================
// Hero Section
// ============================================

export interface HeroSectionCTA {
  primary: string;    // 主按钮文案，如 "Get Started"
  secondary?: string; // 次按钮文案，如 "View Documentation"
}

export interface HeroSection {
  headline: string;      // 大标题，如 "Brand Guidelines"
  subheadline: string;   // 副标题，简短描述
  cta?: HeroSectionCTA;  // 可选的 CTA 按钮
}

// ============================================
// Quick Start
// ============================================

export interface QuickStart {
  title?: string;         // 可选标题，默认 "Quick Start"
  steps: string[];        // 步骤列表，如 ["Install the skill", "Run /brand-guidelines"]
  exampleCommand?: string; // 示例命令，如 "/brand-guidelines apply to my landing page"
}

// ============================================
// Capabilities
// ============================================

export interface Capability {
  icon: string;        // Lucide icon 名称，如 "Palette", "Code"
  title: string;       // 能力标题，如 "Color System"
  description: string; // 能力描述
}

// ============================================
// Usage Examples
// ============================================

export interface BeforeAfter {
  before: string;
  after: string;
}

export interface UsageExample {
  input: string;              // 用户输入
  output: string;             // AI 输出
  beforeAfter?: BeforeAfter;  // 可选的前后对比
}

// ============================================
// Presets (主题预设)
// ============================================

export interface PresetFonts {
  heading: string; // 标题字体
  body: string;    // 正文字体
}

export interface Preset {
  name: string;       // 预设名称，如 "Corporate Blue"
  colors: string[];   // 颜色数组，如 ["#1a73e8", "#ffffff", "#f8f9fa"]
  fonts: PresetFonts;
  bestFor: string;    // 适用场景，如 "Enterprise applications"
}

// ============================================
// FAQ Items
// ============================================

export interface FAQItem {
  question: string;
  answer: string;
}

// ============================================
// Skill SEO Fields (完整 Schema)
// ============================================

/**
 * Skill SEO Fields - Agent 工作流输出格式
 *
 * 这是 seo-field-generator Agent 生成的完整 JSON 结构
 * schema-validator Agent 负责验证此结构的正确性
 */
export interface SkillSEOFields {
  // ========== 基础 SEO ==========
  /** SEO 标题 (用于 <title> 和 og:title) */
  seoTitle: string;

  /** H1 标题 (页面主标题) */
  h1Title: string;

  /** SEO 描述 (用于 meta description) */
  seoDescription: string;

  /** SEO 关键词 (逗号分隔) */
  seoKeywords: string;

  /** 内容简介 (详情页顶部描述段落) */
  contentIntro: string;

  /** 图片 alt 文本 */
  imageAlt: string;

  // ========== Skill 落地页增强 ==========
  /** Hero 区域 */
  heroSection: HeroSection;

  /** 快速上手 */
  quickStart: QuickStart;

  /** 核心能力列表 */
  capabilities: Capability[];

  /** 使用示例 */
  usageExamples: UsageExample[];

  /** 触发词列表 */
  triggerPhrases: string[];

  /** 主题预设 (可选) */
  presets?: Preset[];

  /** Skill 图标 (Lucide icon 名称) */
  skillIcon: string;

  // ========== 可选扩展 ==========
  /** FAQ 列表 */
  faqItems?: FAQItem[];

  /** 视觉标签 (用于卡片展示) */
  visualTags?: string[];
}

// ============================================
// Database Field Types (与 community_post 对应)
// ============================================

/**
 * Skill 详情页数据 - 从 community_post 查询后的类型
 *
 * 前端组件应使用此类型，而非直接使用 CommunityPost
 */
export interface SkillDetailData {
  id: string;
  seoSlug: string;

  // 基础 SEO
  seoTitle: string | null;
  h1Title: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  contentIntro: string | null;
  imageAlt: string | null;

  // Skill 增强字段 (JSON string，需要 parse)
  heroSection: string | null;
  quickStart: string | null;
  capabilities: string | null;
  usageExamples: string | null;
  triggerPhrases: string | null;
  presets: string | null;
  faqItems: string | null;
  visualTags: string | null;

  // Skill 内容
  skillIcon: string | null;
  skillContent: string | null;
  readmeContent: string | null;
  prompt: string | null; // fallback content

  // 下载
  zipUrl: string | null;

  // 统计
  viewCount: number;
  downloadCount: number;
  likeCount: number;

  // 作者
  user?: {
    id: string;
    name: string;
    image: string | null;
  } | null;

  // 时间
  createdAt: Date | null;
  updatedAt: Date | null;
}

// ============================================
// Helper: Parse JSON Fields
// ============================================

/**
 * 安全解析 JSON 字段
 */
export function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * 解析 Skill 详情数据中的 JSON 字段
 */
export function parseSkillEnhancedFields(data: SkillDetailData) {
  return {
    heroSection: parseJsonField<HeroSection | null>(data.heroSection, null),
    quickStart: parseJsonField<QuickStart | null>(data.quickStart, null),
    capabilities: parseJsonField<Capability[]>(data.capabilities, []),
    usageExamples: parseJsonField<UsageExample[]>(data.usageExamples, []),
    triggerPhrases: parseJsonField<string[]>(data.triggerPhrases, []),
    presets: parseJsonField<Preset[]>(data.presets, []),
    faqItems: parseJsonField<FAQItem[]>(data.faqItems, []),
    visualTags: parseJsonField<string[]>(data.visualTags, []),
  };
}
