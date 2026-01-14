'use client';

/**
 * Admin 虚拟人格管理页面 v2.0
 *
 * @description 提供批量生成虚拟人格的 UI，包含详情预览和灵魂验证
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  UserPlus,
  CheckCircle2,
  Users,
  Sparkles,
  ImageIcon,
  RefreshCw,
  MessageCircle,
  Heart,
  ThumbsDown,
  Wrench,
  Zap,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  Eye,
  Bot,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useDebug } from '@/shared/contexts/debug';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';

import type {
  PersonaCategory,
  ActivityLevel,
  PersonaGenerationOutput,
  WorkflowType,
} from '@/shared/types/virtual-persona';
import { WORKFLOW_TYPE_LABELS } from '@/shared/types/virtual-persona';

// ============================================
// 类型定义
// ============================================

interface DebugInfo {
  prompt: string;
  rawOutput: string;
  model: string;
  temperature: number;
}

interface GeneratedPersona {
  persona: PersonaGenerationOutput;
  category: PersonaCategory;
  activityLevel: ActivityLevel;
  workflowType?: WorkflowType;
  debug?: DebugInfo;
}

interface ProcessingStatus {
  personaIndex: number;
  step: 'idle' | 'avatar' | 'compressing' | 'uploading' | 'saving' | 'done' | 'error';
  progress: number;
  avatarUrl?: string;
  error?: string;
}

// ============================================
// 常量
// ============================================

const CATEGORY_LABELS: Record<PersonaCategory, string> = {
  'photography': '写实摄影',
  'art-illustration': '艺术插画',
  'design': '设计',
  'commercial-product': '商业产品',
  'character-design': '角色设计',
  'experimental': '实验创作',
  'infographic': '信息图表',
  'indie-illustration': '独立插画',
  '3d-visualization': '3D可视化',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  'low': '低',
  'moderate': '中等',
  'high': '高',
  'very_high': '极高',
};

const COMMUNICATION_STYLE_LABELS: Record<string, string> = {
  'formal': '正式',
  'casual': '随性',
  'enthusiastic': '热情',
  'reserved': '内敛',
};

// ============================================
// 人格特质可视化组件
// ============================================

const TRAIT_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
] as const;

function TraitBar({ label, value, colorIndex }: { label: string; value: number; colorIndex: number }) {
  const colorClass = TRAIT_COLORS[colorIndex % TRAIT_COLORS.length];
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="w-4 text-right font-mono text-muted-foreground">{value}</span>
    </div>
  );
}

// ============================================
// 灵魂验证对话框组件
// ============================================

function SoulVerificationCard({ persona }: { persona: PersonaGenerationOutput }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full text-left text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            <Bot className="w-4 h-4" />
            <span>灵魂验证 - 查看此人格如何互动</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          {/* 场景描述 */}
          <div className="rounded-md bg-background/80 p-3 border border-border-light">
            <div className="text-xs text-muted-foreground mb-1">场景</div>
            <div className="text-sm">{persona.sampleInteraction?.scenario || '用户发布了一张 AI 生成的作品'}</div>
          </div>

          {/* 人格回复 */}
          <div className="rounded-md bg-primary/10 p-3 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs font-medium">{persona.displayName} 的回复</span>
            </div>
            <div className="text-sm italic text-foreground/90">
              "{persona.sampleInteraction?.response || '这个作品太棒了！'}"
            </div>
          </div>

          {/* 常用说话方式 */}
          {persona.responsePatterns?.typicalPhrases && persona.responsePatterns.typicalPhrases.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">常用说话方式</div>
              <div className="flex flex-wrap gap-1.5">
                {persona.responsePatterns.typicalPhrases.slice(0, 4).map((phrase, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-md bg-background border border-border-light"
                  >
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============================================
// 详细人格卡片组件
// ============================================

function PersonaDetailCard({
  item,
  index,
  status,
  onGenerateAvatar,
  onSave,
  onDiscard,
  isProcessing,
}: {
  item: GeneratedPersona;
  index: number;
  status?: ProcessingStatus;
  onGenerateAvatar: () => void;
  onSave: () => void;
  onDiscard: () => void;
  isProcessing: boolean;
}) {
  const { persona, category, activityLevel } = item;
  const [showDetails, setShowDetails] = useState(true);

  const statusColors = {
    idle: 'bg-glass-subtle border-border-medium',
    avatar: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    compressing: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    uploading: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    saving: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    done: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  };

  const currentStep = status?.step || 'idle';

  return (
    <Card className={`transition-all duration-300 ${statusColors[currentStep]}`}>
      <CardContent className="p-4 space-y-4">
        {/* 头部：头像 + 基础信息 */}
        <div className="flex items-start gap-4">
          {/* 头像区域 */}
          <div className="relative shrink-0">
            {status?.avatarUrl ? (
              <img
                src={status.avatarUrl}
                alt={persona.displayName}
                className="w-16 h-16 rounded-xl object-cover ring-2 ring-primary/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                <ImageIcon className="w-6 h-6 text-primary/40" />
              </div>
            )}
            {/* 工作流类型角标 */}
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-background border border-border-medium shadow-sm">
              {WORKFLOW_TYPE_LABELS[persona.workflowType] || '纯 AI'}
            </div>
          </div>

          {/* 基础信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">{persona.displayName}</h3>
              <span className="text-xs text-muted-foreground">@{persona.username}</span>
            </div>

            {/* 标签组 */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {CATEGORY_LABELS[category]}
              </Badge>
              <Badge variant="glass" className="text-xs px-2 py-0.5">
                <Zap className="w-3 h-3 mr-1" />
                {ACTIVITY_LABELS[activityLevel]}
              </Badge>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {COMMUNICATION_STYLE_LABELS[persona.communicationStyle] || persona.communicationStyle}
              </Badge>
            </div>

            {/* Bio */}
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {persona.bio}
            </p>
          </div>

          {/* 展开/折叠 */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* 详细信息区域 */}
        {showDetails && (
          <div className="space-y-4 pt-2 border-t border-border-light">
            {/* 工具与偏好 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 常用工具 */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Wrench className="w-3 h-3" />
                  <span>常用工具</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.preferredTools?.slice(0, 4).map((tool, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* 不喜欢的 */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <ThumbsDown className="w-3 h-3" />
                  <span>不喜欢</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {persona.dislikes?.slice(0, 3).map((dislike, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 dark:text-orange-300">
                      {dislike}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 性格特质可视化 */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Heart className="w-3 h-3" />
                <span>性格特质</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <TraitBar label="热情" value={persona.personalityTraits.warmth} colorIndex={0} />
                <TraitBar label="专业" value={persona.personalityTraits.professionalism} colorIndex={1} />
                <TraitBar label="幽默" value={persona.personalityTraits.humor} colorIndex={2} />
                <TraitBar label="创意" value={persona.personalityTraits.creativity} colorIndex={3} />
                <TraitBar label="乐助" value={persona.personalityTraits.helpfulness} colorIndex={4} />
              </div>
            </div>

            {/* 灵魂验证 */}
            <SoulVerificationCard persona={persona} />
          </div>
        )}

        {/* 状态和操作按钮 */}
        <div className="pt-3 border-t border-border-light">
          {/* 处理状态 */}
          {status && status.step !== 'idle' && status.step !== 'done' && status.step !== 'error' && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                {status.step === 'avatar' && '生成头像中...'}
                {status.step === 'compressing' && '压缩图片中...'}
                {status.step === 'uploading' && '上传中...'}
                {status.step === 'saving' && '保存到数据库...'}
              </div>
              <Progress value={status.progress} className="h-1" />
            </div>
          )}

          {/* 完成状态 */}
          {status?.step === 'done' && (
            <div className="flex items-center text-green-600 dark:text-green-400 text-sm mb-3">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              已保存成功
            </div>
          )}

          {/* 错误状态 */}
          {status?.step === 'error' && (
            <div className="text-red-600 dark:text-red-400 text-sm mb-3 truncate">
              ❌ {status.error}
            </div>
          )}

          {/* 操作按钮 - 分步操作 */}
          {(!status || status.step === 'idle') && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={onGenerateAvatar}
                disabled={isProcessing}
                className="flex-1"
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                生成头像
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onSave}
                disabled={isProcessing}
                className="flex-1"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                直接保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDiscard}
                disabled={isProcessing}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* 已有头像时的操作 */}
          {status?.avatarUrl && status.step === 'idle' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={onGenerateAvatar}
                disabled={isProcessing}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                重新生成头像
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onSave}
                disabled={isProcessing}
                className="flex-1"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                保存
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// 页面组件
// ============================================

export default function VirtualPersonasPage() {
  const { pushDebug } = useDebug();

  // 表单状态
  const [count, setCount] = useState(5);
  const [category, setCategory] = useState<PersonaCategory | 'auto'>('auto');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | 'auto'>('auto');
  const [workflowType, setWorkflowType] = useState<WorkflowType | 'auto'>('auto');

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPersonas, setGeneratedPersonas] = useState<GeneratedPersona[]>([]);

  // 处理状态
  const [processingStatuses, setProcessingStatuses] = useState<Map<number, ProcessingStatus>>(new Map());
  const [isAnyProcessing, setIsAnyProcessing] = useState(false);

  // Step 1: 调用 API 生成人格数据
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGeneratedPersonas([]);
    setProcessingStatuses(new Map());

    try {
      const response = await fetch('/api/admin/virtual-personas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          category: category === 'auto' ? undefined : category,
          activityLevel: activityLevel === 'auto' ? undefined : activityLevel,
          workflowType: workflowType === 'auto' ? undefined : workflowType,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json() as {
        code: number;
        message?: string;
        data?: { results: GeneratedPersona[] };
      };

      if (result.code !== 0 || !result.data?.results) {
        throw new Error(result.message || 'Generation failed');
      }

      setGeneratedPersonas(result.data.results);

      // 初始化每个人格的处理状态
      const initialStatuses = new Map<number, ProcessingStatus>();
      result.data.results.forEach((_, index) => {
        initialStatuses.set(index, { personaIndex: index, step: 'idle', progress: 0 });
      });
      setProcessingStatuses(initialStatuses);

      // 添加调试信息
      for (const item of result.data.results) {
        if (item.debug) {
          let parsedOutput: Record<string, unknown> | null = null;
          try {
            parsedOutput = JSON.parse(
              item.debug.rawOutput.replace(/```json\n?|```/g, '').trim()
            );
          } catch {
            // ignore
          }

          pushDebug('virtual-persona', `生成人格: ${item.persona.displayName}`, {
            personaName: item.persona.displayName,
            username: item.persona.username,
            category: item.category,
            activityLevel: item.activityLevel,
            workflowType: item.persona.workflowType,
            model: item.debug.model,
            temperature: item.debug.temperature,
            prompt: item.debug.prompt,
            rawOutput: item.debug.rawOutput,
            parsedOutput,
            finalPersona: item.persona,
          });
        }
      }

      toast.success(`成功生成 ${result.data.results.length} 个 AI 创作者人格`);
    } catch (error: any) {
      toast.error(`生成失败: ${error.message}`);
      console.error('[VirtualPersonas] Generate error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [count, category, activityLevel, workflowType, pushDebug]);

  // 更新单个人格状态
  const updateStatus = useCallback((index: number, update: Partial<ProcessingStatus>) => {
    setProcessingStatuses((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(index) || { personaIndex: index, step: 'idle', progress: 0 };
      newMap.set(index, { ...current, ...update });
      return newMap;
    });
  }, []);

  // 处理单个人格：生成头像
  const handleGenerateAvatar = useCallback(async (index: number) => {
    const item = generatedPersonas[index];
    if (!item) return;

    setIsAnyProcessing(true);
    updateStatus(index, { step: 'avatar', progress: 0 });

    // 记录开始日志
    pushDebug('avatar-generation', `开始生成头像: ${item.persona.displayName}`, {
      username: item.persona.username,
      avatarPrompt: item.persona.avatarPrompt,
      step: 'start',
    });

    try {
      const { generateAndUploadAvatar } = await import('@/shared/lib/avatar-generator');

      const avatarUrl = await generateAndUploadAvatar(
        item.persona.avatarPrompt,
        item.persona.username,
        (step, progress) => {
          if (step === 'generating') {
            updateStatus(index, { step: 'avatar', progress: progress * 0.5 });
            pushDebug('avatar-generation', `AI 生成中: ${item.persona.displayName}`, {
              username: item.persona.username,
              step: 'generating',
              progress,
            });
          } else if (step === 'compressing') {
            updateStatus(index, { step: 'compressing', progress: 50 + progress * 0.3 });
          } else if (step === 'uploading') {
            updateStatus(index, { step: 'uploading', progress: 80 + progress * 0.2 });
          }
        }
      );

      updateStatus(index, { step: 'idle', progress: 100, avatarUrl: avatarUrl || undefined });

      // 记录成功日志
      pushDebug('avatar-generation', `头像生成成功: ${item.persona.displayName}`, {
        username: item.persona.username,
        avatarUrl,
        step: 'success',
      });

      toast.success(`${item.persona.displayName} 的头像生成完成`);
    } catch (error: any) {
      console.warn('[VirtualPersonas] Avatar generation failed:', error);

      // 记录失败日志（详细错误信息）
      pushDebug('avatar-generation', `❌ 头像生成失败: ${item.persona.displayName}`, {
        username: item.persona.username,
        avatarPrompt: item.persona.avatarPrompt,
        step: 'error',
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
      });

      updateStatus(index, { step: 'idle', progress: 0, error: error.message });
      toast.error(`头像生成失败: ${error.message}`);
    } finally {
      setIsAnyProcessing(false);
    }
  }, [generatedPersonas, updateStatus, pushDebug]);

  // 处理单个人格：保存到数据库
  const handleSave = useCallback(async (index: number) => {
    const item = generatedPersonas[index];
    const status = processingStatuses.get(index);
    if (!item) return;

    setIsAnyProcessing(true);
    updateStatus(index, { step: 'saving', progress: 90 });

    try {
      const saveResponse = await fetch('/api/admin/virtual-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: item.persona.displayName,
          username: item.persona.username,
          bio: item.persona.bio,
          avatarUrl: status?.avatarUrl || null,
          primaryCategory: item.category,
          specialties: item.persona.specialties,
          styleKeywords: item.persona.styleKeywords,
          workflowType: item.persona.workflowType,
          workflowDescription: item.persona.workflowDescription,
          preferredTools: item.persona.preferredTools,
          dislikes: item.persona.dislikes,
          sampleInteraction: item.persona.sampleInteraction,
          personalityTraits: item.persona.personalityTraits,
          communicationStyle: item.persona.communicationStyle,
          responsePatterns: item.persona.responsePatterns,
          activityLevel: item.activityLevel,
          promptStyleGuide: item.persona.promptStyleGuide,
          siteReview: item.persona.siteReview,
          siteRating: item.persona.siteRating,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(`Save failed: ${saveResponse.status}`);
      }

      const saveResult = await saveResponse.json() as { code: number; message?: string };
      if (saveResult.code !== 0) {
        throw new Error(saveResult.message || 'Save failed');
      }

      updateStatus(index, { step: 'done', progress: 100 });
      toast.success(`${item.persona.displayName} 已保存`);
    } catch (error: any) {
      updateStatus(index, { step: 'error', error: error.message });
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setIsAnyProcessing(false);
    }
  }, [generatedPersonas, processingStatuses, updateStatus]);

  // 丢弃人格
  const handleDiscard = useCallback((index: number) => {
    setGeneratedPersonas((prev) => prev.filter((_, i) => i !== index));
    setProcessingStatuses((prev) => {
      const newMap = new Map(prev);
      newMap.delete(index);
      // 重新映射索引
      const reindexed = new Map<number, ProcessingStatus>();
      let newIndex = 0;
      prev.forEach((status, oldIndex) => {
        if (oldIndex !== index) {
          reindexed.set(newIndex, { ...status, personaIndex: newIndex });
          newIndex++;
        }
      });
      return reindexed;
    });
    toast.info('已丢弃该人格');
  }, []);

  // 批量处理：生成头像并保存所有
  const handleProcessAll = useCallback(async () => {
    setIsAnyProcessing(true);

    for (let i = 0; i < generatedPersonas.length; i++) {
      const status = processingStatuses.get(i);
      if (status?.step === 'done') continue; // 跳过已完成的

      // 1. 生成头像
      await handleGenerateAvatar(i);

      // 2. 保存
      await handleSave(i);
    }

    setIsAnyProcessing(false);
    toast.success('批量处理完成！');
  }, [generatedPersonas, processingStatuses, handleGenerateAvatar, handleSave]);

  // 统计
  const completedCount = Array.from(processingStatuses.values()).filter(s => s.step === 'done').length;
  const failedCount = Array.from(processingStatuses.values()).filter(s => s.step === 'error').length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            AI 创作者人格工坊
          </h1>
          <p className="text-muted-foreground mt-1">
            生成具有独特"灵魂"的虚拟 AI 创作者，让社区充满活力
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          v2.0 灵魂验证版
        </Badge>
      </div>

      {/* Step 1: 配置区域 */}
      <Card className="border-2 border-dashed border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              1
            </span>
            配置生成参数
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 生成数量 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">生成数量</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                disabled={isGenerating || isAnyProcessing}
              />
            </div>

            {/* 分类选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">创作分类</label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as PersonaCategory | 'auto')}
                disabled={isGenerating || isAnyProcessing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">🎲 自动分配</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 活跃度选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">活跃度</label>
              <Select
                value={activityLevel}
                onValueChange={(v) => setActivityLevel(v as ActivityLevel | 'auto')}
                disabled={isGenerating || isAnyProcessing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">🎲 自动分配</SelectItem>
                  {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 工作流类型选择 - 新增 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">工作流类型</label>
              <Select
                value={workflowType}
                onValueChange={(v) => setWorkflowType(v as WorkflowType | 'auto')}
                disabled={isGenerating || isAnyProcessing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">🎲 自动分配</SelectItem>
                  {Object.entries(WORKFLOW_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isAnyProcessing}
            className="w-full md:w-auto"
            size="lg"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? '正在召唤 AI 创作者...' : `生成 ${count} 个人格`}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: 生成的人格列表 */}
      {generatedPersonas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </span>
              <h2 className="text-lg font-semibold">
                审核并保存人格
                <span className="text-muted-foreground font-normal ml-2">
                  ({completedCount}/{generatedPersonas.length} 已完成)
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || isAnyProcessing}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                重新生成
              </Button>
              <Button
                size="sm"
                onClick={handleProcessAll}
                disabled={isGenerating || isAnyProcessing}
              >
                {isAnyProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-1.5" />
                )}
                全部生成头像并保存
              </Button>
            </div>
          </div>

          {/* 统计信息 */}
          {(completedCount > 0 || failedCount > 0) && (
            <div className="flex items-center gap-4 text-sm">
              {completedCount > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  ✅ 成功: {completedCount}
                </span>
              )}
              {failedCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  ❌ 失败: {failedCount}
                </span>
              )}
            </div>
          )}

          {/* 人格卡片网格 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {generatedPersonas.map((item, index) => (
              <PersonaDetailCard
                key={`${item.persona.username}-${index}`}
                item={item}
                index={index}
                status={processingStatuses.get(index)}
                onGenerateAvatar={() => handleGenerateAvatar(index)}
                onSave={() => handleSave(index)}
                onDiscard={() => handleDiscard(index)}
                isProcessing={isAnyProcessing}
              />
            ))}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-dashed">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">灵魂验证说明</h3>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>每个人格卡片展示完整信息：Bio、常用工具、不喜欢的风格、性格特质</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>点击"灵魂验证"查看此人格在社区中会如何互动，验证是否像真人</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>可以单独操作每个人格：生成头像、直接保存、丢弃</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span>如果人格说话方式不自然（如问"你用什么镜头"），请丢弃并重新生成</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
