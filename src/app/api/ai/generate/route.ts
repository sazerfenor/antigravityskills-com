import { envConfigs } from '@/config';
import { AIMediaType } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/shared/lib/rate-limit';
import { respData, respErrWithMeta } from '@/shared/lib/resp';
import { validateRequest } from '@/shared/lib/zod';
import { requireEmailVerified } from '@/shared/lib/email-verification';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo, isPaidUser } from '@/shared/models/user';
import { restoreRateLimit } from '@/shared/lib/rate-limit';
import { getAIService } from '@/shared/services/ai';
import { aiGenerateSchema } from '@/shared/schemas/api-schemas';
import { ErrorLogger } from '@/shared/lib/error-logger';
import { ErrorFeature } from '@/shared/models/error_report';
import { calculateCreditCost } from '@/shared/config/ai-models';

export async function POST(request: Request) {
  try {
    // ✅ Zod 参数校验 - 防止恶意数据注入
    const validation = await validateRequest(request, aiGenerateSchema);
    if (!validation.success) {
      return validation.response;
    }
    
    let { provider, mediaType, model, prompt, options, scene, optimizationData, seoHints } = validation.data;

    // Validate optimizationData structure (optional field)
    if (optimizationData && typeof optimizationData !== 'object') {
      console.warn('[Generate] Invalid optimizationData, ignoring');
      optimizationData = null;
    }

    // 🛡️ Rate Limit - 智能区分游客和登录用户
    let rateLimitIdentifier = getClientIP(request);
    let rateLimitConfig = RATE_LIMITS.AI_GENERATE_GUEST;
    let identifierPrefix = 'ip';

    // 尝试获取用户身份（仅用于放宽限制，不强制登录）
    const user = await getUserInfo();
    if (user?.id) {
      rateLimitIdentifier = user.id;
      rateLimitConfig = RATE_LIMITS.AI_GENERATE_USER;
      identifierPrefix = 'user';
    }

    const rateLimitKey = `ai:generate:${identifierPrefix}:${rateLimitIdentifier}`;
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      rateLimitConfig.limit,
      rateLimitConfig.window
    );

    if (!rateLimitResult.success) {
      return respErrWithMeta({
        message: 'Too many requests. Please take a break and try again later.',
        shouldRetry: true,
        retryDelay: 5000,
      }, 429);
    }

    // 用户认证检查（AI 生成必须登录）
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // Email verification check (v1.7.2) - 未验证用户不能使用 AI 生成
    const verificationError = await requireEmailVerified(user);
    if (verificationError) return verificationError;

    // 初始化 AI Service 和 Provider
    const aiService = await getAIService();

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }

    // 🆕 Calculate credits based on model and inputs
    let costCredits = 10; // Default fallback

    if (mediaType === AIMediaType.IMAGE) {
      // Validate scene for image generation
      if (scene !== 'text-to-image' && scene !== 'image-to-image') {
        throw new Error('invalid scene: must be text-to-image or image-to-image');
      }

      // Get output count and resolution from options
      const outputImageCount = options?.numberOfImages || 1;
      const resolution = options?.imageSize || '1K'; // '1K' | '2K' | '4K'

      // Calculate using model config (v3: added scene multiplier for image-to-image)
      costCredits = calculateCreditCost(model, outputImageCount, resolution, scene);
    } else if (mediaType === AIMediaType.MUSIC) {
      costCredits = 10;
      scene = 'text-to-music';
    } else {
      throw new Error('invalid mediaType');
    }

    // check credits
    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits < costCredits) {
      throw new Error('insufficient credits');
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options,
      seoHints, // 🌟 SEO Image Naming: pass hints to provider
    };

    // 🆕 Retry wrapper for transient errors (429, 5xx)
    const MAX_RETRIES = 1;
    const RETRY_DELAY = 3000; // 3 seconds
    
    const executeWithRetry = async (attemptNumber: number = 0): Promise<any> => {
      try {
        const result = await aiProvider.generate({ params });
        return result;
      } catch (error: any) {
        const statusCode = error.statusCode || error.status || 0;
        const errorMessage = (error.message || '').toLowerCase();
        
        // 🚫 Never retry: 400 Bad Request or Safety/Content violations
        const isSafetyError = errorMessage.includes('safety') || 
                             errorMessage.includes('blocked') || 
                             errorMessage.includes('content');
        const isBadRequest = statusCode === 400;
        
        if (isSafetyError || isBadRequest) {
          console.log('[Generate] Non-retryable error, throwing immediately:', { statusCode, isSafetyError });
          throw error;
        }
        
        // ✅ Retry: 429 Rate Limit or 5xx Server Errors
        const isRetryable = statusCode === 429 || statusCode >= 500;
        
        if (isRetryable && attemptNumber < MAX_RETRIES) {
          console.log(`[Generate] Retrying in ${RETRY_DELAY}ms (attempt ${attemptNumber + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return executeWithRetry(attemptNumber + 1);
        }
        
        // Max retries reached or non-retryable error
        throw error;
      }
    };

    // generate content with retry
    const result = await executeWithRetry();
    if (!result?.taskId) {
      throw new Error(
        `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
      );
    }

    // create ai task
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: options ? JSON.stringify(options) : null,
      status: result.taskStatus,
      costCredits,
      taskId: result.taskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      optimizationData, // Pass optimization metadata (JSONB)
    };
    await createAITask(newAITask);

    // 🔄 Dynamic Quota: Restore 1 Build Limit for Paid Users
    // This rewards actual usage (generation) by giving back specific quota
    isPaidUser(user.id).then(isPaid => {
      if (isPaid) {
        restoreRateLimit(`vl:build:user:${user.id}`)
          .catch(e => console.error('[Generate] Failed to restore quota:', e));
      }
    }).catch(e => console.error('[Generate] Failed to check paid status:', e));

    return respData(newAITask);
  } catch (e: any) {
    // 获取用户信息用于错误上下文
    let userId = 'anonymous';
    let userEmail: string | undefined;
    let errorProvider = 'unknown';
    let errorModel = 'unknown';
    try {
      const user = await getUserInfo();
      if (user) {
        userId = user.id;
        userEmail = user.email || undefined;
      }
    } catch { }

    // 尝试从请求体获取 provider/model（如果 validation 成功过）
    try {
      const body = await request.clone().json() as Record<string, unknown>;
      errorProvider = (body?.provider as string) || 'unknown';
      errorModel = (body?.model as string) || 'unknown';
    } catch { }

    // 使用 ErrorLogger 记录到数据库
    const errorReport = await ErrorLogger.log({
      error: e,
      context: {
        feature: ErrorFeature.IMAGE_GENERATION,
        provider: errorProvider,
        model: errorModel,
        userId,
        userEmail,
        requestParams: {
          // 只记录非敏感信息
          mediaType: 'image',
        },
      },
    });

    // 🆕 返回结构化错误响应（支持 ErrorHandler）
    return respErrWithMeta({
      message: errorReport.userMessage,
      errorId: errorReport.errorId,
      errorType: errorReport.errorType,
      shouldRetry: errorReport.shouldRetry,
      retryDelay: errorReport.retryDelay,
    });
  }
}
