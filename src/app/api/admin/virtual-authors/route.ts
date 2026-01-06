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
import { user } from '@/config/db/schema';
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

    // 从数据库获取所有虚拟作者
    const virtualAuthors = await db()
      .select({
        id: user.id,
        displayName: user.name,
        username: user.email, // 从 email 提取 username
        bio: user.bio,
        isVirtual: user.isVirtual,
      })
      .from(user)
      .where(eq(user.isVirtual, true));

    // 格式化数据
    const formattedAuthors = virtualAuthors.map(author => ({
      id: author.id,
      displayName: author.displayName,
      // 从 email 提取 username: virtual+{username}@... -> username
      username: author.username?.replace('virtual+', '').split('@')[0] || author.displayName.toLowerCase().replace(/\s+/g, '_'),
      bio: author.bio || '',
      category: '', // 从数据库没有存储这个，可以忽略
      tags: [],
      matchedPromptIds: [], // 需要从映射文件获取
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
