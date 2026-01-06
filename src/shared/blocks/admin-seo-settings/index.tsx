'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Sparkles } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export function AdminSEOSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // V14.0: Two-Stage Prompts
  const [promptStage1, setPromptStage1] = useState('');
  const [promptStage2, setPromptStage2] = useState('');
  const [model, setModel] = useState('gemini-3.0-flash-preview');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Load config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/seo/config');
      if (!response.ok) throw new Error('Failed to load config');
      
      const { data } = await response.json() as { data: any };
      setPromptStage1(data.promptStage1 || '');
      setPromptStage2(data.promptStage2 || '');
      setModel(data.model);
      setTemperature(data.temperature);
      setMaxTokens(data.maxTokens);
    } catch (error) {
      console.error('Load config error:', error);
      toast.error('加载配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/seo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptStage1,
          promptStage2,
          model,
          temperature,
          maxTokens,
        }),
      });

      if (!response.ok) throw new Error('Failed to save config');

      toast.success('✅ 配置保存成功！');
    } catch (error) {
      console.error('Save config error:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置为默认配置吗？这将加载 V14.0 双阶段默认模板。')) return;
    
    try {
      const response = await fetch('/api/admin/seo/config?defaults=true');
      if (!response.ok) throw new Error('Failed to load defaults');
      
      const { data } = await response.json() as { data: any };
      setPromptStage1(data.promptStage1 || '');
      setPromptStage2(data.promptStage2 || '');
      setModel(data.model);
      setTemperature(data.temperature);
      setMaxTokens(data.maxTokens);
      
      toast.success('✅ 已加载 V14.0 默认模板，请点击保存配置');
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('重置失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8" />
          SEO AI 生成配置 (V14.0)
        </h1>
        <p className="text-muted-foreground mt-2">
          配置双阶段 AI 生成 SEO 内容：Stage 1 (策略分析) + Stage 2 (内容生成)
        </p>
      </div>

      {/* Two-Stage Prompt Editor */}
      <Card>
        <CardHeader>
          <CardTitle>AI Prompt 模板 (双阶段)</CardTitle>
          <CardDescription>
            Stage 1: 策略分析 (提取 Anchor, MicroFocus) | Stage 2: 内容生成 (执行策略)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="stage1" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="stage1">🧠 Stage 1: Strategist</TabsTrigger>
              <TabsTrigger value="stage2">✍️ Stage 2: Writer</TabsTrigger>
            </TabsList>
            
            <TabsContent value="stage1">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  分析用户 Prompt，提取核心主题 (Anchor)、独特角度 (MicroFocus)，并规划内容块。
                  <br />
                  可用变量: <code className="bg-muted px-1 rounded">{'{{prompt}}'}</code>, <code className="bg-muted px-1 rounded">{'{{model}}'}</code>
                </p>
                <Textarea
                  value={promptStage1}
                  onChange={(e) => setPromptStage1(e.target.value)}
                  placeholder="输入 Stage 1 (Strategist) Prompt..."
                  rows={18}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="stage2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  根据 Stage 1 的策略 Blueprint 生成最终 SEO 内容。
                  <br />
                  可用变量: <code className="bg-muted px-1 rounded">{'{{prompt}}'}</code>, <code className="bg-muted px-1 rounded">{'{{blueprint}}'}</code>
                </p>
                <Textarea
                  value={promptStage2}
                  onChange={(e) => setPromptStage2(e.target.value)}
                  placeholder="输入 Stage 2 (Writer) Prompt..."
                  rows={18}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Generation Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>生成参数</CardTitle>
          <CardDescription>控制 AI 生成内容的随机性和长度</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="text-sm text-muted-foreground">{temperature}</span>
            </div>
            <input
              id="temperature"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              低 = 更一致，高 = 更创造性
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Tokens (Stage 2)</Label>
            <Input
              id="maxTokens"
              type="number"
              min={512}
              max={8192}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              生成内容的最大长度（推荐: 2048，Stage 1 固定使用 1024）
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="flex gap-4 pt-6">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            重置为默认
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存配置
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
