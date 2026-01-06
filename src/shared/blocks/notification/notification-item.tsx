'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Heart,
  MessageCircle,
  Megaphone,
  UserPlus,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';

// ==================== Types ====================

export interface NotificationItemData {
  id: string;
  type: string;
  previewText?: string | null;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
  actor?: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  resourceId?: string | null;
  resourceType?: string | null;
}

export interface NotificationItemProps {
  notification: NotificationItemData;
  /** Compact mode for Popover */
  compact?: boolean;
  /** Click handler (for marking as read, etc.) */
  onClick?: () => void;
}

// ==================== Icon & Label Mappings ====================

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  comment_reply: <MessageCircle className="size-4 text-cyan-400" />,
  post_comment: <MessageCircle className="size-4 text-cyan-400" />,
  post_like: <Heart className="size-4 text-pink-400" />,
  new_follower: <UserPlus className="size-4 text-blue-400" />,
  system_announce: <Megaphone className="size-4 text-primary" />,
  payment_success: <CreditCard className="size-4 text-green-400" />,
  subscription_update: <RefreshCw className="size-4 text-purple-400" />,
};

const NOTIFICATION_LABELS: Record<string, string> = {
  comment_reply: 'replied to your comment',
  post_comment: 'commented on your post',
  post_like: 'liked your post',
  new_follower: 'followed you',
  system_announce: 'System announcement',
  payment_success: 'Payment successful',
  subscription_update: 'Subscription updated',
};

// ==================== Component ====================

export function NotificationItem({
  notification,
  compact = false,
  onClick,
}: NotificationItemProps) {
  const { type, actor, previewText, isRead, createdAt, link } = notification;

  const content = (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg transition-colors',
        compact ? 'p-3' : 'p-4',
        // Unread: subtle neon yellow background
        !isRead && 'bg-primary/5',
        // Hover: glass glow
        'hover:bg-primary/10'
      )}
      onClick={onClick}
    >
      {/* Avatar or Icon */}
      {actor ? (
        <Avatar className={cn(compact ? 'size-8' : 'size-10')}>
          <AvatarImage src={actor.image || undefined} alt={actor.name} />
          <AvatarFallback className="text-xs">
            {actor.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-card',
            compact ? 'size-8' : 'size-10'
          )}
        >
          {NOTIFICATION_ICONS[type] || <Bell className="size-4 text-muted-foreground" />}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-snug', compact && 'text-xs')}>
          {actor && (
            <span className="font-medium text-foreground">{actor.name} </span>
          )}
          <span className="text-muted-foreground">
            {NOTIFICATION_LABELS[type] || type}
          </span>
        </p>

        {/* Preview text - max 2 lines */}
        {previewText && (
          <p
            className={cn(
              'mt-1 text-muted-foreground line-clamp-2',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            "{previewText}"
          </p>
        )}

        {/* Timestamp */}
        <p className={cn('mt-1 text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Unread indicator: Neon Yellow pulsing dot */}
      {!isRead && (
        <div className="flex items-center">
          <span className="size-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
        </div>
      )}
    </div>
  );

  // Wrap in Link if we have a destination
  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
