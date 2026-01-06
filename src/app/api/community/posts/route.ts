import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/shared/lib/rate-limit';
import { respData, respErr } from '@/shared/lib/resp';
import { validateRequest } from '@/shared/lib/zod';
import { requireEmailVerified } from '@/shared/lib/email-verification';
import { getUserInfo } from '@/shared/models/user';
import {
  createCommunityPost,
  findCommunityPostByTaskId,
  updateCommunityPostById,
  CommunityPostStatus,
  getCommunityPosts,
  getCommunityPostsCount,
} from '@/shared/models/community_post';
import { findAITaskById } from '@/shared/models/ai_task';
import { communityPostSchema } from '@/shared/schemas/api-schemas';
import { ErrorLogger } from '@/shared/lib/error-logger';

/**
 * POST /api/community/posts
 * Create or update a community post (share to community)
 */
export async function POST(request: Request) {
  try {
    // ✅ Zod 参数校验 - 防止恶意数据注入
    const validation = await validateRequest(request, communityPostSchema);
    if (!validation.success) {
      return validation.response;
    }
    
    const { aiTaskId, shareToPublic, visionLogicData } = validation.data;

    // 🛡️ Rate Limit - 社区发布防刷屏
    const ip = getClientIP(request);
    const user = await getUserInfo();
    
    const rateLimitConfig = user ? RATE_LIMITS.COMMUNITY_POST_USER : RATE_LIMITS.COMMUNITY_POST_GUEST;
    const identifier = user ? `user:${user.id}` : `ip:${ip}`;
    
    const rateLimitResult = await checkRateLimit(
      `community:post:${identifier}`,
      rateLimitConfig.limit,
      rateLimitConfig.window
    );
    if (!rateLimitResult.success) {
      return respErr('Too many posts. Please slow down.');
    }

    // 用户认证检查（发帖必须登录）
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // Email verification check (v1.7.2) - 未验证用户不能发帖
    const verificationError = await requireEmailVerified(user);
    if (verificationError) return verificationError;

    // Get AI task
    const aiTask = await findAITaskById(aiTaskId);
    if (!aiTask) {
      throw new Error('AI task not found');
    }

    // Verify ownership
    if (aiTask.userId !== user.id) {
      throw new Error('unauthorized');
    }

    // Parse task info to get image URL
    const taskInfo = aiTask.taskInfo ? JSON.parse(aiTask.taskInfo) : null;
    if (!taskInfo || !taskInfo.images || taskInfo.images.length === 0) {
      throw new Error('no image found in task result');
    }

    const imageUrl = taskInfo.images[0].imageUrl;
    if (!imageUrl) {
      throw new Error('image URL not found');
    }

    // Check if post already exists for this task
    const existingPost = await findCommunityPostByTaskId(aiTaskId);

    if (existingPost) {
      // Update existing post status
      const updatedPost = await updateCommunityPostById(existingPost.id, {
        status: shareToPublic ? CommunityPostStatus.PENDING : CommunityPostStatus.PRIVATE,
      });

      return respData(updatedPost);
    }

    // Parse options to build params JSON
    const options = aiTask.options ? JSON.parse(aiTask.options) : {};
    
    // Build params: prefer visionLogicData if available (for better Remix)
    const params = visionLogicData ? {
      ...visionLogicData,
      // Also include basic fields for compatibility
      provider: aiTask.provider,
      model: aiTask.model,
      scene: aiTask.scene,
      options,
    } : {
      version: 1, // Legacy format
      provider: aiTask.provider,
      model: aiTask.model,
      prompt: aiTask.prompt,
      scene: aiTask.scene,
      options,
    };

    // Get aspect ratio from options (already parsed at L86)
    const aspectRatio = options.aspectRatio || '1:1';

    // Create new post
    const newPost = await createCommunityPost({
      userId: user.id,
      aiTaskId: aiTask.id,
      imageUrl,
      prompt: aiTask.prompt,
      model: aiTask.model,
      params: JSON.stringify(params),
      aspectRatio,
      status: shareToPublic ? CommunityPostStatus.PENDING : CommunityPostStatus.PRIVATE,
      viewCount: 0,
      likeCount: 0,
    } as any);

    return respData(newPost);
  } catch (e: any) {
    let userId = 'anonymous';
    try {
      const u = await getUserInfo();
      if (u) userId = u.id;
    } catch { }

    const errorReport = await ErrorLogger.log({
      error: e,
      context: { feature: 'community_post', userId },
    });

    console.error('Create community post failed:', e);
    return respErr(errorReport.userMessage);
  }
}

/**
 * GET /api/community/posts
 * Get community posts list (for gallery)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const sort = (searchParams.get('sort') || 'newest') as 'newest' | 'trending';
    const model = searchParams.get('model') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const statusParam = searchParams.get('status');
    
    // Determine status filter
    let status: CommunityPostStatus | undefined;
    if (statusParam) {
      status = statusParam as CommunityPostStatus;
    } else {
      // Only show published posts in public gallery by default
      status = CommunityPostStatus.PUBLISHED;
    }

    // Get posts with user info
    const posts = await getCommunityPosts({
      userId,
      status,
      model,
      sort,
      page,
      limit,
      getUser: true,
    });

    // Get total count for pagination
    const total = await getCommunityPostsCount({
      userId,
      status,
      model,
    });

    return respData({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e: any) {
    const errorReport = await ErrorLogger.log({
      error: e,
      context: { feature: 'community_gallery', userId: 'anonymous' },
    });

    console.error('Get community posts failed:', e);
    return respErr(errorReport.userMessage);
  }
}
