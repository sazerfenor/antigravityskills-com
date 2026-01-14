/**
 * Gallery 分类常量
 * 单独文件以避免在 Client Component 中间接导入 server-only 代码
 */
export const GALLERY_CATEGORIES = [
  'photography',        // 摄影 (50.2%)
  'art-illustration',   // 艺术与插画 (18.0%)
  'design',             // 设计 (15.0%)
  'commercial-product', // 商业与产品 (7.1%)
  'character-design',   // 角色设计 (5.4%)
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];
