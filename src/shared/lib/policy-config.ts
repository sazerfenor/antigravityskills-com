/**
 * Policy Page Configuration
 *
 * ⚠️ 模板化说明：
 * 这是政策页面的配置文件。使用此模板时，请修改以下内容：
 * 1. 修改 brandConfig 中的品牌信息（在 src/config/brand.ts）
 * 2. 根据你的法律要求更新政策内容
 *
 * 政策页面会自动使用 brandConfig 中的品牌名称和联系信息。
 */

import { brandConfig } from '@/config';

/**
 * Policy brand placeholders
 * Use these in policy pages to ensure consistent branding
 */
export const policyBrand = {
  /** Brand name (e.g., "Your Company") */
  name: brandConfig.name,
  /** Full domain URL (e.g., "https://yoursite.com") */
  domain: brandConfig.domain,
  /** Support email */
  supportEmail: brandConfig.supportEmail,
  /** Current year for copyright */
  year: new Date().getFullYear(),
} as const;

/**
 * Generate metadata title for policy pages
 */
export function getPolicyMetadata(policyType: string) {
  return {
    title: `${policyType} | ${policyBrand.name}`,
    description: `${policyType} for ${policyBrand.name} - Learn about our policies and your rights.`,
  };
}
