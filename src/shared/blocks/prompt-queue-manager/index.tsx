'use client';

/**
 * Prompt 队列管理组件
 *
 * @description 管理待发帖的 Prompts，支持批量导入、筛选、删除
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ListTodo,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Filter,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

import type { PromptQueueStatus, PersonaCategory } from '@/shared/types/virtual-persona';

// ============================================
// 类型定义
// ============================================

interface QueueItem {
  id: string;
  prompt: string;
  category: PersonaCategory | null;
  status: PromptQueueStatus;
  priority: number;
  source: string;
  assignedPersonaId: string | null;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface QueueStats {
  total: number;
  pending: number;
  assigned: number;
  processing: number;
  completed: number;
  failed: number;
}

interface CategoryStats {
  category: PersonaCategory | null;
  count: number;
}

// ============================================
// 常量
// ============================================

const STATUS_CONFIG: Record<PromptQueueStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: '待处理', icon: <Clock className="w-3 h-3" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  assigned: { label: '已分配', icon: <AlertCircle className="w-3 h-3" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  processing: { label: '处理中', icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  completed: { label: '已完成', icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  failed: { label: '失败', icon: <XCircle className="w-3 h-3" />, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const CATEGORY_LABELS: Record<PersonaCategory, string> = {
  'photography': '商业视觉',
  'art-illustration': '游戏插画',
  'design': '品牌设计',
  'commercial-product': '电商产品',
  'character-design': 'IP角色',
  'experimental': '灵感创作',
  'infographic': '信息图表',
  'indie-illustration': '独立插画',
  '3d-visualization': '3D可视化',
};

// ============================================
// 主组件
// ============================================

export function PromptQueueManager() {
  // 数据状态
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<PromptQueueStatus | 'all'>('all');

  // 导入对话框
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importCategory, setImportCategory] = useState<PersonaCategory | 'auto'>('auto');
  const [importing, setImporting] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/admin/prompt-queue?${params}`);
      if (!response.ok) throw new Error('Failed to load');

      const result = await response.json() as {
        code: number;
        data?: {
          items: QueueItem[];
          stats: QueueStats;
          pagination: { totalPages: number };
        };
      };

      if (result.code === 0 && result.data) {
        setItems(result.data.items);
        setStats(result.data.stats);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Load queue failed:', error);
      toast.error('加载队列失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  // 加载分类统计
  const loadCategoryStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/prompt-queue?statsOnly=true');
      if (!response.ok) throw new Error('Failed to load');

      const result = await response.json() as {
        code: number;
        data?: { categoryStats: CategoryStats[] };
      };

      if (result.code === 0 && result.data) {
        setCategoryStats(result.data.categoryStats);
      }
    } catch (error) {
      console.error('Load category stats failed:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadCategoryStats();
  }, [loadData, loadCategoryStats]);

  // 批量导入
  const handleImport = async () => {
    if (!importText.trim()) {
      toast.error('请输入 Prompts');
      return;
    }

    setImporting(true);
    try {
      // 按行分割，过滤空行
      const prompts = importText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(prompt => ({
          prompt,
          category: importCategory === 'auto' ? undefined : importCategory,
          priority: 5,
          source: 'admin-import',
        }));

      if (prompts.length === 0) {
        toast.error('没有有效的 Prompts');
        return;
      }

      const response = await fetch('/api/admin/prompt-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts }),
      });

      const result = await response.json() as { code: number; data?: { created: number } };

      if (result.code === 0) {
        toast.success(`成功导入 ${result.data?.created || prompts.length} 个 Prompts`);
        setImportOpen(false);
        setImportText('');
        loadData();
        loadCategoryStats();
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 删除单个
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/prompt-queue?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      toast.success('已删除');
      loadData();
      loadCategoryStats();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('删除失败');
    }
  };

  // 清理失败任务
  const handleCleanupFailed = async () => {
    try {
      const response = await fetch('/api/admin/prompt-queue?cleanupDays=7', {
        method: 'DELETE',
      });

      const result = await response.json() as { code: number; data?: { deletedCount: number } };

      if (result.code === 0) {
        toast.success(`已清理 ${result.data?.deletedCount || 0} 个失败任务`);
        loadData();
        loadCategoryStats();
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('清理失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">总计</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">待处理</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
              <div className="text-sm text-muted-foreground">已分配</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.processing}</div>
              <div className="text-sm text-muted-foreground">处理中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">已完成</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">失败</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 分类统计 */}
      {categoryStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">分类分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categoryStats.map((cat) => (
                <Badge key={cat.category || 'uncategorized'} variant="outline" className="text-sm">
                  {cat.category ? CATEGORY_LABELS[cat.category] : '未分类'}
                  <span className="ml-1.5 font-mono">{cat.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as PromptQueueStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <SelectItem key={status} value={status}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {stats && stats.failed > 0 && (
            <Button variant="outline" size="sm" onClick={handleCleanupFailed}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              清理失败任务
            </Button>
          )}

          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                批量导入
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>批量导入 Prompts</DialogTitle>
                <DialogDescription>
                  每行一个 Prompt，支持批量导入
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="在此粘贴 Prompts，每行一个..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">分类</label>
                  <Select
                    value={importCategory}
                    onValueChange={(v) => setImportCategory(v as PersonaCategory | 'auto')}
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
                <div className="text-sm text-muted-foreground">
                  预计导入: {importText.split('\n').filter(l => l.trim()).length} 个 Prompts
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Upload className="w-4 h-4 mr-1.5" />
                  )}
                  导入
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 队列列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Prompt</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const statusConfig = STATUS_CONFIG[item.status];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="max-w-[400px] truncate" title={item.prompt}>
                          {item.prompt}
                        </div>
                        {item.errorMessage && (
                          <div className="text-xs text-red-500 mt-1 truncate">
                            {item.errorMessage}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.category ? (
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[item.category]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">未分类</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusConfig.color}`}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{item.priority}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
