/**
 * Prompt 队列管理 API
 *
 * @description 提供 Prompt 队列的 CRUD 操作和统计查询
 */

import { z } from 'zod';

import { respData, respErr, respOk } from '@/shared/lib/resp';
import { validateRequest } from '@/shared/lib/zod';
import { getUuid } from '@/shared/lib/hash';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
  createPromptQueueItems,
  deletePromptQueueItemById,
  getPromptQueuePaginated,
  getQueueStats,
  getQueueCategoryStats,
  updatePromptQueueItemById,
  cleanupFailedPrompts,
} from '@/shared/models/prompt_queue';
import type { PromptQueueStatus, PersonaCategory } from '@/shared/types/virtual-persona';

// ============================================
// Schema 定义
// ============================================

const getQueueSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['pending', 'assigned', 'processing', 'completed', 'failed']).optional(),
});

const createPromptsSchema = z.object({
  prompts: z.array(z.object({
    prompt: z.string().min(1).max(5000),
    category: z.enum(['photography', 'art-illustration', 'design', 'commercial-product', 'character-design']).optional(),
    priority: z.number().min(1).max(10).default(5),
    source: z.string().optional(),
  })).min(1).max(100),
});

const updatePromptSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'assigned', 'processing', 'completed', 'failed']).optional(),
  priority: z.number().min(1).max(10).optional(),
  category: z.enum(['photography', 'art-illustration', 'design', 'commercial-product', 'character-design']).optional().nullable(),
});

// ============================================
// GET - 获取队列列表 + 统计
// ============================================

export async function GET(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.read'))) {
      return respErr('Permission denied', 403);
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // 特殊处理：仅获取统计
    if (params.statsOnly === 'true') {
      const [stats, categoryStats] = await Promise.all([
        getQueueStats(),
        getQueueCategoryStats(),
      ]);

      return respData({
        stats,
        categoryStats,
      });
    }

    const validation = getQueueSchema.safeParse(params);
    if (!validation.success) {
      return respErr(`Invalid parameters: ${validation.error.message}`);
    }

    const { page, pageSize, status } = validation.data;

    const [items, stats] = await Promise.all([
      getPromptQueuePaginated({ page, pageSize, status: status as PromptQueueStatus | undefined }),
      getQueueStats(),
    ]);

    return respData({
      items,
      stats,
      pagination: {
        page,
        pageSize,
        total: stats.total,
        totalPages: Math.ceil(stats.total / pageSize),
      },
    });
  } catch (e: any) {
    console.error('[API] Get prompt queue failed:', e);
    return respErr(e.message);
  }
}

// ============================================
// POST - 批量创建 Prompts
// ============================================

export async function POST(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.write'))) {
      return respErr('Permission denied', 403);
    }

    const validation = await validateRequest(request, createPromptsSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { prompts } = validation.data;
    const now = new Date();

    const items = prompts.map((p) => ({
      id: getUuid(),
      prompt: p.prompt,
      category: p.category as PersonaCategory | undefined,
      priority: p.priority,
      source: p.source || 'admin',
      status: 'pending' as const,
      createdAt: now,
    }));

    const created = await createPromptQueueItems(items);

    return respData({
      created: created.length,
      items: created,
    });
  } catch (e: any) {
    console.error('[API] Create prompts failed:', e);
    return respErr(e.message);
  }
}

// ============================================
// PATCH - 更新单个 Prompt
// ============================================

export async function PATCH(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.write'))) {
      return respErr('Permission denied', 403);
    }

    const validation = await validateRequest(request, updatePromptSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { id, ...updateData } = validation.data;

    const item = await updatePromptQueueItemById(id, updateData);

    return respData({ item });
  } catch (e: any) {
    console.error('[API] Update prompt failed:', e);
    return respErr(e.message);
  }
}

// ============================================
// DELETE - 删除 Prompt 或清理失败任务
// ============================================

export async function DELETE(request: Request) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo) {
      return respErr('Unauthorized', 401);
    }

    if (!(await hasPermission(userInfo.id, 'admin.gallery.write'))) {
      return respErr('Permission denied', 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const cleanupDays = searchParams.get('cleanupDays');

    // 清理失败任务模式
    if (cleanupDays) {
      const days = parseInt(cleanupDays, 10);
      if (isNaN(days) || days < 1) {
        return respErr('Invalid cleanupDays parameter');
      }

      const deletedCount = await cleanupFailedPrompts(days);
      return respData({ deletedCount });
    }

    // 单个删除模式
    if (!id) {
      return respErr('Missing prompt id');
    }

    await deletePromptQueueItemById(id);

    return respOk();
  } catch (e: any) {
    console.error('[API] Delete prompt failed:', e);
    return respErr(e.message);
  }
}
