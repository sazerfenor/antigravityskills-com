import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getUserInfo } from '@/shared/models/user';
import { AdminGalleryReview } from '@/shared/blocks/admin-gallery-review';
import { AdminGalleryLoading } from '@/shared/blocks/admin-gallery-review/loading';

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  // Check if user is authenticated
  const user = await getUserInfo();
  if (!user) {
    redirect('/api/auth/signin');
  }

  // TODO: Add admin role check
  // if (!user.isAdmin) {
  //   redirect('/');
  // }

  const params = await searchParams;

  return (
    <div className="container py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Community Gallery Review</h1>
        <p className="text-muted-foreground">
          Review and moderate community-submitted images
        </p>
      </div>

      <Suspense fallback={<AdminGalleryLoading />}>
        <AdminGalleryReview
          status={(params.status as any) || 'pending'}
          page={parseInt(params.page || '1')}
        />
      </Suspense>
    </div>
  );
}
