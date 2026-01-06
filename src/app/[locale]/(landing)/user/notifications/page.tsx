'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Container, Section } from '@/shared/components/ui/layout';
import { cn } from '@/shared/lib/utils';

import {
  NotificationItem,
  NotificationEmpty,
  NotificationSkeletonList,
  type NotificationItemData,
} from '@/shared/blocks/notification';

// Filter type mapping
type FilterType = 'all' | 'mentions' | 'system';

const FILTER_TYPES: Record<FilterType, string[]> = {
  all: [], // Empty means no filter
  mentions: ['comment_reply', 'post_comment', 'post_like', 'new_follower'],
  system: ['system_announce', 'payment_success', 'subscription_update'],
};

export default function UserNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (pageNum: number, append = false) => {
      if (!append) setLoading(true);
      try {
        const res = await fetch(`/api/notifications?page=${pageNum}&limit=20`);
        const data = await res.json() as { 
          code: number; 
          data?: { 
            notifications: NotificationItemData[]; 
            hasMore: boolean; 
            total: number 
          } 
        };
        if (data.code === 0) {
          const fetchedNotifications = data.data?.notifications || [];
          if (append) {
            setNotifications((prev) => [...prev, ...fetchedNotifications]);
          } else {
            setNotifications(fetchedNotifications);
          }
          setHasMore(data.data?.hasMore ?? false);
          setTotal(data.data?.total ?? 0);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  // Mark all as read (Optimistic UI)
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.error('Failed to mark all read:', error);
      fetchNotifications(1);
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((prev) => prev - 1);
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      fetchNotifications(1);
    }
  };

  // Filter notifications client-side
  const filteredNotifications =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => FILTER_TYPES[filter].includes(n.type));

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <Section spacing="default">
      <Container className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {total} notifications
            </p>
          </div>
          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-1.5"
            >
              <Check className="size-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterType)}
          className="mb-6"
        >
          <TabsList className="w-full grid grid-cols-3 bg-card/40 backdrop-blur-sm">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content */}
        <div className="rounded-xl border border-border/50 bg-card/20 backdrop-blur-sm overflow-hidden">
          {loading ? (
            <NotificationSkeletonList count={5} />
          ) : filteredNotifications.length === 0 ? (
            <NotificationEmpty />
          ) : (
            <div className="divide-y divide-border/50">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && !loading && filter === 'all' && (
          <div className="flex justify-center pt-6">
            <Button variant="outline" onClick={handleLoadMore}>
              Load more
            </Button>
          </div>
        )}
      </Container>
    </Section>
  );
}
