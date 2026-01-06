import { respData, respErr } from '@/shared/lib/resp';
import { md5 } from '@/shared/lib/hash';
import { getStorageService } from '@/shared/services/storage';
import { ErrorLogger } from '@/shared/lib/error-logger';
import { ErrorFeature } from '@/shared/models/error_report';
import { getUserInfo } from '@/shared/models/user';

// 🛡️ 安全配置常量
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

// MIME 类型到扩展名映射
function extFromMime(mimeType: string): string | null {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || null;
}

function getDirectoryPrefix(type?: string): string {
  switch (type) {
    case 'avatar':
      return 'avatars/';
    case 'ai-image-reference':
      return 'ai/image/reference/';
    case 'ai-image-generated':
      return 'ai/image/generated/';
    case 'thumbnail':
      return 'ai/image/thumbs/'; // 🆕 缩略图目录
    case 'temp':
    default:
      return 'temp/';
  }
}

export async function POST(req: Request) {
  try {
    // 🚨 安全检查 1: 身份验证 (Authentication)
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized: Please sign in to upload', 401);
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const type = formData.get('type') as string;
    // 是否启用去重（默认对 ai-image-reference 启用）
    const enableDedup = formData.get('dedup') !== 'false' && type === 'ai-image-reference';

    console.log('[API] Received files:', files.length);
    console.log('[API] Upload type:', type || 'temp (default)');
    console.log('[API] User:', user.id);
    console.log('[API] Dedup enabled:', enableDedup);

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    const uploadResults = [];
    const storageService = await getStorageService();

    for (const file of files) {
      // 🚨 安全检查 2: 文件大小限制 (Size Limit)
      if (file.size > MAX_FILE_SIZE) {
        return respErr(
          `File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      }

      // 🚨 安全检查 3: 扩展名白名单 (Extension Whitelist)
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return respErr(
          `File extension .${ext} is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`
        );
      }

      // 🚨 安全检查 4: MIME 类型验证 (MIME Type Validation)
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return respErr(
          `File type ${file.type} is not allowed. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`
        );
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      // 🆕 v1.6.1: MD5 去重逻辑
      let key: string;
      let deduped = false;

      if (enableDedup) {
        // 计算文件内容 MD5 哈希
        const digest = md5(body);
        const fileExt = extFromMime(file.type) || ext;
        key = `${getDirectoryPrefix(type)}${digest}.${fileExt}`;

        // 检查文件是否已存在
        const provider = storageService.getDefaultProvider();
        if (provider && 'exists' in provider && typeof provider.exists === 'function') {
          const exists = await provider.exists(key);
          if (exists) {
            // 文件已存在，直接返回已有 URL
            const publicUrl = 'getPublicUrl' in provider && typeof provider.getPublicUrl === 'function'
              ? provider.getPublicUrl(key)
              : null;

            if (publicUrl) {
              console.log('[API] Dedup hit - file already exists:', key);
              uploadResults.push({
                url: publicUrl,
                key,
                filename: file.name,
                deduped: true,
              });
              continue; // 跳过上传，处理下一个文件
            }
          }
        }
      } else {
        // 原有逻辑：使用时间戳+随机字符
        const prefix = getDirectoryPrefix(type);
        const safeFilename = type === 'thumbnail'
          ? file.name.replace(/[^a-zA-Z0-9.-]/g, '-')
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
        key = `${prefix}${safeFilename}`;
      }

      // Upload to storage
      const result = await storageService.uploadFile({
        body: Buffer.from(body),
        key: key,
        contentType: file.type,
        disposition: 'inline',
      });

      if (!result.success) {
        console.error('[API] Upload failed:', result.error);
        return respErr(result.error || 'Upload failed');
      }

      console.log('[API] Upload success:', result.url, deduped ? '(deduped)' : '');

      uploadResults.push({
        url: result.url,
        key: result.key,
        filename: file.name,
        deduped,
      });
    }

    console.log(
      '[API] All uploads complete. Returning URLs:',
      uploadResults.map((r) => r.url)
    );

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e: any) {
    const errorReport = await ErrorLogger.log({
      error: e,
      context: { feature: ErrorFeature.UPLOAD, userId: 'anonymous' },
    });

    console.error('upload image failed:', e);
    return respErr(errorReport.userMessage);
  }
}
