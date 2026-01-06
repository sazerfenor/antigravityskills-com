import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission, hasPermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { findUserById, getUserInfo } from '@/shared/models/user';
import {
  getRemainingCredits,
  grantCreditsForUser,
  CreditTransactionScene,
} from '@/shared/models/credit';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function GrantCreditsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Check permission
  await requirePermission({
    code: PERMISSIONS.CREDITS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  // Get target user
  const targetUser = await findUserById(id);
  if (!targetUser) {
    return <Empty message="User not found" />;
  }

  // Get current credits balance
  const currentCredits = await getRemainingCredits(id);

  const t = await getTranslations('admin.users');

  const crumbs: Crumb[] = [
    { title: t('grant_credits.crumbs.admin'), url: '/admin' },
    { title: t('grant_credits.crumbs.users'), url: '/admin/users' },
    { title: t('grant_credits.crumbs.grant_credits'), is_active: true },
  ];

  // Store user info for display (not as form fields to avoid controlled/uncontrolled issue)
  const userDisplayInfo = `${targetUser.name} (${targetUser.email})`;
  const creditsDisplayInfo = String(currentCredits);

  const form: Form = {
    fields: [
      {
        name: 'amount',
        type: 'number',
        title: t('grant_credits.fields.amount'),
        placeholder: t('grant_credits.fields.amount_placeholder'),
        validation: {
          required: true,
          min: 1,
          max: 10000,
        },
      },
      {
        name: 'valid_days',
        type: 'number',
        title: t('grant_credits.fields.valid_days'),
        placeholder: '0',
        tip: t('grant_credits.fields.valid_days_tip'),
        validation: {
          required: false,
          min: 0,
          max: 3650,
        },
      },
      {
        name: 'reason',
        type: 'textarea',
        title: t('grant_credits.fields.reason'),
        placeholder: t('grant_credits.fields.reason_placeholder'),
        validation: { required: false },
      },
    ],
    passby: {
      userId: id,
      targetUserEmail: targetUser.email,
    },
    submit: {
      button: {
        title: t('grant_credits.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const { userId, targetUserEmail } = passby;
        const amount = parseInt(data.get('amount') as string);
        const validDays = parseInt(data.get('valid_days') as string) || 0;
        const reason = data.get('reason') as string;

        if (!amount || amount < 1 || amount > 10000) {
          throw new Error('Invalid amount. Must be between 1 and 10000.');
        }

        // Get current admin user for audit
        const admin = await getUserInfo();
        if (!admin) {
          throw new Error('Unauthorized');
        }

        // Check permission again in server action
        const hasPerm = await hasPermission(admin.id, PERMISSIONS.CREDITS_WRITE);
        if (!hasPerm) {
          throw new Error('Permission denied');
        }

        // Grant credits using unified function
        const result = await grantCreditsForUser({
          userId: userId as string,
          userEmail: targetUserEmail as string,
          credits: amount,
          validDays: validDays > 0 ? validDays : undefined,
          description: reason?.trim() || `Admin grant by ${admin.email}`,
          scene: CreditTransactionScene.GIFT,
          metadata: {
            source: 'admin_grant_page',
            grantedBy: admin.id,
            grantedByEmail: admin.email,
            reason: reason?.trim() || null,
          },
        });

        if (!result) {
          throw new Error('Failed to grant credits');
        }

        const expiryInfo =
          validDays > 0 ? ` (expires in ${validDays} days)` : ' (never expires)';
        console.log(
          `[GrantCredits] Admin ${admin.email} granted ${amount} credits to ${targetUserEmail}${expiryInfo}`
        );

        return {
          status: 'success',
          message: `Successfully granted ${amount} credits${expiryInfo}`,
          redirect_url: '/admin/users',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader 
          title={t('grant_credits.title')} 
          description={t('grant_credits.description')}
        />
        
        {/* Display user info as read-only text instead of form fields */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border md:max-w-xl">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('grant_credits.fields.user')}:</span>
              <span className="font-medium">{userDisplayInfo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('grant_credits.fields.current_credits')}:</span>
              <span className="font-medium text-green-500">{creditsDisplayInfo}</span>
            </div>
          </div>
        </div>
        
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
