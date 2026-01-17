/**
 * Skills Entrance Service
 *
 * 提供首页 Skills Gallery 入口组件所需的动态数据：
 * - 分类统计（count + coverImage）
 * - 热门 Skills（基于下载/查看次数）
 */

import {
  getSkillCategoryStats,
  getTrendingSkills,
} from '@/shared/models/antigravity_skill';

// ============================================
// 类型定义
// ============================================

export interface SkillCategoryData {
  slug: string;
  title: string;
  description: string;
  count: number;
  coverImage: string;
  icon: string;
}

export interface SkillTrendingData {
  slug: string;
  title: string;
  downloadCount: number;
}

export interface SkillsEntranceData {
  categories: SkillCategoryData[];
  trending: SkillTrendingData[];
}

// ============================================
// 静态配置
// ============================================

/**
 * Skills 分类定义（8 类）
 * 基于 Claude Skills、Cursor.directory 和 AI Agent 行业趋势调研
 */
export const SKILL_CATEGORIES = [
  'development-workflow',
  'debugging-analysis',
  'frontend-design',
  'documentation',
  'ai-automation',
  'data-research',
  'creative-content',
  'operations-devops',
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/**
 * 分类的静态配置（title, description, icon, coverImage）
 */
const CATEGORY_CONFIG: Record<
  SkillCategory,
  { title: string; description: string; icon: string; coverImage: string }
> = {
  'development-workflow': {
    title: 'Development Workflow',
    description: 'Complete software development automation',
    icon: 'Wrench',
    coverImage: '/images/skills/dev-workflow.jpg',
  },
  'debugging-analysis': {
    title: 'Debugging & Analysis',
    description: 'Systematic diagnosis and code analysis',
    icon: 'Bug',
    coverImage: '/images/skills/debugging.jpg',
  },
  'frontend-design': {
    title: 'Frontend & Design',
    description: 'Frontend development and UI/UX standards',
    icon: 'Palette',
    coverImage: '/images/skills/frontend.jpg',
  },
  documentation: {
    title: 'Documentation',
    description: 'Documentation generation and knowledge management',
    icon: 'BookOpen',
    coverImage: '/images/skills/documentation.jpg',
  },
  'ai-automation': {
    title: 'AI & Automation',
    description: 'AI-driven content generation and automation',
    icon: 'Bot',
    coverImage: '/images/skills/ai-automation.jpg',
  },
  'data-research': {
    title: 'Data & Research',
    description: 'Data analysis and market research',
    icon: 'BarChart3',
    coverImage: '/images/skills/data-research.jpg',
  },
  'creative-content': {
    title: 'Creative & Content',
    description: 'Creative writing and marketing content',
    icon: 'PenTool',
    coverImage: '/images/skills/creative.jpg',
  },
  'operations-devops': {
    title: 'Operations & DevOps',
    description: 'Operations, deployment, and infrastructure',
    icon: 'Server',
    coverImage: '/images/skills/devops.jpg',
  },
};

// ============================================
// 服务方法
// ============================================

/**
 * 获取 Skills 入口组件所需的完整数据
 *
 * @returns categories 和 trending 数据
 */
export async function getSkillsEntranceData(): Promise<SkillsEntranceData> {
  // 并行获取分类统计和热门 Skills
  const [categoryStats, trendingSkills] = await Promise.all([
    getSkillCategoryStats(),
    getTrendingSkills({ limit: 5 }),
  ]);

  // 构建分类数据（取前 5 个用于展示）
  const categories: SkillCategoryData[] = SKILL_CATEGORIES.slice(0, 5).map(
    (slug) => {
      const stats = categoryStats.find((s) => s.category === slug);
      const config = CATEGORY_CONFIG[slug];

      return {
        slug,
        title: config.title,
        description: config.description,
        count: stats?.count || 0,
        coverImage: config.coverImage,
        icon: config.icon,
      };
    }
  );

  // 转换热门 Skills 数据
  const trending: SkillTrendingData[] = trendingSkills.map((skill) => ({
    slug: skill.slug,
    title: skill.name,
    downloadCount: skill.downloadCount,
  }));

  return {
    categories,
    trending,
  };
}

/**
 * 获取所有分类配置（用于 Skills 列表页筛选）
 */
export function getAllCategoryConfigs(): SkillCategoryData[] {
  return SKILL_CATEGORIES.map((slug) => {
    const config = CATEGORY_CONFIG[slug];
    return {
      slug,
      title: config.title,
      description: config.description,
      count: 0,
      coverImage: config.coverImage,
      icon: config.icon,
    };
  });
}

/**
 * 获取单个分类的详细信息
 */
export function getCategoryConfig(
  slug: string
): SkillCategoryData | null {
  const config = CATEGORY_CONFIG[slug as SkillCategory];
  if (!config) return null;

  return {
    slug,
    title: config.title,
    description: config.description,
    count: 0,
    coverImage: config.coverImage,
    icon: config.icon,
  };
}
