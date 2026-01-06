'use client';

import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';

interface ReplyViaEmailButtonProps {
  userEmail: string;
  errorId: string;
  userFeedback?: string | null;
}

/**
 * Reply via Email按钮
 * 点击后打开默认邮件客户端，自动填充收件人和邮件内容
 */
export function ReplyViaEmailButton({
  userEmail,
  errorId,
  userFeedback,
}: ReplyViaEmailButtonProps) {
  const handleClick = () => {
    const subject = `Re: Error Report ${errorId}`;
    
    const body = `Hi,

Thank you for reporting this issue (${errorId}).

${userFeedback ? `Your feedback:
"${userFeedback}"

` : ''}I've looked into this and here's what I found:

[Your reply here]

Best regards,
Support Team`;

    // 使用mailto协议打开邮件客户端
    window.location.href = `mailto:${userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // 提示用户
    toast.success('Opening email client...', {
      description: `Composing email to ${userEmail}`,
    });
  };

  return (
    <Button onClick={handleClick} size="sm" variant="default">
      <Mail className="h-4 w-4 mr-2" />
      Reply via Email
    </Button>
  );
}
