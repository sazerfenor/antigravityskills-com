'use client';

import { User2, ImageIcon, Lock, Heart, Eye, Download, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Masonry from 'react-masonry-css';

import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { ImageDetailModal } from '@/shared/components/image-detail-modal';
import { Button } from '@/shared/components/ui/button';
import { FollowButton } from '@/shared/components/post-detail/follow-button';
import { PromptCard, PromptCardPost } from '@/shared/components/ui/prompt-card';
import { useAppContext } from '@/shared/contexts/app';

interface UserData {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  totalViews: number;
  totalDownloads: number;
  postCount: number;
}

interface Post {
  id: string;
  imageUrl: string;
  prompt: string;
  model: string;
  likeCount: number;
  viewCount: number;
  status: string;
  seoSlug?: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface ProfileResponse {
  user: UserData;
  isFollowing: boolean;
}

export function UserProfile({
  userId,
  tab = 'published',
  page = 1,
}: {
  userId: string;
  tab?: 'published' | 'private';
  page?: number;
}) {
  const router = useRouter();
  const { user: currentUser } = useAppContext();
  
  const [profileData, setProfileData] = useState<UserData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reactionsMap, setReactionsMap] = useState<Record<string, string[]>>({});

  // 获取用户资料
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const resp = await fetch(`/api/users/${userId}/profile`);
        const data: ApiResponse<ProfileResponse> = await resp.json();
        if (data.code === 0) {
          setProfileData(data.data.user);
          setIsFollowing(data.data.isFollowing);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  // 获取用户作品
  useEffect(() => {
    const fetchPosts = async () => {
      setPostsLoading(true);
      try {
        const params = new URLSearchParams({
          userId: userId,
          page: String(page),
          limit: '30',
          status: tab === 'published' ? 'published' : 'private',
        });
        
        const resp = await fetch(`/api/community/posts?${params}`);
        if (!resp.ok) throw new Error('Failed to fetch posts');

        const { data }: any = await resp.json();
        setPosts(data.posts || []);
        setPagination(data.pagination);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        toast.error('Failed to load gallery');
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [tab, page, userId]);

  // Batch fetch reactions when posts or user change
  useEffect(() => {
    const fetchBatchReactions = async () => {
      if (!currentUser || posts.length === 0) {
        setReactionsMap({});
        return;
      }

      try {
        const postIds = posts.map(p => p.id);
        const response = await fetch('/api/community/reactions/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postIds }),
        });
        const data = await response.json() as { code: number; data?: Record<string, string[]> };
        
        if (data.code === 0 && data.data) {
          setReactionsMap(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch batch reactions:', error);
      }
    };

    fetchBatchReactions();
  }, [currentUser, posts]);

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const isOwnProfile = currentUser?.id === userId;
  const showPrivateTab = isOwnProfile;

  const breakpointColumns = {
    default: 3,
    1024: 2,
    640: 1,
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        {/* 渐变背景骨架 */}
        <div className="h-32 md:h-48 bg-gradient-to-r from-primary/10 to-secondary/10 animate-pulse" />
        <div className="container -mt-16 pb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-32 w-32 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 渐变背景 */}
      <div className="h-32 md:h-48 bg-gradient-to-r from-primary/20 to-secondary/20" />
      
      {/* 用户信息头部 */}
      <div className="container -mt-16 pb-8">
        <div className="flex flex-col items-center text-center">
          {/* 头像 */}
          <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
            <AvatarImage src={profileData.image || undefined} alt={profileData.name} />
            <AvatarFallback className="text-3xl bg-muted">
              {profileData.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* 用户名 */}
          <h1 className="mt-4 text-2xl font-bold">{profileData.name}</h1>
          
          {/* Bio */}
          {profileData.bio && (
            <p className="mt-2 max-w-md text-muted-foreground">{profileData.bio}</p>
          )}
          
          {/* 加入时间 */}
          <p className="mt-2 text-sm text-muted-foreground">
            Joined {new Date(profileData.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
            })}
          </p>
          
          {/* 统计数据 */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{profileData.followerCount || 0}</span>
              <span className="text-muted-foreground">Followers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{profileData.followingCount || 0}</span>
              <span className="text-muted-foreground">Following</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{profileData.totalLikes || 0}</span>
              <span className="text-muted-foreground">Likes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{profileData.totalViews || 0}</span>
              <span className="text-muted-foreground">Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{profileData.totalDownloads || 0}</span>
              <span className="text-muted-foreground">Downloads</span>
            </div>
          </div>
          
          {/* 关注/编辑按钮 */}
          <div className="mt-6">
            {isOwnProfile ? (
              <Button variant="outline" onClick={() => router.push('/settings/profile')}>
                Edit Profile
              </Button>
            ) : (
              <FollowButton userId={userId} />
            )}
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t" />

      {/* 作品区域 */}
      <div className="container py-8">
        {/* Tabs */}
        <div className="mb-6">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="published">
                <ImageIcon className="mr-2 h-4 w-4" />
                Works ({profileData.postCount || 0})
              </TabsTrigger>
              {showPrivateTab && (
                <TabsTrigger value="private">
                  <Lock className="mr-2 h-4 w-4" />
                  Private
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* Gallery */}
        {postsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-muted aspect-square animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ImageIcon className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground text-lg">
              {tab === 'published'
                ? 'No published works yet'
                : 'No private works'}
            </p>
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex w-auto gap-6"
            columnClassName="masonry-grid_column"
          >
            {posts.map((post) => (
              <PromptCard
                key={post.id}
                post={{
                  ...post,
                  aspectRatio: '1:1',
                } as PromptCardPost}
                userReactions={reactionsMap[post.id] || []}
                onReactionChange={(postId, newReactions) => {
                  setReactionsMap(prev => ({
                    ...prev,
                    [postId]: newReactions,
                  }));
                }}
              />
            ))}
          </Masonry>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', String(page - 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', String(page + 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <ImageDetailModal
        postId={selectedPostId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
