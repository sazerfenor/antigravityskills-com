/**
 * ETL Pipeline 2.0 - 多场景 Case 数据结构
 * 
 * 用于重构向量库，解决"主体干扰"和"参数冲突"问题
 * 实现"搜风格得风格"的检索效果
 * 
 * @module src/shared/types/case-v2
 * @version 2.0
 */

// ==================== 枚举定义 ====================

/**
 * Case 类别
 * 
 * @description 用于分流 ETL 处理逻辑和前端展示
 * 
 * - VISUAL:  纯画面生成（人物、风景、产品图）
 * - LAYOUT:  PPT/海报/文档排版设计
 * - EDITING: 图像编辑（换装、去背景、上色）
 * - UTILITY: 非视觉任务（逻辑推理、代码生成）
 */
export type CaseCategory = 'VISUAL' | 'LAYOUT' | 'EDITING' | 'UTILITY';

/**
 * 占位符类型
 * 
 * - subject: 主体（用于 VISUAL）
 * - topic:   话题（用于 LAYOUT）
 * - target:  操作对象（用于 EDITING）
 * - custom:  自定义
 */
export type PlaceholderType = 'subject' | 'topic' | 'target' | 'custom';

/**
 * 模型偏好提示
 */
export type ModelHint = 'midjourney' | 'stable-diffusion' | 'gemini' | 'dalle' | null;

/**
 * 输出类型
 */
export type OutputType = 'image' | 'document' | 'video' | null;

// ==================== 核心接口 ====================

/**
 * CaseV2 - 新一代 Case 数据结构
 * 
 * @description 
 * 核心变更：将 `semantic_search_text` 与主体/参数解耦
 * 只对 `semantic_search_text` 做 Embedding，实现纯风格检索
 */
export interface CaseV2 {
  // ==================== 元数据 ====================
  
  /** 唯一标识符 */
  id: string;
  
  /** 人类可读标题 */
  title: string;
  
  /** Schema 版本标记 */
  version: '2.0';
  
  /** 创建时间 (ISO 8601) */
  createdAt: string;
  
  /** 更新时间 (ISO 8601) */
  updatedAt: string;

  // ==================== 类别分类 ====================
  
  /**
   * Case 类别（必填）
   * 
   * 决定 ETL 清洗策略和前端展示逻辑
   */
  category: CaseCategory;
  
  // ==================== 原始数据备份 ====================
  
  /**
   * 原始 Prompt
   * 
   * 保留网上抓取或用户提交的原始文本
   * 用于审计和回溯
   */
  origin_prompt: string;
  
  /**
   * 来源 URL（可选）
   */
  source_url?: string;

  // ==================== LLM 填空模板 ====================
  
  /**
   * 模板载荷
   * 
   * 包含挖空处理后的动态模板和默认值
   */
  template_payload: {
    /**
     * 挖空了主体/内容的动态模板
     * 
     * @example
     * - VISUAL:  "<subject>, cyberpunk style, neon lighting"
     * - LAYOUT:  "Create educational slides for <topic>, warm color palette"
     * - EDITING: "Replace <target> with <replacement>"
     */
    template: string;

    /**
     * 从原始 prompt 提取的默认填充值
     * 
     * @example
     * - VISUAL:  "a cute orange cat"
     * - LAYOUT:  "Chinese history for middle school"
     * - EDITING: "the person's red dress"
     */
    default_subject: string;

    /**
     * 占位符类型
     * 
     * 用于前端渲染不同的输入控件
     */
    placeholder_type: PlaceholderType;
    
    /**
     * 额外占位符（可选）
     * 
     * 用于多占位符模板，如 EDITING 的 `<target>` 和 `<replacement>`
     */
    additional_placeholders?: Array<{
      name: string;
      default_value: string;
      description?: string;
    }>;
  };

  // ==================== 核心资产：语义检索文本 ====================
  
  /**
   * 语义检索文本（💎 核心资产）
   * 
   * @description
   * 这是唯一用于 Embedding 的字段
   * 
   * 🚫 严禁出现：
   *   - 具体主体名词（cat, batman, China）
   *   - 硬件参数（16:9, v6.0, ISO 200, f/2.8）
   *   - 平台特定语法（--ar, --style raw）
   * 
   * ✅ 必须包含（根据类别）：
   *   - VISUAL:  风格、氛围、光影、材质、构图
   *   - LAYOUT:  配色方案、字体风格、版式结构
   *   - EDITING: 操作意图、处理手法、效果描述
   * 
   * @example
   * - VISUAL:  "Cozy interior atmosphere, warm afternoon lighting, vintage aesthetic, film grain"
   * - LAYOUT:  "Academic presentation design, warm earth tones, structured content layout"
   * - EDITING: "Clothing replacement, seamless blending, fashion editing"
   */
  semantic_search_text: string;

