'use client';

import { ReactNode } from 'react';
import { CopyIcon } from 'lucide-react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { toast } from 'sonner';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

export function Copy({
  value,
  placeholder,
  metadata,
  className,
  children,
}: {
  value: string;
  placeholder?: string;
  metadata?: Record<string, any>;
  className?: string;
  children: ReactNode;
}) {
  // Truncate if children is a string and too long
  const shouldTruncate = typeof children === 'string' && children.length > 100;
  const displayText = shouldTruncate 
    ? `${(children as string).substring(0, 100)}...` 
    : children;

  const handleCopy = () => {
    toast.success(metadata?.message ?? 'Copied');
  };

  const content = (
    <div className={`flex cursor-pointer items-center gap-2 ${className}`}>
      <span className="max-w-xs truncate">{displayText}</span>
      <CopyIcon className="h-3 w-3 flex-shrink-0" />
    </div>
  );

  // Wrap with tooltip if truncated
  if (shouldTruncate) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <CopyToClipboard text={value} onCopy={handleCopy}>
                {content}
              </CopyToClipboard>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-md break-words">
            <p className="whitespace-pre-wrap">{children}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <CopyToClipboard text={value} onCopy={handleCopy}>
      {content}
    </CopyToClipboard>
  );
}
