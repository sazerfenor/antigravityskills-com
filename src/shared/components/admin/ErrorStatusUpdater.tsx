'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { ErrorReportStatus } from '@/shared/models/error_report';

/**
 * 错误状态更新组件
 */
export function ErrorStatusUpdater({
  errorId,
  currentStatus,
  currentResolution,
}: {
  errorId: string;
  currentStatus: string;
  currentResolution?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [resolution, setResolution] = useState(currentResolution || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/admin/errors/${errorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          resolution: resolution || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update error status');
      }

      toast.success('Error status updated successfully');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <h3 className="text-lg font-semibold">Update Status</h3>

      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ErrorReportStatus.PENDING}>Pending</SelectItem>
            <SelectItem value={ErrorReportStatus.INVESTIGATING}>
              Investigating
            </SelectItem>
            <SelectItem value={ErrorReportStatus.RESOLVED}>Resolved</SelectItem>
            <SelectItem value={ErrorReportStatus.CLOSED}>Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Resolution Notes</label>
        <Textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="Add notes about the resolution..."
          rows={4}
        />
      </div>

      <Button onClick={handleUpdate} disabled={isUpdating} className="w-full">
        {isUpdating ? 'Updating...' : 'Update Status'}
      </Button>
    </div>
  );
}
