'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Badge } from '@/shared/components/ui/badge';
import { ErrorReportStatus } from '@/shared/models/error_report';
import { ChevronDown, Loader2 } from 'lucide-react';

interface StatusDropdownProps {
  errorId: string;
  currentStatus: string;
}

/**
 * 状态下拉组件 - 快速更改错误状态
 */
export function StatusDropdown({ errorId, currentStatus }: StatusDropdownProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = [
    { value: ErrorReportStatus.PENDING, label: 'Pending', color: 'bg-orange-600' },
    { value: ErrorReportStatus.INVESTIGATING, label: 'Investigating', color: 'bg-blue-600' },
    { value: ErrorReportStatus.RESOLVED, label: 'Resolved', color: 'bg-green-600' },
    { value: ErrorReportStatus.CLOSED, label: 'Closed', color: 'bg-gray-600' },
  ];

  const currentOption = statusOptions.find((opt) => opt.value === currentStatus) || statusOptions[0];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/admin/errors/${errorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Status updated successfully');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
          disabled={isUpdating}
        >
          <Badge
            variant={currentStatus === ErrorReportStatus.RESOLVED ? 'default' : 'secondary'}
            className={`${currentOption.color} text-white`}
          >
            {isUpdating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {currentOption.label}
          </Badge>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${option.color}`} />
              <span>{option.label}</span>
              {option.value === currentStatus && (
                <span className="ml-auto text-xs text-gray-500">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
