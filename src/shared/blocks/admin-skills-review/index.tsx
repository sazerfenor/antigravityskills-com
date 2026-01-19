'use client';

import { Trash2, Eye, EyeOff, Loader2, ExternalLink, Download } from 'lucide-react';
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
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string | null;
  subcategory: string | null;
  status: string;
  viewCount: number;
  downloadCount: number;
  zipUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export function AdminSkillsReview({
  status = 'all',
  page = 1,
}: {
  status?: string;
  page?: number;
}) {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchSkills();
  }, [status, page]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      // 只有非 'all' 状态才添加过滤
      if (status !== 'all') {
        params.set('status', status);
      }

      const resp = await fetch(`/api/admin/skills?${params}`);
      if (!resp.ok) throw new Error('Failed to fetch skills');

      const { data }: any = await resp.json();
      setSkills(data.skills || []);
      setPagination({
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
      });
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      toast.error('Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (skillId: string, newStatus: 'published' | 'draft') => {
    setProcessingId(skillId);
    try {
      const resp = await fetch(`/api/admin/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!resp.ok) throw new Error('Status update failed');

      toast.success(
        newStatus === 'published'
          ? 'Skill published!'
          : 'Skill unpublished'
      );

      // 更新本地状态
      setSkills(skills.map((s) =>
        s.id === skillId ? { ...s, status: newStatus } : s
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (skillId: string, skillName: string) => {
    setProcessingId(skillId);
    try {
      const resp = await fetch(`/api/admin/skills/${skillId}`, {
        method: 'DELETE',
      });

      if (!resp.ok) throw new Error('Delete failed');

      const { data }: any = await resp.json();
      toast.success(`Skill "${skillName}" deleted completely`);

      // 从列表中移除
      setSkills(skills.filter((s) => s.id !== skillId));
    } catch (error) {
      console.error('Failed to delete skill:', error);
      toast.error('Failed to delete skill');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFilterChange = (newStatus: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'skills');
    params.set('skillStatus', newStatus);
    params.delete('page');
    router.push(`?${params.toString()}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-muted h-48 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Filter Tabs */}
      <Tabs value={status} onValueChange={handleFilterChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Skills List */}
      {skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground text-lg">
            No skills found
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Card key={skill.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">
                    {skill.name}
                  </CardTitle>
                  <Badge
                    variant={skill.status === 'published' ? 'default' : 'secondary'}
                  >
                    {skill.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 pb-2">
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {skill.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {skill.category && (
                    <Badge variant="outline" className="text-xs">
                      {skill.category}
                    </Badge>
                  )}
                  {skill.subcategory && (() => {
                    try {
                      const subs = JSON.parse(skill.subcategory);
                      return subs.slice(0, 2).map((sub: string) => (
                        <Badge key={sub} variant="outline" className="text-xs">
                          {sub}
                        </Badge>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </div>
                <div className="text-muted-foreground flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {skill.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {skill.downloadCount}
                  </span>
                  <span>{formatDate(skill.createdAt)}</span>
                </div>
                {skill.zipUrl && (
                  <Badge variant="secondary" className="text-xs">
                    Has ZIP
                  </Badge>
                )}
              </CardContent>
              <CardFooter className="flex gap-2 pt-2">
                {/* Toggle Status */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleStatusChange(
                    skill.id,
                    skill.status === 'published' ? 'draft' : 'published'
                  )}
                  disabled={processingId === skill.id}
                >
                  {processingId === skill.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : skill.status === 'published' ? (
                    <>
                      <EyeOff className="mr-1 h-4 w-4" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-4 w-4" />
                      Publish
                    </>
                  )}
                </Button>

                {/* Delete with Confirmation */}
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={processingId === skill.id}
                  onClick={() => setDeleteConfirm({ id: skill.id, name: skill.name })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-background rounded-lg p-6 max-w-md w-full shadow-xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Delete Skill Completely?</h3>
            <div className="text-sm text-muted-foreground mb-4">
              This will permanently delete:
              <ul className="mt-2 list-inside list-disc text-sm">
                <li>Skill record from database</li>
                <li>Related community post (if published)</li>
                <li>Conversion history</li>
                <li>ZIP file from R2 storage (if exists)</li>
              </ul>
              <strong className="mt-2 block text-destructive">
                This action cannot be undone.
              </strong>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete(deleteConfirm.id, deleteConfirm.name);
                  setDeleteConfirm(null);
                }}
              >
                Delete Forever
              </Button>
            </div>
          </div>
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
    </div>
  );
}
