/**
 * 站内通知服务
 * @description 提供发送通知、标记已读、获取未读数等功能
 */

import { db } from '@/core/db';
import { notification, user } from '@/config/db/schema';
import { eq, and, desc, sql, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// ==================== Types ====================

export enum NotificationType {
  COMMENT_REPLY = 'comment_reply',
  POST_COMMENT = 'post_comment',
  POST_LIKE = 'post_like',
  NEW_FOLLOWER = 'new_follower',
  SYSTEM_ANNOUNCE = 'system_announce',
  PAYMENT_SUCCESS = 'payment_success',
  SUBSCRIPTION_UPDATE = 'subscription_update',
}

// 支付类通知类型（不过期）
const PERMANENT_TYPES = [
  NotificationType.PAYMENT_SUCCESS,
  NotificationType.SUBSCRIPTION_UPDATE,
];

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  actorId?: string;
  resourceId?: string;
  resourceType?: 'post' | 'comment' | 'order';
  link?: string; // 完整跳转链接
  previewText?: string;
}

// ==================== KV Cache ====================

const UNREAD_KEY_PREFIX = 'notif:unread:';

function getSessionKV(): KVNamespace | null {
  try {
    const { env } = getCloudflareContext();
    return env.SESSION_KV;
  } catch {
    return null;
  }
}

/**
 * 获取未读数（KV 缓存优先）
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const kv = getSessionKV();
  const key = `${UNREAD_KEY_PREFIX}${userId}`;

  if (kv) {
    const cached = await kv.get(key);
    if (cached !== null) {
      return parseInt(cached, 10);
    }
  }

  // KV 未命中，查询数据库
  const result = await db()
    .select({ count: sql<number>`count(*)` })
    .from(notification)
    .where(
      and(
        eq(notification.userId, userId),
        eq(notification.isRead, false)
      )
    );

  const count = result[0]?.count || 0;

  // 写入 KV 缓存
  if (kv) {
    await kv.put(key, String(count), { expirationTtl: 3600 });
  }

  return count;
}

/**
 * 增加未读数（KV 缓存）
 */
async function incrementUnreadCount(userId: string): Promise<void> {
  const kv = getSessionKV();
  if (!kv) return;

  const key = `${UNREAD_KEY_PREFIX}${userId}`;
  const current = await kv.get(key);
  const newCount = current ? parseInt(current, 10) + 1 : 1;
  await kv.put(key, String(newCount), { expirationTtl: 3600 });
}

/**
 * 清空未读数缓存
 */
async function clearUnreadCache(userId: string): Promise<void> {
  const kv = getSessionKV();
  if (kv) {
    await kv.delete(`${UNREAD_KEY_PREFIX}${userId}`);
  }
}

// ==================== Core Functions ====================

/**
 * 发送通知
 * @description 自动处理：禁止通知自己、支付类通知不过期
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // 边界条件：不通知自己
  if (payload.actorId && payload.actorId === payload.userId) {
    return;
  }

  const isPermanent = PERMANENT_TYPES.includes(payload.type);

  await db().insert(notification).values({
    id: nanoid(),
    userId: payload.userId,
    type: payload.type,
    actorId: payload.actorId || null,
    resourceId: payload.resourceId || null,
    resourceType: payload.resourceType || null,
    link: payload.link || null,
    previewText: payload.previewText || null,
    isRead: false,
    isRecalled: false,
    isPermanent,
    createdAt: new Date(),
  });

  // 更新 KV 未读数
  await incrementUnreadCount(payload.userId);

  console.log(`[Notification] Sent ${payload.type} to user ${payload.userId}`);
}

/**
 * 群发公告（管理员）
 */
export async function broadcastAnnouncement(previewText: string): Promise<number> {
  // 获取所有用户 ID
  const users = await db()
    .select({ id: user.id })
    .from(user);

  // 批量插入通知
  const notifications = users.map((u) => ({
    id: nanoid(),
    userId: u.id,
    type: NotificationType.SYSTEM_ANNOUNCE,
    actorId: null,
    resourceId: null,
    resourceType: null,
    link: null,
    previewText,
    isRead: false,
    isRecalled: false,
    isPermanent: false,
    createdAt: new Date(),
  }));

  if (notifications.length > 0) {
    await db().insert(notification).values(notifications);
  }

  console.log(`[Notification] Broadcast to ${notifications.length} users`);
  return notifications.length;
}

/**
 * 标记已读
 */
export async function markAsRead(userId: string, notificationId?: string): Promise<void> {
  if (notificationId) {
    // 标记单条已读
    await db()
      .update(notification)
      .set({ isRead: true })
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.userId, userId)
        )
      );
  } else {
    // 全部标记已读
    await db()
      .update(notification)
      .set({ isRead: true })
      .where(eq(notification.userId, userId));
  }

  // 清空缓存
  await clearUnreadCache(userId);
}

