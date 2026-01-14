/**
 * API: 获取虚拟作者列表
 * GET /api/admin/virtual-authors
 * 
 * Security:
 * - Auth required
 * - Admin or Super Admin role required
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { db } from '@/core/db';
import { user, virtualPersona } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { getSignUser } from '@/shared/models/user';
import { hasAnyRole, ROLES } from '@/shared/services/rbac';

export async function GET(request: NextRequest) {
  try {
    // 1. 获取真实登录用户
    const currentUser = await getSignUser();
    if (!currentUser) {
      return respErr('Not authenticated', 401);
    }

    // 2. 验证管理员权限
    const isAdmin = await hasAnyRole(currentUser.id, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!isAdmin) {
      console.warn(`[Virtual Authors] Permission denied for user ${currentUser.id}`);
      return respErr('Admin permission required', 403);
    }

    // 从数据库获取所有虚拟作者，JOIN virtual_persona 获取完整信息
    const virtualAuthors = await db()
      .select({
        id: user.id,
        username: user.name,  // 只用 name 作为用户名
        bio: user.bio,
        image: user.image,
        // 从 virtual_persona 获取完整信息
        category: virtualPersona.primaryCategory,
        specialties: virtualPersona.specialties,
        styleKeywords: virtualPersona.styleKeywords,
        workflowType: virtualPersona.workflowType,
        workflowDescription: virtualPersona.workflowDescription,
        preferredTools: virtualPersona.preferredTools,
        dislikes: virtualPersona.dislikes,
        personalityTraits: virtualPersona.personalityTraits,
        communicationStyle: virtualPersona.communicationStyle,
        activityLevel: virtualPersona.activityLevel,
      })
      .from(user)
      .leftJoin(virtualPersona, eq(user.id, virtualPersona.userId))
      .where(eq(user.isVirtual, true));

    // 格式化数据，解析 JSON 字段
    const formattedAuthors = virtualAuthors.map((author: any) => ({
      id: author.id,
      username: author.username || '',
      bio: author.bio || '',
      category: author.category || '',
      image: author.image || undefined,
      // 解析 JSON 字段
      specialties: author.specialties ? JSON.parse(author.specialties) : [],
      styleKeywords: author.styleKeywords ? JSON.parse(author.styleKeywords) : [],
      workflowType: author.workflowType || 'pure_ai',
      workflowDescription: author.workflowDescription || '',
      preferredTools: author.preferredTools ? JSON.parse(author.preferredTools) : [],
      dislikes: author.dislikes ? JSON.parse(author.dislikes) : [],
      personalityTraits: author.personalityTraits ? JSON.parse(author.personalityTraits) : null,
      communicationStyle: author.communicationStyle || 'casual',
      activityLevel: author.activityLevel || 'moderate',
    }));

    return respData({
      virtualAuthors: formattedAuthors,
      count: formattedAuthors.length,
    });
  } catch (error: any) {
    console.error('[/api/admin/virtual-authors] Error:', error);
    return respErr(error.message);
  }
}
