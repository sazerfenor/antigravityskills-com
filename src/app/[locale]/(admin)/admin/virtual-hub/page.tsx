'use client';

/**
 * 虚拟人格中心 - 统一管理入口
 *
 * @description 整合人格生成、Prompt 队列、运行状态、账号模拟四个功能模块
 */

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bot, Users, ListTodo, Activity, UserCircle } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';

// 子模块组件
import { VirtualPersonaGenerator } from '@/shared/blocks/virtual-persona-generator';
import { PromptQueueManager } from '@/shared/blocks/prompt-queue-manager';
import { VirtualStatusMonitor } from '@/shared/blocks/virtual-status-monitor';
import { VirtualAccountSwitcher } from '@/shared/blocks/virtual-account-switcher';

// ============================================
// 类型定义
// ============================================

type TabValue = 'personas' | 'queue' | 'status' | 'accounts';

const TAB_CONFIG: Array<{
  value: TabValue;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    value: 'personas',
    label: '人格生成',
    icon: <Users className="w-4 h-4" />,
    description: '批量生成 AI 创作者人格',
  },
  {
    value: 'queue',
    label: 'Prompt 队列',
    icon: <ListTodo className="w-4 h-4" />,
    description: '管理待发帖的 Prompts',
  },
  {
    value: 'status',
    label: '运行状态',
    icon: <Activity className="w-4 h-4" />,
    description: '监控自动发帖和互动',
  },
  {
    value: 'accounts',
    label: '账号模拟',
    icon: <UserCircle className="w-4 h-4" />,
    description: '切换虚拟作者身份',
  },
];

// ============================================
// 加载占位组件
// ============================================

function TabSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// 主页面内容组件
// ============================================

function VirtualHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = (searchParams.get('tab') as TabValue) || 'personas';

  const handleTabChange = (value: string) => {
    router.push(`/admin/virtual-hub?tab=${value}`);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">虚拟人格中心</h1>
          <p className="text-muted-foreground">
            管理 AI 创作者人格、自动发帖和社区互动
          </p>
        </div>
      </div>

      {/* Tab 导航 */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 内容 */}
        <div className="mt-6">
          <TabsContent value="personas" className="m-0">
            <Suspense fallback={<TabSkeleton />}>
              <VirtualPersonaGenerator />
            </Suspense>
          </TabsContent>

          <TabsContent value="queue" className="m-0">
            <Suspense fallback={<TabSkeleton />}>
              <PromptQueueManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="status" className="m-0">
            <Suspense fallback={<TabSkeleton />}>
              <VirtualStatusMonitor />
            </Suspense>
          </TabsContent>

          <TabsContent value="accounts" className="m-0">
            <Suspense fallback={<TabSkeleton />}>
              <VirtualAccountSwitcher />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ============================================
// 页面导出
// ============================================

export default function VirtualHubPage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <VirtualHubContent />
    </Suspense>
  );
}
