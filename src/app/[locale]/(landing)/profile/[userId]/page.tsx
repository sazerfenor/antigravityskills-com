import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { findUserById, User } from '@/shared/models/user';
import { UserProfile } from '@/shared/blocks/user-profile';
import { UserProfileLoading } from '@/shared/blocks/user-profile/loading';

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { userId } = await params;
  const search = await searchParams;

  // Fetch user data
  const user = await findUserById(userId);
  if (!user) {
    notFound();
  }

  return (
    <div className="min-h-screen">
    <Suspense fallback={<UserProfileLoading />}>
        <UserProfile
          userId={userId}
          tab={(search.tab as 'published' | 'private') || 'published'}
          page={parseInt(search.page || '1')}
        />
      </Suspense>
    </div>
  );
}
