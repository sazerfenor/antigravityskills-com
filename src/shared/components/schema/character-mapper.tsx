'use client';

import { useState, useCallback } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

export interface CharacterRole {
  imageIndex: number;
  roleName: string;
  imageDataUrl?: string;
}

export interface CharacterMapperProps {
  images: { index: number; dataUrl: string }[];
  value: CharacterRole[];
  onChange: (roles: CharacterRole[]) => void;
  className?: string;
}

/**
 * CharacterMapper Component
 * 
 * Allows users to assign roles to multiple face images for multi-character generation.
 * Displays image thumbnails with editable role names.
 */
export function CharacterMapper({
  images,
  value,
  onChange,
  className,
}: CharacterMapperProps) {
  // Initialize roles from images if value is empty
  const roles = value.length > 0 ? value : images.map((img, idx) => ({
    imageIndex: img.index,
    roleName: idx === 0 ? 'Primary' : idx === 1 ? 'Secondary' : `Character ${idx + 1}`,
    imageDataUrl: img.dataUrl,
  }));

  const handleRoleNameChange = useCallback((imageIndex: number, newName: string) => {
    const updatedRoles = roles.map(role => 
      role.imageIndex === imageIndex 
        ? { ...role, roleName: newName }
        : role
    );
    onChange(updatedRoles);
  }, [roles, onChange]);

  if (images.length < 2) {
    return (
      <div className={cn("text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg", className)}>
        <p>需要上传至少 2 张人脸图片才能使用角色分配功能</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">角色分配</Label>
        <Badge variant="secondary" className="text-xs">
          {images.length} 张人脸
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img, idx) => {
          const role = roles.find(r => r.imageIndex === img.index) || {
            imageIndex: img.index,
            roleName: idx === 0 ? 'Primary' : `Character ${idx + 1}`,
          };
          
          return (
            <div
              key={img.index}
              className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              {/* Image Thumbnail */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30">
                <img
                  src={img.dataUrl}
                  alt={`Character ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
              </div>
              
              {/* Role Name Input */}
              <Input
                value={role.roleName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRoleNameChange(img.index, e.target.value)}
                placeholder="角色名称"
                className="text-center text-sm h-8 px-2"
              />
            </div>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground">
        点击角色名称可编辑。生成时会自动将对应人脸应用到指定角色。
      </p>
    </div>
  );
}

export default CharacterMapper;