  // ==================== 约束条件 ====================
  
  /**
   * 约束条件
   * 
   * 从原始 Prompt 提取的特殊限制和偏好
   */
  constraints: {
    /**
     * 是否需要用户上传参考图
     * 
     * @description
     * 当原 prompt 包含 "uploaded image"、"this image"、"analyze the image" 时为 true
     * EDITING 类别通常为 true
     */
    requires_image_upload: boolean;
    
    /**
     * 原 prompt 中显式指定的宽高比
     * 
     * 用于检测 UI 设置冲突
     */
    original_aspect_ratio?: string;
    
    /**
     * 原 prompt 中的模型偏好提示
     */
    model_hint?: ModelHint;
    
    /**
     * 输出类型约束
     */
    output_type?: OutputType;
    
    /**
     * 其他自定义约束
     */
    custom?: Record<string, unknown>;
  };

  // ==================== 向量 ====================
  
  /**
   * 768 维 Embedding 向量
   * 
   * @description
   * 只对 `semantic_search_text` 生成
   * 不对 `origin_prompt` 或 `template` 做 Embedding
   */
  vector: number[];
  
  // ==================== 结构化标签 ====================
  
  /**
   * 分类标签
   * 
   * 用于精确筛选和多维度过滤
   */
  tags: {
    /** 风格标签 */
    style: string[];
    
    /** 氛围标签 */
    atmosphere: string[];
    
    /** 技术/手法标签 */
    technique: string[];
    
    /** 构图/版式标签 */
    composition: string[];
    
    /** 意图标签 */
    intent: string[];
  };

  // ==================== 展示资源 ====================
  
  /** 缩略图 URL (R2) */
  thumbnail: string;
  
  /** 原作者 */
  author?: string;
  
  // ==================== ETL 元数据 ====================
  
  /**
   * ETL 处理信息
   */
  etl_metadata?: {
    /** LLM 分类置信度 (0-1) */
    confidence: number;
    
    /** 是否需要人工审核 */
    needs_review: boolean;
    
    /** 审核原因 */
    review_reason?: string;
    
    /** 处理时间 */
    processed_at: string;
    
    /** 是否已审核 */
    reviewed?: boolean;
    
    /** 审核时间 */
    reviewed_at?: string;
    
    /** 审核者 */
    reviewed_by?: string;
  };
}

// ==================== 辅助类型 ====================

/**
 * ETL 处理结果
 */
export interface ETLResult {
  /** 处理是否成功 */
  success: boolean;
  
  /** 处理后的 CaseV2 数据 */
  caseV2: CaseV2 | null;
  
  /** 警告信息 */
  warnings: string[];
  
  /** 错误信息 */
  errors: string[];
  
  /** 原始 ID */
  originalId: string;
  
  /** 原始标题 */
  originalTitle: string;
}

/**
 * 审核报告条目
 */
export interface AuditEntry {
  /** Case ID */
  id: string;
  
  /** 标题 */
  title: string;
  
  /** 分类 */
  category: CaseCategory;
  
  /** 原始 prompt 预览 */
  before: string;
  
  /** 清洗后的 semantic_search_text */
  after: string;
  
  /** 生成的模板 */
  template: string;
  
  /** LLM 置信度 */
  confidence: number;
  
  /** 是否需要审核 */
  needs_review: boolean;
  
  /** 审核原因 */
  review_reason?: string;
  
  /** 审核状态 */
  review_status?: 'pending' | 'approved' | 'rejected' | 'modified';
  
  /** 人工修正后的 semantic_search_text */
  corrected_semantic_text?: string;
}

/**
 * 批量处理报告
 */
export interface BatchProcessingReport {
  /** 处理时间 */
  processedAt: string;
  
  /** 总条数 */
  totalCount: number;
  
  /** 成功数 */
  successCount: number;
  
  /** 失败数 */
  errorCount: number;
  
  /** 各类别统计 */
  categoryBreakdown: Record<CaseCategory, number>;
  
  /** 需要审核的条数 */
  needsReviewCount: number;
  
  /** 详细结果 */
  results: ETLResult[];
}
