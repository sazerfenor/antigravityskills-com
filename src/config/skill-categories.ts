/**
 * Skill Categories Configuration
 * 定义 Antigravity Skills 的两级分类体系
 */

// ============================================
// 类型定义
// ============================================

export interface CategoryConfig {
  name: string;
  description: string;
  subcategories: SubcategoryConfig[];
}

export interface SubcategoryConfig {
  id: string;
  name: string;
}

// ============================================
// 分类配置
// ============================================

export const SKILL_CATEGORIES: Record<string, CategoryConfig> = {
  tools: {
    name: 'Tools',
    description: '工具类 Skills',
    subcategories: [
      { id: 'productivity', name: 'Productivity & Integration' },
      { id: 'automation', name: 'Automation Tools' },
      { id: 'debugging', name: 'Debugging' },
      { id: 'system-admin', name: 'System Administration' },
      { id: 'ide-plugins', name: 'IDE Plugins' },
      { id: 'cli-tools', name: 'CLI Tools' },
      { id: 'domain-utilities', name: 'Domain & DNS Tools' },
    ],
  },
  development: {
    name: 'Development',
    description: '开发类 Skills',
    subcategories: [
      { id: 'frontend', name: 'Frontend' },
      { id: 'backend', name: 'Backend' },
      { id: 'full-stack', name: 'Full Stack' },
      { id: 'mobile', name: 'Mobile' },
      { id: 'gaming', name: 'Game Development' },
      { id: 'cms-platforms', name: 'CMS & Platforms' },
      { id: 'architecture-patterns', name: 'Architecture Patterns' },
      { id: 'scripting', name: 'Scripting' },
      { id: 'package-distribution', name: 'Package & Distribution' },
      { id: 'ecommerce-development', name: 'E-commerce Development' },
      { id: 'framework-internals', name: 'Framework Internals' },
    ],
  },
  'data-ai': {
    name: 'Data & AI',
    description: '数据与 AI 类 Skills',
    subcategories: [
      { id: 'llm-ai', name: 'LLM & AI' },
      { id: 'data-analysis', name: 'Data Analysis' },
      { id: 'data-engineering', name: 'Data Engineering' },
      { id: 'machine-learning', name: 'Machine Learning' },
    ],
  },
  business: {
    name: 'Business',
    description: '商业类 Skills',
    subcategories: [
      { id: 'project-management', name: 'Project Management' },
      { id: 'sales-marketing', name: 'Sales & Marketing' },
      { id: 'finance-investment', name: 'Finance & Investment' },
      { id: 'health-fitness', name: 'Health & Fitness' },
      { id: 'business-apps', name: 'Business Apps' },
      { id: 'real-estate-legal', name: 'Real Estate & Legal' },
      { id: 'payment', name: 'Payment' },
      { id: 'ecommerce', name: 'E-commerce' },
    ],
  },
  devops: {
    name: 'DevOps',
    description: '运维类 Skills',
    subcategories: [
      { id: 'cicd', name: 'CI/CD' },
      { id: 'git-workflows', name: 'Git Workflows' },
      { id: 'cloud', name: 'Cloud' },
      { id: 'containers', name: 'Containers' },
      { id: 'monitoring', name: 'Monitoring' },
    ],
  },
  'testing-security': {
    name: 'Testing & Security',
    description: '测试与安全类 Skills',
    subcategories: [
      { id: 'testing', name: 'Testing' },
      { id: 'code-quality', name: 'Code Quality' },
      { id: 'security', name: 'Security' },
    ],
  },
  documentation: {
    name: 'Documentation',
    description: '文档类 Skills',
    subcategories: [
      { id: 'knowledge-base', name: 'Knowledge Base' },
      { id: 'technical-docs', name: 'Technical Docs' },
      { id: 'education', name: 'Education' },
    ],
  },
  'content-media': {
    name: 'Content & Media',
    description: '内容与媒体类 Skills',
    subcategories: [
      { id: 'content-creation', name: 'Content Creation' },
      { id: 'documents', name: 'Documents' },
      { id: 'design', name: 'Design' },
      { id: 'media', name: 'Media' },
    ],
  },
  research: {
    name: 'Research',
    description: '研究类 Skills',
    subcategories: [
      { id: 'academic', name: 'Academic' },
      { id: 'scientific-computing', name: 'Scientific Computing' },
      { id: 'computational-chemistry', name: 'Computational Chemistry' },
      { id: 'bioinformatics', name: 'Bioinformatics' },
      { id: 'lab-tools', name: 'Lab Tools' },
      { id: 'astronomy-physics', name: 'Astronomy & Physics' },
    ],
  },
  databases: {
    name: 'Databases',
    description: '数据库类 Skills',
    subcategories: [
      { id: 'sql-databases', name: 'SQL Databases' },
      { id: 'database-tools', name: 'Database Tools' },
      { id: 'nosql-databases', name: 'NoSQL Databases' },
    ],
  },
  lifestyle: {
    name: 'Lifestyle',
    description: '生活方式类 Skills',
    subcategories: [
      { id: 'divination-mysticism', name: 'Divination & Mysticism' },
      { id: 'literature-writing', name: 'Literature & Writing' },
      { id: 'philosophy-ethics', name: 'Philosophy & Ethics' },
      { id: 'arts-crafts', name: 'Arts & Crafts' },
      { id: 'wellness-health', name: 'Wellness & Health' },
      { id: 'culinary-arts', name: 'Culinary Arts' },
    ],
  },
  blockchain: {
    name: 'Blockchain',
    description: '区块链类 Skills',
    subcategories: [
      { id: 'web3-tools', name: 'Web3 Tools' },
      { id: 'smart-contracts', name: 'Smart Contracts' },
      { id: 'defi', name: 'DeFi' },
    ],
  },
};

