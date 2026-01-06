'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Check } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { useAppContext } from '@/shared/contexts/app';
import { useMedia } from '@/shared/hooks/use-media';
import { cn } from '@/shared/lib/utils';

import {
  NotificationItem,
  NotificationEmpty,
  NotificationSkeletonList,
  type NotificationItemData,
} from '../notification';

export function NotificationButton() {
  const { user, unreadCount, fetchUnreadCount } = useAppContext();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Responsive: Popover only on desktop (md+)
  const isDesktop = useMedia('(min-width: 768px)');

  // Fetch latest 5 notifications when popover opens
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?page=1&limit=5');
      const data = await res.json() as { code: number; data?: { notifications: NotificationItemData[] } };
      if (data.code === 0) {
        setNotifications(data.data?.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && isDesktop) {
      fetchNotifications();
    }
  }, [open, isDesktop, fetchNotifications]);

  // Optimistic UI: Mark all as read instantly
  const handleMarkAllRead = async () => {
    // Optimistic update - clear visual immediately
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Refresh unread count after server confirms
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark all read:', error);
      // Revert on error
      fetchNotifications();
    }
  };

  // Handle single notification click: mark as read + close popover
  const handleNotificationClick = async (notification: NotificationItemData) => {
    // Close popover first
    setOpen(false);
    
    // If already read, no API call needed
    if (notification.isRead) return;
    
    // Optimistic update: mark this one as read locally
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );
    
    // Call API to mark as read (single notification)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      });
      // Refresh unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 未登录不显示
  if (!user) return null;

  // Smart skeleton count: based on unreadCount, capped at 5
  const skeletonCount = Math.min(Math.max(unreadCount, 1), 5);

  // Bell icon with badge - FIX: Push badge further out (-right-1.5 -top-1.5)
  const BellIcon = (
    <div className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full',
            'bg-primary text-primary-foreground text-[10px] font-medium',
            'shadow-[0_0_8px_var(--color-primary)]',
            unreadCount > 99 ? 'h-5 w-5' : 'h-4 w-4'
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );

  // Mobile: Direct link to notifications page
  if (!isDesktop) {
    return (
      <Button
        variant="ghost"
        size="icon"
        asChild
        className="relative h-9 w-9 rounded-full hover:text-primary hover:bg-primary/10 transition-colors"
      >
        <Link href="/user/notifications">{BellIcon}</Link>
      </Button>
    );
  }

  // Desktop: Popover with quick view
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:text-primary hover:bg-primary/10 transition-colors"
        >
          {BellIcon}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-medium text-foreground">Notifications</h3>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Check className="size-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            // Smart skeleton: show count based on unreadCount to minimize layout shift
            <NotificationSkeletonList count={skeletonCount} compact />
          ) : notifications.length === 0 ? (
            <NotificationEmpty compact />
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  compact
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 p-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-full justify-center text-xs hover:text-primary"
            onClick={() => setOpen(false)}
          >
            <Link href="/user/notifications">View All Notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
