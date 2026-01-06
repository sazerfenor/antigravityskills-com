/**
 * Vector Search Service (V2)
 * 
 * 支持新的 CaseV2 数据结构:
 * - 使用 text-embedding-004 @ 768 dims
 * - 仅对 semantic_search_text 进行 Embedding 检索
 * - 支持分类过滤 (VISUAL/LAYOUT/EDITING/UTILITY)
 * 
 * @module src/shared/services/vector-search
 */

// ==================== Imports ====================

// V2 数据 (新架构)
import vectorDataV2 from '../../data/cases-v2-with-vectors.json';

// ==================== Types ====================

/** V1 Case 元数据 (向后兼容) */
export interface CaseMetadata {
  id: string;
  title: string;
  prompt: string;
  thumbnail: string;
  author: string;
  structured: {
    subject: string;
    style: string;
    inferred_intent: string[];
    technique: string;
    search_optimized_text: string;
  };
  categories: string[];
  embedding: number[];
}

/** V2 Case 数据结构 */
export interface CaseV2Metadata {
  id: string;
  title: string;
  version: '2.0';
  category: 'VISUAL' | 'LAYOUT' | 'EDITING' | 'UTILITY';
  
  /** 模板 payload */
  template_payload: {
    template: string;
    default_subject: string;
    placeholder_type: 'subject' | 'topic' | 'target' | 'custom';
  };
  
  /** 纯风格描述 (用于向量检索) */
  semantic_search_text: string;
  
  /** 约束 */
  constraints: {
    requires_image_upload: boolean;
    original_aspect_ratio?: string;
    model_hint?: string;
    output_type?: string;
  };
  
  /** 标签 */
  tags: {
    style: string[];
    atmosphere: string[];
    technique: string[];
    composition: string[];
    intent: string[];
  };
  
  /** 原始 prompt */
  origin_prompt: string;
  
  /** 768 维向量 */
  vector: number[];
  
  /** 缩略图 */
  thumbnail: string;
}

/** 搜索结果 */
export interface SearchResult {
  case: CaseMetadata;
  similarity: number;
  rank: number;
}

/** V2 搜索结果 */
export interface SearchResultV2 {
  case: CaseV2Metadata;
  similarity: number;
  rank: number;
}

/** 搜索选项 */
export interface SearchOptions {
  /** 返回数量 */
  topK?: number;
  
  /** 最低相似度阈值 */
  minSimilarity?: number;
  
  /** 类别过滤 */
  category?: 'VISUAL' | 'LAYOUT' | 'EDITING' | 'UTILITY';
  
  /** 使用 V2 数据 */
  useV2?: boolean;
}

// ==================== Data Loading ====================

/** 当前使用的嵌入模型和维度 */
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-004',
  dimensions: 768,
  v2Enabled: true,
};

// V2 Cases
const casesV2: CaseV2Metadata[] = (vectorDataV2 as { cases?: CaseV2Metadata[] }).cases || [];

// ==================== Core Functions ====================

/**
 * 余弦相似度计算
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    console.warn(`Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * V2 向量搜索 (推荐)
 * 
 * @param inputEmbedding - Query vector (768-dim from text-embedding-004)
 * @param options - 搜索选项
 * @returns 排序后的搜索结果
 */
export function searchCasesV2(
  inputEmbedding: number[],
  options: SearchOptions = {}
): SearchResultV2[] {
  const {
    topK = 5,
    minSimilarity = 0,
    category,
  } = options;

  // 过滤 cases
  let candidates = casesV2.filter(c => c.vector && c.vector.length === 768);
  
  if (category) {
    candidates = candidates.filter(c => c.category === category);
  }

  // 计算相似度
  const results: SearchResultV2[] = candidates.map(caseItem => ({
    case: caseItem,
    similarity: cosineSimilarity(inputEmbedding, caseItem.vector),
    rank: 0,
  }));

  // 过滤低相似度
  const filtered = results.filter(r => r.similarity >= minSimilarity);

  // 排序
  filtered.sort((a, b) => b.similarity - a.similarity);

  // 分配排名
  filtered.forEach((result, index) => {
    result.rank = index + 1;
  });

  return filtered.slice(0, topK);
}

/**
 * 统一搜索接口
 */
export function searchCases(
  inputEmbedding: number[],
  options: SearchOptions = {}
): SearchResultV2[] {
  return searchCasesV2(inputEmbedding, options);
}

/**
 * 获取最佳匹配 (V2)
 */
export function findBestCaseV2(
  inputEmbedding: number[],
  options?: Omit<SearchOptions, 'topK'>
): SearchResultV2 | null {
  const results = searchCasesV2(inputEmbedding, { ...options, topK: 1 });
  return results.length > 0 ? results[0] : null;
}

// ==================== Utility Functions ====================

/**
 * 获取 Case 总数
 */
export function getCaseCount(): number {
  return casesV2.filter((c: CaseV2Metadata) => c.vector && c.vector.length === 768).length;
}

/**
 * 按 ID 获取 Case
 */
export function getCaseById(id: string): CaseV2Metadata | null {
  return casesV2.find((c: CaseV2Metadata) => c.id === id) || null;
}

/**
 * 获取类别分布统计
 */
export function getCategoryStats(): Record<string, number> {
  return casesV2.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * 检查向量维度是否匹配
 */
export function validateEmbedding(embedding: number[]): boolean {
  return embedding.length === EMBEDDING_CONFIG.dimensions;
}

// Legacy aliases for backward compatibility
export const getV2CaseCount = getCaseCount;
export const getV2CaseById = getCaseById;
export const getV2CategoryStats = getCategoryStats;
