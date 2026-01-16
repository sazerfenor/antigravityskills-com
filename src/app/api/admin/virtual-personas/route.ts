/**
 * 虚拟人格管理 API
 *
 * @description 提供虚拟人格的 CRUD 操作
 */

import { z } from 'zod';

import { respData, respErr, respOk } from '@/shared/lib/resp';
import { validateRequest } from '@/shared/lib/zod';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
  createVirtualPersona,
  deleteVirtualPersonaById,
  getVirtualPersonasCount,
  getVirtualPersonasPaginated,
  updateVirtualPersonaById,
} from '@/shared/models/virtual_persona';
import { db } from '@/core/db';
import { user } from '@/config/db/schema.sqlite';
import { getUuid } from '@/shared/lib/hash';
import type { NewVirtualPersona } from '@/shared/types/virtual-persona';

// ============================================
// Schema 定义
// ============================================

const getPersonasSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  category: z.enum(['photography', 'art-illustration', 'design', 'commercial-product', 'character-design']).optional(),
  activityLevel: z.enum(['low', 'moderate', 'high', 'very_high']).optional(),
  isActive: z.enum(['true', 'false']).optional().transform(v => v === undefined ? undefined : v === 'true'),
});

const createPersonaSchema = z.object({
  displayName: z.string().min(1).max(50),
  username: z.string().min(3).max(30),  // 只用 username 作为名字
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  primaryCategory: z.enum(['photography', 'art-illustration', 'design', 'commercial-product', 'character-design']),
  specialties: z.array(z.string()).optional(),
  styleKeywords: z.array(z.string()).optional(),

  // v2.0 新增：工作流相关
  workflowType: z.enum(['pure_ai', 'ai_enhanced', 'hybrid']).default('pure_ai'),
  workflowDescription: z.string().max(500).optional(),
  preferredTools: z.array(z.string()).optional(),
  dislikes: z.array(z.string()).optional(),
  sampleInteraction: z.object({
    scenario: z.string(),
    response: z.string(),
  }).optional(),

  personalityTraits: z.object({
    warmth: z.number().min(1).max(10),
    professionalism: z.number().min(1).max(10),
    humor: z.number().min(1).max(10),
    creativity: z.number().min(1).max(10),
    helpfulness: z.number().min(1).max(10),
  }),
  communicationStyle: z.enum(['formal', 'casual', 'enthusiastic', 'reserved']),
  responsePatterns: z.object({
    greetings: z.array(z.string()),
    closings: z.array(z.string()),
    emojiUsage: z.enum(['none', 'minimal', 'moderate', 'frequent']),
    typicalPhrases: z.array(z.string()),
  }).optional(),
  activityLevel: z.enum(['low', 'moderate', 'high', 'very_high']).default('moderate'),
  activeHoursStart: z.number().min(0).max(23).default(9),
  activeHoursEnd: z.number().min(0).max(23).default(22),
  promptStyleGuide: z.string().optional(),
  siteReview: z.string().optional(),
  siteRating: z.number().min(1).max(5).default(5),
});

const updatePersonaSchema = createPersonaSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

// ============================================
// GET - 获取人格列表
// ============================================