/**
 * 删除通知
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  const result = await db()
    .select({ isRead: notification.isRead })
    .from(notification)
    .where(
      and(
        eq(notification.id, notificationId),
        eq(notification.userId, userId)
      )
    )
    .limit(1);

  await db()
    .delete(notification)
    .where(
      and(
        eq(notification.id, notificationId),
        eq(notification.userId, userId)
      )
    );

  // 如果删除的是未读通知，清空缓存
  if (result[0] && !result[0].isRead) {
    await clearUnreadCache(userId);
  }
}

/**
 * 清理过期通知（30天前的已读非永久通知）
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db()
    .delete(notification)
    .where(
      and(
        eq(notification.isRead, true),
        eq(notification.isPermanent, false),
        lt(notification.createdAt, thirtyDaysAgo)
      )
    )
    .returning();

  console.log(`[Notification] Cleaned up ${result.length} expired notifications`);
  return result.length;
}

/**
 * 获取通知列表
 */
export async function getNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  notifications: any[];
  total: number;
  hasMore: boolean;
}> {
  const offset = (page - 1) * limit;

  const [notifications, countResult] = await Promise.all([
    db()
      .select({
        id: notification.id,
        type: notification.type,
        actorId: notification.actorId,
        resourceId: notification.resourceId,
        resourceType: notification.resourceType,
        link: notification.link,
        previewText: notification.previewText,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        actor: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
      })
      .from(notification)
      .leftJoin(user, eq(notification.actorId, user.id))
      .where(and(
        eq(notification.userId, userId),
        eq(notification.isRecalled, false)
      ))
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset),
    db()
      .select({ count: sql<number>`count(*)` })
      .from(notification)
      .where(and(
        eq(notification.userId, userId),
        eq(notification.isRecalled, false)
      )),
  ]);

  const total = countResult[0]?.count || 0;

  return {
    notifications,
    total,
    hasMore: offset + notifications.length < total,
  };
}

// ==================== Admin Functions ====================

export type UserFilter = 'all' | 'subscriber' | 'creator' | 'admin';

/**
 * 管理员发送通知（支持批量、单个、按类型）
 */
export async function sendToUsers(params: {
  userIds?: string[];        // 指定用户 ID 列表
  userFilter?: UserFilter;   // 按用户类型筛选
  message: string;
  link?: string;
}): Promise<{ sentCount: number; batchId: string }> {
  const batchId = nanoid();
  
  let targetUsers: { id: string }[] = [];
  
  if (params.userIds && params.userIds.length > 0) {
    // 指定用户
    targetUsers = params.userIds.map(id => ({ id }));
  } else {
    // 按类型筛选
    let query = db().select({ id: user.id }).from(user);
    
    // TODO: 根据实际业务需求添加筛选逻辑
    // 例如：subscriber 可以根据 subscription 表筛选
    // creator 可以根据发帖数量筛选
    // admin 可以根据 user_permission 表筛选
    
    targetUsers = await query;
  }

  if (targetUsers.length === 0) {
    return { sentCount: 0, batchId };
  }

  const notifications = targetUsers.map((u) => ({
    id: nanoid(),
    userId: u.id,
    type: NotificationType.SYSTEM_ANNOUNCE,
    actorId: null,
    resourceId: batchId, // 使用 batchId 关联同一批次
    resourceType: 'batch' as const,
    link: params.link || null,
    previewText: params.message,
    isRead: false,
    isRecalled: false,
    isPermanent: false,
    createdAt: new Date(),
  }));

  // 批量插入
  await db().insert(notification).values(notifications);

  console.log(`[Notification] Admin sent to ${notifications.length} users, batchId: ${batchId}`);
  return { sentCount: notifications.length, batchId };
}

/**
 * 撤回通知（软删除）
 */
export async function recallNotification(notificationId: string): Promise<number> {
  const result = await db()
    .update(notification)
    .set({ isRecalled: true })
    .where(eq(notification.id, notificationId))
    .returning();

  console.log(`[Notification] Recalled notification ${notificationId}`);
  return result.length;
}

/**
 * 批量撤回通知（按 batchId）
 */
export async function recallBatch(batchId: string): Promise<number> {
  const result = await db()
    .update(notification)
    .set({ isRecalled: true })
    .where(eq(notification.resourceId, batchId))
    .returning();

  console.log(`[Notification] Recalled batch ${batchId}, affected: ${result.length}`);
  return result.length;
}

/**
 * 获取管理员发送历史（用于后台管理）
 */
export async function getAdminNotificationHistory(
  page: number = 1,
  limit: number = 20
): Promise<{
  notifications: any[];
  total: number;
  hasMore: boolean;
}> {
  const offset = (page - 1) * limit;

  // 按 batchId 分组，获取每批次的发送信息
  const [batches, countResult] = await Promise.all([
    db()
      .select({
        batchId: notification.resourceId,
        previewText: notification.previewText,
        link: notification.link,
        createdAt: notification.createdAt,
        isRecalled: notification.isRecalled,
        count: sql<number>`count(*)`,
      })
      .from(notification)
      .where(
        and(
          eq(notification.type, NotificationType.SYSTEM_ANNOUNCE),
          eq(notification.resourceType, 'batch')
        )
      )
      .groupBy(
        notification.resourceId,
        notification.previewText,
        notification.link,
        notification.createdAt,
        notification.isRecalled
      )
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset),
    db()
      .select({ count: sql<number>`count(distinct ${notification.resourceId})` })
      .from(notification)
      .where(
        and(
          eq(notification.type, NotificationType.SYSTEM_ANNOUNCE),
          eq(notification.resourceType, 'batch')
        )
      ),
  ]);

  const total = countResult[0]?.count || 0;

  return {
    notifications: batches,
    total,
    hasMore: offset + batches.length < total,
  };
}

