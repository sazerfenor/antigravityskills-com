/**
 * Vision-Logic 预设/模板单项 API
 *
 * GET /api/logic/presets/[id] - 获取单个预设详情
 * DELETE /api/logic/presets/[id] - 删除用户模板
 */

import { getUserInfo } from '@/shared/models/user';
import { getPresetByIdOrSlug, deleteUserPreset } from '@/shared/models/preset';
import { respData, respErr, respOk } from '@/shared/lib/resp';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/logic/presets/[id]
 * 获取单个预设的完整数据（用于应用预设）
 * 支持通过 id 或 slug 查询
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { id } = await params;

    const preset = await getPresetByIdOrSlug(id);

    if (!preset) {
      return respErr('Preset not found', 404);
    }

    return respData({
      id: preset.id,
      slug: preset.slug,
      name: preset.name,
      category: preset.category,
      thumbnailUrl: preset.thumbnailUrl,
      imageUrl: preset.imageUrl,
      params: preset.params,
      isSystem: preset.type === 'system',
    });
  } catch (error) {
    console.error('[GET /api/logic/presets/[id]] Error:', error);
    return respErr('Failed to fetch preset');
  }
}

/**
 * DELETE /api/logic/presets/[id]
 * 删除用户模板（只能删除自己的模板）
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<Response> {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    const { id } = await params;

    // 先查找预设
    const preset = await getPresetByIdOrSlug(id);

    if (!preset) {
      return respErr('Template not found', 404);
    }

    // 检查是否是系统预设（不允许删除）
    if (preset.type === 'system') {
      return respErr('Cannot delete system preset', 403);
    }

    // 检查是否是自己的模板
    if (preset.userId !== user.id) {
      return respErr('Permission denied', 403);
    }

    // 删除模板
    const deleted = await deleteUserPreset(preset.id, user.id);

    if (!deleted) {
      return respErr('Failed to delete template');
    }

    return respOk();
  } catch (error) {
    console.error('[DELETE /api/logic/presets/[id]] Error:', error);
    return respErr('Failed to delete template');
  }
}
