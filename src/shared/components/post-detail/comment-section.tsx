'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/shared/components/ui/button";
import { MessageSquare, Send, Heart, Loader2, Reply, Smile, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAppContext } from '@/shared/contexts/app';
import dynamic from 'next/dynamic';

// 动态加载 Emoji Picker (避免 SSR 问题)
const Picker = dynamic(() => import('@emoji-mart/react').then(m => m.default), { ssr: false });

interface Comment {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string;
  parentId: string | null;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user, setIsShowSignModal } = useAppContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  // 回复状态
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  // 点赞状态（记录哪些评论已点赞）
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  
  // Emoji 选择器状态
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 高亮评论 ID（用于锚点定位）
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);

  // Emoji 选择处理
  const handleEmojiSelect = (emoji: any) => {
    setNewComment(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  // 获取评论列表
  const fetchComments = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/community/posts/${postId}/comments?page=${pageNum}&limit=10`);
      const data = await response.json() as any;

      if (data.code === 0) {
        if (append) {
          setComments(prev => [...prev, ...data.data.comments]);
        } else {
          setComments(data.data.comments);
        }
        setTotal(data.data.pagination.total);
        setHasMore(pageNum < data.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 处理 URL hash 锚点定位
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#comment-')) {
        const commentId = hash.replace('#comment-', '');
        
        // 等待评论加载完成后再处理
        setTimeout(() => {
          const element = document.getElementById(`comment-${commentId}`);
          if (element) {
            // 滚动到评论位置
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 设置高亮
            setHighlightedCommentId(commentId);
            // 3秒后取消高亮
            setTimeout(() => setHighlightedCommentId(null), 3000);
          } else {
            // 评论不存在（可能已删除）
            toast.info('This comment has been deleted or is not available.');
          }
        }, 500);
      }
    };

    // 页面加载后检查
    if (!isLoading && comments.length > 0) {
      handleHashScroll();
    }

    // 监听 hash 变化
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, [isLoading, comments]);

  // 发表评论
  const handleSubmit = async (parentId?: string) => {
  // 未登录时弹出登录框
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), parentId }),
      });

      const data = await response.json() as any;

      if (data.code === 0) {
        // 重新获取评论
        await fetchComments();
        if (parentId) {
          setReplyContent('');
          setReplyingTo(null);
        } else {
          setNewComment('');
        }
      } else {
        setError(data.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      setError('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 点赞评论
  const handleLike = async (commentId: string) => {
    try {
      const response = await fetch(`/api/community/comments/${commentId}/like`, {
        method: 'POST',
      });
      const data = await response.json() as any;

      if (data.code === 0) {
        // 更新点赞状态
        setLikedComments(prev => {
          const newSet = new Set(prev);
          if (data.data.liked) {
            newSet.add(commentId);
          } else {
            newSet.delete(commentId);
          }
          return newSet;
        });

        // 更新评论点赞计数
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, likeCount: (c.likeCount || 0) + (data.data.liked ? 1 : -1) }
            : c
        ));
      } else if (data.message === 'Please sign in to like comments') {
        setIsShowSignModal(true);
      }
    } catch (err) {
      console.error('Failed to like comment:', err);
    }
  };

  // 加载更多
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  // 输入框获得焦点时检查登录状态
  const handleInputFocus = () => {
    if (!user) {
      setIsShowSignModal(true);
    }
  };

  // 删除评论
  const handleDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
      });
      const data = await res.json() as any;
      
      if (data.code === 0) {
        // 从列表中移除评论（包括主评论和回复）
        setComments(prev => prev.map(c => ({
          ...c,
          replies: c.replies?.filter(r => r.id !== commentId)
        })).filter(c => c.id !== commentId));
        setTotal(prev => prev - 1);
        toast.success('评论已删除');
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
      toast.error('删除失败');
    }
  };

  // 检查是否可以删除评论（作者或管理员）
  const canDeleteComment = (comment: Comment) => {
    if (!user) return false;
    return comment.user.id === user.id || (user as any).isAdmin;
  };

  // 渲染单个评论
  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div 
      key={comment.id} 
      id={`comment-${comment.id}`}
      className={`flex items-start gap-3 ${isReply ? 'ml-10 mt-3' : ''} ${highlightedCommentId === comment.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg p-2 bg-primary/5 animate-pulse' : ''}`}
    >
      <Avatar className={isReply ? "h-6 w-6" : "h-7 w-7"}>
        <AvatarImage src={comment.user.image || undefined} alt={`${comment.user.name}'s avatar`} />
        <AvatarFallback className="text-xs bg-muted">
          {comment.user.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{comment.user.name}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground/80 break-words">{comment.content}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          {/* 回复按钮 */}
          {!isReply && (
            <button 
              className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}
          
          {/* 点赞按钮 */}
          <button 
            className={`flex items-center gap-1 cursor-pointer transition-colors ${
              likedComments.has(comment.id) ? 'text-red-400' : 'hover:text-red-400'
            }`}
            onClick={() => handleLike(comment.id)}
          >
            <Heart className={`w-3 h-3 ${likedComments.has(comment.id) ? 'fill-current' : ''}`} />
            {comment.likeCount || 0}
          </button>
          
          {/* 删除按钮 - 仅作者或管理员可见 */}
          {canDeleteComment(comment) && (
            <button 
              className="flex items-center gap-1 cursor-pointer hover:text-destructive transition-colors"
              onClick={() => handleDelete(comment.id)}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {/* 回复输入框 */}
        {replyingTo === comment.id && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onFocus={handleInputFocus}
              placeholder={`Reply to ${comment.user.name}...`}
              className="flex-1 bg-glass-hint-alt rounded-lg border border-primary/20 px-3 py-1.5 text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_-4px_var(--color-primary)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(comment.id);
                }
              }}
            />
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
              onClick={() => handleSubmit(comment.id)}
              disabled={isSubmitting || !replyContent.trim()}
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl bg-glass-subtle backdrop-blur-md border border-border-medium p-5 space-y-4 hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-semibold text-sm">Discussion</h2>
        </div>
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">{total} comments</span>
      </div>

      {/* 评论输入区域 */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {user?.image && <AvatarImage src={user.image} alt={`${user.name || 'User'}'s avatar`} />}
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Share your thoughts..."
              className="w-full min-h-[60px] bg-glass-hint-alt rounded-lg border border-primary/20 px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_-4px_var(--color-primary)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <button
              className="absolute right-2 bottom-2 p-1 hover:bg-glass-hint rounded"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-4 h-4 text-muted-foreground" />
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 bottom-10 z-50">
                <Picker onEmojiSelect={handleEmojiSelect} theme="dark" />
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              size="xs" variant="secondary"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* 评论列表 */}
      <div className="space-y-4">
        {isLoading && comments.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 px-4">
            {/* Empty state illustration */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-primary/60" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">Start the conversation</h3>
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
              Be the first to share your thoughts about this creation!
            </p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {comment.replies?.map((reply) => renderComment(reply, true))}
              </div>
            ))}
            
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load more comments'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
