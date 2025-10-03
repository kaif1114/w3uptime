import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (_request: NextRequest, user) => {
  try {
    const userId = user.id;
    
    // Get user with balance
    const userWithBalance = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    });

    if (!userWithBalance) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const userBalance = userWithBalance.balance; // Internal balance units (1000 = 1 ETH)

    // Get user transactions for calculating totals
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: 'CONFIRMED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate balance metrics
    const confirmedDeposits = allTransactions
      .filter(tx => tx.type === 'DEPOSIT')
      .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));

    // Get pending withdrawals
    const pendingWithdrawals = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'WITHDRAWAL',
        status: 'PENDING'
      }
    });

    const pendingWithdrawalAmount = pendingWithdrawals
      .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));

    // Convert amounts from Wei to ETH
    const totalDepositsEth = Number(confirmedDeposits) / Math.pow(10, 18);
    const pendingWithdrawalsEth = Number(pendingWithdrawalAmount) / Math.pow(10, 18);
    const availableBalanceEth = userBalance / 1000; // Convert internal units to ETH

    // Calculate total earnings (this would typically come from validator rewards)
    // For now, we'll use total deposits as a proxy
    const totalEarnings = totalDepositsEth;

    // Get recent transactions (last 5)
    const recentTransactions = allTransactions.slice(0, 5).map(tx => ({
      id: tx.id,
      type: tx.type === 'DEPOSIT' ? 'earnings' as const : 'withdrawal' as const,
      amount: tx.type === 'DEPOSIT' 
        ? Number(BigInt(tx.amount)) / Math.pow(10, 18)
        : -(Number(BigInt(tx.amount)) / Math.pow(10, 18)),
      status: tx.status.toLowerCase() as 'completed' | 'pending' | 'failed',
      date: tx.createdAt.toISOString(),
      description: tx.type === 'DEPOSIT' 
        ? 'Validator earnings deposit'
        : 'Withdrawal to wallet',
      transactionHash: tx.transactionHash?.startsWith('pending_') ? undefined : tx.transactionHash
    }));

    // Mock validation summary for now (this would come from validator performance data)
    const validationSummary = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      successRate: 0,
      lastValidationDate: new Date().toISOString()
    };

    const dashboardData = {
      balance: {
        totalEarnings,
        availableBalance: availableBalanceEth,
        pendingWithdrawals: pendingWithdrawalsEth,
        currency: 'ETH'
      },
      validationSummary,
      recentTransactions
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching validator dashboard data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data'
    }, { status: 500 });
  }
});