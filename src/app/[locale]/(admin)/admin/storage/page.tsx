'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, Folder, File, ChevronRight, Home, Eye, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { toast } from 'sonner';

interface R2Object {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
}

interface R2ListResponse {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  totalCount: number;
  totalSize: number;
}

// Delete confirmation password (can be changed to use a config)
const DELETE_PASSWORD = 'delete123';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function isImageFile(fileName: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName);
}

// Group files by folder
function groupByFolder(objects: R2Object[], currentPrefix: string): {
  folders: string[];
  files: R2Object[];
} {
  const folders = new Set<string>();
  const files: R2Object[] = [];

  for (const obj of objects) {
    const relativePath = obj.key.slice(currentPrefix.length);
    const slashIndex = relativePath.indexOf('/');
    
    if (slashIndex > 0) {
      folders.add(relativePath.slice(0, slashIndex));
    } else if (relativePath) {
      files.push(obj);
    }
  }

  return {
    folders: Array.from(folders).sort(),
    files: files.sort((a, b) => a.key.localeCompare(b.key)),
  };
}

// Image Preview Modal
function ImagePreviewModal({ 
  imageUrl, 
  fileName, 
  onClose 
}: { 
  imageUrl: string; 
  fileName: string; 
  onClose: () => void; 
}) {
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-10 right-0 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
        <div className="bg-background rounded-lg p-2">
          <img 
            src={imageUrl} 
            alt={fileName}
            className="max-w-full max-h-[80vh] mx-auto rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="text-center text-sm text-muted-foreground mt-2 truncate">
            {fileName}
          </p>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (password !== DELETE_PASSWORD) {
      setError('密码错误！');
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-destructive">⚠️ 危险操作确认</h3>
        <p className="text-muted-foreground mb-4">{message}</p>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            请输入管理员密码以确认删除：
          </label>
          <Input
            type="password"
            placeholder="输入密码..."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            className={error ? 'border-destructive' : ''}
          />
          {error && <p className="text-destructive text-sm mt-1">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function StorageManagementPage() {
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefix, setPrefix] = useState('');
  const [totalSize, setTotalSize] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [r2Domain, setR2Domain] = useState('');

  const fetchObjects = useCallback(async (prefixPath: string = '') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/storage/list?prefix=${encodeURIComponent(prefixPath)}&limit=1000`);
      const data = await response.json() as { code: number; data?: R2ListResponse & { domain?: string }; message?: string };
      
      if (data.code === 0 && data.data) {
        setObjects(data.data.objects);
        setTotalSize(data.data.totalSize);
        if (data.data.domain) {
          setR2Domain(data.data.domain);
        }
      } else {
        toast.error(data.message || 'Failed to load storage');
      }
    } catch (error) {
      toast.error('Failed to fetch storage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObjects(prefix);
  }, [prefix, fetchObjects]);

  const executeDelete = async (key: string) => {
    try {
      const response = await fetch('/api/admin/storage/list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await response.json() as { code: number; message?: string };
      
      if (data.code === 0) {
        toast.success('已删除');
        fetchObjects(prefix);
        setSelected(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleDelete = (key: string) => {
    const fileName = key.split('/').pop() || key;
    setDeleteConfirm({
      message: `确定要删除 "${fileName}" 吗？此操作不可撤销。`,
      onConfirm: () => {
        setDeleteConfirm(null);
        executeDelete(key);
      },
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    
    setDeleteConfirm({
      message: `确定要删除选中的 ${selected.size} 个文件吗？此操作不可撤销。`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        for (const key of selected) {
          await executeDelete(key);
        }
        setSelected(new Set());
      },
    });
  };

  const handleDeleteFolder = (folder: string) => {
    const folderPrefix = prefix + folder + '/';
    const folderFiles = objects.filter(obj => obj.key.startsWith(folderPrefix));
    
    if (folderFiles.length === 0) {
      toast.error('文件夹为空');
      return;
    }

    setDeleteConfirm({
      message: `确定要删除文件夹 "${folder}" 及其中的 ${folderFiles.length} 个文件吗？此操作不可撤销。`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        setLoading(true);
        let deleted = 0;
        
        for (const file of folderFiles) {
          try {
            const response = await fetch('/api/admin/storage/list', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: file.key }),
            });
            const data = await response.json() as { code: number };
            if (data.code === 0) {
              deleted++;
            }
          } catch (error) {
            console.error('Delete failed:', file.key);
          }
        }

        toast.success(`已删除 ${deleted} 个文件`);
        fetchObjects(prefix);
      },
    });
  };

  const handlePreviewImage = (obj: R2Object) => {
    if (!r2Domain) {
      toast.error('R2 域名未配置，无法预览');
      return;
    }
    const imageUrl = `${r2Domain}/${obj.key}`;
    const fileName = obj.key.split('/').pop() || obj.key;
    setPreviewImage({ url: imageUrl, name: fileName });
  };

  const navigateToFolder = (folder: string) => {
    setPrefix(prefix + folder + '/');
    setSelected(new Set());
  };

  const navigateUp = () => {
    const parts = prefix.split('/').filter(Boolean);
    parts.pop();
    setPrefix(parts.length > 0 ? parts.join('/') + '/' : '');
    setSelected(new Set());
  };

  const navigateToRoot = () => {
    setPrefix('');
    setSelected(new Set());
  };

  const { folders, files } = groupByFolder(objects, prefix);
  const breadcrumbs = prefix.split('/').filter(Boolean);

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage.url}
          fileName={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          message={deleteConfirm.message}
          onConfirm={deleteConfirm.onConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">R2 存储管理</h1>
          <p className="text-muted-foreground text-sm mt-1">
            共 {objects.length} 个对象，总大小 {formatBytes(totalSize)}
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              删除 ({selected.size})
            </Button>
          )}
          <Button variant="outline" onClick={() => fetchObjects(prefix)}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 mb-4 text-sm bg-muted/50 rounded-lg px-3 py-2">
        <Button variant="ghost" size="sm" onClick={navigateToRoot} className="h-7 px-2">
          <Home className="w-4 h-4" />
        </Button>
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                const newPrefix = breadcrumbs.slice(0, index + 1).join('/') + '/';
                setPrefix(newPrefix);
              }}
            >
              {crumb}
            </Button>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === files.length && files.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(files.map(f => f.key)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">名称</th>
                <th className="px-4 py-3 text-left font-medium w-32">大小</th>
                <th className="px-4 py-3 text-left font-medium w-48">修改时间</th>
                <th className="px-4 py-3 text-left font-medium w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {/* Back navigation */}
              {prefix && (
                <tr 
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={navigateUp}
                >
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-500" />
                    <span>..</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">-</td>
                  <td className="px-4 py-3 text-muted-foreground">-</td>
                  <td className="px-4 py-3">-</td>
                </tr>
              )}

              {/* Folders */}
              {folders.map((folder) => (
                <tr
                  key={folder}
                  className="border-t hover:bg-muted/30"
                >
                  <td className="px-4 py-3"></td>
                  <td 
                    className="px-4 py-3 flex items-center gap-2 cursor-pointer"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <Folder className="w-5 h-5 text-yellow-500" />
                    <span>{folder}/</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">-</td>
                  <td className="px-4 py-3 text-muted-foreground">-</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}

              {/* Files */}
              {files.map((obj) => {
                const fileName = obj.key.split('/').pop() || obj.key;
                const isImage = isImageFile(fileName);
                
                return (
                  <tr key={obj.key} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(obj.key)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) {
                            next.add(obj.key);
                          } else {
                            next.delete(obj.key);
                          }
                          setSelected(next);
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <File className="w-5 h-5 text-gray-500" />
                        <span className="truncate max-w-md" title={obj.key}>
                          {fileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatBytes(obj.size)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {formatDate(obj.lastModified)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {isImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:text-blue-600"
                            onClick={() => handlePreviewImage(obj)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(obj.key);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {folders.length === 0 && files.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    此目录为空
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
