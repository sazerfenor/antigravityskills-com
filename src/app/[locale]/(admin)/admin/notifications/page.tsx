'use client';

import { useState, useEffect } from 'react';
import { Send, RotateCcw, Bell, Users, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';

interface NotificationBatch {
  batchId: string;
  previewText: string;
  link: string | null;
  createdAt: string;
  isRecalled: boolean;
  count: number;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export default function AdminNotificationsPage() {
  // 发送表单状态
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [userIds, setUserIds] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // 历史列表状态
  const [history, setHistory] = useState<NotificationBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalling, setRecalling] = useState<string | null>(null);

  // 加载历史
  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications?page=1&limit=50');
      const data: ApiResponse<{ notifications: NotificationBatch[] }> = await res.json();
      if (data.code === 0) {
        setHistory(data.data.notifications);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  // 发送通知
  async function handleSend() {
    if (!message.trim()) {
      setSendResult({ success: false, message: '请输入通知内容' });
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const body: any = {
        message: message.trim(),
        link: link.trim() || undefined,
      };

      if (targetType === 'specific' && userIds.trim()) {
        body.userIds = userIds.split(',').map((id) => id.trim()).filter(Boolean);
      }

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: ApiResponse<{ sentCount: number }> = await res.json();
      if (data.code === 0) {
        setSendResult({
          success: true,
          message: `成功发送 ${data.data.sentCount} 条通知`,
        });
        setMessage('');
        setLink('');
        setUserIds('');
        loadHistory();
      } else {
        setSendResult({ success: false, message: data.message });
      }
    } catch (error: any) {
      setSendResult({ success: false, message: error.message });
    } finally {
      setSending(false);
    }
  }

  // 撤回通知
  async function handleRecall(batchId: string) {
    setRecalling(batchId);
    try {
      const res = await fetch(`/api/admin/notifications/${batchId}/recall`, {
        method: 'POST',
      });
      const data: ApiResponse<null> = await res.json();
      if (data.code === 0) {
        setHistory((prev) =>
          prev.map((item) =>
            item.batchId === batchId ? { ...item, isRecalled: true } : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to recall:', error);
    } finally {
      setRecalling(null);
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          通知管理
        </h1>
        <p className="text-muted-foreground mt-2">
          发送系统通知给用户，支持批量发送和撤回
        </p>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="send">发送通知</TabsTrigger>
          <TabsTrigger value="history">发送历史</TabsTrigger>
        </TabsList>

        {/* 发送通知 Tab */}
        <TabsContent value="send" className="space-y-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                发送新通知
              </CardTitle>
              <CardDescription>
                向用户发送系统通知，可选择发送给所有用户或指定用户
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 发送对象 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">发送对象</label>
                <Select
                  value={targetType}
                  onValueChange={(v) => setTargetType(v as 'all' | 'specific')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        全部用户
                      </div>
                    </SelectItem>
                    <SelectItem value="specific">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        指定用户
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 指定用户 ID */}
              {targetType === 'specific' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">用户 ID（多个用逗号分隔）</label>
                  <Input
                    placeholder="user-id-1, user-id-2, ..."
                    value={userIds}
                    onChange={(e) => setUserIds(e.target.value)}
                  />
                </div>
              )}

              {/* 通知内容 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">通知内容 *</label>
                <Textarea
                  placeholder="请输入通知内容..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* 跳转链接 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">跳转链接（可选）</label>
                <Input
                  placeholder="/prompts/xxx 或 https://..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>

              {/* 发送结果 */}
              {sendResult && (
                <div
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-md text-sm',
                    sendResult.success
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-red-500/10 text-red-600'
                  )}
                >
                  <AlertCircle className="h-4 w-4" />
                  {sendResult.message}
                </div>
              )}

              {/* 发送按钮 */}
              <Button
                className="w-full"
                onClick={handleSend}
                disabled={sending || !message.trim()}
              >
                {sending ? (
                  <>发送中...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    发送通知
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 发送历史 Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>发送历史</CardTitle>
              <CardDescription>
                查看已发送的通知，可撤回未读通知
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无发送记录
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.batchId}
                      className={cn(
                        'flex items-start justify-between gap-4 p-4 rounded-lg border',
                        item.isRecalled && 'opacity-50 bg-muted/50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">
                          {item.previewText}
                        </p>
                        {item.link && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            链接: {item.link}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            发送: {item.count} 人
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          {item.isRecalled && (
                            <span className="text-red-500">已撤回</span>
                          )}
                        </div>
                      </div>
                      {!item.isRecalled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRecall(item.batchId)}
                          disabled={recalling === item.batchId}
                        >
                          {recalling === item.batchId ? (
                            '撤回中...'
                          ) : (
                            <>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              撤回
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
