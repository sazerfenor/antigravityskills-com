'use client';

/**
 * Export Button Component
 *
 * 导出按钮：下载 ZIP 文件
 */

import { Button } from '@/shared/components/ui/button';
import { Download, RotateCcw } from 'lucide-react';

interface ExportButtonProps {
  onDownload: () => void;
  onReset: () => void;
  skillName: string;
}

export function ExportButton({
  onDownload,
  onReset,
  skillName,
}: ExportButtonProps) {
  return (
    <div className="flex gap-3">
      <Button onClick={onDownload} className="flex-1" size="lg">
        <Download className="w-4 h-4 mr-2" />
        Download {skillName}.zip
      </Button>
      <Button onClick={onReset} variant="outline" size="lg">
        <RotateCcw className="w-4 h-4 mr-2" />
        New Skill
      </Button>
    </div>
  );
}