export async function GET(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.read'))) {
      return respErr('Permission denied', 403);
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validation = getPersonasSchema.safeParse(params);
    if (!validation.success) {
      return respErr(`Invalid parameters: ${validation.error.message}`);
    }

    const { page, pageSize, category, activityLevel, isActive } = validation.data;

    const [personas, total] = await Promise.all([
      getVirtualPersonasPaginated({ page, pageSize, category, activityLevel, isActive }),
      getVirtualPersonasCount(),
    ]);

    return respData({
      personas,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e: any) {
    console.error('[API] Get virtual personas failed:', e);
    return respErr(e.message);
  }
}

// ============================================
// POST - 创建人格
// ============================================

export async function POST(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.write'))) {
      return respErr('Permission denied', 403);
    }

    const validation = await validateRequest(request, createPersonaSchema);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // 1. 创建 User 记录
    const userId = getUuid();
    const now = new Date();

    await db().insert(user).values({
      id: userId,
      name: data.username,  // 只用 username 作为名字
      email: `${data.username}@virtual.antigravityskills.local`,
      emailVerified: true,
      image: data.avatarUrl || null,
      isVirtual: true,
      bio: data.bio || null,
      createdAt: now,
      updatedAt: now,
    });

    // 2. 创建 VirtualPersona 记录
    const personaData: NewVirtualPersona = {
      id: getUuid(),
      userId,
      displayName: data.username,  // 统一用 username
      username: data.username,
      primaryCategory: data.primaryCategory,
      secondaryCategories: null,
      specialties: data.specialties ? JSON.stringify(data.specialties) : null,
      styleKeywords: data.styleKeywords ? JSON.stringify(data.styleKeywords) : null,

      // v2.0 新增：工作流相关字段
      workflowType: data.workflowType,
      workflowDescription: data.workflowDescription || null,
      preferredTools: data.preferredTools ? JSON.stringify(data.preferredTools) : null,
      dislikes: data.dislikes ? JSON.stringify(data.dislikes) : null,
      sampleInteraction: data.sampleInteraction ? JSON.stringify(data.sampleInteraction) : null,

      personalityTraits: JSON.stringify(data.personalityTraits),
      communicationStyle: data.communicationStyle,
      responsePatterns: data.responsePatterns ? JSON.stringify(data.responsePatterns) : null,
      activityLevel: data.activityLevel,
      activeHoursStart: data.activeHoursStart,
      activeHoursEnd: data.activeHoursEnd,
      dailyTokenBalance: 0,
      lastInteractionMap: null,
      siteReview: data.siteReview || null,
      siteRating: data.siteRating,
      promptStyleGuide: data.promptStyleGuide || null,
      commentTemplates: null,
      isActive: true,
      lastActiveAt: null,
      totalPostsMade: 0,
      totalCommentsMade: 0,
      totalFollowsGiven: 0,
      createdAt: now,
      updatedAt: now,
    };

    const persona = await createVirtualPersona(personaData);

    return respData({ persona, userId });
  } catch (e: any) {
    console.error('[API] Create virtual persona failed:', e);
    return respErr(e.message);
  }
}

// ============================================
// PATCH - 更新人格
// ============================================

export async function PATCH(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.write'))) {
      return respErr('Permission denied', 403);
    }

    const validation = await validateRequest(request, updatePersonaSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { id, ...updateData } = validation.data;

    // 转换 JSON 字段
    const dbData: Record<string, unknown> = { updatedAt: new Date() };

    if (updateData.displayName) dbData.displayName = updateData.displayName;
    if (updateData.username) dbData.username = updateData.username;
    if (updateData.primaryCategory) dbData.primaryCategory = updateData.primaryCategory;
    if (updateData.specialties) dbData.specialties = JSON.stringify(updateData.specialties);
    if (updateData.styleKeywords) dbData.styleKeywords = JSON.stringify(updateData.styleKeywords);

    // v2.0 新增：工作流相关字段
    if (updateData.workflowType) dbData.workflowType = updateData.workflowType;
    if (updateData.workflowDescription !== undefined) dbData.workflowDescription = updateData.workflowDescription || null;
    if (updateData.preferredTools) dbData.preferredTools = JSON.stringify(updateData.preferredTools);
    if (updateData.dislikes) dbData.dislikes = JSON.stringify(updateData.dislikes);
    if (updateData.sampleInteraction) dbData.sampleInteraction = JSON.stringify(updateData.sampleInteraction);

    if (updateData.personalityTraits) dbData.personalityTraits = JSON.stringify(updateData.personalityTraits);
    if (updateData.communicationStyle) dbData.communicationStyle = updateData.communicationStyle;
    if (updateData.responsePatterns) dbData.responsePatterns = JSON.stringify(updateData.responsePatterns);
    if (updateData.activityLevel) dbData.activityLevel = updateData.activityLevel;
    if (updateData.activeHoursStart !== undefined) dbData.activeHoursStart = updateData.activeHoursStart;
    if (updateData.activeHoursEnd !== undefined) dbData.activeHoursEnd = updateData.activeHoursEnd;
    if (updateData.promptStyleGuide) dbData.promptStyleGuide = updateData.promptStyleGuide;
    if (updateData.siteReview) dbData.siteReview = updateData.siteReview;
    if (updateData.siteRating !== undefined) dbData.siteRating = updateData.siteRating;
    if (updateData.isActive !== undefined) dbData.isActive = updateData.isActive;

    const persona = await updateVirtualPersonaById(id, dbData);

    return respData({ persona });
  } catch (e: any) {
    console.error('[API] Update virtual persona failed:', e);
    return respErr(e.message);
  }
}

// ============================================
// DELETE - 删除人格
// ============================================

export async function DELETE(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.write'))) {
      return respErr('Permission denied', 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return respErr('Missing persona id');
    }

    await deleteVirtualPersonaById(id);

    return respOk();
  } catch (e: any) {
    console.error('[API] Delete virtual persona failed:', e);
    return respErr(e.message);
  }
}
