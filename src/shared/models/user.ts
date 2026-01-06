import { headers, cookies } from 'next/headers';
import { and, count, desc, eq, inArray } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';

import { Permission, Role } from '../services/rbac';
import { getRemainingCredits } from './credit';

export interface UserCredits {
  remainingCredits: number;
  expiresAt: Date | null;
}

export type User = typeof user.$inferSelect & {
  isAdmin?: boolean;
  credits?: UserCredits;
  roles?: Role[];
  permissions?: Permission[];
};
export type NewUser = typeof user.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt' | 'email'>>;

export async function updateUser(userId: string, updatedUser: UpdateUser) {
  const [result] = await db()
    .update(user)
    .set(updatedUser)
    .where(eq(user.id, userId))
    .returning();

  return result;
}

export async function findUserById(userId: string) {
  const [result] = await db().select().from(user).where(eq(user.id, userId));

  return result;
}

export async function getUsers({
  page = 1,
  limit = 30,
  email,
  isVirtual,
}: {
  email?: string;
  page?: number;
  limit?: number;
  isVirtual?: boolean;
} = {}): Promise<User[]> {
  const conditions = [];
  if (email) conditions.push(eq(user.email, email));
  if (isVirtual !== undefined) conditions.push(eq(user.isVirtual, isVirtual));
  
  const result = await db()
    .select()
    .from(user)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getUsersCount({ email, isVirtual }: { email?: string; isVirtual?: boolean }) {
  const conditions = [];
  if (email) conditions.push(eq(user.email, email));
  if (isVirtual !== undefined) conditions.push(eq(user.isVirtual, isVirtual));
  
  const [result] = await db()
    .select({ count: count() })
    .from(user)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return result?.count || 0;
}

export async function getUserByUserIds(userIds: string[]) {
  const result = await db()
    .select()
    .from(user)
    .where(inArray(user.id, userIds));

  return result;
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;

  const [row] = await db()
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  return !!row?.emailVerified;
}

export async function getUserInfo() {
  // 1. 检查是否在模拟模式
  const cookieStore = await cookies();
  const impersonationCookie = cookieStore.get('impersonation');
  
  if (impersonationCookie) {
    try {
      const impersonationData = JSON.parse(impersonationCookie.value);
      
      // 2. 安全验证：获取真实 session 用户，确认是发起模拟的管理员
      // 这是关键的安全检查，防止：
      // - 退出登录后 cookie 残留导致的认证问题
      // - 其他用户获取到 cookie 后的劫持攻击
      const sessionUser = await getSignUser();
      
      if (!sessionUser) {
        // 用户已退出登录，清除无效的 impersonation cookie
        console.log('[getUserInfo] No session, clearing orphaned impersonation cookie');
        cookieStore.delete('impersonation');
        return null;
      }
      
      if (sessionUser.id !== impersonationData.originalUserId) {
        // 当前登录用户不是发起模拟的管理员，清除无效 cookie
        console.warn('[getUserInfo] Session mismatch, clearing impersonation cookie. Expected:', impersonationData.originalUserId, 'Got:', sessionUser.id);
        cookieStore.delete('impersonation');
        return sessionUser;
      }
      
      // 3. Session 验证通过，获取被模拟的用户信息
      const [targetUser] = await db()
        .select()
        .from(user)
        .where(eq(user.id, impersonationData.targetUserId))
        .limit(1);
      
      if (targetUser) {
        console.log('[Impersonate] Active:', targetUser.name);
        return {
          ...targetUser,
          _impersonatedBy: impersonationData.originalUserId,
          _isImpersonating: true,
          _originalUsername: impersonationData.originalUsername,
        };
      }
      
      // 目标用户不存在，清除无效 cookie
      console.warn('[getUserInfo] Target user not found, clearing impersonation cookie');
      cookieStore.delete('impersonation');
      return sessionUser;
    } catch (error) {
      console.error('[Impersonate] Error:', error);
      // 出错则清除 cookie 并继续正常流程
      cookieStore.delete('impersonation');
    }
  }

  // 4. 没有模拟状态，正常获取当前登录用户
  const signUser = await getSignUser();

  return signUser;
}

export async function getUserCredits(userId: string) {
  const remainingCredits = await getRemainingCredits(userId);

  return { remainingCredits };
}

export async function isPaidUser(userId: string): Promise<boolean> {
  const credits = await getRemainingCredits(userId);
  return credits > 10;
}

export async function getSignUser() {
  const headersList = await headers();
  
  // Try to get cached session first
  try {
    const { getCachedSession, setCachedSession, getSessionTokenFromCookie } = await import('@/core/auth/session-cache');
    const cookieHeader = headersList.get('cookie');
    const token = getSessionTokenFromCookie(cookieHeader);
    
    if (token) {
      // Check KV cache first
      const cachedSession = await getCachedSession(token);
      if (cachedSession) {
        return {
          id: cachedSession.userId,
          email: cachedSession.email,
          name: cachedSession.name,
          image: cachedSession.image,
          emailVerified: cachedSession.emailVerified,
        };
      }
    }
    
    // Cache miss - query database
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    
    // Cache the result for next time
    if (session?.user && token) {
      await setCachedSession(token, session.user as any);
    }
    
    return session?.user;
  } catch (error: any) {
    console.error('[getSignUser] Error with session cache, falling back:', error.message);
    // Fallback to direct database query
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session?.user;
  }
}

export async function appendUserToResult(result: any) {
  if (!result || !result.length) {
    return result;
  }

  const userIds = result.map((item: any) => item.userId);
  const users = await getUserByUserIds(userIds);
  result = result.map((item: any) => {
    const user = users.find((user: any) => user.id === item.userId);
    return { ...item, user };
  });

  return result;
}
