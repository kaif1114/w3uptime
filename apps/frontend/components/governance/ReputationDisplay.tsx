'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Info, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ReputationClaimModal } from './ReputationClaimModal';
import { useSession } from '@/hooks/useSession';

interface ReputationData {
  earned: number;
  claimed: number;
  available: number;
  onChainBalance: number | null;
  breakdown: {
    totalScore: number;
    validatorScore: number;
    customerScore: number;
    monitorScore: number;
    depositScore: number;
    ageScore: number;
  };
}

interface ReputationDisplayProps {
  showClaimButton?: boolean;
  className?: string;
  onClaim?: () => void;
}

async function fetchReputationData(): Promise<ReputationData> {
  const response = await fetch('/api/reputation', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch reputation');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch reputation');
  }

  return result.data as ReputationData;
}

export function ReputationDisplay({
  showClaimButton = true,
  className,
  onClaim
}: ReputationDisplayProps) {
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const { data: session } = useSession();

  const { data: reputation, isLoading, error } = useQuery({
    queryKey: ['reputation-with-claiming'],
    queryFn: fetchReputationData,
    staleTime: 1000 * 30, // 30 seconds to align with on-chain cache
    gcTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error || !reputation) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">Failed to load reputation data</p>
        </CardContent>
      </Card>
    );
  }

  const { earned, claimed, available, onChainBalance } = reputation;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reputation Points</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Reputation is earned through validator performance, governance participation, and platform activity. Claim your reputation on-chain to unlock voting rights and governance features.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>Track your earned and claimable reputation</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Earned Points */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">All-Time Earned:</span>
          <Badge variant="secondary">{earned} points</Badge>
        </div>

        {/* Available to Claim */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Available to claim:</span>
          <Badge variant={available > 0 ? "default" : "outline"}>
            {available} points
          </Badge>
        </div>

        {/* On-chain Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">On-Chain Balance:</span>
          {onChainBalance === null ? (
            <Badge variant="outline" className="text-xs">
              Contract unavailable
            </Badge>
          ) : (
            <Badge variant="outline">{onChainBalance} points</Badge>
          )}
        </div>

        {/* Reputation Breakdown */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Breakdown:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validator:</span>
              <span>{reputation.breakdown.validatorScore}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span>{reputation.breakdown.customerScore}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monitors:</span>
              <span>{reputation.breakdown.monitorScore}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposits:</span>
              <span>{reputation.breakdown.depositScore}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Age:</span>
              <span>{reputation.breakdown.ageScore}</span>
            </div>
          </div>
        </div>

        {/* Claim Button */}
        {showClaimButton && available > 0 && (
          <Button
            className="w-full"
            onClick={() => {
              if (onClaim) {
                onClaim();
              } else {
                setClaimModalOpen(true);
              }
            }}
          >
            Claim {available} Points
          </Button>
        )}

        {showClaimButton && available === 0 && claimed > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            All earned reputation has been claimed
          </p>
        )}
      </CardContent>

      {/* Reputation Claim Modal */}
      <ReputationClaimModal
        open={claimModalOpen}
        onOpenChange={setClaimModalOpen}
        availableReputation={available}
        userAddress={session?.user?.walletAddress || ''}
      />
    </Card>
  );
}
