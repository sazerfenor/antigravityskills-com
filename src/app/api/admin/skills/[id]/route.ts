/**
 * DELETE /api/admin/skills/[id] - 彻底删除 Skill
 * PATCH /api/admin/skills/[id] - 更新 Skill 状态（上架/下架）
 */

import { sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { communityPost } from '@/config/db/schema.sqlite';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  getAntigravitySkillById,
  deleteAntigravitySkill,
  deleteConversionHistoryBySkillId,
  updateAntigravitySkillStatus,
} from '@/shared/models/antigravity_skill';
import { getStorageService } from '@/shared/services/storage';
import { cleanSlugText } from '@/shared/lib/seo-slug-generator';

// ============================================
// DELETE - 彻底删除 Skill
// ============================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 权限检查
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    const { id } = await params;

    // 2. 查找 Skill
    const skill = await getAntigravitySkillById(id);
    if (!skill) {
      return respErr('Skill not found', 404);
    }

    console.log('[API] Deleting skill:', { id, name: skill.name, zipUrl: skill.zipUrl });

    // 3. 删除 R2 文件（如果有）
    if (skill.zipUrl) {
      try {
        const storageService = await getStorageService();
        const provider = storageService.getDefaultProvider();

        if (provider && 'deleteFile' in provider && typeof provider.deleteFile === 'function') {
          // 从 URL 提取 key
          const url = new URL(skill.zipUrl);
          const key = url.pathname.slice(1); // 移除开头的 /

          await provider.deleteFile(key);
          console.log('[API] R2 file deleted:', key);
        }
      } catch (e: any) {
        // R2 删除失败不影响数据库删除
        console.error('[API] Failed to delete R2 file:', e.message);
      }
    }

    // 4. 删除关联的 community_post（通过 seoSlug 前缀匹配）
    try {
      const namePart = cleanSlugText(skill.name);
      const slugPattern = `skill-${namePart}-%`;
      await db()
        .delete(communityPost)
        .where(sql`${communityPost.seoSlug} LIKE ${slugPattern}`);

      console.log('[API] Related community_post deleted with pattern:', slugPattern);
    } catch (e: any) {
      console.error('[API] Failed to delete community_post:', e.message);
    }

    // 5. 删除转换历史
    await deleteConversionHistoryBySkillId(id);
    console.log('[API] Conversion history deleted');

    // 6. 删除 Skill 主记录
    await deleteAntigravitySkill(id);
    console.log('[API] Skill deleted successfully');

    return respData({
      success: true,
      message: `Skill "${skill.name}" deleted completely`,
      deletedItems: {
        skill: true,
        conversionHistory: true,
        r2File: !!skill.zipUrl,
        communityPost: true,
      },
    });
  } catch (e: any) {
    console.error('[API] admin/skills/[id] DELETE error:', e);
    return respErr(e.message || 'Internal server error', 500);
  }
}

// ============================================
// PATCH - 更新 Skill 状态
// ============================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 权限检查
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    const { id } = await params;

    // 2. 解析请求体
    const body = await request.json() as { status?: string };
    const { status } = body;

    if (!status || !['published', 'draft', 'deleted'].includes(status)) {
      return respErr('Invalid status. Must be: published, draft, or deleted', 400);
    }

    // 3. 查找 Skill
    const skill = await getAntigravitySkillById(id);
    if (!skill) {
      return respErr('Skill not found', 404);
    }

    // 4. 更新状态
    const updatedSkill = await updateAntigravitySkillStatus(id, status);

    console.log('[API] Skill status updated:', { id, name: skill.name, oldStatus: skill.status, newStatus: status });

    return respData({
      success: true,
      skill: updatedSkill,
      message: `Skill "${skill.name}" status changed to ${status}`,
    });
  } catch (e: any) {
    console.error('[API] admin/skills/[id] PATCH error:', e);
    return respErr(e.message || 'Internal server error', 500);
  }
}
