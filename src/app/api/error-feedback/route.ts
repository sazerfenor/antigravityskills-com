import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { errorReport } from '@/config/db/schema';
import { getUserInfo } from '@/shared/models/user';

/**
 * POST /api/error-feedback
 * 接收用户对错误的反馈
 */
export async function POST(req: Request) {
  try {
    const { errorId, userFeedback }: { errorId: string; userFeedback: string } =
      await req.json();

    if (!errorId || !userFeedback) {
      return new Response('Missing errorId or userFeedback', { status: 400 });
    }

    // 验证用户登录
    const user = await getUserInfo();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 查找错误报告
    const dbConn = db();
    const existingReport = await dbConn
      .select()
      .from(errorReport)
      .where(eq(errorReport.errorId, errorId))
      .limit(1);

    if (existingReport.length === 0) {
      return new Response('Error report not found', { status: 404 });
    }

    const report = existingReport[0];

    // 验证错误报告是否属于当前用户
    if (report.userId !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // 更新错误报告
    await dbConn
      .update(errorReport)
      .set({
        userFeedback,
        feedbackAt: new Date(),
        status: 'pending', // 重新标记为待处理
        updatedAt: new Date(),
      })
      .where(eq(errorReport.errorId, errorId));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feedback submitted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    console.error('Error feedback submission failed:', e);
    return new Response(e.message || 'Internal server error', { status: 500 });
  }
}
