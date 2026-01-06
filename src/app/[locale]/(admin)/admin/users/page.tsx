import { getTranslations } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import { Badge } from '@/shared/components/ui/badge';
import { getRemainingCreditsBatch } from '@/shared/models/credit';
import { getUsers, getUsersCount, User } from '@/shared/models/user';
import { getUserRolesBatch, Role } from '@/shared/services/rbac';
import { Crumb, Search } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

// Extended user type with pre-loaded data
type UserWithData = User & {
  roles: Role[];
  remainingCredits: number;
};

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: number;
    pageSize?: number;
    email?: string;
    userType?: 'all' | 'virtual' | 'real';
  }>;
}) {
  const { locale } = await params;

  // Check if user has permission to read users
  await requirePermission({
    code: PERMISSIONS.USERS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.users');

  const { page: pageNum, pageSize, email, userType = 'all' } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  // Get users (1 query)
  const total = await getUsersCount({ email, isVirtual: userType === 'virtual' ? true : userType === 'real' ? false : undefined });
  const users = await getUsers({ email, page, limit, isVirtual: userType === 'virtual' ? true : userType === 'real' ? false : undefined });

  // Get user IDs for batch queries
  const userIds = users.map((u) => u.id);

  // Batch get roles for all users (1 query instead of N)
  const rolesByUser = await getUserRolesBatch(userIds);

  // Batch get credits for all users (1 query instead of N)
  const creditsByUser = await getRemainingCreditsBatch(userIds);

  // Combine data (in memory, no additional queries)
  const usersWithData: UserWithData[] = users.map((user) => ({
    ...user,
    roles: rolesByUser[user.id] || [],
    remainingCredits: creditsByUser[user.id] || 0,
  }));

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.users'), is_active: true },
  ];

  const search: Search = {
    name: 'email',
    title: t('list.search.email.title'),
    placeholder: t('list.search.email.placeholder'),
    value: email,
  };

  // User type tabs
  const tabs = [
    { title: 'All Users', url: '/admin/users?userType=all', isActive: userType === 'all' },
    { title: 'Real Users', url: '/admin/users?userType=real', isActive: userType === 'real' },
    { title: 'Virtual Authors', url: '/admin/users?userType=virtual', isActive: userType === 'virtual' },
  ];

  const table: Table = {
    columns: [
      { name: 'id', title: t('fields.id'), type: 'copy' },
      { name: 'name', title: t('fields.name') },
      {
        name: 'userType',
        title: 'Type',
        callback: (item: UserWithData) => {
          const isVirtual = (item as any).isVirtual;
          return (
            <Badge variant={isVirtual ? 'secondary' : 'default'}>
              {isVirtual ? '🤖 Virtual' : '👤 Real'}
            </Badge>
          );
        },
      },
      {
        name: 'image',
        title: t('fields.avatar'),
        type: 'image',
        placeholder: '-',
      },
      { name: 'email', title: t('fields.email'), type: 'copy' },
      {
        name: 'roles',
        title: t('fields.roles'),
        // Use pre-loaded data instead of callback
        callback: (item: UserWithData) => {
          return (
            <div className="flex flex-col gap-2">
              {item.roles.map((role) => (
                <Badge key={role.id} variant="outline">
                  {role.title}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        name: 'emailVerified',
        title: t('fields.email_verified'),
        type: 'label',
        placeholder: '-',
      },
      {
        name: 'remainingCredits',
        title: t('fields.remaining_credits'),
        // Use pre-loaded data instead of callback
        callback: (item: UserWithData) => {
          return <div className="text-green-500">{item.remainingCredits}</div>;
        },
      },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'actions',
        title: t('fields.actions'),
        type: 'dropdown',
        callback: (item: UserWithData) => [
          {
            name: 'edit',
            title: t('list.buttons.edit'),
            icon: 'RiEditLine',
            url: `/admin/users/${item.id}/edit`,
          },
          {
            name: 'edit-roles',
            title: t('list.buttons.edit_roles'),
            icon: 'Users',
            url: `/admin/users/${item.id}/edit-roles`,
          },
          {
            name: 'grant-credits',
            title: t('list.buttons.grant_credits'),
            icon: 'Coins',
            url: `/admin/users/${item.id}/grant-credits`,
          },
        ],
      },
    ],
    data: usersWithData,
    pagination: {
      total,
      page,
      limit,
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} search={search} />
        
        {/* User Type Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map((tab) => (
            <a
              key={tab.url}
              href={tab.url}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab.isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {tab.title}
            </a>
          ))}
        </div>
        
        <TableCard table={table} />
      </Main>
    </>
  );
}
