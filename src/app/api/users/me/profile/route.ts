import { NextRequest } from 'next/server';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/users/me/profile
 * Get current user's profile
 */
export async function GET() {
  try {
    const currentUser = await getUserInfo();
    if (!currentUser) {
      return respErr('Unauthorized', 401);
    }

    const [profile] = await db()
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        bio: user.bio,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, currentUser.id))
      .limit(1);

    return respData(profile);
  } catch (error: any) {
    console.error('[GET me/profile] Error:', error);
    return respErr(error.message);
  }
}

/**
 * PATCH /api/users/me/profile
 * Update current user's profile (bio, name)
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getUserInfo();
    if (!currentUser) {
      return respErr('Unauthorized', 401);
    }

    const body = await request.json() as { bio?: string; name?: string };
    const { bio, name } = body;

    // Validate bio length
    if (bio !== undefined && bio.length > 500) {
      return respErr('Bio must be 500 characters or less');
    }

    // Validate name
    if (name !== undefined && (name.length < 1 || name.length > 50)) {
      return respErr('Name must be between 1 and 50 characters');
    }

    // Build update object
    const updates: { bio?: string; name?: string } = {};
    if (bio !== undefined) updates.bio = bio;
    if (name !== undefined) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return respErr('No valid fields to update');
    }

    // Update user
    await db()
      .update(user)
      .set(updates)
      .where(eq(user.id, currentUser.id));

    return respData({ success: true });
  } catch (error: any) {
    console.error('[PATCH me/profile] Error:', error);
    return respErr(error.message);
  }
}
