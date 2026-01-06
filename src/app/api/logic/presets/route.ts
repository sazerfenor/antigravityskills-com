/**
 * Vision-Logic 预设/模板 API
 *
 * GET /api/logic/presets - 获取预设列表
 * POST /api/logic/presets - 保存用户模板
 */

import { NextRequest } from 'next/server';

import { getUserInfo } from '@/shared/models/user';
import {
  getSystemPresets,
  getUserPresets,
  createPreset,
  generateUserPresetSlug,
  type PresetListItem,
} from '@/shared/models/preset';
import { respData, respErr } from '@/shared/lib/resp';

// 预设响应类型
interface PresetsResponse {
  system: PresetListItem[];
  user: PresetListItem[];
}

// 系统预设缓存（内存缓存，5分钟过期）
let systemPresetsCache: PresetListItem[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/logic/presets
 * 获取系统预设和用户模板列表
 *
 * 优化：
 * 1. 系统预设使用内存缓存
 * 2. 仅当需要用户模板时才验证 session
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    // 1. 获取系统预设（使用缓存）
    const now = Date.now();
    if (!systemPresetsCache || now - cacheTime > CACHE_TTL) {
      systemPresetsCache = await getSystemPresets();
      cacheTime = now;
    }

    // 2. 检查是否需要用户模板
    const includeUser = request.nextUrl.searchParams.get('include_user') === 'true';

    let userTemplates: PresetListItem[] = [];
    if (includeUser) {
      const user = await getUserInfo();
      if (user) {
        userTemplates = await getUserPresets(user.id);
      }
    }

    const response: PresetsResponse = {
      system: systemPresetsCache,
      user: userTemplates,
    };

    return respData(response);
  } catch (error) {
    console.error('[GET /api/logic/presets] Error:', error);
    return respErr('Failed to fetch presets');
  }
}

/**
 * POST /api/logic/presets
 * 保存当前 VisionLogic 状态为用户模板
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('Unauthorized', 401);
    }

    const body = await request.json() as {
      name?: string;
      params?: Record<string, unknown>;
      imageUrl?: string;
      thumbnailUrl?: string;
      category?: string;
    };
    const { name, params, imageUrl, thumbnailUrl, category } = body;

    if (!name || !params) {
      return respErr('Name and params are required');
    }

    // 生成唯一 slug
    const slug = await generateUserPresetSlug(user.id, name);

    // 创建用户模板
    const result = await createPreset({
      slug,
      name,
      category,
      type: 'user',
      userId: user.id,
      params,
      imageUrl,
      thumbnailUrl,
    });

    return respData(result);
  } catch (error) {
    console.error('[POST /api/logic/presets] Error:', error);
    return respErr('Failed to save template');
  }
}
