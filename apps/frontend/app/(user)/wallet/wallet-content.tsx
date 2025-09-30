"use client"

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ExternalLink, Wallet, Clock, Hash } from 'lucide-react';
import { DepositForm } from '@/components/deposit-form';
import { useDepositHistory, useUserBalance, useRefreshDeposits } from '@/hooks/useDeposits';
import { useSession } from '@/hooks/useSession';
import { formatDepositAmount } from 'common/contract';
import { format } from 'date-fns';

export function WalletContent() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: balanceData, isLoading: balanceLoading } = useUserBalance();
  const { 
    data: historyData, 
    isLoading: historyLoading, 
    error: historyError,
    refetch: refetchHistory
  } = useDepositHistory({ page: 1, limit: 20 });
  
  const refreshDeposits = useRefreshDeposits();

  const handleDepositSuccess = (transactionHash: string) => {
    console.log('Deposit successful:', transactionHash);
    // Refresh data after successful deposit
    setTimeout(() => {
      refreshDeposits();
    }, 5000); // Wait 5 seconds for event processing
  };

  const handleDepositError = (error: string) => {
    console.error('Deposit error:', error);
  };

  const handleRefresh = () => {
    refreshDeposits();
    refetchHistory();
  };

  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session?.authenticated) {
    return (
      <Alert>
        <AlertDescription>
          Please log in to access your wallet.
        </AlertDescription>
      </Alert>
    );
  }

  const userBalance = balanceData || session.user?.balance || 0;
  const balanceInEth = userBalance / 1000; // Convert from stored balance (1000 = 1 SepoliaETH)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Deposit Form */}
      <div className="space-y-6">
        <DepositForm 
          onSuccess={handleDepositSuccess}
          onError={handleDepositError}
        />

        {/* Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balanceLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `${balanceInEth.toFixed(4)} SepoliaETH`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for monitoring services
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deposit History */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Deposit History</CardTitle>
              <CardDescription>
                Your recent SepoliaETH deposits
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={historyLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : historyError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load deposit history. Please try again.
                </AlertDescription>
              </Alert>
            ) : !historyData?.data.deposits.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No deposits found</p>
                <p className="text-sm">Make your first deposit to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.data.deposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell className="font-medium">
                          <Badge variant="secondary">
                            {formatDepositAmount(BigInt(deposit.amount))} SepoliaETH
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(deposit.createdAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {deposit.transactionHash.slice(0, 8)}...{deposit.transactionHash.slice(-6)}
                            </span>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${deposit.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </a>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {historyData.data.pagination.totalPages > 1 && (
                  <div className="flex justify-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {historyData.data.deposits.length} of {historyData.data.pagination.total} deposits
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}