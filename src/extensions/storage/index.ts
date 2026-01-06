/**
 * Storage upload options interface
 */
export interface StorageUploadOptions {
  body: Buffer | Uint8Array;
  key: string;
  contentType?: string;
  bucket?: string;
  onProgress?: (progress: number) => void;
  disposition?: 'inline' | 'attachment';
}

/**
 * Storage download and upload options interface
 */
export interface StorageDownloadUploadOptions {
  url: string;
  key: string;
  bucket?: string;
  contentType?: string;
  disposition?: 'inline' | 'attachment';
}

/**
 * Storage upload result interface
 */
export interface StorageUploadResult {
  success: boolean;
  location?: string;
  bucket?: string;
  key?: string;
  filename?: string;
  url?: string;
  error?: string;
  provider: string;
}

/**
 * Storage list options interface
 */
export interface StorageListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
}

/**
 * Storage object info interface
 */
export interface StorageObjectInfo {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
}

/**
 * Storage list result interface
 */
export interface StorageListResult {
  objects: StorageObjectInfo[];
  truncated: boolean;
  cursor?: string;
  totalCount: number;
  totalSize: number;
}

/**
 * Storage configs interface
 */
export interface StorageConfigs {
  [key: string]: any;
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
  // provider name
  readonly name: string;

  // provider configs
  configs: StorageConfigs;

  // upload file
  uploadFile(options: StorageUploadOptions): Promise<StorageUploadResult>;

  // download and upload
  downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult>;

  /**
   * 列出存储桶中的对象 (管理功能)
   */
  listFiles?(options: StorageListOptions): Promise<StorageListResult>;

  /**
   * 删除存储桶中的对象 (管理功能)
   */
  deleteFile?(key: string): Promise<{ success: boolean; error?: string }>;
}

/**
 * Storage manager to manage all storage providers
 */
export class StorageManager {
  // storage providers
  private providers: StorageProvider[] = [];
  private defaultProvider?: StorageProvider;

  // add storage provider
  addProvider(provider: StorageProvider, isDefault = false) {
    this.providers.push(provider);
    if (isDefault) {
      this.defaultProvider = provider;
    }
  }

  // get provider by name
  getProvider(name: string): StorageProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  // get default provider (v1.6.1 - for dedup checks)
  getDefaultProvider(): StorageProvider | undefined {
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }
    return this.defaultProvider;
  }

  // upload file using default provider
  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    // set default provider if not set
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    return this.defaultProvider.uploadFile(options);
  }

  // upload file using specific provider
  async uploadFileWithProvider(
    options: StorageUploadOptions,
    providerName: string
  ): Promise<StorageUploadResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Storage provider '${providerName}' not found`);
    }
    return provider.uploadFile(options);
  }

  // download and upload using default provider
  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    // set default provider if not set
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error('No storage provider configured');
    }

    return this.defaultProvider.downloadAndUpload(options);
  }

  // download and upload using specific provider
  async downloadAndUploadWithProvider(
    options: StorageDownloadUploadOptions,
    providerName: string
  ): Promise<StorageUploadResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Storage provider '${providerName}' not found`);
    }
    return provider.downloadAndUpload(options);
  }

  // get all provider names
  getProviderNames(): string[] {
    return this.providers.map((p) => p.name);
  }
}

// Global storage manager instance
export const storageManager = new StorageManager();

// Export all providers
export * from './s3';
export * from './r2';
