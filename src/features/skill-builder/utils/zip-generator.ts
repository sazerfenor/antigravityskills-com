'use client';

/**
 * ZIP Generator (Client-side)
 *
 * 在浏览器端生成 ZIP 文件，避免 Cloudflare Workers 兼容问题
 */

import JSZip from 'jszip';
import type { SkillFile } from '../types';

/**
 * 生成并下载 Skill ZIP 文件
 *
 * @param skillName - Skill 名称（用作文件夹名和 ZIP 文件名）
 * @param files - 文件列表
 */
export async function downloadSkillZip(
  skillName: string,
  files: SkillFile[]
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(skillName);

  if (!folder) {
    throw new Error('Failed to create ZIP folder');
  }

  // 添加所有文件
  for (const file of files) {
    folder.file(file.path, file.content);
  }

  // 生成 Blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // 触发浏览器下载
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${skillName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
