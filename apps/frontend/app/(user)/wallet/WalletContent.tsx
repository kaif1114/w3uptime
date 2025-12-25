"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { RefreshCw, ExternalLink, Wallet, MoreHorizontal, TrendingUp } from 'lucide-react';
import { DepositForm } from '@/components/DepositForm';
import { useDepositHistory, useRefreshDeposits } from '@/hooks/useDeposits';
import { useSession } from '@/hooks/useSession';
import { formatDepositAmount } from 'common/contract';
import { format } from 'date-fns';
import { ethers } from 'ethers';

export function WalletContent() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { 
    data: historyData, 
    isLoading: historyLoading, 
    error: historyError,
    refetch: refetchHistory
  } = useDepositHistory({ page: 1, limit: 20 });
  
  const refreshDeposits = useRefreshDeposits();

  const handleDepositSuccess = (transactionHash: string) => {
    console.log('Deposit successful:', transactionHash);
    
    setTimeout(() => {
      refreshDeposits();
    }, 5000); 
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

  const rawBalance = session.user?.balance ? BigInt(session.user.balance) : BigInt(0);

  return (
    <div className="space-y-8">
      
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-muted-foreground mb-2">Total Balance</h2>
              <div className="flex items-baseline gap-2">
                {sessionLoading ? (
                  <Skeleton className="h-16 w-64" />
                ) : (
                  <>
                    <span className="text-5xl font-bold">{ethers.formatEther(rawBalance)} SepoliaETH</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Available for monitoring</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <DepositForm 
                onSuccess={handleDepositSuccess}
                onError={handleDepositError}
                variant="button"
              />
             
            </div>
          </div>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Transaction history</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={historyLoading}
            >
              <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : historyError ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to load transaction history. Please try again.
                </AlertDescription>
              </Alert>
            </div>
          ) : !historyData?.data.deposits.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm">Make your first deposit to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="text-muted-foreground font-normal">Payment Method</TableHead>
                  <TableHead className="text-muted-foreground font-normal">Details</TableHead>
                  <TableHead className="text-muted-foreground font-normal">Date</TableHead>
                  <TableHead className="text-muted-foreground font-normal text-right">Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.data.deposits.map((deposit) => (
                  <TableRow key={deposit.id} className="border-b hover:bg-muted/50">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-primary rounded-lg flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-black" />
                        </div>
                        <div>
                          <div className="font-medium">Ethereum Wallet</div>
                          <div className="text-sm text-muted-foreground">
                            {deposit.transactionHash.slice(0, 8)}...{deposit.transactionHash.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge 
                        variant="secondary" 
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        Deposit
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground">
                      {format(new Date(deposit.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="py-4 text-right font-medium">
                      {formatDepositAmount(BigInt(deposit.amount))} SepoliaETH
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${deposit.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View on Etherscan
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {historyData?.data.pagination && historyData.data.pagination.totalPages > 1 && (
            <div className="flex justify-center p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {historyData.data.deposits.length} of {historyData.data.pagination.total} transactions
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}