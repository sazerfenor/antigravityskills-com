/**
 * Avatar Generation Utility (Browser-side)
 *
 * @description 头像生成 + 压缩工具，用于虚拟人格头像处理
 * 使用 browser-image-compression 进行客户端压缩，不依赖 sharp
 */

import imageCompression from 'browser-image-compression';
import { nanoid } from 'nanoid';

export interface AvatarGenerationOptions {
  /** AI 生成的头像图片 URL */
  imageUrl: string;
  /** 用户名（用于文件命名） */
  username: string;
  /** 进度回调 */
  onProgress?: (progress: number) => void;
}

export interface AvatarResult {
  /** 压缩后的 Blob */
  blob: Blob;
  /** 建议的文件名 */
  filename: string;
  /** 原始大小 */
  originalSize: number;
  /** 压缩后大小 */
  compressedSize: number;
  /** 压缩比例 */
  ratio: number;
}

/**
 * 头像压缩配置
 * 参考 UIUX_Guidelines.md 中的头像规范
 */
const AVATAR_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.8,
};

/**
 * 从 URL 下载图片并转换为 File 对象
 */
async function fetchImageAsFile(imageUrl: string): Promise<File> {
  let response: Response;

  // 尝试直接获取
  try {
    response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Direct fetch failed');
  } catch {
    // 通过代理获取
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    response = await fetch(proxyUrl);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  return new File([blob], 'avatar.png', { type: blob.type });
}

/**
 * 压缩头像图片
 */
export async function compressAvatar({
  imageUrl,
  username,
  onProgress,
}: AvatarGenerationOptions): Promise<AvatarResult> {
  // 1. 下载原始图片
  const originalFile = await fetchImageAsFile(imageUrl);
  const originalSize = originalFile.size;

  // 2. 使用 browser-image-compression 压缩
  const compressedBlob = await imageCompression(originalFile, {
    ...AVATAR_COMPRESSION_OPTIONS,
    onProgress,
  });

  // 3. 生成文件名
  const hash = nanoid(12);
  const filename = `${username}-${hash}.webp`;

  return {
    blob: compressedBlob,
    filename,
    originalSize,
    compressedSize: compressedBlob.size,
    ratio: compressedBlob.size / originalSize,
  };
}

/**
 * 上传头像到 R2
 */
export async function uploadAvatar(
  blob: Blob,
  filename: string
): Promise<string> {
  const formData = new FormData();
  formData.append('files', blob, filename);
  formData.append('type', 'avatar');

  const response = await fetch('/api/storage/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const result = await response.json() as {
    code: number;
    message?: string;
    data?: { urls?: string[] };
  };

  if (result.code !== 0 || !result.data?.urls?.length) {
    throw new Error(result.message || 'Upload failed');
  }

  return result.data.urls[0];
}

/**
 * 一步完成：压缩 + 上传头像
 */
export async function compressAndUploadAvatar(
  options: AvatarGenerationOptions
): Promise<string> {
  const { blob, filename } = await compressAvatar(options);
  return uploadAvatar(blob, filename);
}

/**
 * 调用 AI 生成头像图片
 *
 * @param avatarPrompt - AI 生成头像的 Prompt
 * @returns 生成的图片 URL
 */
export async function generateAvatarImage(avatarPrompt: string): Promise<string> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'gemini',
      mediaType: 'image',
      model: 'gemini-3-pro-image-preview',
      scene: 'text-to-image',
      prompt: avatarPrompt,
      options: {
        aspectRatio: '1:1',
      },
    }),
  });

  if (!response.ok) {
    // 获取详细错误信息
    const errorData = await response.json().catch(() => null) as {
      code: number;
      message?: string;
      data?: { urls?: string[] };
    } | null;
    const errorMessage = errorData?.message || `AI generation failed: ${response.status}`;
    console.error('[Avatar Generation] API Error:', response.status, errorData);
    throw new Error(errorMessage);
  }

  const result = await response.json() as {
    code: number;
    message?: string;
    data?: {
      imageUrl?: string;  // 直接返回 (兼容)
      taskInfo?: string | {  // Gemini 同步返回的数据结构（可能是 JSON 字符串或对象）
        images?: Array<{ imageUrl: string }>;
      };
    };
  };

  if (result.code !== 0) {
    throw new Error(result.message || 'Image generation failed');
  }

  // 尝试多种数据结构：
  // 1. 直接 imageUrl（兼容旧格式）
  // 2. taskInfo.images（Gemini 同步返回）
  // 注意：API 返回的 taskInfo 可能是 JSON 字符串，需要先解析
  let imageUrl = result.data?.imageUrl;

  if (!imageUrl && result.data?.taskInfo) {
    let taskInfo = result.data.taskInfo;

    // 如果 taskInfo 是字符串，先解析为对象
    if (typeof taskInfo === 'string') {
      try {
        taskInfo = JSON.parse(taskInfo);
      } catch (e) {
        console.error('[Avatar Generation] Failed to parse taskInfo:', e);
      }
    }

    // 从解析后的 taskInfo 中获取 imageUrl
    imageUrl = (taskInfo as any)?.images?.[0]?.imageUrl;
  }

  if (!imageUrl) {
    console.error('[Avatar Generation] No imageUrl in response:', JSON.stringify(result.data, null, 2));
    throw new Error('No image URL in response. Check debug panel for details.');
  }

  return imageUrl;
}

/**
 * 完整头像生成流程
 *
 * 1. 调用 AI 生成头像
 * 2. 下载并压缩
 * 3. 上传到 R2
 *
 * @param avatarPrompt - AI 生成头像的 Prompt
 * @param username - 用户名
 * @param onProgress - 进度回调
 * @returns 头像的公开 URL
 */
export async function generateAndUploadAvatar(
  avatarPrompt: string,
  username: string,
  onProgress?: (step: string, progress: number) => void
): Promise<string> {
  // Step 1: 生成头像
  onProgress?.('generating', 0);
  const generatedImageUrl = await generateAvatarImage(avatarPrompt);
  onProgress?.('generating', 100);

  // Step 2: 压缩头像
  onProgress?.('compressing', 0);
  const { blob, filename } = await compressAvatar({
    imageUrl: generatedImageUrl,
    username,
    onProgress: (p) => onProgress?.('compressing', p),
  });
  onProgress?.('compressing', 100);

  // Step 3: 上传头像
  onProgress?.('uploading', 0);
  const avatarUrl = await uploadAvatar(blob, filename);
  onProgress?.('uploading', 100);

  return avatarUrl;
}
