'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Progress } from '@/shared/components/ui/progress';
import { UserCircle, LogOut, RefreshCw, Loader2, ChevronDown, ChevronUp, Wrench, ThumbsDown, Zap } from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// 类型定义
// ============================================

interface PersonalityTraits {
  warmth: number;
  professionalism: number;
  humor: number;
  creativity: number;
  helpfulness: number;
}

interface VirtualAuthor {
  id: string;
  username: string;
  bio: string;
  category: string;
  image?: string;
  // 完整信息
  specialties: string[];
  styleKeywords: string[];
  workflowType: 'pure_ai' | 'ai_enhanced' | 'hybrid';
  workflowDescription: string;
  preferredTools: string[];
  dislikes: string[];
  personalityTraits: PersonalityTraits | null;
  communicationStyle: string;
  activityLevel: string;
}

// ============================================
// 常量
// ============================================

const CATEGORY_LABELS: Record<string, string> = {
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

const ACTIVITY_LABELS: Record<string, string> = {
  'low': '低',
  'moderate': '中',
  'high': '高',
  'very_high': '超高',
};

const WORKFLOW_LABELS: Record<string, string> = {
  'pure_ai': '纯 AI',
  'ai_enhanced': 'AI 辅助',
  'hybrid': '混合创作',
};

const COMMUNICATION_LABELS: Record<string, string> = {
  'formal': '正式',
  'casual': '随性',
  'enthusiastic': '热情',
  'reserved': '内敛',
};

const TRAIT_LABELS: Record<string, string> = {
  warmth: '热情',
  professionalism: '专业',
  humor: '幽默',
  creativity: '创意',
  helpfulness: '乐助',
};

const TRAIT_COLORS: Record<string, string> = {
  warmth: 'bg-green-500',
  professionalism: 'bg-blue-500',
  humor: 'bg-yellow-500',
  creativity: 'bg-purple-500',
  helpfulness: 'bg-red-500',
};

// ============================================
// 组件
// ============================================

export function VirtualAccountSwitcher() {
  const [virtualAuthors, setVirtualAuthors] = useState<VirtualAuthor[]>([]);
  const [currentImpersonation, setCurrentImpersonation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Exit error:', error);
      toast.error(error.message || '退出失败');
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
          const isExpanded = expandedIds.has(author.id);

          return (
            <Card
              key={author.id}
              className={`flex flex-col ${isActive ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {author.image && <AvatarImage src={author.image} alt={author.username} />}
                      <AvatarFallback>
                        {author.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{author.username}</CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Badge variant="default" className="bg-green-600">
                        使用中
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(author.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* 标签组 */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {author.category && (
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[author.category] || author.category}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    {ACTIVITY_LABELS[author.activityLevel] || author.activityLevel}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {COMMUNICATION_LABELS[author.communicationStyle] || author.communicationStyle}
                  </Badge>
                </div>

                {/* Bio */}
                <p className={`text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {author.bio}
                </p>

                {/* 展开的详细信息 */}
                {isExpanded && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-border">
                    {/* 工具与偏好 */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* 常用工具 */}
                      {author.preferredTools && author.preferredTools.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <Wrench className="w-3 h-3" />
                            常用工具
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {author.preferredTools.map((tool) => (
                              <Badge key={tool} variant="secondary" className="text-xs">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 不喜欢 */}
                      {author.dislikes && author.dislikes.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <ThumbsDown className="w-3 h-3" />
                            不喜欢
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {author.dislikes.map((item) => (
                              <Badge key={item} variant="outline" className="text-xs text-red-500 border-red-200">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 性格特质 */}
                    {author.personalityTraits && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">性格特质</div>
                        <div className="space-y-1.5">
                          {Object.entries(author.personalityTraits).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs w-8">{TRAIT_LABELS[key] || key}</span>
                              <Progress
                                value={value * 10}
                                className={`h-1.5 flex-1 ${TRAIT_COLORS[key] || 'bg-gray-500'}`}
                              />
                              <span className="text-xs w-4 text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 专长 */}
                    {author.specialties && author.specialties.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">专长领域</div>
                        <div className="flex flex-wrap gap-1">
                          {author.specialties.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
          <p>• 点击 ▼ 展开查看完整人格信息</p>
          <p>• 点击"切换到此账号"后，你将以该虚拟作者身份操作</p>
          <p>• 在该模式下发布的所有内容都会归属到虚拟作者</p>
          <p>• 完成后点击"退出模拟"回到你的管理员账号</p>
        </CardContent>
      </Card>
    </div>
  );
}
