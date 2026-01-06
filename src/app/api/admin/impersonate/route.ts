/**
 * Admin API: 切换到虚拟作者账号
 * POST /api/admin/impersonate
 * 
 * Security:
 * - Auth required (must be real session user, not impersonated)
 * - Admin or Super Admin role required
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { getSignUser } from '@/shared/models/user';
import { hasAnyRole, ROLES } from '@/shared/services/rbac';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // 1. 获取真实登录用户（不是被模拟用户）
    // 重要：使用 getSignUser 而非 getUserInfo，避免在模拟状态下误判权限
    const currentUser = await getSignUser();
    if (!currentUser) {
      return respErr('Not authenticated', 401);
    }

    // 2. 验证管理员权限
    const isAdmin = await hasAnyRole(currentUser.id, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!isAdmin) {
      console.warn(`[Impersonate] Permission denied for user ${currentUser.id} (${currentUser.email})`);
      return respErr('Admin permission required', 403);
    }

    const body = await request.json() as any;
    const { targetUsername } = body;

    if (!targetUsername) {
      throw new Error('Missing targetUsername');
    }

    console.log('[Impersonate] Looking for username:', targetUsername);

    // 3. 查询目标用户 (通过 email 中的 username 部分匹配)
    const virtualUsers = await db()
      .select()
      .from(user)
      .where(eq(user.isVirtual, true));

    // 从 email 中提取 username 进行匹配
    // 前端发送的 username 格式是: email.split('@')[0] (不含 virtual+ 前缀)
    const targetUser = virtualUsers.find(u => {
      // 从 email 提取 username: neko.mancer.art@gmail.com -> neko.mancer.art
      const emailUsername = u.email.split('@')[0].replace('virtual+', '');
      console.log('[Impersonate] Checking:', emailUsername, 'vs', targetUsername);
      return emailUsername === targetUsername;
    });

    if (!targetUser) {
      console.log('[Impersonate] Available users:', virtualUsers.map(u => u.email.split('@')[0]));
      throw new Error(`Virtual user ${targetUsername} not found`);
    }

    // 4. 创建 impersonation session
    const impersonationData = {
      originalUserId: currentUser.id,
      originalUsername: currentUser.name,
      targetUserId: targetUser.id,
      targetUsername: targetUser.email.split('@')[0],
      targetDisplayName: targetUser.name,
      isVirtual: targetUser.isVirtual || false,
      startedAt: new Date().toISOString(),
    };

    // 5. 存储到 cookie (path: '/' 确保全站可用)
    const cookieStore = await cookies();
    cookieStore.set('impersonation', JSON.stringify(impersonationData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24小时
    });

    console.log('[Impersonate] Admin', currentUser.name, '→', targetUser.name);

    return respData({
      success: true,
      impersonating: targetUser.email.split('@')[0],
      displayName: targetUser.name,
      isVirtual: targetUser.isVirtual,
      message: `已切换到 ${targetUser.name}`,
    });
  } catch (error: any) {
    console.error('[Impersonate] Error:', error);
    return respErr(error.message);
  }
}

/**
 * 退出模拟，回到原账号
 * DELETE /api/admin/impersonate
 * 
 * Security:
 * - 验证调用者是发起模拟的原始管理员
 * - 或者调用者有 admin 权限（允许任意管理员结束他人的模拟状态）
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get('impersonation');
    
    if (!impersonationCookie) {
      // 没有 impersonation cookie，可能是正常退出登录场景
      // 返回成功而不是错误，避免退出登录流程中断
      return respData({
        success: true,
        message: 'No active impersonation session',
      });
    }

    const impersonationData = JSON.parse(impersonationCookie.value);
    
    // 验证调用者身份（可选：如果有 session 则验证）
    const currentUser = await getSignUser();
    if (currentUser && currentUser.id !== impersonationData.originalUserId) {
      // 不是原始管理员，检查是否有 admin 权限
      const isAdmin = await hasAnyRole(currentUser.id, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
      if (!isAdmin) {
        console.warn(`[Impersonate Exit] Permission denied for user ${currentUser.id}`);
        return respErr('Permission denied: not the original admin', 403);
      }
    }

    // 删除 impersonation cookie
    cookieStore.delete('impersonation');

    console.log('[Impersonate] Exit:', impersonationData.targetDisplayName, '→', impersonationData.originalUsername);

    return respData({
      success: true,
      message: `已退出模拟，回到 ${impersonationData.originalUsername}`,
    });
  } catch (error: any) {
    console.error('[Impersonate Exit] Error:', error);
    return respErr(error.message);
  }
}
