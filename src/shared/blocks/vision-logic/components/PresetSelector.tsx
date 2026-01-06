/**
 * PresetSelector - 预设/模板选择器组件
 *
 * Features:
 * - 显示系统预设列表
 * - 显示用户自定义模板
 * - 保存当前状态为模板
 * - 删除用户模板
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ChevronDown, Star, User, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

// 预设项类型
interface PresetItem {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  thumbnailUrl: string | null;
  imageUrl: string;
  params: Record<string, unknown> | null;
}

interface PresetSelectorProps {
  // 当前用户（用于显示用户模板）
  userId?: string;
  // 选择预设时的回调
  onSelect: (preset: PresetItem) => void;
  // 保存模板时的回调（可选，提供时显示保存按钮）
  onSaveAsTemplate?: (name: string) => Promise<void>;
  // 是否显示下拉菜单
  open: boolean;
  setOpen: (open: boolean) => void;
  // 样式
  className?: string;
  // 触发按钮样式
  triggerClassName?: string;
  // 当前选中的预设（用于显示名称）
  currentPresetName?: string;
}

export function PresetSelector({
  userId,
  onSelect,
  onSaveAsTemplate,
  open,
  setOpen,
  className,
  triggerClassName,
  currentPresetName,
}: PresetSelectorProps) {
  // 预设数据
  const [systemPresets, setSystemPresets] = useState<PresetItem[]>([]);
  const [userTemplates, setUserTemplates] = useState<PresetItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // 保存模板对话框
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<PresetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 加载预设数据
  const loadPresets = async () => {
    if (hasLoaded) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/logic/presets');
      const data = await response.json() as {
        code: number;
        data?: { system: PresetItem[]; user: PresetItem[] };
      };

      if (data.code === 0 && data.data) {
        setSystemPresets(data.data.system || []);
        setUserTemplates(data.data.user || []);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('[PresetSelector] Failed to load presets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 当下拉菜单打开时加载数据
  useEffect(() => {
    if (open && !hasLoaded) {
      loadPresets();
    }
  }, [open, hasLoaded]);

  // 处理选择预设
  const handleSelect = (preset: PresetItem) => {
    onSelect(preset);
    setOpen(false);
  };

  // 处理保存模板
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!onSaveAsTemplate) return;

    setIsSaving(true);
    try {
      await onSaveAsTemplate(templateName.trim());
      toast.success('Template saved!');
      setShowSaveDialog(false);
      setTemplateName('');
      // 刷新列表
      setHasLoaded(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // 处理删除模板
  const handleDeleteTemplate = async (preset: PresetItem) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/logic/presets/${preset.id}`, {
        method: 'DELETE',
      });
      const data = await response.json() as { code: number; message?: string };

      if (data.code === 0) {
        toast.success('Template deleted');
        // 从列表中移除
        setUserTemplates(prev => prev.filter(t => t.id !== preset.id));
      } else {
        throw new Error(data.message || 'Failed to delete');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1 text-xs font-medium',
              triggerClassName
            )}
          >
            <Star className="w-3 h-3" />
            <span className="hidden sm:inline">
              {currentPresetName || 'Presets'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className={cn('w-56', className)}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}

          {/* System Presets */}
          {!isLoading && systemPresets.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Star className="w-3 h-3" />
                System Presets
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {systemPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => handleSelect(preset)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {preset.thumbnailUrl ? (
                        <img
                          src={preset.thumbnailUrl}
                          alt={preset.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                          <Star className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 truncate">{preset.name}</span>
                      {preset.category && (
                        <span className="text-[10px] text-muted-foreground">
                          {preset.category}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}

          {/* User Templates */}
          {!isLoading && userId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <User className="w-3 h-3" />
                My Templates
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {userTemplates.length > 0 ? (
                  userTemplates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      className="cursor-pointer group"
                    >
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => handleSelect(template)}
                      >
                        {template.thumbnailUrl ? (
                          <img
                            src={template.thumbnailUrl}
                            alt={template.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                        <span className="flex-1 truncate">{template.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(template);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                    No templates yet
                  </div>
                )}

                {/* Save as Template Button */}
                {onSaveAsTemplate && (
                  <DropdownMenuItem
                    onClick={() => {
                      setOpen(false);
                      setShowSaveDialog(true);
                    }}
                    className="cursor-pointer text-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Save Current as Template
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}

          {/* Empty State */}
          {!isLoading && systemPresets.length === 0 && userTemplates.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No presets available
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save your current form configuration as a reusable template.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="My Awesome Style"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    handleSaveTemplate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDeleteTemplate(deleteTarget)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { PresetItem, PresetSelectorProps };
