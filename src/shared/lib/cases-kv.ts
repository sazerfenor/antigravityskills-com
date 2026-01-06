/**
 * Cases KV 服务
 * 
 * 用于存储和检索 Case 语义向量数据
 * 遵循项目开发规范：
 * - 使用 Cloudflare Workers KV
 * - 通过 getCloudflareContext() 获取 env
 * - 提供标准化的 CRUD 操作
 * 
 * @module shared/lib/cases-kv
 */

/// <reference path="../types/cloudflare.d.ts" />

import { getCloudflareContext } from '@opennextjs/cloudflare';

// ==================== Types ====================

/**
 * Case 元数据（存储在 KV metadata 字段）
 */
export interface CaseMetadata {
  title: string;
  hasImageUpload: boolean;
  keywords: string[];
  updatedAt: string;
}

/**
 * Case KV 存储的完整数据结构
 */
export interface CaseKVData {
  id: string;
  title: string;
  semanticText: string;
  vector: number[];
  payload: any; // 完整的 Case JSON
  metadata: CaseMetadata;
}

/**
 * 向量搜索结果
 */
export interface VectorSearchResult {
  id: string;
  title: string;
  similarity: number;
  payload: any;
  metadata: CaseMetadata;
}

// ==================== Core Functions ====================

/**
 * 获取 Cases KV Namespace
 * @throws 如果 KV 不可用
 */
export function getCasesKV(): KVNamespace {
  const { env } = getCloudflareContext();
  if (!env.CASES_KV) {
    throw new Error('[CasesKV] CASES_KV namespace not available');
  }
  return env.CASES_KV;
}

/**
 * 存储单个 Case 到 KV
 * Key 格式: case:{id}
 */
export async function putCase(data: CaseKVData): Promise<void> {
  const kv = getCasesKV();
  const key = `case:${data.id}`;
  
  // 存储完整数据（包含向量）
  await kv.put(key, JSON.stringify(data), {
    metadata: {
      title: data.title,
      hasImageUpload: data.metadata.hasImageUpload,
      keywords: data.metadata.keywords,
      updatedAt: new Date().toISOString(),
    } as CaseMetadata,
  });
}

/**
 * 获取单个 Case
 */
export async function getCase(id: string): Promise<CaseKVData | null> {
  const kv = getCasesKV();
  const key = `case:${id}`;
  
  const data = await kv.get<CaseKVData>(key, 'json');
  return data;
}

/**
 * 删除单个 Case
 */
export async function deleteCase(id: string): Promise<void> {
  const kv = getCasesKV();
  const key = `case:${id}`;
  await kv.delete(key);
}

/**
 * 列出所有 Case（只返回元数据，不含向量）
 */
export async function listCases(): Promise<Array<{ id: string; metadata: CaseMetadata }>> {
  const kv = getCasesKV();
  const results: Array<{ id: string; metadata: CaseMetadata }> = [];
  
  let cursor: string | undefined;
  do {
    const list = await kv.list<CaseMetadata>({
      prefix: 'case:',
      cursor,
    });
    
    for (const key of list.keys) {
      const id = key.name.replace('case:', '');
      if (key.metadata) {
        results.push({
          id,
          metadata: key.metadata,
        });
      }
    }
    
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  
  return results;
}

/**
 * 计算余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 向量搜索：在所有 Case 中找到最相似的 TopK
 * 
 * 注意：这是朴素的逐一比较，适用于小规模数据（< 1000）
 * 对于大规模数据，建议使用专业向量数据库（Pinecone/Milvus）
 */
export async function searchSimilarCases(
  queryVector: number[],
  topK: number = 3
): Promise<VectorSearchResult[]> {
  const kv = getCasesKV();
  const results: VectorSearchResult[] = [];
  
  // 获取所有 Case
  let cursor: string | undefined;
  do {
    const list = await kv.list<CaseMetadata>({
      prefix: 'case:',
      cursor,
    });
    
    // 批量获取数据
    for (const key of list.keys) {
      const data = await kv.get<CaseKVData>(key.name, 'json');
      if (data && data.vector) {
        const similarity = cosineSimilarity(queryVector, data.vector);
        results.push({
          id: data.id,
          title: data.title,
          similarity,
          payload: data.payload,
          metadata: key.metadata as CaseMetadata,
        });
      }
    }
    
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  
  // 按相似度降序排序，取 TopK
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * 存储索引元数据（用于快速检查版本）
 */
export async function putIndexMeta(meta: {
  version: string;
  totalCases: number;
  model: string;
  dimensions: number;
  updatedAt: string;
}): Promise<void> {
  const kv = getCasesKV();
  await kv.put('_index_meta', JSON.stringify(meta));
}

/**
 * 获取索引元数据
 */
export async function getIndexMeta(): Promise<{
  version: string;
  totalCases: number;
  model: string;
  dimensions: number;
  updatedAt: string;
} | null> {
  const kv = getCasesKV();
  return await kv.get('_index_meta', 'json');
}

/**
 * 清空所有 Case 数据（危险操作）
 */
export async function clearAllCases(): Promise<number> {
  const kv = getCasesKV();
  let deletedCount = 0;
  
  let cursor: string | undefined;
  do {
    const list = await kv.list({
      prefix: 'case:',
      cursor,
    });
    
    for (const key of list.keys) {
      await kv.delete(key.name);
      deletedCount++;
    }
    
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  
  // 同时删除索引元数据
  await kv.delete('_index_meta');
  
  return deletedCount;
}
