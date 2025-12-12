'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface VoteVerificationProps {
  proposalId: string;
  onChainId: number | null;
}

interface VerificationData {
  voted: boolean;
  voteType?: string;
  transactionHash?: string;
  transactionUrl?: string;
  blockNumber?: number;
  timestamp?: string;
}

export function VoteVerification({ proposalId, onChainId }: VoteVerificationProps) {
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyVote = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/verify-vote`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const data = await response.json();
      setVerificationData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!onChainId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Vote Verification</CardTitle>
          <CardDescription>Only available for on-chain proposals</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Verify Your Vote</CardTitle>
        <CardDescription>
          Check if your vote was recorded on the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!verificationData ? (
          <Button
            onClick={verifyVote}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify My Vote'
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            {verificationData.voted ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700">Vote Verified On-Chain</span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your vote:</span>
                    <Badge variant={verificationData.voteType === 'UPVOTE' ? 'default' : 'destructive'} className={verificationData.voteType === 'UPVOTE' ? 'bg-green-600 hover:bg-green-700' : ''}>
                      {verificationData.voteType}
                    </Badge>
                  </div>

                  {verificationData.transactionHash && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Transaction:</span>
                      <Link
                        href={verificationData.transactionUrl || '#'}
                        target="_blank"
                        className="flex items-center gap-1 text-blue-500 hover:underline"
                      >
                        View on Etherscan
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Block:</span>
                    <span className="font-mono text-xs">{verificationData.blockNumber}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span className="text-xs">{verificationData.timestamp ? new Date(verificationData.timestamp).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">No vote found for this proposal</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
