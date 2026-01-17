'use client';

/**
 * Skill Preview Component
 *
 * 预览生成的 Skill：SKILL.md 内容、目录结构、验证评分
 */

import { useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { FileText, FolderTree, CheckCircle, AlertTriangle } from 'lucide-react';
import type { GenerationResult, SkillFile } from '../types';

interface SkillPreviewProps {
  result: GenerationResult;
}

export function SkillPreview({ result }: SkillPreviewProps) {
  const { skill, validation } = result;
  const [activeFile, setActiveFile] = useState<SkillFile | null>(
    skill.files.find(f => f.path === 'SKILL.md') || skill.files[0] || null
  );

  return (
    <div className="space-y-4">
      {/* Validation Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {validation.passed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
              Validation Score
            </CardTitle>
            <Badge variant={validation.passed ? 'default' : 'secondary'}>
              {validation.score.toFixed(1)} / 10
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {Object.entries(validation.dimensions).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{key}</span>
                <span className="font-mono">{value.toFixed(1)}</span>
              </div>
            ))}
          </div>
          {validation.issues.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Issues:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {validation.issues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Preview */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Structure
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          {/* File selector */}
          {skill.files.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {skill.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setActiveFile(file)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    activeFile?.path === file.path
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {file.path}
                </button>
              ))}
            </div>
          )}

          {/* File content */}
          {activeFile && (
            <pre className="p-4 rounded-lg bg-muted/50 overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto">
              {activeFile.content}
            </pre>
          )}
        </TabsContent>

        <TabsContent value="structure" className="mt-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="font-mono text-sm">
              <div className="flex items-center gap-2 text-primary">
                <FolderTree className="w-4 h-4" />
                {skill.name}/
              </div>
              {skill.files.map((file, i) => (
                <div key={file.path} className="ml-6 text-muted-foreground">
                  {i === skill.files.length - 1 ? '└── ' : '├── '}
                  {file.path}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
