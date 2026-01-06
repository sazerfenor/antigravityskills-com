/**
 * AI Configs to use AI functions
 */
export interface AIConfigs {
  [key: string]: any;
}

/**
 * ai media type
 */
export enum AIMediaType {
  MUSIC = 'music',
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
  SPEECH = 'speech',
}

export interface AISong {
  id?: string;
  createTime?: Date;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  prompt: string;
  title: string;
  tags: string;
  style: string;
  model?: string;
  artist?: string;
  album?: string;
}

export interface AIImage {
  id?: string;
  createTime?: Date;
  imageType?: string;
  imageUrl?: string;
}

export interface AIVideo {
  id?: string;
  createTime?: Date;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface AIFile {
  url: string;
  contentType: string;
  key: string;
  index?: number;
  type?: string;
}

/**
 * Gemini 图片生成选项 (Imagen 3 API)
 */
export interface GeminiImageGenerationOptions {
  /** 图片宽高比: "1:1" | "3:4" | "4:3" | "9:16" | "16:9". 默认 "1:1" */
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  /** 生成图片数量: 1-4. 默认 4 */
  numberOfImages?: number;
  /** 图片尺寸: "1K" | "2K". 仅 Standard/Ultra 支持. 默认 "1K" */
  imageSize?: '1K' | '2K';
  /** 人物生成控制. 默认 "allow_adult" */
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all';
  /** 输入图片 URL 列表 (用于 Image-to-Image) */
  image_input?: string[];
}

/**
 * AI generate params
 */
export interface AIGenerateParams {
  mediaType: AIMediaType;
  prompt: string;
  model?: string;
  // Gemini image generation options
  options?: GeminiImageGenerationOptions & Record<string, any>;
  // receive notify result
  callbackUrl?: string;
  // is return stream
  stream?: boolean;
  // is async
  async?: boolean;
  // 🌟 SEO hints for image filename generation
  seoHints?: string | null;
}

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * AI task info
 */
export interface AITaskInfo {
  songs?: AISong[];
  images?: AIImage[];
  videos?: AIVideo[];
  status?: string; // provider task status
  errorCode?: string;
  errorMessage?: string;
  createTime?: Date;
}

/**
 * AI task result
 */
export interface AITaskResult {
  taskStatus: AITaskStatus;
  taskId: string; // provider task id
  taskInfo?: AITaskInfo;
  taskResult?: any; // raw result from provider
}

/**
 * 文本聊天参数 (对应 Gemini generateContent)
 */
export interface AIChatParams {
  model: string;           // e.g. "gemini-2.0-flash-exp"
  prompt: string;          // 用户输入
  systemPrompt?: string;   // 系统指令
  temperature?: number;    // 0.0-1.0
  maxTokens?: number;      // 最大输出 token
  jsonMode?: boolean;      // 是否强制返回 JSON
}

/**
 * 文本向量化参数 (对应 Gemini embedContent)
 */
export interface AIEmbedParams {
  text: string;
  model?: string;          // e.g. "text-embedding-004"
}

/**
 * AI Provider provide AI functions
 */
export interface AIProvider {
  // provider name
  readonly name: string;

  // provider configs
  configs: AIConfigs;

  // generate content (异步任务，用于图片/视频/音乐生成)
  generate({ params }: { params: AIGenerateParams }): Promise<AITaskResult>;

  // query task (查询异步任务状态)
  query?({
    taskId,
    mediaType,
    model,
  }: {
    taskId: string;
    mediaType?: AIMediaType;
    model?: string;
  }): Promise<AITaskResult>;

  /**
   * 同步对话/文本生成 (对应 Gemini generateContent)
   * 用于 SEO 生成、Prompt 优化等场景
   */
  chat?(params: AIChatParams): Promise<string>;

  /**
   * 文本向量化 (对应 Gemini embedContent)
   * 用于 Case Embedding 生成
   */
  embed?(params: AIEmbedParams): Promise<number[]>;
}

