/**
 * Admin 页面：虚拟账号管理
 */

import { VirtualAccountSwitcher } from '@/shared/blocks/virtual-account-switcher';

export default function VirtualAccountsPage() {
  return (
    <div className="container py-8">
      <VirtualAccountSwitcher />
    </div>
  );
}
