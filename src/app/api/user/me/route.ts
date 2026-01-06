/**
 * API: 获取当前用户信息
 * GET /api/user/me
 */

import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserInfo();

    if (!currentUser) {
      return respErr('Not authenticated');
    }

    return respData({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      image: currentUser.image,
      isVirtual: (currentUser as any).isVirtual || false,
      _isImpersonating: (currentUser as any)._isImpersonating || false,
      _originalUsername: (currentUser as any)._originalUsername || null,
    });
  } catch (error: any) {
    console.error('[/api/user/me] Error:', error);
    return respErr(error.message);
  }
}
