'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useClaimReputation } from '@/hooks/useClaimReputation';

interface ReputationClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableReputation: number; // Reputation points as number
  userAddress: string;
}

export function ReputationClaimModal({
  open,
  onOpenChange,
  availableReputation,
  userAddress
}: ReputationClaimModalProps) {
  const [currentStep, setCurrentStep] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const claimMutation = useClaimReputation();

  const hasReputation = availableReputation > 0;

  const handleClaim = async () => {
    try {
      const result = await claimMutation.mutateAsync({
        onProgress: (step: string) => setCurrentStep(step)
      });
      setTransactionHash(result.transactionHash);
    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  const handleClose = () => {
    if (!claimMutation.isPending) {
      onOpenChange(false);
      // Reset state after close animation
      setTimeout(() => {
        setTransactionHash(null);
        setCurrentStep('');
        claimMutation.reset();
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Reputation Rewards</DialogTitle>
          <DialogDescription>
            Convert your earned reputation points to on-chain balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Available Reputation Display */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available to Claim</span>
              <span className="text-2xl font-bold">{availableReputation} REP</span>
            </div>
          </div>

          {/* Transaction States */}
          {claimMutation.isPending && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription className="ml-2">
                {currentStep || 'Processing transaction...'}
              </AlertDescription>
            </Alert>
          )}

          {claimMutation.isSuccess && transactionHash && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2">
                <div className="space-y-2">
                  <p className="text-green-900 dark:text-green-100 font-medium">
                    Reputation claimed successfully!
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    View on Etherscan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {claimMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {claimMutation.error instanceof Error
                  ? claimMutation.error.message
                  : 'Failed to claim reputation. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {!hasReputation && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don&apos;t have any reputation available to claim yet.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={claimMutation.isPending}
          >
            {claimMutation.isSuccess ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleClaim}
            disabled={!hasReputation || claimMutation.isPending || claimMutation.isSuccess}
          >
            {claimMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {claimMutation.isSuccess ? 'Claimed' : 'Claim Reputation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

