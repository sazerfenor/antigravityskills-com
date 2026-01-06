'use client';

import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

interface CreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  creditCost: number;
  remainingCredits: number;
  isLoading?: boolean;
}

/**
 * Credit confirmation dialog (CBDS v3.2 compliant)
 * Shows before generation to confirm credit consumption.
 */
export function CreditDialog({
  open,
  onOpenChange,
  onConfirm,
  creditCost,
  remainingCredits,
  isLoading = false,
}: CreditDialogProps) {
  const hasEnoughCredits = remainingCredits >= creditCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cost</span>
            <span className="text-primary font-medium">~{creditCost} Credits</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className={hasEnoughCredits ? '' : 'text-destructive font-medium'}>
              {remainingCredits} Credits
            </span>
          </div>
          
          {!hasEnoughCredits && (
            <p className="text-sm text-destructive">
              Insufficient credits. At least {creditCost} credits required.
            </p>
          )}
        </div>
        
        <div className="flex gap-3 justify-end">
          <DialogClose asChild>
            <Button variant="ghost" disabled={isLoading}>Cancel</Button>
          </DialogClose>
          <Button 
            variant="glow-primary" 
            onClick={onConfirm}
            disabled={!hasEnoughCredits || isLoading}
          >
            {isLoading ? 'Generating...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
