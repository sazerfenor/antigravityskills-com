/**
 * Skill ZIP Uploader
 *
 * 收集 Skill 文件夹内容，打包为 ZIP 并上传到 R2
 * 用于发布脚本和 Skill 管理
 */

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

import { createR2Provider, type R2Configs } from '@/extensions/storage/r2';

/**
 * 获取 R2 存储 Provider（脚本环境用）
 * 直接从环境变量读取配置
 */
function getR2Provider() {
  const configs: R2Configs = {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET_NAME || '',
    publicDomain: process.env.R2_PUBLIC_DOMAIN || '',
  };

  if (!configs.accessKeyId || !configs.secretAccessKey || !configs.bucket) {
    throw new Error('R2 配置缺失，请设置 R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME 环境变量');
  }

  return createR2Provider(configs);
}

// ============================================
// 类型定义
// ============================================

export interface SkillFile {
  /** 相对路径，如 "SKILL.md" 或 "brands/anthropic.md" */
  path: string;
  /** 文件内容 */
  content: string | Buffer;
}

export interface UploadSkillZipResult {
  success: boolean;
  zipUrl?: string;
  zipSize?: number;
  fileCount?: number;
  error?: string;
}

// ============================================
// 排除规则
// ============================================

/** 需要排除的文件/文件夹 */
const EXCLUDED_PATTERNS = [
  '.DS_Store',
  '.git',
  '.gitignore',
  'node_modules',
  '.env',
  '.env.local',
  'seo-fields.json', // 发布元数据，不需要打包
  '*.log',
  'thumbs.db',
];

/**
 * 检查文件是否应该被排除
 */
function shouldExclude(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  for (const pattern of EXCLUDED_PATTERNS) {
    // 精确匹配
    if (fileName === pattern) return true;
    // 通配符匹配 (*.log)
    if (pattern.startsWith('*') && fileName.endsWith(pattern.slice(1))) return true;
    // 目录排除
    if (dirName.includes(pattern)) return true;
  }

  return false;
}

// ============================================
// 文件收集
// ============================================

/**
 * 递归收集 Skill 文件夹内所有文件
 *
 * @param skillDir - Skill 文件夹的绝对路径
 * @returns 文件列表（相对路径 + 内容）
 */
export function collectSkillFiles(skillDir: string): SkillFile[] {
  const files: SkillFile[] = [];

  function walkDir(currentDir: string, relativePath: string = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

      // 检查排除规则
      if (shouldExclude(relPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        // 递归处理子目录
        walkDir(fullPath, relPath);
      } else if (entry.isFile()) {
        // 读取文件内容
        // 对于文本文件使用 utf-8，二进制文件使用 Buffer
        const ext = path.extname(entry.name).toLowerCase();
        const textExtensions = ['.md', '.txt', '.json', '.yaml', '.yml', '.csv', '.xml', '.html', '.css', '.js', '.ts'];

        if (textExtensions.includes(ext)) {
          files.push({
            path: relPath,
            content: fs.readFileSync(fullPath, 'utf-8'),
          });
        } else {
          files.push({
            path: relPath,
            content: fs.readFileSync(fullPath),
          });
        }
      }
    }
  }

  walkDir(skillDir);
  return files;
}

/**
 * 检查 Skill 文件夹是否有附属资源（除 SKILL.md 外的其他文件）
 */
export function hasAttachedResources(skillDir: string): boolean {
  const files = collectSkillFiles(skillDir);
  // 如果只有 SKILL.md 一个文件，则没有附属资源
  return files.length > 1 || (files.length === 1 && files[0].path !== 'SKILL.md');
}

// ============================================
// ZIP 打包
// ============================================

/**
 * 将文件列表打包为 ZIP Buffer
 *
 * @param skillId - Skill ID，用作 ZIP 内的根文件夹名
 * @param files - 文件列表
 * @returns ZIP Buffer
 */
export async function createSkillZip(
  skillId: string,
  files: SkillFile[]
): Promise<Buffer> {
  const zip = new JSZip();
  const folder = zip.folder(skillId);

  if (!folder) {
    throw new Error('Failed to create ZIP folder');
  }

  for (const file of files) {
    folder.file(file.path, file.content);
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return buffer;
}

// ============================================
// R2 上传
// ============================================

/**
 * 打包 Skill 文件夹并上传到 R2
 *
 * @param skillId - Skill ID
 * @param files - 文件列表（如果为空，将不上传）
 * @returns 上传结果
 */
export async function uploadSkillZip(
  skillId: string,
  files: SkillFile[]
): Promise<UploadSkillZipResult> {
  if (files.length === 0) {
    return {
      success: false,
      error: 'No files to upload',
    };
  }

  try {
    // 1. 创建 ZIP
    const zipBuffer = await createSkillZip(skillId, files);

    // 2. 获取存储 Provider
    const storage = getR2Provider();

    // 3. 上传到 R2 (URL 安全文件名: {skillId}-antigravityskills-com.zip)
    const zipFileName = `${skillId}-antigravityskills-com.zip`;
    const key = `skills/${skillId}/${zipFileName}`;
    const result = await storage.uploadFile({
      key,
      body: zipBuffer,
      contentType: 'application/zip',
      disposition: 'attachment',
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Upload failed',
      };
    }

    return {
      success: true,
      zipUrl: result.url,
      zipSize: zipBuffer.length,
      fileCount: files.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 一站式：收集文件 + 打包 + 上传
 *
 * @param skillId - Skill ID
 * @param skillDir - Skill 文件夹路径
 * @returns 上传结果
 */
export async function collectAndUploadSkillZip(
  skillId: string,
  skillDir: string
): Promise<UploadSkillZipResult> {
  // 收集文件
  const files = collectSkillFiles(skillDir);

  if (files.length === 0) {
    return {
      success: false,
      error: `No files found in ${skillDir}`,
    };
  }

  console.log(`   📦 收集到 ${files.length} 个文件，准备打包上传...`);

  // 上传
  return uploadSkillZip(skillId, files);
}
