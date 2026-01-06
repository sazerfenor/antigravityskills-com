'use client';

import { Check, X, Eye, Loader2, Edit } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { ImageDetailModal } from '@/shared/components/image-detail-modal';

interface Post {
  id: string;
  imageUrl: string;
  prompt: string;
  model: string;
  status: string;
  createdAt: string;
  params?: string | null; // Smart Remix V3: Contains originalInput and other generation params
  user?: {
    name: string;
    image?: string;
  };
}

export function AdminGalleryReview({
  status = 'pending',
  page = 1,
}: {
  status?: string;
  page?: number;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [status, page]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        limit: '20',
      });

      const resp = await fetch(`/api/admin/gallery?${params}`);
      if (!resp.ok) throw new Error('Failed to fetch posts');

      const { data }: any = await resp.json();
      setPosts(data.posts || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (postId: string, action: 'approve' | 'reject') => {
    setProcessingId(postId);
    try {
      const resp = await fetch(`/api/admin/gallery/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!resp.ok) throw new Error('Action failed');

      toast.success(
        action === 'approve'
          ? 'Content approved and published!'
          : 'Content rejected'
      );

      // Remove post from list
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (error) {
      console.error('Failed to process action:', error);
      toast.error('Failed to process action');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('status', newStatus);
    params.delete('page'); // Reset to page 1
    router.push(`?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-muted aspect-square animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <Tabs value={status} onValueChange={handleStatusChange}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {status === 'pending' && posts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {posts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground text-lg">
            {status === 'pending'
              ? 'No pending posts to review'
              : `No ${status} posts`}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="relative aspect-square">
                  <Image
                    src={post.imageUrl}
                    alt={post.prompt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {/* Smart Remix V3: Show originalInput if available */}
                {(() => {
                  let originalInput: string | null = null;
                  if (post.params) {
                    try {
                      const parsed = JSON.parse(post.params);
                      originalInput = parsed.originalInput || null;
                    } catch {}
                  }
                  return originalInput ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Original:</p>
                      <p className="text-sm line-clamp-2" title={originalInput}>{originalInput}</p>
                      <p className="text-xs text-muted-foreground mt-2">Optimized:</p>
                      <p className="text-sm line-clamp-2" title={post.prompt}>{post.prompt}</p>
                    </div>
                  ) : (
                    <p className="text-sm line-clamp-2" title={post.prompt}>
                      {post.prompt}
                    </p>
                  );
                })()}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{post.model}</Badge>
                  <Badge
                    variant={
                      post.status === 'pending'
                        ? 'default'
                        : post.status === 'published'
                          ? 'default'
                          : 'destructive'
                    }
                  >
                    {post.status}
                  </Badge>
                </div>
                {post.user && (
                  <div className="flex items-center gap-2">
                    {post.user.image && (
                      <Image
                        src={post.user.image}
                        alt={post.user.name}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-muted-foreground text-xs">
                      {post.user.name}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2 p-4 pt-0">
                {/* Pending: Edit + Reject (Approve removed - must go through Edit for SEO data) */}
                {status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/admin/gallery/${post.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAction(post.id, 'reject')}
                      disabled={processingId === post.id}
                    >
                      {processingId === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Published: Edit + Reject */}
                {status === 'published' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/admin/gallery/${post.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAction(post.id, 'reject')}
                      disabled={processingId === post.id}
                    >
                      {processingId === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="mr-2 h-4 w-4" />
                          Unpublish
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Rejected: Edit + Approve */}
                {status === 'rejected' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/admin/gallery/${post.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAction(post.id, 'approve')}
                      disabled={processingId === post.id}
                    >
                      {processingId === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Republish
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
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

      {/* Detail Modal */}
      <ImageDetailModal
        postId={selectedPostId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