// ============================================
// 辅助函数
// ============================================

/**
 * 获取所有一级分类 ID 列表
 */
export function getCategoryIds(): string[] {
  return Object.keys(SKILL_CATEGORIES);
}

/**
 * 获取所有二级分类 ID 列表
 */
export function getAllSubcategoryIds(): string[] {
  const ids: string[] = [];
  for (const category of Object.values(SKILL_CATEGORIES)) {
    for (const sub of category.subcategories) {
      ids.push(sub.id);
    }
  }
  return ids;
}

/**
 * 根据二级分类 ID 获取其所属的一级分类
 */
export function getCategoryBySubcategory(subcategoryId: string): string | null {
  for (const [categoryId, config] of Object.entries(SKILL_CATEGORIES)) {
    if (config.subcategories.some((sub) => sub.id === subcategoryId)) {
      return categoryId;
    }
  }
  return null;
}

/**
 * 验证分类是否有效
 */
export function isValidCategory(categoryId: string): boolean {
  return categoryId in SKILL_CATEGORIES;
}

/**
 * 验证二级分类是否有效
 */
export function isValidSubcategory(subcategoryId: string): boolean {
  return getAllSubcategoryIds().includes(subcategoryId);
}

/**
 * 获取分类的显示名称
 */
export function getCategoryName(categoryId: string): string | null {
  return SKILL_CATEGORIES[categoryId]?.name ?? null;
}

/**
 * 获取二级分类的显示名称
 */
export function getSubcategoryName(subcategoryId: string): string | null {
  for (const category of Object.values(SKILL_CATEGORIES)) {
    const sub = category.subcategories.find((s) => s.id === subcategoryId);
    if (sub) return sub.name;
  }
  return null;
}

/**
 * 生成用于 AI Prompt 的分类列表文本（紧凑格式，节省 tokens）
 */
export function generateCategoryPromptText(): string {
  const lines: string[] = ['## Available Categories'];

  for (const [categoryId, config] of Object.entries(SKILL_CATEGORIES)) {
    const subcategoryIds = config.subcategories.map((sub) => sub.id).join(', ');
    lines.push(`- **${categoryId}**: ${subcategoryIds}`);
  }

  return lines.join('\n');
}
