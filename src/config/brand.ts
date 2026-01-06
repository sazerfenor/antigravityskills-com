/**
 * Brand Configuration - Nano Banana Ultra
 *
 * 配置方式（二选一）：
 * 1. 直接修改此文件中的默认值（推荐用于固定品牌）
 * 2. 通过环境变量覆盖（推荐用于多环境部署）
 */

export const brandConfig = {
  // ========================
  // 基本品牌信息
  // ========================

  /**
   * 品牌名称 - 显示在 UI、SEO、邮件等位置
   */
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Nano Banana Ultra',

  /**
   * 短名称 - 用于 PWA manifest、移动端显示
   */
  shortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME || 'NBU',

  /**
   * 标语/口号 - 简短描述产品核心价值
   */
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || 'AI Image Generator',

  /**
   * 完整描述 - 用于 SEO meta description
   * 建议 150-160 字符
   */
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'Nano Banana Ultra - Ultra-level AI image optimization. Turn simple ideas into professional prompts for Nano Banana models.',

  // ========================
  // 域名和联系方式
  // ========================

  /**
   * 主域名 - 不带末尾斜杠
   */
  domain: process.env.NEXT_PUBLIC_APP_URL || 'https://nanobananaultra.com',

  /**
   * 客服邮箱 - 显示在政策页面、页脚等位置
   */
  supportEmail: process.env.SUPPORT_EMAIL || 'support@nanobananaultra.com',

  // ========================
  // 社交链接 (可选)
  // ========================
  social: {
    twitter: process.env.SOCIAL_TWITTER || '',
    github: process.env.SOCIAL_GITHUB || '',
    discord: process.env.SOCIAL_DISCORD || '',
  },

  // ========================
  // Logo 路径 (需替换 public/ 目录下的文件)
  // ========================
  logo: {
    light: '/logo.png',
    dark: '/logo-dark.png',
    favicon: '/favicon.ico',
    icon192: '/icons/icon-192x192.png',
    icon512: '/icons/icon-512x512.png',
  },

  // ========================
  // AI 模型品牌化
  // ========================
  /**
   * Banana = 标准/快速模型
   * Banana Pro = 高级/Pro 模型
   */
  modelBrand: {
    /** 高级/Pro 模型显示名称 */
    premium: process.env.MODEL_BRAND_PREMIUM || 'Banana Pro',
    /** 快速/标准模型显示名称 */
    fast: process.env.MODEL_BRAND_FAST || 'Banana',
  },

  // ========================
  // SEO 配置
  // ========================
  seo: {
    /** 默认 OG 图片路径 - 替换 public/og-image.png */
    ogImage: '/og-image.png',
    /** Twitter 卡片类型 */
    twitterCard: 'summary_large_image' as const,
    /** JSON-LD 组织类型 */
    organizationType: 'Organization' as const,
  },
} as const;

// Type export for type-safe access
export type BrandConfig = typeof brandConfig;
