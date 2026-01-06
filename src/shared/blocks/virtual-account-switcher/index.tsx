'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { UserCircle, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VirtualAuthor {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  category: string;
  tags: string[];
  matchedPromptIds: string[];
}

export function VirtualAccountSwitcher() {
  const [virtualAuthors, setVirtualAuthors] = useState<VirtualAuthor[]>([]);
  const [currentImpersonation, setCurrentImpersonation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  useEffect(() => {
    loadVirtualAuthors();
    checkCurrentImpersonation();
  }, []);

  async function loadVirtualAuthors() {
    try {
      const response = await fetch('/api/admin/virtual-authors');
      if (!response.ok) throw new Error('Failed to load');
      const result = await response.json() as { data?: { virtualAuthors?: VirtualAuthor[] } };
      setVirtualAuthors(result.data?.virtualAuthors || []);
    } catch (error) {
      console.error('Failed to load virtual authors:', error);
      toast.error('加载虚拟作者失败');
    }
  }

  async function checkCurrentImpersonation() {
    try {
      const response = await fetch('/api/user/me');
      if (!response.ok) return;
      const result = await response.json() as { data?: { _isImpersonating?: boolean; email?: string } };
      
      if (result.data?._isImpersonating) {
        // 从 email 提取 username: virtual+{username}@... -> username
        const email = result.data.email || '';
        const username = email.replace('virtual+', '').split('@')[0];
        setCurrentImpersonation(username);
      }
    } catch (error) {
      console.error('Failed to check impersonation:', error);
    }
  }

  async function switchToAuthor(username: string) {
    setSwitchingTo(username);
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username }),
      });

      const data = await response.json() as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Switch failed');
      }

      toast.success(`✅ ${data.message}`);
      setCurrentImpersonation(username);
      
      // 刷新页面以应用新身份
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Switch error:', error);
      toast.error(error.message || '切换失败');
    } finally {
      setSwitchingTo(null);
    }
  }

  async function exitImpersonation() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE',
      });

      const data = await response.json() as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Exit failed');
      }

      toast.success(`✅ ${data.message}`);
      setCurrentImpersonation(null);
      
      // 刷新页面回到管理员身份
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Exit error:', error);
      toast.error(error.message || '退出失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCircle className="h-8 w-8" />
          虚拟作者账号池
        </h1>
        <p className="text-muted-foreground mt-2">
          Super Admin 专用：一键切换到任何虚拟作者身份发布内容
        </p>
      </div>

      {/* Current Status */}
      {currentImpersonation && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-semibold text-orange-900 dark:text-orange-100">
                    当前模拟中: @{currentImpersonation}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">
                    你现在以此虚拟作者身份操作
                  </div>
                </div>
              </div>
              <Button
                onClick={exitImpersonation}
                disabled={loading}
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    退出中...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    退出模拟
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Virtual Authors Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {virtualAuthors.map((author) => {
          const isActive = currentImpersonation === author.username;
          const isSwitching = switchingTo === author.username;

          return (
            <Card 
              key={author.id} 
              className={`flex flex-col h-full ${isActive ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {author.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{author.displayName}</CardTitle>
                      <CardDescription className="text-sm">
                        @{author.username}
                      </CardDescription>
                    </div>
                  </div>
                  {isActive && (
                    <Badge variant="default" className="bg-green-600">
                      使用中
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Bio - 固定高度区域 */}
                <div className="text-sm text-muted-foreground line-clamp-3 min-h-[4.5rem]">
                  {author.bio}
                </div>

                {/* Tags - 可选显示 */}
                {author.tags && author.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {author.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Prompts 数量 */}
                <div className="text-xs text-muted-foreground mt-3">
                  管理 {author.matchedPromptIds?.length || 0} 个 Prompts
                </div>

                {/* 按钮 - 始终在底部 */}
                <div className="mt-auto pt-4">
                  <Button
                    onClick={() => switchToAuthor(author.username)}
                    disabled={isActive || isSwitching}
                    className="w-full"
                    variant={isActive ? 'secondary' : 'default'}
                  >
                    {isSwitching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        切换中...
                      </>
                    ) : isActive ? (
                      '当前账号'
                    ) : (
                      <>
                        <UserCircle className="mr-2 h-4 w-4" />
                        切换到此账号
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 点击"切换到此账号"后，你将以该虚拟作者身份操作</p>
          <p>• 在该模式下发布的所有内容都会归属到虚拟作者</p>
          <p>• 完成后点击"退出模拟"回到你的管理员账号</p>
          <p>• 切换状态会保持 24 小时，或直到你手动退出</p>
        </CardContent>
      </Card>
    </div>
  );
}
