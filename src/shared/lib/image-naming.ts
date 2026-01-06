/**
 * Image Naming Utility (SEO-Friendly)
 * 
 * 核心策略：Smart Fallback (智能混合)
 * - 优先使用 AI 优化结果 (anchor 标签)
 * - 兜底使用本地关键词提取 (extractKeywordsSimple)
 */

import { nanoid } from 'nanoid';
import { extractKeywordsSimple } from './simple-keyword-extractor';
import { cleanSlugText } from './seo-slug-generator';

export interface ImageNamingOptions {
  /** 优先使用：来自 Prompt Optimization V12 的 anchor 标签内容 */
  anchorKeywords?: string;
  /** 用户最终提交的 Prompt（用于兜底提取） */
  prompt: string;
  /** 图片类型（用于前缀） */
  type?: 'generated' | 'case' | 'reference';
}

/**
 * 生成 SEO 友好的图片文件名
 * 
 * @param options - 命名选项
 * @param ext - 文件扩展名 (默认 'png')
 * @returns SEO 文件名
 * 
 * @example
 * // 场景 1：用户使用了优化且未修改 Prompt
 * generateImageFilename({
 *   anchorKeywords: 'a fluffy calico cat',
 *   prompt: '...'
 * }, 'png')
 * // => 'fluffy-calico-cat-your-domain-a1b2c3d4.png'
 *
 * // 场景 2：用户直接生成 or 修改了 Prompt
 * generateImageFilename({
 *   prompt: 'A cute dog running in the park'
 * }, 'png')
 * // => 'cute-dog-running-your-domain-x9y8z7w6.png'
 */
export async function generateImageFilename(
  options: ImageNamingOptions,
  ext: string = 'png'
): Promise<string> {
  console.log('[ImageNaming] Input:', { anchorKeywords: options.anchorKeywords?.slice(0, 50), prompt: options.prompt?.slice(0, 50), ext });
  
  // 1. 决定关键词来源
  let keywords = '';
  
  if (options.anchorKeywords) {
    // 优先使用 AI 优化的高质量关键词
    keywords = options.anchorKeywords;
  } else {
    // 兜底：从 Prompt 进行本地提取 (零成本)
    keywords = extractKeywordsSimple(options.prompt);
  }
  
  console.log('[ImageNaming] Raw keywords:', keywords?.slice(0, 100));
  
  // 2. 清理和规范化关键词
  keywords = cleanSlugText(keywords)
    .slice(0, 50) // 限制长度
    .replace(/^-+|-+$/g, ''); // 移除首尾连字符
  
  console.log('[ImageNaming] Cleaned keywords:', keywords);
  
  // 3. 获取域名配置（默认 ai-prompts）
  const domain = await getDomainConfig();
  
  // 4. 生成唯一 hash
  const hash = nanoid(8);
  
  // 5. 组装最终文件名
  const filename = `${keywords}-${domain}-${hash}.${ext}`;
  console.log('[ImageNaming] Final filename:', filename);
  
  return filename;
}

/**
 * 获取域名配置（从数据库读取）
 * TODO: 在数据库 config 表中设置 image_naming_domain 的值
 */
async function getDomainConfig(): Promise<string> {
  try {
    const { getConfigsByKeys } = await import('@/shared/models/config');
    const { brandConfig } = await import('@/config');
    const configs = await getConfigsByKeys(['image_naming_domain']);
    // 优先使用数据库配置，否则从 brandConfig 提取域名
    if (configs.image_naming_domain) {
      return configs.image_naming_domain;
    }
    // 从 brandConfig.domain 提取简化域名 (e.g., "https://example.com" → "example-com")
    const domain = new URL(brandConfig.domain).hostname.replace(/\./g, '-');
    return domain;
  } catch (error) {
    console.warn('[ImageNaming] Failed to load config, using default:', error);
    return 'ai-prompts';
  }
}

/**
 * 从 Prompt Optimization V12 的 tagExplanations 中提取 anchor 关键词
 * 
 * @param tagExplanations - V12 返回的标签解释数组
 * @returns 组合的 anchor 关键词字符串
 * 
 * @example
 * extractAnchorKeywords([
 *   { content: 'a fluffy calico cat', type: 'anchor' },
 *   { content: 'Golden hour lighting', type: 'atmos' },
 *   { content: 'sun-drenched windowsill', type: 'anchor' }
 * ])
 * // => 'a fluffy calico cat sun-drenched windowsill'
 */
export function extractAnchorKeywords(
  tagExplanations: Array<{ content: string; type: string }>
): string {
  return tagExplanations
    .filter(tag => tag.type === 'anchor')
    .map(tag => tag.content)
    .slice(0, 3) // 最多取 3 个 anchor
    .join(' ');
}
