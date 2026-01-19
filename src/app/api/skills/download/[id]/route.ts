/**
 * GET /api/skills/download/[id]
 *
 * 代理下载 Skill ZIP 文件，设置正确的 Content-Disposition header
 * 触发浏览器"另存为"对话框
 */

import { getAntigravitySkillById } from '@/shared/models/antigravity_skill';
import { respErr } from '@/shared/lib/resp';
import { checkRateLimit, getClientIP } from '@/shared/lib/rate-limit';
import { getUserInfo } from '@/shared/models/user';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 限流检查（游客 3次/天，登录用户 20次/小时）
    const ip = getClientIP(request);
    const user = await getUserInfo().catch(() => null);

    const identifier = user ? `user:${user.id}` : `ip:${ip}`;
    const limit = user ? 20 : 3;
    const window = user ? 3600 : 86400;

    const { success: rateLimitOk } = await checkRateLimit(
      `skill:download:${identifier}`,
      limit,
      window
    );

    if (!rateLimitOk) {
      if (!user) {
        return respErr('Daily download limit reached. Sign in for more downloads!', 429);
      } else {
        return respErr("You've been busy! Take a short break and try again in an hour.", 429);
      }
    }

    // 2. 获取 Skill 信息
    const skill = await getAntigravitySkillById(id);
    if (!skill) {
      return respErr('Skill not found', 404);
    }

    if (!skill.zipUrl) {
      return respErr('No download available for this skill', 404);
    }

    // 3. 从 R2 获取文件
    const response = await fetch(skill.zipUrl);
    if (!response.ok) {
      return respErr('Failed to fetch file from storage', 500);
    }

    // 4. 生成安全的文件名
    const fileName = (skill.name || 'skill').replace(/[^a-zA-Z0-9-_]/g, '-');

    // 5. 返回文件，设置 Content-Disposition 触发"另存为"
    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}.zip"`,
        'Content-Length': response.headers.get('Content-Length') || '',
      },
    });
  } catch (e: any) {
    console.error('[API] skills/download error:', e);
    return respErr(e.message || 'Download failed', 500);
  }
}
