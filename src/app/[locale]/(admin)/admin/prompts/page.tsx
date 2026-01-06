'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Sparkles, FileCode } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

export default function AdminPromptsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash-exp');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);

  // Load config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/prompts/config');
      if (!response.ok) throw new Error('Failed to load config');
      
      const { data } = await response.json() as { data: any };
      setPrompt(data.prompt);
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
      const response = await fetch('/api/admin/prompts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          temperature,
          maxTokens,
        }),
      });

      if (!response.ok) throw new Error('Failed to save config');

      toast.success('✅ Prompt 配置保存成功！');
    } catch (error) {
      console.error('Save config error:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置为当前数据库/文件中的配置吗？')) return;
    
    await loadConfig();
    toast.success('已重置配置');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileCode className="h-8 w-8" />
          Prompt Optimization 配置
        </h1>
        <p className="text-muted-foreground mt-2">
          配置 AI 优化用户 Prompt 的模板和参数
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              此 Prompt 用于 <strong>/api/ai/optimize-prompt</strong> 接口。
              修改后，用户点击 "Optimize" 按钮时会使用最新的配置。
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt 模板</CardTitle>
          <CardDescription>
            定义 AI 如何优化用户的 Prompt。支持变量替换：
            <code className="bg-muted px-1 rounded mx-1">{'{{reference_case_id}}'}</code>,
            <code className="bg-muted px-1 rounded mx-1">{'{{reference_case_title}}'}</code>,
            <code className="bg-muted px-1 rounded mx-1">{'{{reference_case_prompt}}'}</code> 等
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入 Prompt 模板..."
            rows={20}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
            <span>💡 提示：使用清晰的指令和具体示例以获得最佳效果</span>
            <span>{prompt.length} 字符</span>
          </div>
        </CardContent>
      </Card>

      {/* Model & Parameters */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle>AI 模型</CardTitle>
            <CardDescription>选择用于 Prompt 优化的 Gemini 模型</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium mb-1">推荐设置：</div>
              <p className="text-muted-foreground">
                使用 <strong>Gemini 2.0 Flash</strong> 以获得最快的响应速度
              </p>
            </div>
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
                低 (0.1) = 更一致，高 (1.0) = 更创造性
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
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
                生成内容的最大长度（推荐: 1024）
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="flex gap-4 pt-6">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            重置
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !prompt.trim()}
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
