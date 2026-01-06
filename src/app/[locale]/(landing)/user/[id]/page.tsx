import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { UserProfile } from '@/shared/blocks/user-profile';

interface PageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

// 生成 SEO Metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  const [profileUser] = await db()
    .select({ name: user.name, bio: user.bio })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!profileUser) {
    return {
      // TODO: 自定义你的品牌名称
      title: 'User Not Found | Your Brand',
    };
  }

  return {
    // TODO: 自定义你的品牌名称
    title: `${profileUser.name} | Your Brand`,
    description: profileUser.bio || `Check out ${profileUser.name}'s prompts and creations.`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;

  // 验证用户是否存在
  const [profileUser] = await db()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);

  if (!profileUser) {
    notFound();
  }

  return <UserProfile userId={id} />;
}
