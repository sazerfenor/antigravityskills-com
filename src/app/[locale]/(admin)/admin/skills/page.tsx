import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getUserInfo } from '@/shared/models/user';
import { AdminSkillsReview } from '@/shared/blocks/admin-skills-review';

export default async function AdminSkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ skillStatus?: string; page?: string }>;
}) {
  // Check if user is authenticated
  const user = await getUserInfo();
  if (!user) {
    redirect('/api/auth/signin');
  }

  const params = await searchParams;

  return (
    <div className="container py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Skills Management</h1>
        <p className="text-muted-foreground">
          Manage Antigravity Skills - publish, unpublish, or delete
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-muted h-48 animate-pulse rounded-lg"
              />
            ))}
          </div>
        }
      >
        <AdminSkillsReview
          status={params.skillStatus || 'all'}
          page={parseInt(params.page || '1')}
        />
      </Suspense>
    </div>
  );
}
