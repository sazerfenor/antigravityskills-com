'use client';

import { useEffect, useState } from 'react';
import { Bell, MessageCircle, Heart, UserPlus, Megaphone, Trash2, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Link } from '@/core/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  previewText: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
  actor?: {
    id: string;
    name: string;
    image: string;
  };
  resourceId?: string;
  resourceType?: string;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  comment_reply: <MessageCircle className="size-4" />,
  post_comment: <MessageCircle className="size-4" />,
  post_like: <Heart className="size-4 text-red-500" />,
  new_follower: <UserPlus className="size-4 text-blue-500" />,
  system_announce: <Megaphone className="size-4 text-yellow-500" />,
};

const NOTIFICATION_LABELS: Record<string, string> = {
  comment_reply: 'replied to your comment',
  post_comment: 'commented on your post',
  post_like: 'liked your post',
  new_follower: 'followed you',
  system_announce: 'System announcement',
};

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface NotificationListResponse {
  notifications: NotificationItem[];
  hasMore: boolean;
  total: number;
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // 加载通知
  async function fetchNotifications(pageNum: number, append = false) {
    try {
      const res = await fetch(`/api/notifications?page=${pageNum}&limit=20`);
      const data: ApiResponse<NotificationListResponse> = await res.json();
      if (data.code === 0) {
        if (append) {
          setNotifications((prev) => [...prev, ...data.data.notifications]);
        } else {
          setNotifications(data.data.notifications);
        }
        setHasMore(data.data.hasMore);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  // 加载更多
  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  }

  // 标记全部已读
  async function handleMarkAllRead() {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  }

  // 删除通知
  async function handleDelete(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  // 获取通知链接（优先使用 link 字段，否则回退到 #）
  function getNotificationLink(notification: NotificationItem): string {
    if (notification.link) {
      return notification.link;
    }
    // 向后兼容：旧数据没有 link 字段
    return '#';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{total} notifications</p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <Check className="mr-1 size-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Bell className="mb-4 size-12 opacity-50" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'group flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50',
                !notification.isRead && 'bg-muted/30 border-primary/20'
              )}
            >
              {/* Avatar or Icon */}
              {notification.actor ? (
                <Link href={`/profile/${notification.actor.id}`}>
                  <Avatar className="size-10">
                    <AvatarImage src={notification.actor.image} />
                    <AvatarFallback>
                      {notification.actor.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  {NOTIFICATION_ICONS[notification.type] || <Bell className="size-5" />}
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <Link href={getNotificationLink(notification)} className="block">
                  <p className="text-sm">
                    {notification.actor && (
                      <span className="font-medium">{notification.actor.name} </span>
                    )}
                    <span className="text-muted-foreground">
                      {NOTIFICATION_LABELS[notification.type] || notification.type}
                    </span>
                  </p>
                  {notification.previewText && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      "{notification.previewText}"
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </Link>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!notification.isRead && (
                  <div className="size-2 rounded-full bg-blue-500" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => handleDelete(notification.id)}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleLoadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
