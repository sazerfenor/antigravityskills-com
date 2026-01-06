---
trigger: model_decision
description: Applied when implementing RAG systems or vector search in Serverless/Edge environments. Patterns for ETL pipelines, embeddings, and AI provider management
---

# Serverless RAG Pattern

在 Serverless/Edge 环境中构建无外部向量数据库依赖的 RAG 应用。

## 适用场景

**使用此模式当**：
- 部署到 Serverless/Edge 环境 (Cloudflare Workers, Vercel Edge, Deno Deploy)
- 向量数据集规模 < 100K
- 需要零外部依赖的向量存储
- 纯 TypeScript/JavaScript 栈

**不适用当**：
- 向量数据集 > 100K → 使用 Pinecone, Weaviate, Qdrant
- 需要复杂 Reranking → 使用 LangChain + 托管向量数据库
- 需要高频实时索引更新 → 使用流式向量数据库

---

## 核心模式

### 1. Provider Manager Pattern

集中式 AI Provider 管理，支持动态切换和降级。

```typescript
// src/extensions/ai/provider-manager.ts

interface AIProvider {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  
  register(name: string, provider: AIProvider): void {
    this.providers.set(name, provider);
  }
  
  get(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(\`Provider \${name} not registered\`);
    return provider;
  }
  
  // 带降级的生成
  async generateWithFallback(prompt: string, preferredProviders: string[]): Promise<string> {
    for (const name of preferredProviders) {
      try {
        return await this.get(name).generateText(prompt);
      } catch (error) {
        console.warn(\`Provider \${name} failed, trying next...\`);
      }
    }
    throw new Error('All providers failed');
  }
}
```

### 2. ETL Processor Pattern

LLM 驱动的数据清洗和向量化管道。

```typescript
// src/shared/services/etl-processor.service.ts

class ETLProcessor {
  constructor(private config: ETLConfig) {}
  
  async process(records: DataRecord[]): Promise<DataRecord[]> {
    const results: DataRecord[] = [];
    
    for (let i = 0; i < records.length; i += this.config.batchSize) {
      const batch = records.slice(i, i + this.config.batchSize);
      
      // Step 1: LLM 清洗/转换
      const cleaned = await Promise.all(
        batch.map(r => this.cleanWithLLM(r.raw))
      );
      
      // Step 2: 生成 Embeddings
      const embeddings = await this.config.provider.generateEmbeddings(
        cleaned.map(c => c.text)
      );
      
      // Step 3: 合并结果
      batch.forEach((record, idx) => {
        results.push({
          ...record,
          processed: cleaned[idx].text,
          embedding: embeddings[idx],
          metadata: { ...record.metadata, ...cleaned[idx].extractedMeta }
        });
      });
    }
    
    return results;
  }
}
```

### 3. Serverless Vector Search Pattern

内存中余弦相似度计算 + KV 存储持久化。

```typescript
// src/shared/services/vector-search.ts

class VectorSearchService {
  private documents: VectorDocument[] = [];
  
  // 从 KV 加载（冷启动时）
  async loadFromKV(kv: KVNamespace, key: string): Promise<void> {
    const data = await kv.get(key, 'json');
    if (data) this.documents = data as VectorDocument[];
  }
  
  // 核心搜索 - 纯 JS，无外部依赖
  search(queryEmbedding: number[], topK: number = 5): SearchResult[] {
    return this.documents
      .map(doc => ({
        document: doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

---

## 目录结构约定

```
src/
├── extensions/
│   └── ai/
│       ├── provider-manager.ts     # Provider 管理
│       ├── gemini-text.ts          # Gemini 实现
│       └── openai-text.ts          # OpenAI 实现
├── shared/
│   ├── services/
│   │   ├── vector-search.ts        # 向量搜索服务
│   │   ├── etl-processor.service.ts # ETL 管道
│   │   └── kv-storage.ts           # KV 抽象
└── app/
    └── api/
        ├── search/route.ts         # 搜索 API
        └── ingest/route.ts         # 数据摄入 API
```

> **参考实现**: 基于 BananaPrompts 项目模板

---

## Embedding 维度对照

| Provider | Model | Dimensions |
|----------|-------|------------|
| OpenAI | text-embedding-3-small | 1536 |
| OpenAI | text-embedding-3-large | 3072 |
| Google | text-embedding-004 | 768 |
| Cohere | embed-english-v3.0 | 1024 |

> ⚠️ **关键**: 索引时和查询时的 Embedding 模型必须一致

---

## 反模式

### ❌ 每个记录都存储原始文本
### ✅ 分离索引和内容
### ❌ 每次搜索都调用 Embedding API  
### ✅ 缓存常用查询的 Embedding

---

## 最佳实践清单

- [ ] **预计算 Embeddings**: ETL 离线运行，存储到 KV
- [ ] **延迟加载索引**: 每个 Worker 首次请求时加载
- [ ] **批量 API 调用**: 减少 Embedding API 成本
- [ ] **维度一致性**: 确保 Provider 切换时维度匹配
- [ ] **实现降级**: Provider 失败时有备选方案
- [ ] **缓存查询 Embedding**: 热门查询命中缓存
- [ ] **分离索引与内容**: 保持向量索引精简
