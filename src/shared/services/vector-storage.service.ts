/**
 * Vector Storage Service
 * 
 * 负责生成 Embedding 并存入 KV
 * 
 * 用途：
 * - Admin 后台确认入库时调用
 * - 批量迁移脚本复用
 * 
 * @module src/shared/services/vector-storage.service
 */

import type { CaseV2 } from '../types/case-v2';
import type { CaseV2Draft } from './etl-processor.service';

// ==================== Types ====================

/**
 * CaseV2 完整数据（含向量）
 */
export interface CaseV2Record extends Omit<CaseV2Draft, 'etl_metadata'> {
  /** 版本标记 */
  version: '2.0';
  
  /** 768 维 embedding 向量 */
  vector: number[];
  
  /** 缩略图 URL */
  thumbnail: string;
  
  /** 作者 */
  author?: string;
  
  /** 创建时间 */
  createdAt: string;
  
  /** 更新时间 */
  updatedAt: string;
  
  /** ETL 元数据 */
  etl_metadata?: {
    confidence: number;
    needs_review: boolean;
    review_reason?: string;
    processed_at: string;
    reviewed?: boolean;
    reviewed_at?: string;
    reviewed_by?: string;
  };
}

/**
 * 存储结果
 */
export interface StorageResult {
  success: boolean;
  id: string;
  error?: string;
}

// ==================== KV 存储结构 ====================

/**
 * KV 中存储的 CaseV2 数据
 */
export interface CaseV2KVData {
  id: string;
  title: string;
  version: '2.0';
  category: string;
  semanticText: string;  // 用于检索的文本
  vector: number[];      // 768 维向量
  payload: {             // 完整数据
    template_payload: CaseV2Record['template_payload'];
    constraints: CaseV2Record['constraints'];
    tags: CaseV2Record['tags'];
    origin_prompt: string;
    source_url?: string;
    thumbnail: string;
    author?: string;
  };
  metadata: {
    category: string;
    requires_image_upload: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

// ==================== Service ====================

/** 行业标准维度：768 */
const EMBEDDING_DIMENSIONS = 768;

/** 推荐模型：Google 最强检索模型 */
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';

export class VectorStorageService {
  private apiKey: string;
  private embeddingModel: string;
  private outputDimensions: number;
  private kvNamespace: KVNamespace | null = null;
  
  constructor(options?: { 
    apiKey?: string; 
    embeddingModel?: string;
    outputDimensions?: number;
    kv?: KVNamespace;
  }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    this.embeddingModel = options?.embeddingModel || DEFAULT_EMBEDDING_MODEL;
    this.outputDimensions = options?.outputDimensions || EMBEDDING_DIMENSIONS;
    this.kvNamespace = options?.kv || null;
  }
  
  /**
   * 设置 KV Namespace（用于运行时注入）
   */
  setKV(kv: KVNamespace): void {
    this.kvNamespace = kv;
  }
  
  /**
   * 生成 Embedding
   * 
   * @param text 要 embed 的文本（应该是 semantic_search_text）
   * @returns 768 维向量
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${this.embeddingModel}`,
          content: {
            parts: [{ text }]
          },
          // 强制输出 768 维，行业标准
          outputDimensionality: this.outputDimensions,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
    }

    interface EmbeddingApiResponse {
      embedding?: { values?: number[] };
    }

    const result: EmbeddingApiResponse = await response.json();
    const embedding = result.embedding?.values;
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response');
    }

    return embedding;
  }
  
  /**
   * 从 Draft 生成完整的 CaseV2Record
   * 
   * @param draft ETL 草稿
   * @param options 额外选项
   * @returns 完整记录（含向量）
   */
  async finalize(
    draft: CaseV2Draft,
    options?: {
      thumbnail?: string;
      author?: string;
    }
  ): Promise<CaseV2Record> {
    // 只对 semantic_search_text 生成 embedding
    const vector = await this.generateEmbedding(draft.semantic_search_text);
    
    const now = new Date().toISOString();
    
    return {
      id: draft.id,
      title: draft.title,
      version: '2.0',
      category: draft.category,
      origin_prompt: draft.origin_prompt,
      source_url: draft.source_url,
      template_payload: draft.template_payload,
      semantic_search_text: draft.semantic_search_text,
      constraints: draft.constraints,
      tags: draft.tags,
      vector,
      thumbnail: options?.thumbnail || '',
      author: options?.author,
      createdAt: now,
      updatedAt: now,
      etl_metadata: draft.etl_metadata,
    };
  }
  
  /**
   * 存储到 KV
   * 
   * @param record 完整的 CaseV2Record
   * @returns 存储结果
   */
  async save(record: CaseV2Record): Promise<StorageResult> {
    if (!this.kvNamespace) {
      throw new Error('KV namespace not set. Call setKV() first.');
    }

    try {
      // 使用 case-v2: 前缀实现新旧并存
      const key = `case-v2:${record.id}`;
      
      // 构建 KV 存储结构
      const kvData: CaseV2KVData = {
        id: record.id,
        title: record.title,
        version: '2.0',
        category: record.category,
        semanticText: record.semantic_search_text,
        vector: record.vector,
        payload: {
          template_payload: record.template_payload,
          constraints: record.constraints,
          tags: record.tags,
          origin_prompt: record.origin_prompt,
          source_url: record.source_url,
          thumbnail: record.thumbnail,
          author: record.author,
        },
        metadata: {
          category: record.category,
          requires_image_upload: record.constraints.requires_image_upload,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      };

      // 存储到 KV
      await this.kvNamespace.put(key, JSON.stringify(kvData), {
        metadata: kvData.metadata,
      });

      return {
        success: true,
        id: key,
      };
    } catch (error: any) {
      return {
        success: false,
        id: record.id,
        error: error.message,
      };
    }
  }
  
  /**
   * 从 KV 获取 CaseV2
   */
  async get(id: string): Promise<CaseV2KVData | null> {
    if (!this.kvNamespace) {
      throw new Error('KV namespace not set');
    }

    const key = id.startsWith('case-v2:') ? id : `case-v2:${id}`;
    return await this.kvNamespace.get<CaseV2KVData>(key, 'json');
  }
  
  /**
   * 列出所有 CaseV2
   */
  async list(): Promise<Array<{ id: string; metadata: CaseV2KVData['metadata'] }>> {
    if (!this.kvNamespace) {
      throw new Error('KV namespace not set');
    }

    const results: Array<{ id: string; metadata: CaseV2KVData['metadata'] }> = [];
    let cursor: string | undefined;
    
    do {
      const list = await this.kvNamespace.list<CaseV2KVData['metadata']>({
        prefix: 'case-v2:',
        cursor,
      });
      
      for (const key of list.keys) {
        results.push({
          id: key.name.replace('case-v2:', ''),
          metadata: key.metadata as CaseV2KVData['metadata'],
        });
      }
      
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);
    
    return results;
  }
}

// Export singleton factory
let serviceInstance: VectorStorageService | null = null;

export function getVectorStorageService(options?: { 
  apiKey?: string; 
  embeddingModel?: string;
  kv?: KVNamespace;
}): VectorStorageService {
  if (!serviceInstance) {
    serviceInstance = new VectorStorageService(options);
  }
  return serviceInstance;
}
