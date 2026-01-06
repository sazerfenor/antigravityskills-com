'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/shared/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useAppContext } from '@/shared/contexts/app';

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export function FollowButton({ userId, className }: FollowButtonProps) {
  const { setIsShowSignModal } = useAppContext();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // 检查关注状态
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/follow`);
        const data = await response.json() as any;
        if (data.code === 0) {
          setIsFollowing(data.data.isFollowing);
        }
      } catch (err) {
        console.error('Failed to check follow status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowStatus();
  }, [userId]);

  // 切换关注状态
  const toggleFollow = async () => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });

      const data = await response.json() as any;

      if (data.code === 0) {
        setIsFollowing(!isFollowing);
      } else if (data.message === 'Please sign in to follow users' || data.message === 'Please sign in to unfollow users') {
        // 未登录，弹出登录模态框
        setIsShowSignModal(true);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Button 
        size="sm" 
        variant="ghost" 
        className={`h-8 px-2.5 text-xs font-semibold ${className}`}
        disabled
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </Button>
    );
  }

  return (
    <button 
      className={`h-8 px-3 text-xs font-semibold rounded-md transition-colors ${
        isFollowing 
          ? 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20' 
          : 'bg-glass-hint hover:bg-glass-hint-alt border border-border-subtle'
      } ${className || ''}`}
      onClick={toggleFollow}
      disabled={isUpdating}
    >
      {isUpdating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        isFollowing ? 'Following' : 'Follow'
      )}
    </button>
  );
}
