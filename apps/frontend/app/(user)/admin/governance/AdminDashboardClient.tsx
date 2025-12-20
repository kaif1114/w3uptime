'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface AdminDashboardClientProps {
  initialStats: {
    pendingCount: number;
    recentFinalizations: number;
    successfulFinalizations: number;
    failedFinalizations: number;
    successRate: string;
    avgGasCost: number;
  } | null;
  initialErrors: {
    errors: Array<{
      proposalId: string;
      onChainId: number | null;
      title: string;
      votingEndsAt: Date | null;
      hoursOverdue: number;
      severity: 'low' | 'medium' | 'high';
      message: string;
      category: string;
    }>;
    totalErrors: number;
  } | null;
}

export function AdminDashboardClient({
  initialStats,
  initialErrors,
}: AdminDashboardClientProps) {
  const [finalizingProposals, setFinalizingProposals] = useState<Set<string>>(
    new Set()
  );

  const handleManualFinalize = async (proposalId: string) => {
    setFinalizingProposals((prev) => new Set(prev).add(proposalId));

    try {
      const response = await fetch('/api/admin/governance/finalize-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Finalization failed');
      }

      toast.success('Success', {
        description: (
          <div className="space-y-2">
            <p>{data.data.message}</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${data.data.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center gap-1 text-sm"
            >
              View on Etherscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ),
      });

      // Refresh the page after 2 seconds
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast.error('Finalization Failed', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setFinalizingProposals((prev) => {
        const next = new Set(prev);
        next.delete(proposalId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alerts */}
      {initialErrors && initialErrors.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Finalization Errors ({initialErrors.totalErrors})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {initialErrors.errors.map((error) => (
                <Alert
                  key={error.proposalId}
                  variant={
                    error.severity === 'high' ? 'destructive' : 'default'
                  }
                >
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{error.title}</span>
                          <Badge
                            variant={
                              error.severity === 'high'
                                ? 'destructive'
                                : error.severity === 'medium'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {error.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {error.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          On-chain ID: {error.onChainId || 'N/A'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleManualFinalize(error.proposalId)}
                        disabled={finalizingProposals.has(error.proposalId)}
                      >
                        {finalizingProposals.has(error.proposalId) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Finalizing...
                          </>
                        ) : (
                          'Finalize Now'
                        )}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Finalizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {initialStats && initialStats.recentFinalizations > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>
                    {initialStats.successfulFinalizations} Successful
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span>{initialStats.failedFinalizations} Failed</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Last 30 days - {initialStats.successRate}% success rate
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recent finalizations found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Platform Wallet Monitor */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Monitor wallet balance to ensure sufficient funds for finalization
              transactions.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Sepolia Testnet</Badge>
              <span className="text-xs text-muted-foreground">
                Ensure wallet has sufficient ETH for gas fees
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
