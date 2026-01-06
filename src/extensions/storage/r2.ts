import type {
  StorageConfigs,
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageListOptions,
  StorageListResult,
  StorageObjectInfo,
} from '.';

/**
 * R2 storage provider configs
 * @docs https://developers.cloudflare.com/r2/
 */
export interface R2Configs extends StorageConfigs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  publicDomain?: string;
}

/**
 * R2 storage provider implementation
 * @website https://www.cloudflare.com/products/r2/
 */
export class R2Provider implements StorageProvider {
  readonly name = 'r2';
  configs: R2Configs;

  constructor(configs: R2Configs) {
    this.configs = configs;
  }

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      // R2 endpoint format: https://<accountId>.r2.cloudflarestorage.com
      // Use custom endpoint if provided, otherwise use default
      const endpoint =
        this.configs.endpoint ||
        `https://${this.configs.accountId}.r2.cloudflarestorage.com`;
      const url = `${endpoint}/${uploadBucket}/${options.key}`;

      const { AwsClient } = await import('aws4fetch');

      // R2 uses "auto" as region for S3 API compatibility
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      const request = new Request(url, {
        method: 'PUT',
        headers,
        body: bodyArray as any,
      });

      const response = await client.fetch(request);

      if (!response.ok) {
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`,
          provider: this.name,
        };
      }

      const publicUrl = this.configs.publicDomain
        ? `${this.configs.publicDomain}/${options.key}`
        : url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        key: options.key,
        filename: options.key.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
          provider: this.name,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No body in response',
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      return this.uploadFile({
        body,
        key: options.key,
        bucket: options.bucket,
        contentType: options.contentType,
        disposition: options.disposition,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  /**
   * 列出存储桶中的对象
   * ✅ 实现 StorageProvider.listFiles 接口
   */
  async listFiles(options: StorageListOptions): Promise<StorageListResult> {
    const { prefix = '', cursor, limit = 100 } = options;

    const endpoint =
      this.configs.endpoint ||
      `https://${this.configs.accountId}.r2.cloudflarestorage.com`;

    const { AwsClient } = await import('aws4fetch');
    const client = new AwsClient({
      accessKeyId: this.configs.accessKeyId,
      secretAccessKey: this.configs.secretAccessKey,
      region: this.configs.region || 'auto',
    });

    // Build ListObjectsV2 URL
    const listUrl = new URL(`${endpoint}/${this.configs.bucket}`);
    listUrl.searchParams.set('list-type', '2');
    listUrl.searchParams.set('max-keys', Math.min(limit, 1000).toString());
    if (prefix) {
      listUrl.searchParams.set('prefix', prefix);
    }
    if (cursor) {
      listUrl.searchParams.set('continuation-token', cursor);
    }

    const response = await client.fetch(listUrl.toString());

    if (!response.ok) {
      throw new Error(`Failed to list objects: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Parse XML response
    const objects: StorageObjectInfo[] = [];
    let totalSize = 0;

    const contentsMatches = xmlText.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
    for (const match of contentsMatches) {
      const content = match[1];
      const key = content.match(/<Key>(.*?)<\/Key>/)?.[1] || '';
      const size = parseInt(content.match(/<Size>(.*?)<\/Size>/)?.[1] || '0');
      const lastModified = content.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] || '';
      const etag = content.match(/<ETag>"?(.*?)"?<\/ETag>/)?.[1];

      objects.push({ key, size, lastModified, etag });
      totalSize += size;
    }

    const isTruncated = xmlText.includes('<IsTruncated>true</IsTruncated>');
    const nextTokenMatch = xmlText.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/);

    return {
      objects,
      truncated: isTruncated,
      cursor: nextTokenMatch?.[1],
      totalCount: objects.length,
      totalSize,
    };
  }

  /**
   * 删除存储桶中的对象
   * ✅ 实现 StorageProvider.deleteFile 接口
   */
  async deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint =
        this.configs.endpoint ||
        `https://${this.configs.accountId}.r2.cloudflarestorage.com`;

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const deleteUrl = `${endpoint}/${this.configs.bucket}/${key}`;
      const response = await client.fetch(deleteUrl, { method: 'DELETE' });

      if (!response.ok && response.status !== 204) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      console.log(`[R2Provider] Deleted: ${key}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 检查对象是否存在 (v1.6.1)
   * 用于上传前去重检查
   */
  async exists(key: string): Promise<boolean> {
    try {
      const endpoint =
        this.configs.endpoint ||
        `https://${this.configs.accountId}.r2.cloudflarestorage.com`;

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const headUrl = `${endpoint}/${this.configs.bucket}/${key}`;
      const response = await client.fetch(headUrl, { method: 'HEAD' });

      // 200 = exists, 404 = not found
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取公开访问 URL
   */
  getPublicUrl(key: string): string | null {
    if (!this.configs.publicDomain) {
      return null;
    }
    return `${this.configs.publicDomain}/${key}`;
  }
}

/**
 * Create R2 provider with configs
 */
export function createR2Provider(configs: R2Configs): R2Provider {
  return new R2Provider(configs);
}
