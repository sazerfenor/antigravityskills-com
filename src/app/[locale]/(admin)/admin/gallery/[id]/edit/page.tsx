import { notFound } from 'next/navigation';
import { getCommunityPostById } from '@/shared/models/community_post';
import { AdminGallerySEOEdit } from '@/shared/blocks/admin-gallery-seo-edit';

export default async function AdminGalleryEditPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  
  // 获取post数据
  const post = await getCommunityPostById(id, { getUser: true });
  
  if (!post) {
    notFound();
  }
  
  // 获取 ai_task 数据（包含 optimization data）
  let aiTask = null;
  if (post.aiTaskId) {
    const { findAITaskById } = await import('@/shared/models/ai_task');
    aiTask = await findAITaskById(post.aiTaskId);
  }
  
  return (
    <div className="container mx-auto py-8">
      <AdminGallerySEOEdit post={post} aiTask={aiTask} />
    </div>
  );
}
