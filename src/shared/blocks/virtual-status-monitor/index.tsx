'use client';

/**
 * 虚拟人格运行状态监控组件
 *
 * @description 监控自动发帖和互动的运行状态，支持手动触发 Cron
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  Loader2,
  RefreshCw,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  MessageSquare,
  FileText,
  Zap,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';

// ============================================
// 类型定义
// ============================================

interface CronJobResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  duration?: number;
  posted?: number;
  failed?: number;
  results?: Array<{ personaId: string; success: boolean; error?: string }>;
  queueStats?: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
}

interface PersonaStats {
  total: number;
  active: number;
  byActivityLevel: Record<string, number>;
}

interface TodayStats {
  postsCreated: number;
  interactionsMade: number;
  tokensUsed: number;
}

// ============================================
// 常量
// ============================================

const CRON_JOBS = [
  {
    id: 'virtual-posting',
    name: '自动发帖',
    description: '每小时检查并执行虚拟人格发帖',
    endpoint: '/api/cron/virtual-posting',
    icon: FileText,
  },
  {
    id: 'virtual-interactions',
    name: '自动互动',
    description: '每 5 分钟执行虚拟人格互动',
    endpoint: '/api/cron/virtual-interactions',
    icon: MessageSquare,
  },
  {
    id: 'virtual-token-reset',
    name: '令牌重置',
    description: '每日凌晨重置发帖令牌',
    endpoint: '/api/cron/virtual-token-reset',
    icon: RefreshCw,
  },
] as const;

const ACTIVITY_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  'low': { label: '低活跃', color: 'bg-gray-100 text-gray-800' },
  'moderate': { label: '中等', color: 'bg-blue-100 text-blue-800' },
  'high': { label: '高活跃', color: 'bg-green-100 text-green-800' },
  'very_high': { label: '极高', color: 'bg-purple-100 text-purple-800' },
};

// ============================================
// 主组件
// ============================================

export function VirtualStatusMonitor() {
  // 状态
  const [loading, setLoading] = useState(true);
  const [personaStats, setPersonaStats] = useState<PersonaStats | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, CronJobResult>>({});

  // 加载统计数据
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // 获取人格统计
      const personaResponse = await fetch('/api/admin/virtual-personas?statsOnly=true');
      if (personaResponse.ok) {
        const personaResult = await personaResponse.json() as { code: number; data?: PersonaStats };
        if (personaResult.code === 0 && personaResult.data) {
          setPersonaStats(personaResult.data);
        }
      }

      // 获取今日统计（从互动日志）
      const statsResponse = await fetch('/api/admin/virtual-stats');
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json() as { code: number; data?: TodayStats };
        if (statsResult.code === 0 && statsResult.data) {
          setTodayStats(statsResult.data);
        }
      }
    } catch (error) {
      console.error('Load stats failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // 手动触发 Cron
  const triggerCron = async (jobId: string, endpoint: string) => {
    setRunningJob(jobId);
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`,
        },
      });

      const result = await response.json() as { code: number; data?: CronJobResult; message?: string };

      if (result.code === 0 && result.data) {
        setLastResults(prev => ({ ...prev, [jobId]: result.data! }));

        if (result.data.skipped) {
          toast.info(`${jobId}: 已跳过 - ${result.data.reason}`);
        } else {
          toast.success(`${jobId}: 执行成功`);
        }
      } else {
        toast.error(`执行失败: ${result.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error(`Trigger ${jobId} failed:`, error);
      toast.error(`执行失败: ${error.message}`);
    } finally {
      setRunningJob(null);
      loadStats(); // 刷新统计
    }
  };

  return (
    <div className="space-y-6">
      {/* 今日统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{personaStats?.active || 0}</div>
                <div className="text-sm text-muted-foreground">活跃人格</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{todayStats?.postsCreated || 0}</div>
                <div className="text-sm text-muted-foreground">今日发帖</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{todayStats?.interactionsMade || 0}</div>
                <div className="text-sm text-muted-foreground">今日互动</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{todayStats?.tokensUsed || 0}</div>
                <div className="text-sm text-muted-foreground">令牌消耗</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 人格活跃度分布 */}
      {personaStats && personaStats.byActivityLevel && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              人格活跃度分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(personaStats.byActivityLevel).map(([level, count]) => {
                const config = ACTIVITY_LEVEL_LABELS[level] || { label: level, color: 'bg-gray-100' };
                const percentage = personaStats.total > 0 ? (count / personaStats.total) * 100 : 0;

                return (
                  <div key={level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <Badge className={config.color}>{config.label}</Badge>
                      <span className="text-muted-foreground">{count} 个 ({percentage.toFixed(0)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cron 任务控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            定时任务控制
          </CardTitle>
          <CardDescription>
            手动触发定时任务进行测试，生产环境由 Cloudflare Cron Triggers 自动执行
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CRON_JOBS.map((job) => {
            const Icon = job.icon;
            const lastResult = lastResults[job.id];
            const isRunning = runningJob === job.id;

            return (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{job.name}</div>
                    <div className="text-sm text-muted-foreground">{job.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* 上次结果 */}
                  {lastResult && (
                    <div className="flex items-center gap-2 text-sm">
                      {lastResult.skipped ? (
                        <Badge variant="secondary" className="text-xs">
                          已跳过
                        </Badge>
                      ) : lastResult.success ? (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          成功
                          {lastResult.posted !== undefined && ` (${lastResult.posted})`}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          失败
                        </Badge>
                      )}
                      {lastResult.duration && (
                        <span className="text-muted-foreground text-xs">
                          {lastResult.duration}ms
                        </span>
                      )}
                    </div>
                  )}

                  {/* 触发按钮 */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerCron(job.id, job.endpoint)}
                    disabled={isRunning || runningJob !== null}
                  >
                    {isRunning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 最近执行结果详情 */}
      {Object.entries(lastResults).some(([_, r]) => r.results && r.results.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">最近执行详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(lastResults).map(([jobId, result]) => {
                if (!result.results || result.results.length === 0) return null;

                return (
                  <div key={jobId} className="space-y-2">
                    <div className="text-sm font-medium">{jobId}</div>
                    <div className="space-y-1">
                      {result.results.map((r, i) => (
                        <div
                          key={i}
                          className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                            r.success
                              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {r.success ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span className="font-mono">{r.personaId.slice(0, 8)}...</span>
                          {r.error && <span className="truncate">{r.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            注意事项
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>手动触发仅用于测试，生产环境由 Cloudflare Cron Triggers 自动调度</li>
            <li>自动发帖每小时执行一次，自动互动每 5 分钟执行一次</li>
            <li>令牌重置每日凌晨 0 点执行，重置所有人格的发帖令牌</li>
            <li>如果任务显示"已跳过"，可能是没有待处理的 Prompts 或没有准备好的人格</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
