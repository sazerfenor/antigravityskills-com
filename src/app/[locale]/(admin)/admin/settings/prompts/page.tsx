'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { FileCode } from 'lucide-react';
import { AdminSEOSettings } from '@/shared/blocks/admin-seo-settings';
import { AdminPromptOptimizationSettings } from '@/shared/blocks/admin-prompt-optimization-settings';

export default function AdminPromptsSettingsPage() {
  const [activeTab, setActiveTab] = useState('seo');

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileCode className="h-8 w-8" />
          Prompt 配置
        </h1>
        <p className="text-muted-foreground mt-2">
          配置 AI Prompt 模板和参数
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="seo">Post 生成</TabsTrigger>
          <TabsTrigger value="optimization">生图 Prompt 优化</TabsTrigger>
        </TabsList>

        <TabsContent value="seo" className="space-y-6">
          <AdminSEOSettings />
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <AdminPromptOptimizationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
